import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { MapPin, QrCode, ArrowRight, Clock, User } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

export default function Discover() {
  const navigate = useNavigate();
  const { studios, client, loading } = useAuth();

  /* ── Loyalty stamps ─────────────────────────────────────── */
  const { data: loyalty = [] } = useQuery({
    queryKey: ['client_loyalty', client?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('client_loyalty')
        .select('studio_id, stamps, stamps_goal, discount_token, token_used')
        .eq('client_id', client.id);
      return data ?? [];
    },
    enabled: !!client?.id,
  });
  const loyaltyMap = {};
  loyalty.forEach(l => { loyaltyMap[l.studio_id] = l; });

  /* ── Upcoming bookings (for home dashboard) ─────────────── */
  const { data: upcoming = [] } = useQuery({
    queryKey: ['upcoming_home', client?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select(`
          id, status,
          class_sessions (
            id, starts_at, studio_id,
            class_types ( name, color ),
            staff ( full_name ),
            studios ( brand_name, name, primary_color )
          )
        `)
        .eq('client_id', client.id)
        .eq('status', 'confirmed')
        .gte('class_sessions.starts_at', new Date().toISOString())
        .order('class_sessions(starts_at)', { ascending: true })
        .limit(4);
      return (data ?? []).filter(b => b.class_sessions?.starts_at);
    },
    enabled: !!client?.id,
  });

  /* ── First name helper ──────────────────────────────────── */
  const firstName = client?.full_name?.split(' ')[0]
    ?? client?.email?.split('@')[0]
    ?? 'there';

  if (loading) {
    return (
      <div className="px-5 pt-4 space-y-4">
        <div className="h-16 rounded-2xl animate-pulse" />
        <div className="h-40 rounded-2xl animate-pulse" />
        <div className="h-32 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* ── Greeting ──────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-5">
        <h1
          className="font-serif font-bold leading-tight mb-1"
          style={{ fontSize: 32, color: 'var(--ink)' }}
        >
          What's up{'\n'}{firstName}!
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Here are your upcoming sessions and studios.
        </p>
      </div>

      {/* ── Upcoming Sessions ─────────────────────────────── */}
      {upcoming.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="font-serif font-bold text-lg" style={{ color: 'var(--ink)' }}>
              Upcoming Sessions
            </h2>
            <button
              onClick={() => navigate('/bookings')}
              className="flex items-center gap-1 text-xs font-semibold tracking-wider uppercase"
              style={{ color: 'var(--muted)' }}
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Horizontal scroll cards */}
          <div className="flex gap-3 px-5 overflow-x-auto scrollbar-none pb-2">
            {upcoming.map((b) => {
              const s     = b.class_sessions;
              const color = s?.studios?.primary_color ?? s?.class_types?.color ?? '#8C8479';
              const time  = s?.starts_at ? format(new Date(s.starts_at), 'h:mm a') : '';
              const dayLabel = s?.starts_at
                ? isToday(new Date(s.starts_at))
                  ? 'Today'
                  : isTomorrow(new Date(s.starts_at))
                    ? 'Tomorrow'
                    : format(new Date(s.starts_at), 'EEE, MMM d')
                : '';
              const studioName = s?.studios?.brand_name || s?.studios?.name || '';

              return (
                <button
                  key={b.id}
                  onClick={() => navigate(`/studio/${s?.studio_id}`)}
                  className="shrink-0 rounded-2xl overflow-hidden active:scale-[0.97] transition-transform"
                  style={{ width: 200 }}
                >
                  {/* Image / gradient area */}
                  <div
                    className="relative h-28 flex flex-col justify-between p-3"
                    style={{
                      background: `linear-gradient(135deg, ${color}cc, ${color}66)`,
                    }}
                  >
                    <span className="self-start text-[10px] font-semibold tracking-wide uppercase text-white/80 bg-black/20 rounded-full px-2 py-0.5">
                      {dayLabel}
                    </span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-white/80" />
                      <span className="text-xs font-semibold text-white">{time}</span>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="bg-[var(--surface)] border border-[var(--border)] border-t-0 rounded-b-2xl px-3 py-2.5 text-left">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>
                      {s?.class_types?.name ?? 'Class'}
                    </p>
                    {studioName && (
                      <p className="text-xs mt-0.5 truncate flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                        <MapPin className="w-3 h-3 shrink-0" />
                        {studioName}
                      </p>
                    )}
                    {s?.staff?.full_name && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                        <span className="font-medium">Instructor</span> {s.staff.full_name}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── No studios empty state (safety net — auto-redirect handles this) ── */}
      {studios.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
            style={{ backgroundColor: 'var(--subtle)' }}
          >
            <QrCode className="w-10 h-10" style={{ color: 'var(--muted)' }} />
          </div>
          <h2 className="font-serif font-bold text-xl mb-2" style={{ color: 'var(--ink)' }}>
            No studios yet
          </h2>
          <p className="text-sm leading-relaxed max-w-[260px] mb-5" style={{ color: 'var(--muted)' }}>
            Enter your invite token or scan your studio's QR code to get started.
          </p>
          <button onClick={() => navigate('/join')} className="btn-black">
            Join a studio <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── My Studios ───────────────────────────────────── */}
      {studios.length > 0 && (
        <section className="px-5">
          <h2 className="font-serif font-bold text-lg mb-3" style={{ color: 'var(--ink)' }}>
            My Studios
          </h2>

          <div className="space-y-3">
            {studios.map((s) => {
              const initial = (s.brand_name || s.name || '?')[0].toUpperCase();
              const color   = s.primary_color ?? 'var(--ink)';
              const stamp   = loyaltyMap[s.id];

              return (
                <div
                  key={s.id}
                  className="card p-4"
                >
                  {/* Top row: icon + name + ACTIVE badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {s.logo_url ? (
                        <img
                          src={s.logo_url}
                          alt={s.brand_name || s.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {initial}
                        </div>
                      )}
                    </div>
                    {/* Active badge */}
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      ACTIVE
                    </span>
                  </div>

                  {/* Studio name */}
                  <h3 className="font-serif font-bold text-xl leading-tight mb-1" style={{ color: 'var(--ink)' }}>
                    {s.brand_name || s.name}
                  </h3>

                  {/* Location / tagline */}
                  {(s.tagline || s.name) && (
                    <p className="flex items-center gap-1 text-sm mb-3" style={{ color: 'var(--muted)' }}>
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {s.tagline || s.name}
                    </p>
                  )}

                  {/* Stamp progress */}
                  {stamp && stamp.stamps > 0 && (
                    <div className="flex items-center gap-1.5 mb-3">
                      {stamp.stamps >= stamp.stamps_goal && !stamp.token_used ? (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          Reward ready!
                        </span>
                      ) : (
                        <>
                          <div className="flex gap-0.5">
                            {Array.from({ length: stamp.stamps_goal }).map((_, i) => (
                              <div
                                key={i}
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: i < stamp.stamps ? color : 'transparent',
                                  border: `1.5px solid ${i < stamp.stamps ? color : '#d1d5db'}`,
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                            {stamp.stamps}/{stamp.stamps_goal}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* CTA button */}
                  <button
                    onClick={() => navigate(`/studio/${s.id}`)}
                    className="btn-black w-full"
                    style={{ fontSize: 12, letterSpacing: '0.08em', minHeight: 46 }}
                  >
                    RESERVATIONS <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {/* Explore Studios dashed card → /join */}
            <button
              onClick={() => navigate('/join')}
              className="w-full border-2 border-dashed rounded-2xl py-8 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform hover:bg-black/[0.02]"
              style={{ borderColor: 'var(--border)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--subtle)' }}
              >
                <span className="text-xl font-light" style={{ color: 'var(--muted)' }}>+</span>
              </div>
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                Add a Studio
              </span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
