import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Check, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function BookingSuccess() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const { client } = useAuth();

  const bookingId = params.get('booking_id');
  const item_type = params.get('item_type');
  const studio_id = params.get('studio_id');
  const piId      = params.get('payment_intent_id');

  const [booking, setBooking] = useState(null);
  const [studio,  setStudio]  = useState(null);
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (studio_id) {
        const { data } = await supabase
          .from('studios')
          .select('name, brand_name, primary_color')
          .eq('id', studio_id)
          .single();
        setStudio(data);
      }
      if (bookingId) {
        const { data } = await supabase
          .from('bookings')
          .select('id, status, class_sessions ( starts_at, class_types ( name ) )')
          .eq('id', bookingId)
          .maybeSingle();
        setBooking(data);
      }
      if (studio_id && client?.id) {
        const { data } = await supabase
          .from('client_loyalty')
          .select('stamps, stamps_goal')
          .eq('client_id', client.id)
          .eq('studio_id', studio_id)
          .maybeSingle();
        setLoyalty(data);
      }
      setLoading(false);
    }
    load();
  }, [bookingId, studio_id, client?.id]);

  const studioName   = studio?.brand_name || studio?.name || 'your studio';
  const sessionName  = booking?.class_sessions?.class_types?.name;
  const sessionDate  = booking?.class_sessions?.starts_at
    ? new Date(booking.class_sessions.starts_at)
    : null;
  const shortId      = bookingId ? `#${bookingId.slice(0, 8).toUpperCase()}` : (piId ? `#${piId.slice(-8).toUpperCase()}` : '—');
  const planName     = item_type === 'plan' ? 'Membership' : (sessionName ?? 'Class booking');

  return (
    <div
      className="min-h-full flex flex-col items-center"
      style={{ background: 'linear-gradient(180deg, #B8C5CD 0%, #C9B89A 60%, #C4A87A 100%)' }}
    >
      {/* Spacer */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 w-full max-w-sm">

        {/* Checkmark circle */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-8 animate-[pop_0.4s_ease-out]"
          style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
        >
          <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
        </div>

        {/* Heading */}
        {!loading && (
          <h1
            className="font-serif font-bold text-white text-center mb-2 leading-tight"
            style={{ fontSize: 34 }}
          >
            {item_type === 'plan'
              ? `Welcome to\nthe Sanctuary`
              : `You're booked!`}
          </h1>
        )}
        {loading && (
          <div className="h-10 w-48 rounded-xl animate-pulse mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
        )}

        {/* Details card */}
        <div className="w-full bg-white rounded-2xl p-5 shadow-xl mt-6 mb-6">
          {!loading ? (
            <>
              <p className="text-sm text-center mb-4" style={{ color: 'var(--muted)' }}>
                Your {item_type === 'plan' ? 'payment was successful. You are now a member of' : 'booking at'}
                {' '}<span className="font-semibold" style={{ color: 'var(--ink)' }}>{studioName}</span>
                {item_type === 'plan' ? '.' : ' is confirmed.'}
              </p>

              <div className="border-t border-[var(--border)] pt-4 space-y-3">
                <DetailRow label="STATUS">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {item_type === 'plan' ? 'Active Member' : 'Confirmed'}
                  </span>
                </DetailRow>
                <DetailRow label="PLAN">
                  <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{planName}</span>
                </DetailRow>
                {sessionDate && (
                  <DetailRow label="DATE">
                    <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {format(sessionDate, 'EEE, MMM d · h:mm a')}
                    </span>
                  </DetailRow>
                )}
                <DetailRow label="ORDER ID">
                  <span className="text-sm font-mono font-semibold" style={{ color: 'var(--ink)' }}>{shortId}</span>
                </DetailRow>
              </div>

              {/* Loyalty card */}
              {loyalty && item_type === 'session' && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                    Punch card
                  </p>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: loyalty.stamps_goal }).map((_, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: i < loyalty.stamps ? 'var(--ink)' : 'transparent',
                          border: `2px solid ${i < loyalty.stamps ? 'var(--ink)' : 'var(--border)'}`,
                        }}
                      >
                        {i < loyalty.stamps && (
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        )}
                      </div>
                    ))}
                    <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>
                      {loyalty.stamps}/{loyalty.stamps_goal}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="h-4 rounded-lg animate-pulse" />
              <div className="h-4 rounded-lg animate-pulse w-3/4" />
            </div>
          )}
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => navigate(
            item_type === 'plan'
              ? `/studio/${studio_id}`
              : '/bookings',
            { replace: true }
          )}
          className="btn-black w-full mb-4"
        >
          {item_type === 'plan' ? 'Book Your First Class' : 'View My Bookings'}
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Secondary */}
        <button
          onClick={() => navigate('/discover', { replace: true })}
          className="text-xs font-semibold tracking-widest uppercase text-white/70 py-2"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-semibold tracking-wider uppercase shrink-0" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <div className="flex-1 flex justify-end">
        {children}
      </div>
    </div>
  );
}
