import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, CalendarPlus, ListChecks } from 'lucide-react';

export default function BookingSuccess() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();

  const paymentIntentId = params.get('payment_intent_id');
  const item_type       = params.get('item_type');
  const studio_id       = params.get('studio_id');

  const [booking, setBooking] = useState(null);
  const [studio,  setStudio]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Fetch studio name
      if (studio_id) {
        const { data } = await supabase
          .from('studios')
          .select('name, brand_name, primary_color')
          .eq('id', studio_id)
          .single();
        setStudio(data);
      }

      // Fetch the booking linked to this payment_intent if available
      if (paymentIntentId) {
        const { data } = await supabase
          .from('bookings')
          .select('*, class_sessions ( starts_at, class_types ( name ) )')
          .eq('payment_intent_id', paymentIntentId)
          .maybeSingle();
        setBooking(data);
      }

      setLoading(false);
    }
    load();
  }, [paymentIntentId, studio_id]);

  const color = studio?.primary_color ?? '#3f6840';
  const studioName = studio?.brand_name || studio?.name || 'your studio';

  // Try to get session info from booking
  const sessionName = booking?.class_sessions?.class_types?.name;
  const sessionDate = booking?.class_sessions?.starts_at
    ? new Date(booking.class_sessions.starts_at)
    : null;

  function handleAddToCalendar() {
    if (!sessionDate || !sessionName) return;
    // Generate .ics file for web and Capacitor apps
    const start = sessionDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end   = new Date(sessionDate.getTime() + 60 * 60 * 1000)
      .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${sessionName} — ${studioName}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'class.ics';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-center px-6 pt-16 pb-12 text-center">
      {/* Animated checkmark */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-[pop_0.4s_ease-out]"
        style={{ backgroundColor: `${color}20` }}
      >
        <CheckCircle2 className="w-14 h-14" style={{ color }} />
      </div>

      {loading ? (
        <div className="space-y-2 w-full max-w-xs">
          <div className="h-6 rounded-xl bg-gray-100 animate-pulse mx-auto w-3/4" />
          <div className="h-4 rounded-xl bg-gray-100 animate-pulse mx-auto w-1/2" />
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're all set! 🎉</h1>
          {sessionName ? (
            <p className="text-sm text-gray-500 mb-1">
              <span className="font-medium text-gray-700">{sessionName}</span> at {studioName}
            </p>
          ) : item_type === 'plan' ? (
            <p className="text-sm text-gray-500 mb-1">
              Your pass for <span className="font-medium text-gray-700">{studioName}</span> is ready to use
            </p>
          ) : (
            <p className="text-sm text-gray-500 mb-1">
              Your booking at <span className="font-medium text-gray-700">{studioName}</span> is confirmed
            </p>
          )}

          {sessionDate && (
            <p className="text-xs text-gray-400 mb-8">
              {sessionDate.toLocaleDateString('es-MX', {
                weekday: 'long',
                month:   'long',
                day:     'numeric',
                hour:    '2-digit',
                minute:  '2-digit',
              })}
            </p>
          )}
          {!sessionDate && <div className="mb-8" />}
        </>
      )}

      <div className="flex flex-col gap-3 w-full max-w-sm">
        {sessionDate && (
          <button
            onClick={handleAddToCalendar}
            className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-700 rounded-2xl py-3.5 font-medium text-sm active:scale-[0.98] transition-transform"
          >
            <CalendarPlus className="w-4 h-4" />
            Add to Calendar
          </button>
        )}

        <button
          onClick={() => navigate('/bookings', { replace: true })}
          className="flex items-center justify-center gap-2 w-full text-white rounded-2xl py-3.5 font-semibold text-sm shadow-md active:scale-[0.98] transition-transform"
          style={{ backgroundColor: color }}
        >
          <ListChecks className="w-4 h-4" />
          See my schedule
        </button>
      </div>

      {/* Soft note */}
      <p className="text-xs text-gray-400 mt-8 max-w-xs">
        A confirmation has been recorded. Check your bookings tab for details.
      </p>
    </div>
  );
}
