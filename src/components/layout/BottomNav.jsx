import { NavLink } from 'react-router-dom';
import LordIcon from '@/components/ui/LordIcon';

const tabs = [
  {
    to: '/discover',
    label: 'Studios',
    icon: 'https://cdn.lordicon.com/msoeawqm.json',
  },
  {
    to: '/passes',
    label: 'My Passes',
    icon: 'https://cdn.lordicon.com/sbiheqdr.json',
  },
  {
    to: '/bookings',
    label: 'Bookings',
    icon: 'https://cdn.lordicon.com/ogkflacg.json',
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: 'https://cdn.lordicon.com/bhfjlmgs.json',
  },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex shadow-[0_-1px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {tabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium tracking-wide transition-colors ${
              isActive ? 'text-[#3f6840]' : 'text-gray-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <LordIcon
                src={icon}
                trigger={isActive ? 'loop' : 'hover'}
                size={22}
                primary={isActive ? '#3f6840' : '#9ca3af'}
                secondary={isActive ? '#7da87b' : '#d1d5db'}
              />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
