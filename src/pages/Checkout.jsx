import { useState, useEffect } from 'react';
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
function PaymentForm({ clientSecret, breakdown, onSuccess }) {
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
      if (paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
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
        <p className="text-xs text-gray-400 mb-4">{breakdown.item_description}</p>

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
        className="w-full bg-[#3f6840] text-white rounded-2xl py-4 font-semibold text-base shadow-md active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {paying ? 'Processing…' : `Pay $${breakdown.total_mxn} MXN`}
      </button>
    </form>
  );
}

/* ─── Main checkout page ──────────────────────────────────────────────── */
export default function Checkout() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();

  const item_type  = params.get('item_type');  // 'session' | 'plan'
  const item_id    = params.get('item_id');
  const studio_id  = params.get('studio_id');

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [publishableKey, setPubKey]     = useState(null);
  const [breakdown,    setBreakdown]    = useState(null);
  const [stripePromise, setStripeP]     = useState(null);

  useEffect(() => {
    if (!item_type || !item_id || !studio_id) {
      setError('Missing checkout parameters.');
      setLoading(false);
      return;
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
        setPubKey(data.publishable_key);
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
    navigate(
      `/booking/success?payment_intent_id=${paymentIntentId}&item_type=${item_type}&studio_id=${studio_id}`,
      { replace: true }
    );
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
      <p className="text-sm text-gray-500 mb-6">Review and pay for your booking</p>

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
            onSuccess={handleSuccess}
          />
        </Elements>
      )}
    </div>
  );
}
