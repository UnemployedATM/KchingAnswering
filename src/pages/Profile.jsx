import { useAuth } from '@/lib/AuthContext';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogOut, User } from 'lucide-react';

export default function Profile() {
  const { user, client, logout, reloadClient } = useAuth();
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      const { error } = await supabase
        .from('clients')
        .update({ phone })
        .eq('id', client.id);
      if (error) throw error;
      await reloadClient();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

      {/* Avatar + name */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
          <User className="h-8 w-8 text-indigo-400" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg">{client?.full_name ?? user?.email}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>

      {/* Editable fields */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Add phone number"
            className="mt-1 w-full text-sm text-gray-800 border-0 border-b border-gray-200 pb-1 focus:outline-none focus:border-indigo-400 bg-transparent"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-indigo-600 text-white rounded-2xl py-3.5 font-semibold text-sm shadow-md active:scale-[0.98] transition-transform disabled:opacity-50 mb-4"
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
      </button>

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
