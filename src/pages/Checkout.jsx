import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Info } from 'lucide-react';

/* ─── Stripe appearance ───────────────────────────────────────────────── */
const CARD_STYLE = {
  style: {
    base: {
      fontSize: '16px',
      color: '#111827',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#ef4444' },
  },
};

/* ─── Payment form (inside <Elements>) ───────────────────────────────── */
function PaymentForm({ clientSecret, breakdown, itemType, bookingId, slotLabel, onSuccess }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error,  setError]  = useState(null);
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
        // Confirm the pending booking that was created before checkout
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-booking`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authSession.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              booking_id:        bookingId,
              payment_intent_id: paymentIntent.id,
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Booking confirmation failed after payment');
      }
      // For plans, membership creation is handled server-side via webhook.

      onSuccess(paymentIntent.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  }

  return (
    <form onSubmit={handlePay} className="flex flex-col gap-5">
      {/* Cost breakdown */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="font-semibold text-gray-900 mb-1">{breakdown.item_name}</p>
        <p className="text-xs text-gray-400 mb-1">{breakdown.item_description}</p>
        {slotLabel && (
          <p className="text-xs font-medium text-green-700 bg-green-50 rounded-lg px-2.5 py-1 mb-3 inline-block">
            🎯 {slotLabel}
          </p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Amount</span>
            <span className="font-medium text-gray-900">${breakdown.item_price_mxn} MXN</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1 text-gray-500">
              App fee
              <button
                type="button"
                onClick={() => setFeeInfo(v => !v)}
                className="text-gray-400"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </span>
            <span className="font-medium text-gray-900">${breakdown.serenity_fee_mxn} MXN</span>
          </div>

          {feeInfo && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
              This fee keeps the Serenity app running and is non-refundable.
            </p>
          )}

          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-gray-900">${breakdown.total_mxn} MXN</span>
          </div>
        </div>
      </div>

      {/* Card input */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-semibold text-gray-700 mb-3">Card details</p>
        <div className="border border-gray-200 rounded-xl p-3">
          <CardElement options={CARD_STYLE} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{error}</div>
      )}

      <button
        type="submit"
        disabled={paying || !stripe}
        className="w-full text-white rounded-xl py-4 font-semibold text-base shadow-md active:scale-[0.98] transition-transform disabled:opacity-50"
        style={{ backgroundColor: 'var(--brand)' }}
      >
        {paying ? 'Processing…' : `Pay $${breakdown.total_mxn} MXN`}
      </button>
    </form>
  );
}

/* ─── Countdown timer bar ─────────────────────────────────────────────── */
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

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const pct  = Math.min(100, (secondsLeft / 300) * 100); // 300s = 5min
  const urgent = secondsLeft < 60;
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

/* ─── Main checkout page ──────────────────────────────────────────────── */
export default function Checkout() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();

  const item_type  = params.get('item_type');   // 'session' | 'plan'
  const item_id    = params.get('item_id');
  const studio_id  = params.get('studio_id');
  const slot_id    = params.get('slot_id') || null;
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
    // Load slot label if this is a circuit booking
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
            headers: {
              Authorization: `Bearer ${authSession.access_token}`,
              'Content-Type': 'application/json',
            },
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
    if (booking_id) q.set('booking_id', booking_id);
    if (paymentIntentId) q.set('payment_intent_id', paymentIntentId);
    navigate(`/booking/success?${q.toString()}`, { replace: true });
  }

  return (
    <div className="px-4 pt-4 pb-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-gray-500 text-sm mb-5"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Checkout</h1>
      <p className="text-sm text-gray-500 mb-4">Review and pay for your booking</p>

      {/* Countdown for ghost-booked sessions */}
      {expires_at && item_type === 'session' && (
        <CountdownBar
          expiresAt={expires_at}
          studioId={studio_id}
          navigate={navigate}
        />
      )}

      {loading && (
        <div className="space-y-4">
          <div className="h-36 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-14 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-4">{error}</div>
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
  );
}
