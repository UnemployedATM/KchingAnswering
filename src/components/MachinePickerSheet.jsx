import { X } from 'lucide-react';

const MACHINE_EMOJI = {
  'Rollershaper':  '🔄',
  'Treadmill':     '🏃',
  'Recline Bike':  '🚴',
};

function emoji(name) {
  return MACHINE_EMOJI[name] ?? '⚙️';
}

export default function MachinePickerSheet({ open, onClose, session, slots, studioId, onPick, loading = false }) {
  if (!open || !session) return null;

  const sortedSlots = [...slots].sort((a, b) => a.position_order - b.position_order);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl"
        style={{
          animation: 'slideUp 0.25s ease-out',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900 text-base">Elige tu máquina de inicio</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {session.class_types?.name} · {new Date(session.starts_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slot list */}
        <div className="px-4 py-3 space-y-2.5 pb-8">
          {sortedSlots.map((slot) => {
            const isLocked = !slot.is_booked
              && slot.locked_until
              && new Date(slot.locked_until) > new Date();
            const unavailable = slot.is_booked || isLocked;

            return (
            <div
              key={slot.id}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 transition-all ${
                unavailable
                  ? 'bg-gray-50 border-gray-100 opacity-60'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}
            >
              {/* Machine info */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                  unavailable ? 'bg-gray-100' : 'bg-green-50'
                }`}>
                  {emoji(slot.start_machine)}
                </div>
                <div>
                  <p className={`font-medium text-sm ${unavailable ? 'text-gray-400' : 'text-gray-900'}`}>
                    {slot.start_machine}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    luego {emoji(slot.end_machine)} {slot.end_machine}
                  </p>
                </div>
              </div>

              {/* Action */}
              {unavailable ? (
                <span className={`text-xs font-medium rounded-lg px-3 py-1.5 ${
                  isLocked
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-gray-400 bg-gray-100'
                }`}>
                  {isLocked ? 'Reservado' : 'Ocupado'}
                </span>
              ) : (
                <button
                  onClick={() => !loading && onPick(slot)}
                  disabled={loading}
                  className="text-sm font-semibold text-white rounded-xl px-4 py-2 active:scale-95 transition-transform shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--brand)' }}
                >
                  {loading ? '…' : 'Elegir'}
                </button>
              )}
            </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
