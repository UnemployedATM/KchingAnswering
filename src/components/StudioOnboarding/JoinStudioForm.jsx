import { Key, QrCode, AlertCircle } from 'lucide-react';

/**
 * Token entry form + QR scan trigger.
 * Pure presentational — parent owns state and async submission.
 *
 * Props:
 *  - token: string
 *  - setToken: (string) => void
 *  - onSubmit: (token: string) => void | Promise<void>
 *  - validating: boolean
 *  - tokenError: string | null
 *  - openScanner: () => void
 */
export default function JoinStudioForm({ token, setToken, onSubmit, validating, tokenError, openScanner }) {
  function submit(e) {
    e.preventDefault();
    onSubmit(token);
  }

  return (
    <div className="w-full max-w-xs flex flex-col items-center">
      {/* Token form */}
      <form onSubmit={submit} className="w-full">
        <div
          className="flex items-center gap-3 px-4 rounded-full border"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: tokenError ? '#fecaca' : 'var(--border)',
            height: 56,
          }}
        >
          <Key
            className="w-[18px] h-[18px] shrink-0 rotate-[-45deg]"
            style={{ color: 'var(--muted)' }}
          />
          <input
            type="text"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Invite Token"
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            className="flex-1 bg-transparent outline-none text-sm font-medium"
            style={{ color: 'var(--ink)' }}
            aria-label="Invite token"
          />
          {token && (
            <button
              type="submit"
              disabled={validating}
              className="text-xs font-bold tracking-wider uppercase shrink-0 disabled:opacity-50"
              style={{ color: 'var(--ink)' }}
            >
              {validating ? '…' : 'Go'}
            </button>
          )}
        </div>

        {tokenError && (
          <div className="mt-3 flex items-start gap-2 text-xs px-2" style={{ color: '#b91c1c' }}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{tokenError}</span>
          </div>
        )}
      </form>

      {/* Scan QR pill */}
      <button
        type="button"
        onClick={openScanner}
        className="mt-5 inline-flex items-center gap-2 rounded-full border bg-[var(--surface)] hover:bg-black/5 transition-colors active:scale-[0.97]"
        style={{
          height: 44,
          paddingLeft: 22,
          paddingRight: 22,
          borderColor: 'var(--border)',
          color: 'var(--ink)',
        }}
      >
        <QrCode className="w-4 h-4" />
        <span className="text-sm font-medium">Scan QR code</span>
      </button>
    </div>
  );
}
