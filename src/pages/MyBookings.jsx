import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { format, isPast, differenceInHours } from 'date-fns';
import { X, RefreshCw, CreditCard, Star, Calendar, Clock, MoreHorizontal, CalendarDays } from 'lucide-react';
import RatingPrompt from '@/components/RatingPrompt';
import { toast } from '@/components/ui/Toast';

const statusDot = {
  confirmed:          'bg-green-500',
  cancelled:          'bg-gray-400',
  cancelled_credited: 'bg-blue-400',
  waitlisted:         'bg-yellow-400',
  no_show:            'bg-red-400',
  pending:            'bg-amber-400',
};
const statusLabel = {
  confirmed:          'Confirmed',
  cancelled:          'Cancelled',
  cancelled_credited: 'Credit kept',
  waitlisted:         'Waitlisted',
  no_show:            'No show',
  pending:            'Pending',
};

// Class type icon placeholders (use initials in a circle)
function ClassIcon({ name, color }) {
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold"
      style={{ backgroundColor: color ?? 'var(--subtle)', color: color ? '#fff' : 'var(--muted)' }}
    >
      {(name ?? 'C')[0].toUpperCase()}
    </div>
  );
}

export default function MyBookings() {
  const queryClient = useQueryClient();
  const { client }  = useAuth();
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling,   setCancelling]   = useState(false);
  const [cancelError,  setCancelError]  = useState(null);
  const [menuOpen,     setMenuOpen]     = useState(null); // bookingId of open menu

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['client_bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          class_sessions (
            id, starts_at, ends_at, studio_id,
            class_types ( id, name, color ),
            staff ( id, full_name )
          ),
          session_ratings ( stars, feedback_text )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleCancel(mode) {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const { data: { session: auth } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-booking`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_id: cancelTarget.id, mode }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setCancelError(
          data.error === 'WITHIN_24H_WINDOW'
            ? 'Cancellations are not permitted within 24 hours of the session.'
            : (data.error ?? 'Could not cancel. Please contact support.')
        );
        return;
      }
      toast.success(mode === 'credit' ? 'Converted to studio credit' : 'Refund processing');
      queryClient.invalidateQueries({ queryKey: ['client_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['client_memberships'] });
      setCancelTarget(null);
    } catch {
      setCancelError('Network error. Please try again.');
    } finally {
      setCancelling(false);
    }
  }

  const livePending = bookings.filter(b =>
    b.status === 'pending' && b.expires_at && new Date(b.expires_at) > new Date()
  );
  const upcoming = bookings.filter(b =>
    b.status === 'confirmed' &&
    b.class_sessions?.starts_at &&
    !isPast(new Date(b.class_sessions.starts_at))
  );
  const past = bookings.filter(b =>
    (b.status !== 'confirmed' && b.status !== 'pending') ||
    (b.status === 'confirmed' && (!b.class_sessions?.starts_at || isPast(new Date(b.class_sessions.starts_at))))
  );

  const unratedCount = past.filter(b => {
    const rating = Array.isArray(b.session_ratings) ? b.session_ratings[0] : b.session_ratings;
    return b.status === 'confirmed' && !rating && b.class_sessions?.starts_at && isPast(new Date(b.class_sessions.starts_at));
  }).length;

  function BookingCard({ b }) {
    const s            = b.class_sessions;
    const isFuture     = s?.starts_at && !isPast(new Date(s.starts_at));
    const hoursUntil   = s?.starts_at ? differenceInHours(new Date(s.starts_at), new Date()) : 0;
    const within24h    = hoursUntil < 24;
    const canCancel    = b.status === 'confirmed' && isFuture && !within24h;
    const classColor   = s?.class_types?.color ?? null;
    const existingRating = Array.isArray(b.session_ratings) ? b.session_ratings[0] : b.session_ratings;
    const canRate      = b.status === 'confirmed' && !isFuture && s?.starts_at && isPast(new Date(s.starts_at)) && !existingRating;

    return (
      <div className="card p-4">
        {/* Row 1: icon + status + menu */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <ClassIcon name={s?.class_types?.name} color={classColor} />
            <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--muted)' }}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot[b.status] ?? 'bg-gray-400'}`} />
              {statusLabel[b.status] ?? b.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* ⋮ menu — only for cancellable bookings */}
          {canCancel && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(menuOpen === b.id ? null : b.id)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--muted)' }} />
              </button>
              {menuOpen === b.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-[var(--border)] z-20 overflow-hidden">
                    <button
                      onClick={() => { setMenuOpen(null); setCancelTarget(b); setCancelError(null); }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Cancel booking
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Class name */}
        <p className="font-semibold text-base mb-0.5" style={{ color: 'var(--ink)' }}>
          {s?.class_types?.name ?? 'Class'}
        </p>

        {/* Instructor */}
        {s?.staff?.full_name && (
          <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>
            with {s.staff.full_name}
          </p>
        )}

        {/* Date + Time row */}
        {s?.starts_at && (
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(s.starts_at), 'MMM d')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {format(new Date(s.starts_at), 'h:mm a')}
            </span>
          </div>
        )}

        {/* Star rating display */}
        {existingRating && (
          <div className="mt-3 flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star
                key={n}
                className="w-3.5 h-3.5"
                fill={n <= existingRating.stars ? '#FACC15' : 'none'}
                stroke={n <= existingRating.stars ? '#EAB308' : '#D1D5DB'}
                strokeWidth={1.8}
              />
            ))}
          </div>
        )}

        {/* Rating prompt */}
        {canRate && client && (
          <RatingPrompt
            bookingId={b.id}
            clientId={client.id}
            studioId={s?.studio_id ?? b.studio_id}
            color={'var(--ink)'}
            onRated={() => queryClient.invalidateQueries({ queryKey: ['client_bookings'] })}
          />
        )}

        {within24h && isFuture && b.status === 'confirmed' && (
          <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
            Cancellations closed within 24 hours
          </p>
        )}
      </div>
    );
  }

  const sessionName = cancelTarget?.class_sessions?.class_types?.name;
  const sessionDate = cancelTarget?.class_sessions?.starts_at
    ? format(new Date(cancelTarget.class_sessions.starts_at), 'EEE MMM d, h:mm a')
    : '';

  return (
    <div className="px-5 pb-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-serif font-bold text-3xl" style={{ color: 'var(--ink)' }}>
          My Reservations
        </h1>
        {unratedCount > 0 && (
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
            {unratedCount} to rate
          </span>
        )}
      </div>

      {/* Cancel action sheet */}
      {cancelTarget && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 animate-[fadeIn_0.2s_ease-out]"
            onClick={() => !cancelling && setCancelTarget(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] rounded-t-2xl p-6 shadow-xl animate-[slideUp_0.2s_ease-out]">
            <div className="flex items-center justify-between mb-1">
              <p className="font-serif font-bold text-lg" style={{ color: 'var(--ink)' }}>
                Cancel booking?
              </p>
              <button onClick={() => !cancelling && setCancelTarget(null)} className="p-1" style={{ color: 'var(--muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--ink)' }}>{sessionName}</span>
              {sessionDate ? ` · ${sessionDate}` : ''}
            </p>

            {cancelError && (
              <div className="text-red-600 text-sm rounded-xl p-3 mb-4 bg-red-50">{cancelError}</div>
            )}

            <button
              disabled={cancelling}
              onClick={() => handleCancel('credit')}
              className="w-full flex items-start gap-3 border border-[var(--border)] rounded-2xl p-4 mb-3 text-left disabled:opacity-50 active:bg-[var(--subtle)] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                <RefreshCw className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Keep as studio credit</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  Convert to a pass credit — book any future class at this studio.
                </p>
              </div>
            </button>

            <button
              disabled={cancelling}
              onClick={() => handleCancel('refund')}
              className="w-full flex items-start gap-3 border border-[var(--border)] rounded-2xl p-4 mb-5 text-left disabled:opacity-50 active:bg-[var(--subtle)] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Refund to my card</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  Refunded in 3–5 business days. The app fee is non-refundable.
                </p>
              </div>
            </button>

            <button
              onClick={() => !cancelling && setCancelTarget(null)}
              className="w-full text-center text-sm py-1"
              style={{ color: 'var(--muted)' }}
            >
              Never mind, keep my booking
            </button>

            {cancelling && (
              <div className="absolute inset-0 rounded-t-2xl bg-white/70 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
              </div>
            )}
          </div>
        </>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" />)}
        </div>
      )}

      {!isLoading && bookings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--subtle)' }}>
            <CalendarDays className="w-8 h-8" style={{ color: 'var(--muted)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--ink)' }}>No bookings yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Book a class from Studios to get started</p>
        </div>
      )}

      {livePending.length > 0 && (
        <div className="mb-6">
          <SectionLabel>In Progress</SectionLabel>
          <div className="space-y-3">{livePending.map(b => <BookingCard key={b.id} b={b} />)}</div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-6">
          <SectionLabel>Upcoming</SectionLabel>
          <div className="space-y-3">{upcoming.map(b => <BookingCard key={b.id} b={b} />)}</div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <SectionLabel>Past</SectionLabel>
          <div className="space-y-3">{past.map(b => <BookingCard key={b.id} b={b} />)}</div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>
      {children}
    </p>
  );
}
