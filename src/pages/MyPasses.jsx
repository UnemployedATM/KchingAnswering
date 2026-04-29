import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

const statusColor = {
  active:    'bg-green-50 text-green-700',
  expired:   'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-50 text-red-600',
  paused:    'bg-yellow-50 text-yellow-700',
};

export default function MyPasses() {
  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['client_memberships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_memberships')
        .select('*, membership_plans ( id, name, type, credits )')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">My Passes</h1>
      <p className="text-sm text-gray-500 mb-6">Your memberships and class packs</p>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && memberships.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🎟️</p>
          <p className="font-medium">No passes yet</p>
          <p className="text-sm mt-1">Ask your studio to assign a membership</p>
        </div>
      )}

      <div className="space-y-3">
        {memberships.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">
                  {m.membership_plans?.name ?? 'Membership'}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {m.credits_remaining == null
                    ? 'Unlimited classes'
                    : `${m.credits_remaining} class${m.credits_remaining !== 1 ? 'es' : ''} remaining`}
                </p>
                {m.expires_at && (
                  <p className="text-xs text-gray-400 mt-1">
                    Expires {format(new Date(m.expires_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${statusColor[m.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {m.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
