import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, isToday, isTomorrow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

function dayLabel(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d))    return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEEE, MMM d');
}

export default function Discover() {
  const navigate = useNavigate();
  const { client, studio } = useAuth();

  if (client !== undefined && !client?.studio_id) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Join a studio first</h2>
        <p className="text-sm text-gray-500">
          Ask your studio owner for an invite link to get started.
        </p>
      </div>
    );
  }

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['client_sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*, class_types ( id, name, color, duration_minutes ), staff ( id, full_name )')
        .eq('status', 'scheduled')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Group by date
  const grouped = sessions.reduce((acc, s) => {
    const day = format(new Date(s.starts_at), 'yyyy-MM-dd');
    if (!acc[day]) acc[day] = [];
    acc[day].push(s);
    return acc;
  }, {});

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {studio?.brand_name || studio?.name || 'Discover'}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {studio?.tagline || 'Upcoming classes at your studio'}
      </p>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && sessions.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🧘</p>
          <p className="font-medium">No upcoming classes</p>
          <p className="text-sm mt-1">Check back soon</p>
        </div>
      )}

      {Object.entries(grouped).map(([day, daySessions]) => (
        <div key={day} className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {dayLabel(day)}
          </p>
          <div className="space-y-3">
            {daySessions.map((s) => {
              const spotsLeft = s.max_capacity - s.slots_booked;
              const full = spotsLeft <= 0;
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/book/${s.id}`)}
                  disabled={full}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: s.class_types?.color ?? '#6366f1' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 truncate">
                          {s.class_types?.name ?? 'Class'}
                        </p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                          full
                            ? 'bg-gray-100 text-gray-400'
                            : spotsLeft <= 3
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-green-50 text-green-600'
                        }`}>
                          {full ? 'Full' : `${spotsLeft} left`}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {format(new Date(s.starts_at), 'h:mm a')} · {s.class_types?.duration_minutes ?? 60} min
                        {s.staff?.full_name ? ` · ${s.staff.full_name}` : ''}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
