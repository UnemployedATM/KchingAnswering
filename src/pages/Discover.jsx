import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { ChevronRight } from 'lucide-react';

export default function Discover() {
  const navigate = useNavigate();
  const { studios, loading } = useAuth();

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (studios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <div className="text-5xl mb-4">🏠</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No studios yet</h2>
        <p className="text-sm text-gray-500">
          Scan your studio's QR code or open their invite link to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Studios</h1>
      <p className="text-sm text-gray-500 mb-6">
        {studios.length === 1 ? '1 studio' : `${studios.length} studios`}
      </p>

      <div className="space-y-3">
        {studios.map((s) => {
          const initial = (s.brand_name || s.name || '?')[0].toUpperCase();
          const color   = s.primary_color ?? '#3f6840';

          return (
            <button
              key={s.id}
              onClick={() => navigate(`/studio/${s.id}`)}
              className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform"
            >
              {/* Color accent bar */}
              <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />

              {/* Logo or initials */}
              {s.logo_url ? (
                <img
                  src={s.logo_url}
                  alt={s.brand_name || s.name}
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {initial}
                </div>
              )}

              {/* Studio info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {s.brand_name || s.name}
                </p>
                {s.tagline && (
                  <p className="text-sm text-gray-500 truncate">{s.tagline}</p>
                )}
              </div>

              <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
