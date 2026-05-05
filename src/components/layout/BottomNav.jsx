import { NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, Grid2x2, User } from 'lucide-react';

const tabs = [
  { to: '/discover',  Icon: Home,      match: ['/discover', '/studio'] },
  { to: '/bookings',  Icon: Calendar,  match: ['/bookings'] },
  { to: '/passes',    Icon: Grid2x2,   match: ['/passes'] },
  { to: '/profile',   Icon: User,      match: ['/profile'] },
];

const HIDDEN_ON = ['/checkout', '/booking/success', '/auth'];

export default function BottomNav() {
  const location = useLocation();

  if (HIDDEN_ON.some(p => location.pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-6 py-2 bg-[var(--bg)] border-t border-[var(--border)] z-30"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
    >
      {tabs.map(({ to, Icon, match }) => {
        const active = match.some(m => location.pathname.startsWith(m));
        return (
          <NavLink
            key={to}
            to={to}
            className="flex items-center justify-center w-12 h-12"
            aria-label={to.replace('/', '')}
          >
            {active ? (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
                style={{ backgroundColor: 'var(--ink)' }}
              >
                <Icon className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
            ) : (
              <div className="w-10 h-10 flex items-center justify-center">
                <Icon className="w-5 h-5" style={{ color: 'var(--muted)' }} strokeWidth={1.8} />
              </div>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
