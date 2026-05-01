import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { format, isToday, isTomorrow } from 'date-fns';
import { ArrowLeft, Info, X, ShoppingBag } from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────────────────── */
function dayLabel(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d))    return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEEE, MMM d');
}

const TABS = ['Schedule', 'Packages', 'Bundles'];

/* ─── Info bottom-sheet ───────────────────────────────────────────────── */
function InfoSheet({ plan, onClose, color }) {
  if (!plan) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 pr-4">{plan.name}</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          {plan.credits != null && (
            <p>🎟️ <span className="font-medium">{plan.credits} classes</span> included</p>
          )}
          {plan.credits == null && (
            <p>♾️ <span className="font-medium">Unlimited classes</span></p>
          )}
          {plan.validity_days != null && (
            <p>📅 Valid for <span className="font-medium">{plan.validity_days} days</span></p>
          )}
          {plan.description && <p className="text-gray-500 mt-2">{plan.description}</p>}
          <p className="text-base font-semibold text-gray-900 mt-3">
            ${(plan.price_cents / 100).toFixed(2)} MXN
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Plan card ───────────────────────────────────────────────────────── */
function PlanCard({ plan, color, onInfo, onBuy }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start gap-3">
        <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-gray-900 truncate">{plan.name}</p>
            <button onClick={() => onInfo(plan)} className="shrink-0 text-gray-400">
              <Info className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {plan.credits != null ? `${plan.credits} classes` : 'Unlimited classes'}
            {plan.validity_days ? ` · ${plan.validity_days} days` : ''}
          </p>
          <div className="flex items-center justify-between mt-3">
            <p className="text-base font-bold text-gray-900">
              ${(plan.price_cents / 100).toFixed(2)} <span className="text-xs font-normal text-gray-400">MXN</span>
            </p>
            <button
              onClick={() => onBuy(plan)}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-full text-white active:scale-95 transition-transform"
              style={{ backgroundColor: color }}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Buy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────── */
export default function StudioClasses() {
  const { studioId } = useParams();
  const navigate     = useNavigate();
  const { studios }  = useAuth();

  const [activeTab,  setActiveTab]  = useState(0);
  const [sheetPlan,  setSheetPlan]  = useState(null);

  const studioInfo = studios.find(s => s.id === studioId);
  const color      = studioInfo?.primary_color ?? '#3f6840';

  /* Sessions */
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['studio_sessions', studioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*, class_types ( id, name, color, duration_minutes ), staff ( id, full_name )')
        .eq('studio_id', studioId)
        .eq('status', 'scheduled')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!studioId,
  });

  /* Plans */
  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['studio_plans', studioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('studio_id', studioId)
        .eq('is_active', true)
        .order('price_cents', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!studioId,
  });

  const packages = plans.filter(p => p.type === 'class_pack');
  const bundles  = plans.filter(p => p.type === 'monthly' || p.type === 'annual' || p.type === 'unlimited');

  /* Group sessions by date */
  const grouped = sessions.reduce((acc, s) => {
    const day = format(new Date(s.starts_at), 'yyyy-MM-dd');
    if (!acc[day]) acc[day] = [];
    acc[day].push(s);
    return acc;
  }, {});

  function handleBuy(plan) {
    navigate(`/checkout?item_type=plan&item_id=${plan.id}&studio_id=${studioId}`);
  }

  function handleSession(s) {
    navigate(`/checkout?item_type=session&item_id=${s.id}&studio_id=${studioId}`);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-0 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/discover')}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {studioInfo?.logo_url ? (
              <img
                src={studioInfo.logo_url}
                alt={studioInfo.brand_name || studioInfo.name}
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: color }}
              >
                {(studioInfo?.brand_name || studioInfo?.name || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                {studioInfo?.brand_name || studioInfo?.name || 'Classes'}
              </h1>
              {studioInfo?.tagline && (
                <p className="text-xs text-gray-500">{studioInfo.tagline}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors relative ${
                activeTab === i ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {tab}
              {activeTab === i && (
                <span
                  className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">

        {/* ── Tab 0: Schedule ── */}
        {activeTab === 0 && (
          <>
            {loadingSessions && (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            )}
            {!loadingSessions && sessions.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <p className="text-4xl mb-3">🧘</p>
                <p className="font-medium">No upcoming classes</p>
                <p className="text-sm mt-1">Check back soon</p>
              </div>
            )}
            {Object.entries(grouped).map(([day, daySessions]) => (
              <div key={day} className="mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {dayLabel(day)}
                </p>
                <div className="space-y-3">
                  {daySessions.map((s) => {
                    const spotsLeft = s.max_capacity - s.slots_booked;
                    const full      = spotsLeft <= 0;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSession(s)}
                        disabled={full}
                        className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform disabled:opacity-50"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-1 self-stretch rounded-full shrink-0"
                            style={{ backgroundColor: s.class_types?.color ?? color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-gray-900 truncate">
                                {s.class_types?.name ?? 'Class'}
                              </p>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                                full
                                  ? 'bg-gray-100 text-gray-400'
                                  : spotsLeft <= 3
                                  ? 'bg-orange-50 text-orange-600'
                                  : 'bg-green-50 text-green-600'
                              }`}>
                                {full ? 'Full' : `${spotsLeft} left`}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {format(new Date(s.starts_at), 'h:mm a')} · {s.class_types?.duration_minutes ?? 60} min
                              {s.staff?.full_name ? ` · ${s.staff.full_name}` : ''}
                            </p>
                            {s.price_cents != null && (
                              <p className="text-xs font-medium text-gray-400 mt-1">
                                ${(s.price_cents / 100).toFixed(0)} MXN
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Tab 1: Packages ── */}
        {activeTab === 1 && (
          <>
            {loadingPlans && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            )}
            {!loadingPlans && packages.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <p className="text-4xl mb-3">🎟️</p>
                <p className="font-medium">No class packs available</p>
                <p className="text-sm mt-1">Check back soon</p>
              </div>
            )}
            <div className="space-y-3">
              {packages.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  color={color}
                  onInfo={setSheetPlan}
                  onBuy={handleBuy}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Tab 2: Bundles ── */}
        {activeTab === 2 && (
          <>
            {loadingPlans && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            )}
            {!loadingPlans && bundles.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <p className="text-4xl mb-3">📦</p>
                <p className="font-medium">No bundles available</p>
                <p className="text-sm mt-1">Check back soon</p>
              </div>
            )}
            <div className="space-y-3">
              {bundles.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  color={color}
                  onInfo={setSheetPlan}
                  onBuy={handleBuy}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info bottom sheet */}
      {sheetPlan && (
        <InfoSheet plan={sheetPlan} color={color} onClose={() => setSheetPlan(null)} />
      )}
    </div>
  );
}
