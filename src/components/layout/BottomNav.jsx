import { NavLink, useLocation } from 'react-router-dom';
import { Compass, Ticket, CalendarDays, UserCircle } from 'lucide-react';

const tabs = [
  { to: '/discover',  label: 'Studios',   Icon: Compass,      match: ['/discover', '/studio'] },
  { to: '/passes',    label: 'My Passes', Icon: Ticket,       match: ['/passes'] },
  { to: '/bookings',  label: 'Bookings',  Icon: CalendarDays, match: ['/bookings'] },
  { to: '/profile',   label: 'Profile',   Icon: UserCircle,   match: ['/profile'] },
];

const HIDDEN_ON = ['/checkout', '/booking/success'];

export default function BottomNav() {
  const location = useLocation();

  if (HIDDEN_ON.some(p => location.pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 flex shadow-[0_-1px_12px_rgba(0,0,0,0.06)] z-30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {tabs.map(({ to, label, Icon, match }) => {
        const active = match.some(m => location.pathname.startsWith(m));
        return (
          <NavLink
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium tracking-wide transition-colors duration-200 ${
              active ? 'text-[var(--brand)]' : 'text-gray-400'
            }`}
          >
            {/* Icon with active pill background */}
            <div className={`
              relative flex items-center justify-center
              transition-all duration-200 rounded-xl px-2.5 py-1
              ${active ? 'bg-[var(--brand)]/10 scale-105' : ''}
            `}>
              <Icon
                style={{ width: 22, height: 22 }}
                strokeWidth={active ? 2.2 : 1.8}
              />
              {/* Active dot below icon */}
              {active && (
                <span
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ backgroundColor: 'var(--brand)' }}
                />
              )}
            </div>
            <span className={`mt-0.5 font-body transition-colors duration-200 ${active ? 'font-semibold' : ''}`}>
              {label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
