import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { format, addDays, getHours, differenceInHours, isToday } from 'date-fns';
import { ArrowLeft, Info, X, ShoppingBag, AlertTriangle, Clock } from 'lucide-react';
import MachinePickerSheet from '@/components/MachinePickerSheet';
import TimeChip from '@/components/TimeChip';
import { toast } from '@/components/ui/Toast';

/* ─── Tab labels ──────────────────────────────────────────────────────────── */
const TABS = ['Schedule', 'Packages', 'Bundles'];

/* ─── 14-day ribbon dates ─────────────────────────────────────────────────── */
const RIBBON_DATES = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

/* ─── Info bottom-sheet ───────────────────────────────────────────────────── */
function InfoSheet({ plan, onClose, color }) {
  if (!plan) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end animate-[fadeIn_0.2s_ease-out]" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl p-6 shadow-2xl animate-[slideUp_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 pr-4">{plan.name}</h3>
          <button onClick={onClose} className="p-1 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2 text-sm font-body text-gray-600">
          {plan.credits != null ? (
            <p>🎟️ <span className="font-medium">{plan.credits} classes</span> included</p>
          ) : (
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

/* ─── Non-refundable warning sheet ───────────────────────────────────────── */
function NonRefundableSheet({ session, onConfirm, onDismiss, color }) {
  if (!session) return null;
  const timeStr = format(new Date(session.starts_at), 'h:mm a');
  const dateStr = format(new Date(session.starts_at), 'EEE, MMM d');
  const hoursUntil = differenceInHours(new Date(session.starts_at), new Date());

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-[fadeIn_0.2s_ease-out]" onClick={onDismiss}>
      <div
        className="w-full bg-white rounded-t-3xl p-6 shadow-2xl animate-[slideUp_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
          Non-Refundable Booking
        </h3>
        <p className="text-sm font-body text-gray-500 text-center mb-4">
          This class starts in <span className="font-semibold text-gray-800">
            {hoursUntil < 1 ? 'less than an hour' : `${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`}
          </span>. It cannot be cancelled or refunded after booking.
        </p>

        {/* Session detail */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: color }} />
          <div>
            <p className="text-sm font-semibold text-gray-900">{session.class_types?.name ?? 'Class'}</p>
            <p className="text-xs font-body text-gray-500 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {dateStr} · {timeStr}
            </p>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={onConfirm}
          className="w-full text-white rounded-xl py-3.5 font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform mb-3"
          style={{ backgroundColor: color }}
        >
          Book Anyway
        </button>
        <button
          onClick={onDismiss}
          className="w-full text-center text-sm font-body text-gray-400 py-2"
        >
          Choose another time
        </button>
      </div>
    </div>
  );
}

/* ─── Plan card ───────────────────────────────────────────────────────────── */
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
          <p className="text-sm font-body text-gray-500 mt-0.5">
            {plan.credits != null ? `${plan.credits} classes` : 'Unlimited classes'}
            {plan.validity_days ? ` · ${plan.validity_days} days` : ''}
          </p>
          <div className="flex items-center justify-between mt-3">
            <p className="text-base font-bold text-gray-900">
              ${(plan.price_cents / 100).toFixed(2)} <span className="text-xs font-normal text-gray-400">MXN</span>
            </p>
            <button
              onClick={() => onBuy(plan)}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-xl text-white active:scale-95 transition-transform shadow-sm"
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

/* ─── Daypart section ─────────────────────────────────────────────────────── */
function DaypartSection({ label, icon, sessions, color, showClassName, onTap, loading }) {
  if (sessions.length === 0) return null;
  return (
    <div className="mb-5 animate-[sectionReveal_0.3s_ease-out]">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
        <span>{icon}</span> {label}
      </p>
      <div className="flex flex-wrap gap-2.5">
        {sessions.map(s => (
          <TimeChip
            key={s.id}
            session={s}
            color={color}
            showClassName={showClassName}
            onTap={onTap}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function StudioClasses() {
  const { studioId } = useParams();
  const navigate     = useNavigate();
  const location     = useLocation();
  const { studios }  = useAuth();

  // Show toast if redirected here from an expired checkout timer
  useEffect(() => {
    if (location.state?.expiredMessage) {
      toast.error('Your reservation expired. Please book again.');
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  /* ── Schedule state ── */
  const [activeTab,       setActiveTab]       = useState(0);
  const [selectedType,    setSelectedType]    = useState(null); // null = "All"
  const [selectedDate,    setSelectedDate]    = useState(format(new Date(), 'yyyy-MM-dd'));
  const [nonRefundTarget, setNonRefundTarget] = useState(null);

  /* ── Picker state (circuit sessions) ── */
  const [sheetPlan,     setSheetPlan]     = useState(null);
  const [pickerSession, setPickerSession] = useState(null);
  const [pickerSlots,   setPickerSlots]   = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const ribbonRef = useRef(null);

  const studioInfo = studios.find(s => s.id === studioId);
  const color      = studioInfo?.primary_color ?? '#ffa504';

  /* ─── Sessions query ── */
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

  /* ─── Plans query ── */
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
  const bundles  = plans.filter(p => ['monthly', 'annual', 'unlimited'].includes(p.type));

  /* ─── Class type filter options ── */
  const classTypeOptions = [
    { id: null, name: 'All' },
    ...[...new Map(sessions.map(s => [s.class_types?.id, s.class_types])).values()].filter(Boolean),
  ];

  /* ─── Dates that have sessions (for ribbon indicators) ── */
  const datesWithSessions = new Set(sessions.map(s => format(new Date(s.starts_at), 'yyyy-MM-dd')));

  /* ─── Filtered + grouped for selected date ── */
  const dayFiltered = sessions.filter(s => {
    const day = format(new Date(s.starts_at), 'yyyy-MM-dd');
    if (day !== selectedDate) return false;
    if (selectedType && s.class_types?.id !== selectedType) return false;
    return true;
  });

  const morning   = dayFiltered.filter(s => getHours(new Date(s.starts_at)) < 12);
  const afternoon = dayFiltered.filter(s => { const h = getHours(new Date(s.starts_at)); return h >= 12 && h < 17; });
  const evening   = dayFiltered.filter(s => getHours(new Date(s.starts_at)) >= 17);

  /* ─── Helpers ── */
  function handleBuy(plan) {
    navigate(`/checkout?item_type=plan&item_id=${plan.id}&studio_id=${studioId}`);
  }

  async function createPendingBooking({ class_session_id, slot_id }) {
    const { data: { session: auth } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/book-class`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ class_session_id, slot_id }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Could not reserve your spot');
    return data; // { booking_id, expires_at }
  }

  async function handleSession(s) {
    setPickerLoading(true);
    try {
      const { data: slots } = await supabase
        .from('session_slots')
        .select('*')
        .eq('class_session_id', s.id)
        .order('position_order', { ascending: true });

      if (slots && slots.length > 0) {
        setPickerSlots(slots);
        setPickerSession(s);
        setPickerLoading(false);
      } else {
        const result = await createPendingBooking({ class_session_id: s.id });
        navigate(
          `/checkout?booking_id=${result.booking_id}&expires_at=${encodeURIComponent(result.expires_at)}&item_type=session&item_id=${s.id}&studio_id=${studioId}`
        );
      }
    } catch (err) {
      toast.error(err.message || 'Could not reserve your spot. Please try again.');
      setPickerLoading(false);
    }
  }

  async function handlePickSlot(slot) {
    setPickerLoading(true);
    try {
      const result = await createPendingBooking({
        class_session_id: pickerSession.id,
        slot_id: slot.id,
      });
      setPickerSession(null);
      navigate(
        `/checkout?booking_id=${result.booking_id}&expires_at=${encodeURIComponent(result.expires_at)}&item_type=session&item_id=${pickerSession.id}&studio_id=${studioId}&slot_id=${slot.id}`
      );
    } catch (err) {
      if (err.message?.includes('just taken') || err.message?.includes('SLOT_TAKEN')) {
        const { data: fresh } = await supabase
          .from('session_slots')
          .select('*')
          .eq('class_session_id', pickerSession.id)
          .order('position_order', { ascending: true });
        if (fresh) setPickerSlots(fresh);
        toast.error('That machine slot was just taken — please choose another.');
      } else {
        toast.error(err.message || 'Could not reserve your spot. Please try again.');
      }
      setPickerLoading(false);
    }
  }

  /** Gate: show non-refundable warning if session starts < 24h away */
  function initiateBooking(s) {
    const hoursUntil = differenceInHours(new Date(s.starts_at), new Date());
    if (hoursUntil >= 0 && hoursUntil < 24) {
      setNonRefundTarget(s);
      return;
    }
    handleSession(s);
  }

  const selectedDayLabel = (() => {
    const d = new Date(selectedDate + 'T00:00:00');
    if (isToday(d)) return 'today';
    return format(d, 'EEEE, MMM d');
  })();

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-0 shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/discover')}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            {studioInfo?.logo_url ? (
              <img
                src={studioInfo.logo_url}
                alt={studioInfo.brand_name || studioInfo.name}
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-white shadow-sm"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                style={{ backgroundColor: color }}
              >
                {(studioInfo?.brand_name || studioInfo?.name || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                {studioInfo?.brand_name || studioInfo?.name || 'Classes'}
              </h1>
              {studioInfo?.tagline && (
                <p className="text-xs font-body text-gray-400">{studioInfo.tagline}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
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
                  className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full transition-all duration-300"
                  style={{ backgroundColor: color }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ════════════════ Tab 0: Schedule ════════════════ */}
        {activeTab === 0 && (
          <div className="flex flex-col h-full">

            {/* Sticky filter header */}
            <div className="bg-white border-b border-gray-100 px-4 pt-3 pb-0 shrink-0">

              {/* Layer 1 — Class type filter strip */}
              {!loadingSessions && classTypeOptions.length > 1 && (
                <div className="overflow-x-auto scrollbar-none">
                  <div className="flex gap-2 pb-3 w-max">
                    {classTypeOptions.map(ct => (
                      <button
                        key={ct.id ?? 'all'}
                        onClick={() => setSelectedType(ct.id)}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-semibold font-body whitespace-nowrap transition-all duration-200 active:scale-95 ${
                          selectedType === ct.id
                            ? 'text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        style={selectedType === ct.id ? { backgroundColor: color } : {}}
                      >
                        {ct.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Layer 2 — Horizontal date ribbon */}
              <div
                ref={ribbonRef}
                className="overflow-x-auto scrollbar-none animate-[ribbonSlide_0.3s_ease-out]"
              >
                <div className="flex gap-2 pb-3 w-max">
                  {RIBBON_DATES.map((date) => {
                    const key     = format(date, 'yyyy-MM-dd');
                    const active  = key === selectedDate;
                    const today   = isToday(date);
                    const hasSess = datesWithSessions.has(key);

                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDate(key)}
                        className={`
                          relative flex flex-col items-center justify-center
                          w-12 h-14 rounded-xl transition-all duration-200 shrink-0
                          active:scale-95
                          ${active
                            ? 'text-white shadow-md'
                            : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200'
                          }
                        `}
                        style={active ? { backgroundColor: color } : {}}
                      >
                        <span className={`text-[9px] uppercase tracking-wider font-semibold ${active ? 'text-white/80' : 'text-gray-400'}`}>
                          {format(date, 'EEE')}
                        </span>
                        <span className={`text-base font-bold leading-tight ${active ? 'text-white' : hasSess ? 'text-gray-900' : 'text-gray-400'}`}>
                          {format(date, 'd')}
                        </span>
                        {/* Today indicator */}
                        {today && !active && (
                          <span className="absolute bottom-1.5 w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
                        )}
                        {/* Has sessions indicator */}
                        {hasSess && !active && !today && (
                          <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-gray-300" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Layer 3 — Daypart time chips */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
              {loadingSessions ? (
                <div className="flex flex-wrap gap-2.5">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="w-[82px] h-16 rounded-xl bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : dayFiltered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-4xl mb-3">🧘</div>
                  <p className="font-semibold text-gray-600">No classes {selectedDayLabel}</p>
                  <p className="text-sm font-body text-gray-400 mt-1">Try selecting another date</p>
                </div>
              ) : (
                <>
                  <DaypartSection
                    label="Morning"
                    icon="☀️"
                    sessions={morning}
                    color={color}
                    showClassName={selectedType === null}
                    onTap={initiateBooking}
                    loading={pickerLoading}
                  />
                  <DaypartSection
                    label="Afternoon"
                    icon="🌤"
                    sessions={afternoon}
                    color={color}
                    showClassName={selectedType === null}
                    onTap={initiateBooking}
                    loading={pickerLoading}
                  />
                  <DaypartSection
                    label="Evening"
                    icon="🌙"
                    sessions={evening}
                    color={color}
                    showClassName={selectedType === null}
                    onTap={initiateBooking}
                    loading={pickerLoading}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* ════════════════ Tab 1: Packages ════════════════ */}
        {activeTab === 1 && (
          <div className="px-4 pt-4 pb-4">
            {loadingPlans ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-4xl mb-3">🎟️</p>
                <p className="font-medium">No class packs available</p>
                <p className="text-sm font-body mt-1">Check back soon</p>
              </div>
            ) : (
              <div className="space-y-3">
                {packages.map(plan => (
                  <PlanCard key={plan.id} plan={plan} color={color} onInfo={setSheetPlan} onBuy={handleBuy} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ Tab 2: Bundles ════════════════ */}
        {activeTab === 2 && (
          <div className="px-4 pt-4 pb-4">
            {loadingPlans ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : bundles.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-4xl mb-3">📦</p>
                <p className="font-medium">No bundles available</p>
                <p className="text-sm font-body mt-1">Check back soon</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bundles.map(plan => (
                  <PlanCard key={plan.id} plan={plan} color={color} onInfo={setSheetPlan} onBuy={handleBuy} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Info bottom sheet ── */}
      {sheetPlan && (
        <InfoSheet plan={sheetPlan} color={color} onClose={() => setSheetPlan(null)} />
      )}

      {/* ── Non-refundable warning ── */}
      {nonRefundTarget && (
        <NonRefundableSheet
          session={nonRefundTarget}
          color={color}
          onConfirm={() => {
            const target = nonRefundTarget;
            setNonRefundTarget(null);
            handleSession(target);
          }}
          onDismiss={() => setNonRefundTarget(null)}
        />
      )}

      {/* ── Machine picker sheet (circuit sessions) ── */}
      <MachinePickerSheet
        open={!!pickerSession}
        onClose={() => { setPickerSession(null); setPickerLoading(false); }}
        session={pickerSession}
        slots={pickerSlots}
        studioId={studioId}
        onPick={handlePickSlot}
        loading={pickerLoading}
      />
    </div>
  );
}
