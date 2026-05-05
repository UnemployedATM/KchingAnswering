import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

export default function Auth() {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(null);

  async function handle(provider, fn) {
    try {
      setError(null);
      setLoading(provider);
      await fn();
    } catch (e) {
      setError(e.message ?? 'Sign in failed. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative min-h-full flex flex-col overflow-hidden">
      {/* Desert background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #B8C5CD 0%, #C9B89A 55%, #C4A87A 100%)',
        }}
      />

      {/* Sand dune shape at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-64 opacity-60"
        style={{
          background: 'radial-gradient(ellipse 140% 80% at 50% 120%, #C4A060 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center flex-1 px-8 py-16">
        {/* Wordmark */}
        <h1
          className="font-serif italic font-bold mb-16 select-none"
          style={{ fontSize: 52, color: '#1A1612', letterSpacing: '-0.01em' }}
        >
          B-Cool
        </h1>

        {/* Sign-in area */}
        <div className="w-full max-w-xs space-y-3">
          {/* Google */}
          <button
            onClick={() => handle('google', signInWithGoogle)}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-full bg-white/80 backdrop-blur-sm border border-white/60 text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-transform"
            style={{ color: '#1A1612' }}
          >
            {loading === 'google' ? (
              <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          {/* Apple */}
          <button
            onClick={() => handle('apple', signInWithApple)}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-full text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-transform"
            style={{ backgroundColor: '#1A1612', color: '#ffffff' }}
          >
            {loading === 'apple' ? (
              <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <AppleIcon />
            )}
            Continue with Apple
          </button>
        </div>

        {error && (
          <p className="mt-5 text-sm text-red-800 bg-red-100/80 rounded-xl px-4 py-2 text-center max-w-xs">
            {error}
          </p>
        )}

        {/* Footer links */}
        <div className="mt-10 flex items-center gap-6 text-xs font-medium" style={{ color: '#1A1612' }}>
          <button className="opacity-70 hover:opacity-100 transition-opacity">Request Access</button>
          <span className="opacity-30">|</span>
          <button className="opacity-70 hover:opacity-100 transition-opacity">Support</button>
        </div>
      </div>

      {/* Legal */}
      <p className="relative text-center text-xs pb-8 px-8 opacity-60" style={{ color: '#1A1612' }}>
        By continuing you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}
