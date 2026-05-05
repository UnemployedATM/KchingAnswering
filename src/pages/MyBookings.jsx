import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { format, isPast, differenceInHours } from 'date-fns';
import { X, RefreshCw, CreditCard, Star, CalendarDays } from 'lucide-react';
import RatingPrompt from '@/components/RatingPrompt';
import { toast } from '@/components/ui/Toast';

const statusColor = {
  confirmed:          'bg-green-50 text-green-700',
  cancelled:          'bg-gray-100 text-gray-500',
  cancelled_credited: 'bg-blue-50 text-blue-600',
  waitlisted:         'bg-yellow-50 text-yellow-700',
  no_show:            'bg-red-50 text-red-600',
  pending:            'bg-amber-50 text-amber-700',
};

const statusLabel = {
  confirmed:          'Confirmed',
  cancelled:          'Cancelled',
  cancelled_credited: 'Credit kept',
  waitlisted:         'Waitlisted',
  no_show:            'No show',
  pending:            'Pending',
};

export default function MyBookings() {
  const queryClient = useQueryClient();
  const { client }  = useAuth();
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling,   setCancelling]   = useState(false);
  const [cancelError,  setCancelError]  = useState(null);

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
          headers: {
            Authorization: `Bearer ${auth.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ booking_id: cancelTarget.id, mode }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'WITHIN_24H_WINDOW') {
          setCancelError('Cancellations are not permitted within 24 hours of the session.');
        } else {
          setCancelError(data.error ?? 'Could not cancel. Please contact support.');
        }
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

  // Sections
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

  // Find the nearest upcoming booking (smallest starts_at in the future)
  const nearestUpcomingId = upcoming.length > 0
    ? [...upcoming].sort((a, b) =>
        new Date(a.class_sessions?.starts_at ?? 0) - new Date(b.class_sessions?.starts_at ?? 0)
      )[0]?.id
    : null;

  function BookingCard({ b }) {
    const s          = b.class_sessions;
    const isFuture   = s?.starts_at && !isPast(new Date(s.starts_at));
    const hoursUntil = s?.starts_at ? differenceInHours(new Date(s.starts_at), new Date()) : 0;
    const within24h  = hoursUntil < 24;
    const canCancel  = b.status === 'confirmed' && isFuture;
    const isNearest  = b.id === nearestUpcomingId;

    // Rating: session_ratings comes as an array (1:many from PostgREST)
    const existingRating = Array.isArray(b.session_ratings)
      ? b.session_ratings[0]
      : b.session_ratings;

    // Show rating prompt if: past confirmed, class ended, no rating yet
    const isPastConfirmed = b.status === 'confirmed' && !isFuture;
    const classEnded = s?.starts_at && isPast(new Date(s.starts_at));
    const canRate = isPastConfirmed && classEnded && !existingRating;

    return (
      <div className={`bg-white rounded-2xl p-4 shadow-sm border transition-shadow ${
        isNearest ? 'border-l-4 border-gray-100 shadow-md' : 'border border-gray-100'
      }`} style={isNearest ? { borderLeftColor: s?.class_types?.color ?? 'var(--brand)' } : {}}>
        <div className="flex items-start gap-3">
          <div
            className={`w-1 self-stretch rounded-full shrink-0 ${isNearest ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: s?.class_types?.color ?? '#6366f1' }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-900 truncate">
                {s?.class_types?.name ?? 'Class'}
              </p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${statusColor[b.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {statusLabel[b.status] ?? b.status.replace('_', ' ')}
              </span>
            </div>
            {s?.starts_at && (
              <p className="text-sm text-gray-500 mt-0.5">
                {format(new Date(s.starts_at), 'EEE, MMM d · h:mm a')}
                {s.staff?.full_name ? ` · ${s.staff.full_name}` : ''}
              </p>
            )}

            {/* Cancel button for future confirmed bookings */}
            {canCancel && (
              within24h ? (
                <p className="mt-2 text-xs text-gray-400">
                  Cancellations closed within 24 hours
                </p>
              ) : (
                <button
                  onClick={() => { setCancelTarget(b); setCancelError(null); }}
                  className="mt-2 text-xs font-medium text-red-500"
                >
                  Cancel booking
                </button>
              )
            )}

            {/* Existing rating display */}
            {existingRating && (
              <div className="mt-2.5 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star
                    key={n}
                    className="w-3.5 h-3.5"
                    fill={n <= existingRating.stars ? '#facc15' : 'none'}
                    stroke={n <= existingRating.stars ? '#eab308' : '#d1d5db'}
                    strokeWidth={1.8}
                  />
                ))}
                <span className="ml-1.5 text-xs text-gray-400">
                  {existingRating.stars}/5
                </span>
              </div>
            )}

            {/* Rating prompt for eligible past bookings */}
            {canRate && client && (
              <RatingPrompt
                bookingId={b.id}
                clientId={client.id}
                studioId={s?.studio_id ?? b.studio_id}
                color={s?.class_types?.color ?? '#ffa504'}
                onRated={() => queryClient.invalidateQueries({ queryKey: ['client_bookings'] })}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  const sessionName = cancelTarget?.class_sessions?.class_types?.name;
  const sessionDate = cancelTarget?.class_sessions?.starts_at
    ? format(new Date(cancelTarget.class_sessions.starts_at), 'EEE MMM d, h:mm a')
    : '';

  // Count how many past bookings are unrated
  const unratedCount = past.filter(b => {
    const rating = Array.isArray(b.session_ratings)
      ? b.session_ratings[0]
      : b.session_ratings;
    return b.status === 'confirmed' && !rating && b.class_sessions?.starts_at && isPast(new Date(b.class_sessions.starts_at));
  }).length;

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Bookings</h1>
      <p className="text-sm text-gray-500 mb-6">Your upcoming and past classes</p>

      {/* Cancel action sheet */}
      {cancelTarget && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 animate-[fadeIn_0.2s_ease-out]"
            onClick={() => !cancelling && setCancelTarget(null)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 shadow-xl animate-[slideUp_0.2s_ease-out]"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-gray-900">Cancel this booking?</p>
              <button
                onClick={() => !cancelling && setCancelTarget(null)}
                className="p-1 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-medium text-gray-700">{sessionName}</span>
              {sessionDate ? ` · ${sessionDate}` : ''}
            </p>

            {cancelError && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">
                {cancelError}
              </div>
            )}

            <button
              disabled={cancelling}
              onClick={() => handleCancel('credit')}
              className="w-full flex items-start gap-3 border border-gray-200 rounded-2xl p-4 mb-3 text-left disabled:opacity-50 active:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                <RefreshCw className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Keep as studio credit</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Convert to a pass credit — book any future class at this studio. Nothing lost.
                </p>
              </div>
            </button>

            <button
              disabled={cancelling}
              onClick={() => handleCancel('refund')}
              className="w-full flex items-start gap-3 border border-gray-200 rounded-2xl p-4 mb-5 text-left disabled:opacity-50 active:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Refund to my card</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Session cost refunded in 3-5 business days. The $15 app fee is non-refundable.
                </p>
              </div>
            </button>

            <button
              onClick={() => !cancelling && setCancelTarget(null)}
              className="w-full text-center text-sm text-gray-400 py-1"
            >
              Never mind, keep my booking
            </button>

            {cancelling && (
              <div className="absolute inset-0 rounded-t-2xl bg-white/70 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
                  <p className="text-sm text-gray-500 font-medium">Processing...</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && bookings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <CalendarDays className="w-8 h-8 text-gray-300" />
          </div>
          <p className="font-medium text-gray-500">No bookings yet</p>
          <p className="text-sm text-gray-400 mt-1">Book a class from Studios to get started</p>
        </div>
      )}

      {/* Pending (in checkout right now) */}
      {livePending.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">In progress</p>
          <div className="space-y-3">
            {livePending.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Upcoming</p>
          <div className="space-y-3">
            {upcoming.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Past</p>
            {unratedCount > 0 && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                {unratedCount} to rate
              </span>
            )}
          </div>
          <div className="space-y-3">
            {past.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        </div>
      )}
    </div>
  );
}
