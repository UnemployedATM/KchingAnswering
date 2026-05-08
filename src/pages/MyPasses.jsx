import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { CalendarPlus, Ticket, Sparkles, ArrowRight } from 'lucide-react';

const STATUS_META = {
  active:                    { dot: 'bg-green-500',  label: 'Active' },
  expired:                   { dot: 'bg-gray-400',   label: 'Expired' },
  cancelled:                 { dot: 'bg-red-400',    label: 'Cancelled' },
  paused:                    { dot: 'bg-yellow-400', label: 'Paused' },
  revoked:                   { dot: 'bg-gray-400',   label: 'Revoked' },
  partially_refunded_closed: { dot: 'bg-gray-400',   label: 'Closed' },
};

export default function MyPasses() {
  const navigate = useNavigate();

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['client_memberships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_memberships')
        .select('*, membership_plans ( id, name, type, credits ), studios ( id, brand_name, name, primary_color )')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  function creditsLabel(m) {
    if (m.credits_remaining == null) return 'Unlimited classes';
    const total = m.membership_plans?.credits;
    if (total) return `${m.credits_remaining} of ${total} classes left`;
    return `${m.credits_remaining} class${m.credits_remaining !== 1 ? 'es' : ''} left`;
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

  const active = memberships.filter(m => m.status === 'active');
  const inactive = memberships.filter(m => m.status !== 'active');

  return (
    <div className="px-5 pb-8">
      <h1 className="font-serif font-bold text-3xl mb-1" style={{ color: 'var(--ink)' }}>
        My Passes
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        Memberships and class packs
      </p>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--subtle)' }} />
          ))}
        </div>
      )}

      {!isLoading && memberships.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--subtle)' }}>
            <Ticket className="w-8 h-8" style={{ color: 'var(--muted)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--ink)' }}>No passes yet</p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--muted)' }}>
            Browse studios to buy a class pack
          </p>
          <button
            onClick={() => navigate('/discover')}
            className="btn-black"
          >
            Explore Studios <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {active.length > 0 && (
        <div className="mb-6">
          <SectionLabel>Active</SectionLabel>
          <div className="space-y-3">
            {active.map(m => <PassCard key={m.id} m={m} canSchedule={canSchedule(m)} creditsPct={creditsPct(m)} creditsLabel={creditsLabel(m)} navigate={navigate} />)}
          </div>
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <SectionLabel>Past</SectionLabel>
          <div className="space-y-3">
            {inactive.map(m => <PassCard key={m.id} m={m} canSchedule={false} creditsPct={creditsPct(m)} creditsLabel={creditsLabel(m)} navigate={navigate} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function PassCard({ m, canSchedule, creditsPct, creditsLabel, navigate }) {
  const studioId   = m.studio_id ?? m.studios?.id;
  const studioName = m.studios?.brand_name || m.studios?.name;
  const meta       = STATUS_META[m.status] ?? { dot: 'bg-gray-400', label: m.status.replace(/_/g, ' ') };
  const isUnlimited = m.credits_remaining == null;
  const planName   = m.membership_plans?.name ?? 'Membership';
  const planType   = m.membership_plans?.type;

  // Color coding for the progress bar (when not unlimited)
  let barColor = 'var(--ink)';
  if (creditsPct != null) {
    if (creditsPct <= 10)      barColor = '#ef4444';
    else if (creditsPct <= 30) barColor = '#f59e0b';
    else                       barColor = 'var(--ink)';
  }

  return (
    <div className="card p-5">
      {/* Header row: status + plan type */}
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        {isUnlimited && m.status === 'active' && (
          <span className="flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--ink)' }}>
            <Sparkles className="w-3 h-3" />
            Unlimited
          </span>
        )}
      </div>

      {/* Plan name + studio */}
      <p className="font-serif font-bold text-xl leading-tight" style={{ color: 'var(--ink)' }}>
        {planName}
      </p>
      {studioName && (
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          {studioName}
        </p>
      )}

      {/* Credits / progress block */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            {creditsLabel}
          </span>
          {!isUnlimited && m.membership_plans?.credits && (
            <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
              {creditsPct ?? 0}%
            </span>
          )}
        </div>
        {creditsPct != null && (
          <div className="h-1.5 rounded-full bg-[var(--subtle)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${creditsPct}%`, backgroundColor: barColor }}
            />
          </div>
        )}
        {isUnlimited && m.status === 'active' && (
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ink)' }} />
        )}
      </div>

      {/* Footer row: dates + CTA */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="text-[11px] leading-relaxed min-w-0" style={{ color: 'var(--muted)' }}>
          {planType && (
            <p className="capitalize font-medium" style={{ color: 'var(--ink)' }}>
              {planType.replace(/_/g, ' ')}
            </p>
          )}
          {m.expires_at && (
            <p className="mt-0.5">
              {m.status === 'active' ? 'Renews' : 'Ended'} {format(new Date(m.expires_at), 'MMM d, yyyy')}
            </p>
          )}
        </div>
        {canSchedule && studioId && (
          <button
            onClick={() => navigate(`/studio/${studioId}`)}
            className="btn-black shrink-0 text-xs"
            style={{ padding: '10px 16px' }}
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Book
          </button>
        )}
      </div>
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
