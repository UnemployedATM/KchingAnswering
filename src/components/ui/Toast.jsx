import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/* ─── State manager (works outside React) ──────────────────────────────── */
let listeners = [];
let toasts = [];
let counter = 0;

function emit() { listeners.forEach(fn => fn([...toasts])); }

export function toast(message, { type = 'info', duration = 3500 } = {}) {
  const id = ++counter;
  toasts = [{ id, message, type, exiting: false }, ...toasts].slice(0, 5);
  emit();
  setTimeout(() => dismissToast(id), duration);
  return id;
}
toast.success = (msg, opts) => toast(msg, { ...opts, type: 'success' });
toast.error   = (msg, opts) => toast(msg, { ...opts, type: 'error', duration: 5000 });
toast.info    = (msg, opts) => toast(msg, { ...opts, type: 'info' });

function dismissToast(id) {
  toasts = toasts.map(t => t.id === id ? { ...t, exiting: true } : t);
  emit();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    emit();
  }, 280);
}

/* ─── Icons ─────────────────────────────────────────────────────────────── */
const icons = {
  success: <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />,
  error:   <AlertCircle  className="w-4 h-4 text-red-500 shrink-0" />,
  info:    <Info          className="w-4 h-4 text-blue-500 shrink-0" />,
};

const bgColors = {
  success: 'bg-green-50 border-green-100',
  error:   'bg-red-50 border-red-100',
  info:    'bg-white border-gray-100',
};

/* ─── Toast container — render in App ──────────────────────────────────── */
export function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => { listeners = listeners.filter(l => l !== setItems); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}
    >
      {items.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto mx-4 mb-2 flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-lg backdrop-blur-sm max-w-sm w-full ${bgColors[t.type]} ${
            t.exiting ? 'animate-[toastOut_0.28s_ease-in_forwards]' : 'animate-[toastIn_0.28s_ease-out]'
          }`}
        >
          {icons[t.type]}
          <p className="text-sm text-gray-800 font-medium flex-1">{t.message}</p>
          <button
            onClick={() => dismissToast(t.id)}
            className="text-gray-400 hover:text-gray-600 shrink-0 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
