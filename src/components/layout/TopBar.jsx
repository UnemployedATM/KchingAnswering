import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Bell, X, Home, Calendar, CreditCard, User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const NAV_ITEMS = [
  { label: 'Studios',  to: '/discover',  Icon: Home },
  { label: 'Bookings', to: '/bookings',  Icon: Calendar },
  { label: 'My Passes',to: '/passes',    Icon: CreditCard },
  { label: 'Profile',  to: '/profile',   Icon: User },
];

export default function TopBar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate   = useNavigate();
  const location   = useLocation();
  const { logout } = useAuth();

  function go(to) {
    setDrawerOpen(false);
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
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-[22px] h-[22px]" style={{ color: 'var(--ink)' }} />
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
    </>
  );
}
