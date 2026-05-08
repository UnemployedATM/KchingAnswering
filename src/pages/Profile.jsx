import { useAuth } from '@/lib/AuthContext';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User, Shield, Check } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { format } from 'date-fns';

export default function Profile() {
  const { user, client, studios, logout, reloadClient } = useAuth();
  const [phone,   setPhone]   = useState(client?.phone ?? '');
  const [saving,  setSaving]  = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['profile_stats', client?.id],
    queryFn: async () => {
      const [bookingsRes, passesRes] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true })
          .eq('client_id', client.id).eq('status', 'confirmed'),
        supabase.from('client_memberships').select('id', { count: 'exact', head: true })
          .eq('client_id', client.id).eq('status', 'active'),
      ]);
      return { bookings: bookingsRes.count ?? 0, passes: passesRes.count ?? 0 };
    },
    enabled: !!client?.id,
  });

  async function handleSave() {
    try {
      setSaving(true);
      const { error } = await supabase.from('clients').update({ phone }).eq('id', client.id);
      if (error) throw error;
      await reloadClient();
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const fullName   = client?.full_name ?? '';
  const firstName  = fullName.split(' ')[0] ?? '';
  const lastName   = fullName.split(' ').slice(1).join(' ') ?? '';
  const initial    = (fullName || user?.email || '?')[0].toUpperCase();

  // Member since — prefer client.created_at, fall back to auth user.created_at
  const memberSinceDate = client?.created_at ?? user?.created_at;
  const memberSince = memberSinceDate
    ? format(new Date(memberSinceDate), 'MMM yyyy')
    : null;

  return (
    <div className="px-5 pb-10">
      <h1 className="font-serif font-bold text-3xl mb-5" style={{ color: 'var(--ink)' }}>
        Profile & Settings
      </h1>

      {/* ── User card ──────────────────────────────────────── */}
      <div className="card p-6 text-center mb-4">
        {/* Avatar */}
        <div className="flex justify-center mb-3">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold font-serif"
              style={{ backgroundColor: 'var(--ink)' }}
            >
              {initial}
            </div>
          )}
        </div>
        <p className="font-serif font-bold text-xl" style={{ color: 'var(--ink)' }}>
          {client?.full_name ?? user?.email}
        </p>
        {memberSince && (
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Member since {memberSince}
          </p>
        )}
        {stats && stats.passes > 0 && (
          <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: 'var(--ink)' }}>
            ★ Active Pass Holder
          </span>
        )}
      </div>

      {/* ── Personal Information ────────────────────────────── */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5" style={{ color: 'var(--ink)' }} />
          <h2 className="font-serif font-bold text-lg" style={{ color: 'var(--ink)' }}>
            Personal Information
          </h2>
        </div>

        <div className="space-y-4">
          <InputField label="FIRST NAME" value={firstName} readOnly />
          <InputField label="LAST NAME"  value={lastName}  readOnly />
          <InputField
            label="PHONE NUMBER"
            value={phone}
            placeholder="Add phone number"
            onChange={e => setPhone(e.target.value)}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || phone === (client?.phone ?? '')}
          className="btn-black w-full mt-5"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Saving...
            </span>
          ) : (
            <>Save Changes <Check className="w-4 h-4" /></>
          )}
        </button>
      </div>

      {/* ── Account Security ──────────────────────────────── */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5" style={{ color: 'var(--ink)' }} />
          <h2 className="font-serif font-bold text-lg" style={{ color: 'var(--ink)' }}>
            Account Security
          </h2>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--muted)' }}>
              Email Address
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
              {user?.email}
            </p>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            To update your email or password, sign in again via Google or Apple.
          </p>
        </div>
      </div>

      {/* ── My Studios ───────────────────────────────────── */}
      {studios.length > 0 && (
        <div className="mb-6">
          <h2 className="font-serif font-bold text-lg mb-3" style={{ color: 'var(--ink)' }}>
            My Studios
          </h2>
          <div className="space-y-2">
            {studios.map(s => {
              const c = s.primary_color ?? 'var(--ink)';
              return (
                <div key={s.id} className="card flex items-center gap-3 px-4 py-3">
                  {s.logo_url ? (
                    <img src={s.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: c }}
                    >
                      {(s.brand_name || s.name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <p className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--ink)' }}>
                    {s.brand_name || s.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sign out ─────────────────────────────────────── */}
      <button
        onClick={logout}
        className="w-full text-center text-sm font-semibold py-4 rounded-full border border-[var(--border)] active:scale-[0.98] transition-transform"
        style={{ color: 'var(--muted)' }}
      >
        Sign Out
      </button>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, readOnly }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full px-3 py-3 rounded-xl border text-sm font-medium focus:outline-none transition-colors"
        style={{
          backgroundColor: readOnly ? 'var(--subtle)' : 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--ink)',
        }}
      />
    </div>
  );
}
