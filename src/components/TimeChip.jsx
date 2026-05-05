import { format } from 'date-fns';

/**
 * Compact time chip for the daypart session grid in StudioClasses.
 *
 * Props:
 *   session       — class_session row (with class_types and staff nested)
 *   color         — studio accent color
 *   showClassName — if true, shows class type name; otherwise shows instructor
 *   onTap         — callback when user selects this chip
 *   loading       — global loading flag (disables all chips)
 */
export default function TimeChip({ session, color, showClassName, onTap, loading = false }) {
  const spotsLeft  = (session.max_capacity ?? 0) - (session.slots_booked ?? 0);
  const full       = spotsLeft <= 0;
  const urgent     = !full && spotsLeft <= 2;
  const disabled   = full || loading;

  const timeStr    = format(new Date(session.starts_at), 'h:mm a');
  const className  = session.class_types?.name ?? '';
  const instructor = session.staff?.full_name ?? '';
  const secondary  = showClassName ? className : (instructor || className);

  /* Spot indicator color */
  const dotColor = full    ? '#d1d5db'
                 : urgent  ? '#f97316'
                 :           '#22c55e';

  return (
    <button
      onClick={() => !disabled && onTap(session)}
      disabled={disabled}
      className={`
        relative flex flex-col justify-between
        min-w-[82px] px-3 py-2.5 rounded-xl border bg-white
        transition-all duration-150
        ${disabled
          ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
          : 'border-gray-200 shadow-sm active:scale-95 hover:shadow-md hover:border-gray-300 active:border-[var(--brand)]'
        }
      `}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: disabled ? '#d1d5db' : (color ?? '#ffa504'),
      }}
    >
      {/* Time */}
      <p className={`text-sm font-semibold leading-tight ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
        {timeStr}
      </p>

      {/* Class name or instructor */}
      {secondary && (
        <p className={`text-[10px] font-body mt-0.5 leading-tight truncate max-w-[68px] ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
          {secondary}
        </p>
      )}

      {/* Spot indicator */}
      <div className="flex items-center gap-1 mt-1.5">
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <span className={`text-[9px] font-body font-medium ${disabled ? 'text-gray-300' : urgent ? 'text-orange-500' : full ? 'text-gray-400' : 'text-gray-400'}`}>
          {full ? 'Full' : urgent ? `${spotsLeft} left` : ''}
        </span>
      </div>

      {/* Loading overlay */}
      {loading && !disabled && (
        <div className="absolute inset-0 rounded-xl bg-white/60 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full border-2 border-gray-200 border-t-[var(--brand)] animate-spin" />
        </div>
      )}
    </button>
  );
}
