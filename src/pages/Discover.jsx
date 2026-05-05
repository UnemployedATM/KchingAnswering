import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronRight, QrCode } from 'lucide-react';

export default function Discover() {
  const navigate = useNavigate();
  const { studios, client, loading } = useAuth();

  // Fetch loyalty stamps for all studios this client belongs to
  const { data: loyalty = [] } = useQuery({
    queryKey: ['client_loyalty', client?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_loyalty')
        .select('studio_id, stamps, stamps_goal, discount_token, token_used')
        .eq('client_id', client.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!client?.id,
  });

  // Build a lookup map: studioId → loyalty row
  const loyaltyMap = {};
  loyalty.forEach(l => { loyaltyMap[l.studio_id] = l; });

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[76px] rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (studios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5" style={{ backgroundColor: 'var(--brand-light, #fff3d6)' }}>
          <QrCode className="w-10 h-10" style={{ color: 'var(--brand)' }} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No studios yet</h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-[260px]">
          Scan your studio's QR code or open their invite link to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Studios</h1>
      <p className="text-sm text-gray-500 mb-6">
        {studios.length === 1 ? '1 studio' : `${studios.length} studios`}
      </p>

      <div className="space-y-3">
        {studios.map((s, i) => {
          const initial = (s.brand_name || s.name || '?')[0].toUpperCase();
          const color   = s.primary_color ?? '#ffa504';
          const stamp   = loyaltyMap[s.id];

          return (
            <button
              key={s.id}
              onClick={() => navigate(`/studio/${s.id}`)}
              className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 hover:shadow-md hover:border-gray-200 hover:-translate-y-px"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Color accent bar */}
              <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />

              {/* Logo or initials */}
              {s.logo_url ? (
                <img
                  src={s.logo_url}
                  alt={s.brand_name || s.name}
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm"
                  style={{ backgroundColor: color }}
                >
                  {initial}
                </div>
              )}

              {/* Studio info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {s.brand_name || s.name}
                </p>
                {s.tagline && (
                  <p className="text-sm text-gray-500 truncate mt-0.5">{s.tagline}</p>
                )}

                {/* Loyalty stamp progress */}
                {stamp && stamp.stamps > 0 && (
                  <StampProgress
                    stamps={stamp.stamps}
                    goal={stamp.stamps_goal}
                    color={color}
                    hasReward={stamp.stamps >= stamp.stamps_goal && !stamp.token_used}
                  />
                )}
              </div>

              <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Stamp progress indicator ────────────────────────────────────── */
function StampProgress({ stamps, goal, color, hasReward }) {
  const display = Math.min(stamps, goal);

  if (hasReward) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          Reward ready!
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: goal }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-colors duration-300"
            style={{
              backgroundColor: i < display ? color : 'transparent',
              border: `1.5px solid ${i < display ? color : '#d1d5db'}`,
            }}
          />
        ))}
      </div>
      <span className="text-[10px] text-gray-400 font-medium">
        {display}/{goal}
      </span>
    </div>
  );
}
