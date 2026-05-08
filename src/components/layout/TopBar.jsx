import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu, Bell, X, Home, Calendar, CreditCard, User, LogOut, BellOff } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, isPast, differenceInHours } from 'date-fns';

const NAV_ITEMS = [
  { label: 'Studios',  to: '/discover',  Icon: Home },
  { label: 'Bookings', to: '/bookings',  Icon: Calendar },
  { label: 'My Passes',to: '/passes',    Icon: CreditCard },
  { label: 'Profile',  to: '/profile',   Icon: User },
];

export default function TopBar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const navigate   = useNavigate();
  const location   = useLocation();
  const { logout, client } = useAuth();

  /* ── Lightweight notifications: derived from upcoming + unrated bookings ── */
  const { data: notifications = [] } = useQuery({
    queryKey: ['topbar_notifications', client?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, status, class_sessions(starts_at, class_types(name), studios(brand_name, name)), session_ratings(stars)')
        .eq('client_id', client.id)
        .in('status', ['confirmed'])
        .order('created_at', { ascending: false })
        .limit(20);
      const list = data ?? [];
      const items = [];
      for (const b of list) {
        const startsAt = b.class_sessions?.starts_at;
        if (!startsAt) continue;
        const date = new Date(startsAt);
        const className = b.class_sessions?.class_types?.name ?? 'Class';
        const studio = b.class_sessions?.studios?.brand_name || b.class_sessions?.studios?.name || '';

        // Soon: starts in next 24h
        if (!isPast(date) && differenceInHours(date, new Date()) < 24) {
          items.push({
            id: `soon-${b.id}`,
            kind: 'reminder',
            title: `${className} starts soon`,
            body: `${studio} · ${format(date, 'EEE MMM d, h:mm a')}`,
            ts: date,
          });
        }
        // Unrated: in the past, no rating yet
        const rating = Array.isArray(b.session_ratings) ? b.session_ratings[0] : b.session_ratings;
        if (isPast(date) && !rating) {
          items.push({
            id: `rate-${b.id}`,
            kind: 'rate',
            title: `Rate your ${className} session`,
            body: `${studio} · ${format(date, 'MMM d')}`,
            ts: date,
          });
        }
      }
      return items.slice(0, 8);
    },
    enabled: !!client?.id,
    staleTime: 60_000,
  });

  function go(to) {
    setDrawerOpen(false);
    setNotifOpen(false);
    navigate(to);
  }

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-5 py-3 bg-[var(--bg)] shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-[22px] h-[22px]" style={{ color: 'var(--ink)' }} />
        </button>

        <span className="font-serif italic font-bold text-xl tracking-tight select-none" style={{ color: 'var(--ink)' }}>
          B-COOL
        </span>

        <button
          onClick={() => setNotifOpen(true)}
          className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-[22px] h-[22px]" style={{ color: 'var(--ink)' }} />
          {notifications.length > 0 && (
            <span
              className="absolute top-1.5 right-2 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
              style={{ backgroundColor: '#ef4444' }}
            >
              {notifications.length}
            </span>
          )}
        </button>
      </header>

      {/* ── Drawer backdrop ─────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Slide-in drawer ─────────────────────────────────────── */}
      <div
        className={`fixed top-0 left-0 h-full w-72 z-50 flex flex-col bg-[var(--bg)] shadow-2xl transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <span className="font-serif italic font-bold text-xl" style={{ color: 'var(--ink)' }}>
            B-COOL
          </span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'var(--ink)' }} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ label, to, Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <button
                key={to}
                onClick={() => go(to)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--ink)] text-white'
                    : 'text-[var(--ink)] hover:bg-black/5'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-8 border-t border-[var(--border)] pt-4">
          <button
            onClick={() => { setDrawerOpen(false); logout(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Notifications sheet ─────────────────────────────────── */}
      {notifOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 animate-[fadeIn_0.2s_ease-out]"
            onClick={() => setNotifOpen(false)}
          />
          <div
            className="fixed top-0 right-0 h-full w-80 max-w-[88vw] z-50 flex flex-col bg-[var(--bg)] shadow-2xl animate-[slideInRight_0.25s_ease-out]"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <span className="font-serif font-bold text-lg" style={{ color: 'var(--ink)' }}>
                Notifications
              </span>
              <button
                onClick={() => setNotifOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" style={{ color: 'var(--ink)' }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-6">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--subtle)' }}>
                    <BellOff className="w-7 h-7" style={{ color: 'var(--muted)' }} />
                  </div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>You're all caught up</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    Reminders and rating prompts will show up here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {notifications.map(n => (
                    <li key={n.id}>
                      <button
                        onClick={() => go(n.kind === 'rate' ? '/bookings' : '/bookings')}
                        className="w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-black/5 transition-colors"
                      >
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            backgroundColor: n.kind === 'rate' ? '#FEF3C7' : '#DBEAFE',
                          }}
                        >
                          {n.kind === 'rate' ? '★' : '⏱'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
                            {n.title}
                          </p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                            {n.body}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
