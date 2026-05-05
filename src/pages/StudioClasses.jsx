import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { format, addDays, getHours, differenceInHours, isToday } from 'date-fns';
import { Info, X, ShoppingBag, AlertTriangle, Clock, MapPin, ArrowRight, ChevronLeft } from 'lucide-react';
import MachinePickerSheet from '@/components/MachinePickerSheet';
import { toast } from '@/components/ui/Toast';

/* ─── 14-day ribbon dates (module level, stable reference) ───────────── */
const RIBBON_DATES = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

/* ─── Info bottom-sheet ──────────────────────────────────────────────── */
function InfoSheet({ plan, onClose }) {
  if (!plan) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end animate-[fadeIn_0.2s_ease-out]" onClick={onClose}>
      <div
        className="w-full bg-[var(--surface)] rounded-t-3xl p-6 shadow-2xl animate-[slideUp_0.25s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-serif font-bold text-xl pr-4" style={{ color: 'var(--ink)' }}>{plan.name}</h3>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2 text-sm" style={{ color: 'var(--muted)' }}>
          {plan.credits != null ? (
            <p>🎟️ <span className="font-semibold" style={{ color: 'var(--ink)' }}>{plan.credits} classes</span> included</p>
          ) : (
            <p>♾️ <span className="font-semibold" style={{ color: 'var(--ink)' }}>Unlimited classes</span></p>
          )}
          {plan.validity_days != null && (
            <p>📅 Valid for <span className="font-semibold" style={{ color: 'var(--ink)' }}>{plan.validity_days} days</span></p>
          )}
          {plan.description && <p className="mt-2">{plan.description}</p>}
          <p className="text-lg font-bold mt-3" style={{ color: 'var(--ink)' }}>
            ${(plan.price_cents / 100).toFixed(2)} MXN
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Non-refundable warning sheet ──────────────────────────────────── */
function NonRefundableSheet({ session, onConfirm, onDismiss }) {
  if (!session) return null;
  const timeStr    = format(new Date(session.starts_at), 'h:mm a');
  const dateStr    = format(new Date(session.starts_at), 'EEE, MMM d');
  const hoursUntil = differenceInHours(new Date(session.starts_at), new Date());

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-[fadeIn_0.2s_ease-out]" onClick={onDismiss}>
      <div
        className="w-full bg-[var(--surface)] rounded-t-3xl p-6 shadow-2xl animate-[slideUp_0.25s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>
        </div>
        <h3 className="font-serif font-bold text-xl text-center mb-2" style={{ color: 'var(--ink)' }}>
          Non-Refundable Booking
        </h3>
        <p className="text-sm text-center mb-4" style={{ color: 'var(--muted)' }}>
          This class starts in{' '}
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>
            {hoursUntil < 1 ? 'less than an hour' : `${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`}
          </span>. It cannot be cancelled or refunded after booking.
        </p>
        <div className="rounded-xl px-4 py-3 mb-5" style={{ backgroundColor: 'var(--subtle)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{session.class_types?.name ?? 'Class'}</p>
          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
            <Clock className="w-3 h-3" />
            {dateStr} · {timeStr}
          </p>
        </div>
        <button onClick={onConfirm} className="btn-black w-full mb-3">
          Book Anyway <ArrowRight className="w-4 h-4" />
        </button>
        <button onClick={onDismiss} className="w-full text-center text-sm py-2" style={{ color: 'var(--muted)' }}>
          Choose another time
        </button>
      </div>
    </div>
  );
}

/* ─── Plan card (Figma: Select Membership style) ─────────────────────── */
function PlanCard({ plan, color, isFeatured, onInfo, onBuy }) {
  const price = (plan.price_cents / 100).toFixed(0);
  const period = plan.type === 'monthly' ? '/month' : plan.type === 'annual' ? '/year' : '/session';

  return (
    <div
      className="rounded-2xl p-5 border"
      style={isFeatured ? {
        backgroundColor: 'var(--ink)',
        borderColor: 'var(--ink)',
      } : {
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {isFeatured && (
        <div className="flex items-center gap-1 mb-3">
          <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400">★ Most Popular</span>
        </div>
      )}
      <div className="flex items-start justify-between mb-1">
        <h3
          className="font-serif font-bold text-xl leading-tight"
          style={{ color: isFeatured ? '#fff' : 'var(--ink)' }}
        >
          {plan.name}
        </h3>
        <button onClick={() => onInfo(plan)} className="mt-1">
          <Info className="w-4 h-4" style={{ color: isFeatured ? 'rgba(255,255,255,0.5)' : 'var(--muted)' }} />
        </button>
      </div>
      <div className="flex items-baseline gap-1 mb-3">
        <span
          className="font-bold text-3xl"
          style={{ color: isFeatured ? '#fff' : 'var(--ink)' }}
        >
          ${price}
        </span>
        <span className="text-sm" style={{ color: isFeatured ? 'rgba(255,255,255,0.6)' : 'var(--muted)' }}>
          {period}
        </span>
      </div>
      {plan.description && (
        <p className="text-sm mb-4" style={{ color: isFeatured ? 'rgba(255,255,255,0.65)' : 'var(--muted)' }}>
          {plan.description}
        </p>
      )}

      {/* Features */}
      <div className="space-y-1.5 mb-4">
        {plan.credits != null ? (
          <Feature isFeatured={isFeatured}>{plan.credits} class credits</Feature>
        ) : (
          <Feature isFeatured={isFeatured}>Unlimited classes</Feature>
        )}
        {plan.validity_days != null && (
          <Feature isFeatured={isFeatured}>Valid for {plan.validity_days} days</Feature>
        )}
      </div>

      <button
        onClick={() => onBuy(plan)}
        className={isFeatured ? 'btn-outline w-full' : 'btn-outline w-full'}
        style={isFeatured ? {
          borderColor: 'rgba(255,255,255,0.6)',
          color: '#fff',
        } : {}}
      >
        Select Plan
      </button>
    </div>
  );
}

function Feature({ children, isFeatured }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: isFeatured ? 'rgba(255,255,255,0.2)' : 'var(--subtle)' }}
      >
        <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2 2 4-4" stroke={isFeatured ? '#fff' : 'var(--ink)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="text-sm" style={{ color: isFeatured ? 'rgba(255,255,255,0.8)' : 'var(--ink)' }}>
        {children}
      </span>
    </div>
  );
}

/* ─── Session card (Figma: full-width, class + time + Book) ──────────── */
function SessionCard({ session, onBook, loading }) {
  const startTime = format(new Date(session.starts_at), 'HH:mm');
  const endTime   = session.ends_at
    ? format(new Date(session.ends_at), 'HH:mm')
    : session.class_types?.duration_minutes
      ? format(new Date(new Date(session.starts_at).getTime() + session.class_types.duration_minutes * 60000), 'HH:mm')
      : null;
  const timeLabel  = endTime ? `${startTime} – ${endTime}` : startTime;
  const instructor = session.staff?.full_name;
  const spotsLeft  = (session.max_capacity ?? 0) - (session.slots_booked ?? 0);
  const spotsLabel = session.max_capacity
    ? `${spotsLeft < 0 ? 0 : spotsLeft}/${session.max_capacity} spots`
    : null;

  return (
    <div className="card px-4 py-4 flex items-center gap-4">
      {/* Instructor avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
        style={{ backgroundColor: session.class_types?.color ?? 'var(--muted)' }}
      >
        {instructor?.[0]?.toUpperCase() ?? session.class_types?.name?.[0]?.toUpperCase() ?? 'C'}
      </div>

      {/* Name + instructor */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base leading-tight truncate" style={{ color: 'var(--ink)' }}>
          {session.class_types?.name ?? 'Class'}
        </p>
        {instructor && (
          <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
            {instructor}
          </p>
        )}
      </div>

      {/* Time + spots + button */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <p className="text-xs font-semibold text-right" style={{ color: 'var(--ink)' }}>
          {timeLabel}
        </p>
        {spotsLabel && (
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{spotsLabel}</p>
        )}
        <button
          onClick={() => !loading && onBook(session)}
          disabled={loading || (session.max_capacity != null && spotsLeft <= 0)}
          className="btn-black"
          style={{ padding: '8px 16px', fontSize: 13, minHeight: 36 }}
        >
          Book
        </button>
      </div>
    </div>
  );
}

/* ─── Daypart section ────────────────────────────────────────────────── */
function DaypartSection({ label, icon, sessions, onBook, loading }) {
  if (sessions.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>
        <span>{icon}</span> {label}
      </p>
      <div className="space-y-2.5">
        {sessions.map(s => (
          <SessionCard key={s.id} session={s} onBook={onBook} loading={loading} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */
export default function StudioClasses() {
  const { studioId } = useParams();
  const navigate     = useNavigate();
  const location     = useLocation();
  const { studios }  = useAuth();

  useEffect(() => {
    if (location.state?.expiredMessage) {
      toast.error('Your reservation expired. Please book again.');
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  /* ── State ── */
  const [activeTab,       setActiveTab]       = useState(0);
  const [selectedType,    setSelectedType]    = useState(null);
  const [selectedDate,    setSelectedDate]    = useState(format(new Date(), 'yyyy-MM-dd'));
  const [nonRefundTarget, setNonRefundTarget] = useState(null);
  const [sheetPlan,       setSheetPlan]       = useState(null);
  const [pickerSession,   setPickerSession]   = useState(null);
  const [pickerSlots,     setPickerSlots]     = useState([]);
  const [pickerLoading,   setPickerLoading]   = useState(false);

  const studioInfo = studios.find(s => s.id === studioId);
  const color      = studioInfo?.primary_color ?? 'var(--ink)';

  /* ── Sessions query ── */
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

  /* ── Plans query ── */
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

  /* ── Filter & group sessions ── */
  const classTypeOptions = [
    { id: null, name: 'All' },
    ...[...new Map(sessions.map(s => [s.class_types?.id, s.class_types])).values()].filter(Boolean),
  ];
  const datesWithSessions = new Set(sessions.map(s => format(new Date(s.starts_at), 'yyyy-MM-dd')));

  const dayFiltered = sessions.filter(s => {
    if (format(new Date(s.starts_at), 'yyyy-MM-dd') !== selectedDate) return false;
    if (selectedType && s.class_types?.id !== selectedType) return false;
    return true;
  });
  const morning   = dayFiltered.filter(s => getHours(new Date(s.starts_at)) < 12);
  const afternoon = dayFiltered.filter(s => { const h = getHours(new Date(s.starts_at)); return h >= 12 && h < 17; });
  const evening   = dayFiltered.filter(s => getHours(new Date(s.starts_at)) >= 17);

  const selectedMonth = format(new Date(selectedDate + 'T00:00:00'), 'MMMM').toUpperCase();

  /* ── Booking logic (unchanged) ── */
  function handleBuy(plan) {
    navigate(`/checkout?item_type=plan&item_id=${plan.id}&studio_id=${studioId}`);
  }

  async function createPendingBooking({ class_session_id, slot_id }) {
    const { data: { session: auth } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/book-class`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_session_id, slot_id }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Could not reserve your spot');
    return data;
  }

  async function handleSession(s) {
    setPickerLoading(true);
    try {
      const { data: slots } = await supabase
        .from('session_slots').select('*')
        .eq('class_session_id', s.id).order('position_order', { ascending: true });
      if (slots && slots.length > 0) {
        setPickerSlots(slots);
        setPickerSession(s);
        setPickerLoading(false);
      } else {
        const result = await createPendingBooking({ class_session_id: s.id });
        navigate(`/checkout?booking_id=${result.booking_id}&expires_at=${encodeURIComponent(result.expires_at)}&item_type=session&item_id=${s.id}&studio_id=${studioId}`);
      }
    } catch (err) {
      toast.error(err.message || 'Could not reserve your spot. Please try again.');
      setPickerLoading(false);
    }
  }

  async function handlePickSlot(slot) {
    setPickerLoading(true);
    try {
      const result = await createPendingBooking({ class_session_id: pickerSession.id, slot_id: slot.id });
      setPickerSession(null);
      navigate(`/checkout?booking_id=${result.booking_id}&expires_at=${encodeURIComponent(result.expires_at)}&item_type=session&item_id=${pickerSession.id}&studio_id=${studioId}&slot_id=${slot.id}`);
    } catch (err) {
      if (err.message?.includes('just taken') || err.message?.includes('SLOT_TAKEN')) {
        const { data: fresh } = await supabase.from('session_slots').select('*')
          .eq('class_session_id', pickerSession.id).order('position_order', { ascending: true });
        if (fresh) setPickerSlots(fresh);
        toast.error('That machine slot was just taken — please choose another.');
      } else {
        toast.error(err.message || 'Could not reserve your spot. Please try again.');
      }
      setPickerLoading(false);
    }
  }

  function initiateBooking(s) {
    const hoursUntil = differenceInHours(new Date(s.starts_at), new Date());
    if (hoursUntil >= 0 && hoursUntil < 24) { setNonRefundTarget(s); return; }
    handleSession(s);
  }

  /* ── Render ── */
  return (
    <div className="flex flex-col h-full">

      {/* ── Studio Hero + Tabs (sticky header) ─────────────── */}
      <div className="shrink-0" style={{ backgroundColor: 'var(--bg)' }}>

        {/* Back + Hero card */}
        <div className="px-5 pt-2 pb-4">
          <button
            onClick={() => navigate('/discover')}
            className="flex items-center gap-1 text-sm mb-4"
            style={{ color: 'var(--muted)' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Studios
          </button>

          {/* Studio card */}
          <div className="card p-5">
            {/* Logo image */}
            {studioInfo?.logo_url ? (
              <img
                src={studioInfo.logo_url}
                alt={studioInfo.brand_name || studioInfo.name}
                className="w-full h-40 object-cover rounded-xl mb-4"
              />
            ) : (
              <div
                className="w-full h-36 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: color + '22' }}
              >
                <span
                  className="font-serif font-bold text-6xl"
                  style={{ color: color }}
                >
                  {(studioInfo?.brand_name || studioInfo?.name || '?')[0].toUpperCase()}
                </span>
              </div>
            )}

            {/* Location chip */}
            {studioInfo?.tagline && (
              <div className="flex items-center gap-1.5 mb-2">
                <div className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                  <MapPin className="w-3 h-3" />
                  {studioInfo.tagline}
                </div>
              </div>
            )}

            {/* Studio name */}
            <h1 className="font-serif font-bold text-2xl leading-tight mb-3" style={{ color: 'var(--ink)' }}>
              {studioInfo?.brand_name || studioInfo?.name || 'Studio'}
            </h1>

            {/* Book CTA */}
            <button
              onClick={() => setActiveTab(0)}
              className="btn-black"
              style={{ padding: '12px 20px', fontSize: 14 }}
            >
              Book a Class <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs — outlined pill style */}
        <div className="px-5 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          {['Schedule', 'Packages', 'Bundles'].map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 active:scale-95"
              style={activeTab === i ? {
                backgroundColor: 'var(--ink)',
                borderColor: 'var(--ink)',
                color: '#fff',
              } : {
                backgroundColor: 'transparent',
                borderColor: 'var(--border)',
                color: 'var(--muted)',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ════ Schedule ════ */}
        {activeTab === 0 && (
          <div className="flex flex-col h-full">

            {/* Schedule header: title + month + date strip + filter pills */}
            <div
              className="shrink-0 px-5 pt-3 pb-0 border-b"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              {/* Title + month */}
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-serif font-bold text-2xl" style={{ color: 'var(--ink)' }}>
                  Schedule
                </h2>
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                  {selectedMonth}
                </span>
              </div>

              {/* Date strip — 7 days visible */}
              <div className="overflow-x-auto scrollbar-none mb-3">
                <div className="flex gap-1.5 w-max pb-0.5">
                  {RIBBON_DATES.map(date => {
                    const key    = format(date, 'yyyy-MM-dd');
                    const active = key === selectedDate;
                    const today  = isToday(date);
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDate(key)}
                        className="relative flex flex-col items-center justify-center w-11 h-14 rounded-xl shrink-0 active:scale-95 transition-all duration-200"
                        style={active ? {
                          backgroundColor: 'var(--ink)',
                        } : {
                          backgroundColor: 'transparent',
                        }}
                      >
                        <span
                          className="text-[9px] uppercase font-semibold tracking-wide"
                          style={{ color: active ? 'rgba(255,255,255,0.65)' : 'var(--muted)' }}
                        >
                          {format(date, 'EEE')}
                        </span>
                        <span
                          className="text-sm font-bold mt-0.5"
                          style={{ color: active ? '#fff' : datesWithSessions.has(key) ? 'var(--ink)' : 'var(--muted)' }}
                        >
                          {format(date, 'd')}
                        </span>
                        {today && !active && (
                          <span className="absolute bottom-1.5 w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--ink)' }} />
                        )}
                        {datesWithSessions.has(key) && !active && !today && (
                          <span className="absolute bottom-1.5 w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter pills */}
              {!loadingSessions && classTypeOptions.length > 1 && (
                <div className="overflow-x-auto scrollbar-none pb-3">
                  <div className="flex gap-2 w-max">
                    {classTypeOptions.map(ct => (
                      <button
                        key={ct.id ?? 'all'}
                        onClick={() => setSelectedType(ct.id)}
                        className="shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 active:scale-95"
                        style={selectedType === ct.id ? {
                          backgroundColor: 'var(--ink)',
                          borderColor: 'var(--ink)',
                          color: '#fff',
                        } : {
                          backgroundColor: 'transparent',
                          borderColor: 'var(--border)',
                          color: 'var(--muted)',
                        }}
                      >
                        {ct.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
              {loadingSessions ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" />)}
                </div>
              ) : dayFiltered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-4xl mb-3">🧘</p>
                  <p className="font-serif font-bold text-lg" style={{ color: 'var(--ink)' }}>No classes today</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Try selecting another date</p>
                </div>
              ) : (
                <>
                  <DaypartSection label="Morning"   icon="☀️"  sessions={morning}   onBook={initiateBooking} loading={pickerLoading} />
                  <DaypartSection label="Afternoon" icon="🌤"  sessions={afternoon} onBook={initiateBooking} loading={pickerLoading} />
                  <DaypartSection label="Evening"   icon="🌙"  sessions={evening}   onBook={initiateBooking} loading={pickerLoading} />
                </>
              )}
            </div>
          </div>
        )}

        {/* ════ Packages ════ */}
        {activeTab === 1 && (
          <div className="px-5 pt-5 pb-6 space-y-3">
            {loadingPlans ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl animate-pulse" />)
            ) : packages.length === 0 ? (
              <EmptyTab icon="🎟️" title="No class packs available" />
            ) : (
              packages.map((plan, i) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  color={color}
                  isFeatured={i === 1 && packages.length >= 3}
                  onInfo={setSheetPlan}
                  onBuy={handleBuy}
                />
              ))
            )}
          </div>
        )}

        {/* ════ Bundles ════ */}
        {activeTab === 2 && (
          <div className="px-5 pt-5 pb-6 space-y-3">
            {loadingPlans ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl animate-pulse" />)
            ) : bundles.length === 0 ? (
              <EmptyTab icon="📦" title="No bundles available" />
            ) : (
              bundles.map((plan, i) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  color={color}
                  isFeatured={i === 1 && bundles.length >= 3}
                  onInfo={setSheetPlan}
                  onBuy={handleBuy}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Sheets ─────────────────────────────────────────── */}
      {sheetPlan && <InfoSheet plan={sheetPlan} onClose={() => setSheetPlan(null)} />}

      {nonRefundTarget && (
        <NonRefundableSheet
          session={nonRefundTarget}
          onConfirm={() => { const t = nonRefundTarget; setNonRefundTarget(null); handleSession(t); }}
          onDismiss={() => setNonRefundTarget(null)}
        />
      )}

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

function EmptyTab({ icon, title }) {
  return (
    <div className="text-center py-20">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="font-serif font-bold text-lg" style={{ color: 'var(--ink)' }}>{title}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Check back soon</p>
    </div>
  );
}
