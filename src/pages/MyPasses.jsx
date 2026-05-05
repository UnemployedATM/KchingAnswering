import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { CalendarPlus } from 'lucide-react';

const statusColor = {
  active:                    'bg-green-50 text-green-700',
  expired:                   'bg-gray-100 text-gray-500',
  cancelled:                 'bg-red-50 text-red-600',
  paused:                    'bg-yellow-50 text-yellow-700',
  revoked:                   'bg-gray-100 text-gray-400',
  partially_refunded_closed: 'bg-gray-100 text-gray-400',
};

export default function MyPasses() {
  const navigate = useNavigate();

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['client_memberships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_memberships')
        .select('*, membership_plans ( id, name, type, credits ), studios ( id, brand_name, name )')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  function creditsLabel(m) {
    if (m.credits_remaining == null) return 'Unlimited classes';
    const total = m.membership_plans?.credits;
    if (total) return `${m.credits_remaining} / ${total} classes remaining`;
    return `${m.credits_remaining} class${m.credits_remaining !== 1 ? 'es' : ''} remaining`;
  }

  function creditsPct(m) {
    if (m.credits_remaining == null) return null; // unlimited
    const total = m.membership_plans?.credits;
    if (!total) return null;
    return Math.round((m.credits_remaining / total) * 100);
  }

  function canSchedule(m) {
    return (
      m.status === 'active' &&
      (m.credits_remaining == null || m.credits_remaining > 0)
    );
  }

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
          <p className="text-sm mt-1">Browse studios to buy a class pack</p>
        </div>
      )}

      <div className="space-y-3">
        {memberships.map((m) => {
          const studioId = m.studio_id ?? m.studios?.id;
          return (
            <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">
                    {m.membership_plans?.name ?? 'Membership'}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 font-body">
                    {creditsLabel(m)}
                  </p>
                  {/* Credits progress bar */}
                  {creditsPct(m) !== null && (
                    <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${creditsPct(m)}%`,
                          backgroundColor: creditsPct(m) > 30
                            ? 'var(--brand)'
                            : creditsPct(m) > 10
                              ? '#f59e0b'
                              : '#ef4444',
                        }}
                      />
                    </div>
                  )}
                  {m.studios && (
                    <p className="text-xs text-gray-400 mt-1.5 font-body">
                      {m.studios.brand_name || m.studios.name}
                    </p>
                  )}
                  {m.expires_at && (
                    <p className="text-xs text-gray-400 mt-0.5 font-body">
                      Expires {format(new Date(m.expires_at), 'MMM d, yyyy')}
                    </p>
                  )}
                  {canSchedule(m) && studioId && (
                    <button
                      onClick={() => navigate(`/studio/${studioId}`)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-transform"
                      style={{ color: 'var(--brand)' }}
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      Book a class with this pass
                    </button>
                  )}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${statusColor[m.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {m.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
