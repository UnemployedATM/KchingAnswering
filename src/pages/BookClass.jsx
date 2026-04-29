import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ArrowLeft, Clock, Users } from 'lucide-react';
import { useState } from 'react';

export default function BookClass() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [error, setError] = useState(null);

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*, class_types ( id, name, color, duration_minutes ), staff ( id, full_name )')
        .eq('id', sessionId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['client_memberships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_memberships')
        .select('*, membership_plans ( id, name, type, credits )')
        .eq('status', 'active');
      if (error) throw error;
      return data ?? [];
    },
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/book-class`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            class_session_id: sessionId,
            membership_id: selectedMembership ?? null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Booking failed');
      return data.booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['client_memberships'] });
      queryClient.invalidateQueries({ queryKey: ['client_sessions'] });
      navigate('/bookings', { replace: true });
    },
    onError: (e) => setError(e.message),
  });

  if (loadingSession) {
    return (
      <div className="p-4">
        <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-4 text-center text-gray-400 py-20">Class not found.</div>
    );
  }

  const spotsLeft = session.max_capacity - session.slots_booked;
  const full = spotsLeft <= 0;

  return (
    <div className="px-4 pt-4 pb-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-gray-500 text-sm mb-5 min-h-0 h-auto"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Class card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-start gap-3">
          <div
            className="w-1.5 self-stretch rounded-full shrink-0"
            style={{ backgroundColor: session.class_types?.color ?? '#6366f1' }}
          />
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {session.class_types?.name ?? 'Class'}
            </h2>
            <p className="text-gray-500 mt-1">
              {format(new Date(session.starts_at), 'EEEE, MMMM d · h:mm a')}
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {session.class_types?.duration_minutes ?? 60} min
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {full ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
              </span>
            </div>
            {session.staff?.full_name && (
              <p className="text-sm text-gray-400 mt-1">with {session.staff.full_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Membership selector */}
      {memberships.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-2">Pay with a pass</p>
          <div className="space-y-2">
            <label className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-200 cursor-pointer">
              <input
                type="radio"
                name="membership"
                value=""
                checked={selectedMembership === null}
                onChange={() => setSelectedMembership(null)}
                className="accent-[#3f6840]"
              />
              <span className="text-sm text-gray-600">Drop-in (no pass)</span>
            </label>
            {memberships.map((m) => (
              <label key={m.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-200 cursor-pointer">
                <input
                  type="radio"
                  name="membership"
                  value={m.id}
                  checked={selectedMembership === m.id}
                  onChange={() => setSelectedMembership(m.id)}
                  className="accent-[#3f6840]"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.membership_plans?.name}</p>
                  <p className="text-xs text-gray-400">
                    {m.credits_remaining == null ? 'Unlimited' : `${m.credits_remaining} left`}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded-xl text-sm text-red-600">{error}</div>
      )}

      <button
        onClick={() => bookMutation.mutate()}
        disabled={full || bookMutation.isPending}
        className="w-full bg-[#3f6840] text-white rounded-2xl py-4 font-semibold text-base shadow-md active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {bookMutation.isPending ? 'Booking…' : full ? 'Class Full' : 'Confirm Booking'}
      </button>
    </div>
  );
}
