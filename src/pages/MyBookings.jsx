import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, isPast } from 'date-fns';

const statusColor = {
  confirmed:  'bg-green-50 text-green-700',
  cancelled:  'bg-gray-100 text-gray-500',
  waitlisted: 'bg-yellow-50 text-yellow-700',
  no_show:    'bg-red-50 text-red-600',
};

export default function MyBookings() {
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['client_bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          class_sessions (
            id, starts_at, ends_at,
            class_types ( id, name, color ),
            staff ( id, full_name )
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client_bookings'] }),
  });

  const upcoming = bookings.filter(b =>
    b.status === 'confirmed' && b.class_sessions?.starts_at && !isPast(new Date(b.class_sessions.starts_at))
  );
  const past = bookings.filter(b =>
    b.status !== 'confirmed' || !b.class_sessions?.starts_at || isPast(new Date(b.class_sessions.starts_at))
  );

  function BookingCard({ b }) {
    const s = b.class_sessions;
    const canCancel = b.status === 'confirmed' && s?.starts_at && !isPast(new Date(s.starts_at));
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-start gap-3">
          <div
            className="w-1 self-stretch rounded-full shrink-0"
            style={{ backgroundColor: s?.class_types?.color ?? '#6366f1' }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-900 truncate">
                {s?.class_types?.name ?? 'Class'}
              </p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${statusColor[b.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {b.status.replace('_', ' ')}
              </span>
            </div>
            {s?.starts_at && (
              <p className="text-sm text-gray-500 mt-0.5">
                {format(new Date(s.starts_at), 'EEE, MMM d · h:mm a')}
                {s.staff?.full_name ? ` · ${s.staff.full_name}` : ''}
              </p>
            )}
            {canCancel && (
              <button
                onClick={() => {
                  if (window.confirm('Cancel this booking?')) cancelMutation.mutate(b.id);
                }}
                className="mt-2 text-xs font-medium text-red-500 min-h-0 h-auto py-0"
              >
                Cancel booking
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Bookings</h1>
      <p className="text-sm text-gray-500 mb-6">Your upcoming and past classes</p>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && bookings.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium">No bookings yet</p>
          <p className="text-sm mt-1">Book a class from Discover</p>
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
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Past</p>
          <div className="space-y-3">
            {past.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        </div>
      )}
    </div>
  );
}
