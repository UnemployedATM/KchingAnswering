import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Info, ArrowRight } from 'lucide-react';

/* ─── Stripe card styles ───────────────────────────────────────────────── */
const CARD_STYLE = {
  style: {
    base: {
      fontSize: '15px',
      color: '#1A1612',
      fontFamily: 'Inter, ui-sans-serif, sans-serif',
      '::placeholder': { color: '#8C8479' },
    },
    invalid: { color: '#ef4444' },
  },
};

/* ─── Payment form ─────────────────────────────────────────────────────── */
function PaymentForm({ clientSecret, breakdown, itemType, bookingId, slotLabel, onSuccess }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [paying,  setPaying]  = useState(false);
  const [error,   setError]   = useState(null);
  const [feeInfo, setFeeInfo] = useState(false);

  async function handlePay(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setPaying(true);
    try {
      const card = elements.getElement(CardElement);
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: { card } }
      );
      if (stripeError) throw new Error(stripeError.message);
      if (paymentIntent.status !== 'succeeded') throw new Error('Payment not completed');

      const { data: { session: authSession } } = await supabase.auth.getSession();

      if (itemType === 'session' && bookingId) {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-booking`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authSession.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ booking_id: bookingId, payment_intent_id: paymentIntent.id }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Booking confirmation failed after payment');
      }

      onSuccess(paymentIntent.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      {/* Plan Summary card */}
      <div className="card p-5">
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>
          Plan Summary
        </p>
        <p className="font-serif font-bold text-2xl leading-tight mb-1" style={{ color: 'var(--ink)' }}>
          {breakdown.item_name}
        </p>
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          {breakdown.item_description}
        </p>
        {slotLabel && (
          <p className="text-xs font-medium text-green-700 bg-green-50 rounded-lg px-3 py-1.5 mb-4 inline-block">
            🎯 {slotLabel}
          </p>
        )}

        {/* Itemized breakdown */}
        <div className="space-y-2.5 text-sm border-t border-[var(--border)] pt-4">
          <LineItem label="Monthly Plan" value={`$${breakdown.item_price_mxn} MXN`} />
          <LineItem label="Initiation Fee" value="Waived" />
          <LineItem
            label={
              <span className="flex items-center gap-1">
                App fee
                <button type="button" onClick={() => setFeeInfo(v => !v)}>
                  <Info className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
                </button>
              </span>
            }
            value={`$${breakdown.serenity_fee_mxn} MXN`}
          />
          {feeInfo && (
            <p className="text-xs px-0 py-2" style={{ color: 'var(--muted)' }}>
              This fee keeps the app running and is non-refundable.
            </p>
          )}
        </div>

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--border)]">
          <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
            Total Due Today
          </p>
          <p className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
            ${breakdown.total_mxn} MXN
          </p>
        </div>
      </div>

      {/* Payment Method */}
      <div className="card p-5">
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--muted)' }}>
          Payment Method
        </p>

        <div className="border border-[var(--border)] rounded-xl p-3.5">
          <CardElement options={CARD_STYLE} />
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm rounded-xl p-3 bg-red-50">{error}</div>
      )}

      {/* Legal */}
      <p className="text-xs text-center px-4 leading-relaxed" style={{ color: 'var(--muted)' }}>
        By confirming, you agree to our Terms of Service and Privacy Policy.
      </p>

      <button
        type="submit"
        disabled={paying || !stripe}
        className="btn-black w-full"
      >
        {paying ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Processing…
          </span>
        ) : (
          <>
            {itemType === 'plan' ? 'Subscribe & Pay' : `Pay $${breakdown.total_mxn} MXN`}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

/* ─── Countdown bar ────────────────────────────────────────────────────── */
function CountdownBar({ expiresAt, studioId, navigate }) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!expiresAt) return;
    const end = new Date(expiresAt).getTime();
    function tick() {
      const left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(timerRef.current);
        navigate(`/studio/${studioId}`, { replace: true, state: { expiredMessage: true } });
      }
    }
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [expiresAt, studioId, navigate]);

  if (secondsLeft === null) return null;

  const mins    = Math.floor(secondsLeft / 60);
  const secs    = String(secondsLeft % 60).padStart(2, '0');
  const pct     = Math.min(100, (secondsLeft / 300) * 100);
  const urgent  = secondsLeft < 60;
  const shaking = secondsLeft < 30 && secondsLeft > 0;

  return (
    <div
      className={`rounded-xl px-4 py-2.5 mb-5 flex items-center gap-3 ${urgent ? 'bg-red-50' : 'bg-amber-50'}`}
      style={shaking ? { animation: 'shake 0.3s ease infinite' } : {}}
    >
      <span className={`text-sm font-semibold ${urgent ? 'text-red-600' : 'text-amber-700'}`}>
        ⏱ {mins}:{secs} to complete payment
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${urgent ? 'bg-red-400' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Main page ────────────────────────────────────────────────────────── */
export default function Checkout() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();

  const item_type  = params.get('item_type');
  const item_id    = params.get('item_id');
  const studio_id  = params.get('studio_id');
  const slot_id    = params.get('slot_id')    || null;
  const booking_id = params.get('booking_id') || null;
  const expires_at = params.get('expires_at') || null;

  const [loading,       setLoading]      = useState(true);
  const [error,         setError]        = useState(null);
  const [clientSecret,  setClientSecret] = useState(null);
  const [breakdown,     setBreakdown]    = useState(null);
  const [stripePromise, setStripeP]      = useState(null);
  const [slotLabel,     setSlotLabel]    = useState(null);

  useEffect(() => {
    if (!item_type || !item_id || !studio_id) {
      setError('Missing checkout parameters.');
      setLoading(false);
      return;
    }
    if (slot_id) {
      supabase.from('session_slots').select('slot_label').eq('id', slot_id).single()
        .then(({ data }) => { if (data) setSlotLabel(data.slot_label); });
    }
    async function init() {
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_type, item_id, studio_id }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to create payment');
        setClientSecret(data.client_secret);
        setBreakdown(data.breakdown);
        setStripeP(loadStripe(data.publishable_key, { stripeAccount: undefined }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [item_type, item_id, studio_id]);

  function handleSuccess(paymentIntentId) {
    const q = new URLSearchParams({ item_type, studio_id });
    if (booking_id)     q.set('booking_id',        booking_id);
    if (paymentIntentId) q.set('payment_intent_id', paymentIntentId);
    navigate(`/booking/success?${q.toString()}`, { replace: true });
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--ink)' }} />
        </button>
        <h1 className="font-serif font-bold text-2xl" style={{ color: 'var(--ink)' }}>
          Checkout
        </h1>
      </div>

      <div className="px-5 pb-8">
        {/* Countdown */}
        {expires_at && item_type === 'session' && (
          <CountdownBar expiresAt={expires_at} studioId={studio_id} navigate={navigate} />
        )}

        {loading && (
          <div className="space-y-4">
            <div className="h-48 rounded-2xl animate-pulse" />
            <div className="h-24 rounded-2xl animate-pulse" />
            <div className="h-14 rounded-2xl animate-pulse" />
          </div>
        )}

        {!loading && error && (
          <div className="text-red-600 text-sm rounded-xl p-4 bg-red-50">{error}</div>
        )}

        {!loading && !error && stripePromise && clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              clientSecret={clientSecret}
              breakdown={breakdown}
              itemType={item_type}
              bookingId={booking_id}
              slotLabel={slotLabel}
              onSuccess={handleSuccess}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}

function LineItem({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="font-medium" style={{ color: 'var(--ink)' }}>{value}</span>
    </div>
  );
}
