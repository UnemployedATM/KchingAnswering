import { useAuth } from '@/lib/AuthContext';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LogOut, Check, ChevronRight, Star, Ticket, CalendarDays } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export default function Profile() {
  const { user, client, studios, logout, reloadClient } = useAuth();
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [saving, setSaving] = useState(false);

  // Quick stats
  const { data: stats } = useQuery({
    queryKey: ['profile_stats', client?.id],
    queryFn: async () => {
      const [bookingsRes, passesRes, ratingsRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .eq('status', 'confirmed'),
        supabase
          .from('client_memberships')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .eq('status', 'active'),
        supabase
          .from('session_ratings')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', client.id),
      ]);
      return {
        bookings: bookingsRes.count ?? 0,
        passes:   passesRes.count ?? 0,
        ratings:  ratingsRes.count ?? 0,
      };
    },
    enabled: !!client?.id,
  });

  async function handleSave() {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('clients')
        .update({ phone })
        .eq('id', client.id);
      if (error) throw error;
      await reloadClient();
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const initial = (client?.full_name || user?.email || '?')[0].toUpperCase();

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

      {/* Avatar + name */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: 'var(--brand-light, #fff3d6)' }}>
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="w-16 h-16 rounded-2xl object-cover"
            />
          ) : (
            <span className="text-2xl font-bold" style={{ color: 'var(--brand)' }}>{initial}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-lg truncate">
            {client?.full_name ?? user?.email}
          </p>
          <p className="text-sm text-gray-500 truncate">{user?.email}</p>
          {studios.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {studios.length} {studios.length === 1 ? 'studio' : 'studios'} joined
            </p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard icon={CalendarDays} label="Bookings" value={stats.bookings} color="#ffa504" />
          <StatCard icon={Ticket}       label="Active passes" value={stats.passes} color="#6366f1" />
          <StatCard icon={Star}         label="Ratings" value={stats.ratings} color="#eab308" />
        </div>
      )}

      {/* Editable fields */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Add phone number"
            className="mt-1 w-full text-sm text-gray-800 border-0 border-b border-gray-200 pb-1 focus:outline-none focus:border-[#ffa504] bg-transparent"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || phone === (client?.phone ?? '')}
        className="w-full text-white rounded-xl py-3.5 font-semibold text-sm shadow-md active:scale-[0.98] transition-transform disabled:opacity-40 mb-6"
        style={{ backgroundColor: 'var(--brand)' }}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Saving...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            Save Changes
          </span>
        )}
      </button>

      {/* Studios list */}
      {studios.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            My Studios
          </p>
          <div className="space-y-2">
            {studios.map(s => {
              const c = s.primary_color ?? '#ffa504';
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3"
                >
                  {s.logo_url ? (
                    <img src={s.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: c }}
                    >
                      {(s.brand_name || s.name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <p className="text-sm font-medium text-gray-700 flex-1 truncate">
                    {s.brand_name || s.name}
                  </p>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sign out */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 text-red-500 text-sm font-medium py-3 rounded-2xl border border-red-100 bg-red-50 active:scale-[0.98] transition-transform"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
      <div className="w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400 font-medium">{label}</p>
    </div>
  );
}
