import { NavLink } from 'react-router-dom';
import { CalendarDays, Ticket, BookOpen, User } from 'lucide-react';

const tabs = [
  { to: '/discover',    label: 'Discover',  Icon: CalendarDays },
  { to: '/passes',      label: 'My Passes', Icon: Ticket },
  { to: '/bookings',    label: 'Bookings',  Icon: BookOpen },
  { to: '/profile',     label: 'Profile',   Icon: User },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-indigo-600' : 'text-gray-400'
            }`
          }
        >
          <Icon className="h-5 w-5" strokeWidth={1.8} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
