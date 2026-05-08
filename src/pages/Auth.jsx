import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Key, QrCode, X, ArrowLeft, AlertCircle, Camera } from 'lucide-react';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function Auth() {
  const { signInWithGoogle, signInWithApple } = useAuth();

  // Two-step flow: welcome (token entry / scan) → signin (OAuth)
  const [step, setStep] = useState('welcome');                 // 'welcome' | 'signin'
  const [token, setToken] = useState('');
  const [studio, setStudio] = useState(null);                   // validated studio
  const [validating, setValidating] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(null);

  // Auto-pick up a token already stashed by App.jsx (?studio=… deep link)
  useEffect(() => {
    const stashed = localStorage.getItem('pending_studio_id');
    if (stashed && UUID_RE.test(stashed) && !studio) {
      setToken(stashed);
      validateAndContinue(stashed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function validateAndContinue(rawToken) {
    const t = (rawToken ?? '').trim();
    if (!t) return;
    setValidating(true);
    setTokenError(null);
    try {
      if (!UUID_RE.test(t)) {
        throw new Error("That token doesn't look right. Ask your studio for the link or QR code.");
      }
      const { data, error } = await supabase
        .from('studios')
        .select('id, name, brand_name, primary_color, logo_url, tagline')
        .eq('id', t)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No studio found for that token. Double-check with your studio.");

      // Persist so the post-OAuth handler in App.jsx can join the studio.
      localStorage.setItem('pending_studio_id', data.id);
      setStudio(data);
      setStep('signin');
    } catch (e) {
      setTokenError(e.message ?? 'Invalid token');
    } finally {
      setValidating(false);
    }
  }

  async function handleProvider(provider, fn) {
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

  function handleQrResult(text) {
    setScannerOpen(false);
    let extracted = (text ?? '').trim();
    // QR codes may encode a deep link or a URL with ?studio=<id>; pull the id out if so.
    try {
      const url = new URL(extracted);
      const param = url.searchParams.get('studio') ?? url.searchParams.get('token');
      if (param) extracted = param;
    } catch { /* not a URL — treat as raw token */ }
    setToken(extracted);
    validateAndContinue(extracted);
  }

  return (
    <div className="min-h-full flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {step === 'welcome' && (
        <WelcomeStep
          token={token}
          setToken={setToken}
          onSubmit={validateAndContinue}
          validating={validating}
          tokenError={tokenError}
          openScanner={() => setScannerOpen(true)}
        />
      )}

      {step === 'signin' && studio && (
        <SignInStep
          studio={studio}
          onGoogle={() => handleProvider('google', signInWithGoogle)}
          onApple={() => handleProvider('apple', signInWithApple)}
          loading={loading}
          error={error}
          onBack={() => {
            setStep('welcome');
            setStudio(null);
            localStorage.removeItem('pending_studio_id');
          }}
        />
      )}

      {scannerOpen && (
        <QrScannerSheet
          onClose={() => setScannerOpen(false)}
          onResult={handleQrResult}
        />
      )}
    </div>
  );
}

/* ─── Step 1: Welcome / token entry ─────────────────────────────────────── */
function WelcomeStep({ token, setToken, onSubmit, validating, tokenError, openScanner }) {
  function submit(e) {
    e.preventDefault();
    onSubmit(token);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 w-full">
      {/* Wordmark */}
      <h1
        className="font-serif italic font-bold mb-12 select-none text-center"
        style={{ fontSize: 52, color: 'var(--ink)', letterSpacing: '-0.01em' }}
      >
        B-Cool
      </h1>

      {/* Token form */}
      <form onSubmit={submit} className="w-full max-w-xs">
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

      {/* Footer links */}
      <div className="mt-10 flex items-center gap-5 text-xs font-medium">
        <a
          href="mailto:hello@bcool.app?subject=Request%20access"
          className="opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--ink)' }}
        >
          Request Access
        </a>
        <span className="opacity-30">·</span>
        <a
          href="mailto:support@bcool.app"
          className="opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--ink)' }}
        >
          Support
        </a>
      </div>
    </div>
  );
}

/* ─── Step 2: OAuth sign-in (after token validated) ─────────────────────── */
function SignInStep({ studio, onGoogle, onApple, loading, error, onBack }) {
  const studioName = studio.brand_name || studio.name;

  return (
    <div className="flex-1 flex flex-col px-6 pt-3 pb-12">
      {/* Back */}
      <button
        onClick={onBack}
        className="self-start w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        aria-label="Back"
      >
        <ArrowLeft className="w-5 h-5" style={{ color: 'var(--ink)' }} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center max-w-sm w-full mx-auto">
        {/* Studio context */}
        {studio.logo_url ? (
          <img src={studio.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover mb-4" />
        ) : (
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-serif font-bold text-2xl mb-4"
            style={{ backgroundColor: studio.primary_color ?? 'var(--ink)' }}
          >
            {(studioName ?? '?')[0].toUpperCase()}
          </div>
        )}

        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--muted)' }}>
          You're joining
        </p>
        <h2 className="font-serif font-bold text-3xl text-center mb-1" style={{ color: 'var(--ink)' }}>
          {studioName}
        </h2>
        {studio.tagline ? (
          <p className="text-sm text-center mb-8" style={{ color: 'var(--muted)' }}>
            {studio.tagline}
          </p>
        ) : (
          <div className="mb-8" />
        )}

        {/* Sign-in buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={onGoogle}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-full bg-[var(--surface)] border text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-transform"
            style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
          >
            {loading === 'google' ? (
              <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          <button
            onClick={onApple}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-full text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-transform"
            style={{ backgroundColor: 'var(--ink)', color: '#ffffff' }}
          >
            {loading === 'apple' ? (
              <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <AppleIcon />
            )}
            Continue with Apple
          </button>
        </div>

        <p className="text-xs mt-6 text-center" style={{ color: 'var(--muted)' }}>
          Continue to create or sign in to your B-Cool account.
        </p>

        {error && (
          <p className="mt-4 text-sm rounded-xl px-4 py-2 text-center max-w-xs" style={{ color: '#b91c1c', backgroundColor: '#fef2f2' }}>
            {error}
          </p>
        )}
      </div>

      {/* Legal */}
      <p className="text-center text-xs px-4 opacity-60" style={{ color: 'var(--ink)' }}>
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

/* ─── QR Scanner sheet ──────────────────────────────────────────────────── */
function QrScannerSheet({ onClose, onResult }) {
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('starting'); // 'starting' | 'scanning' | 'unsupported' | 'denied' | 'noaccess'
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // Check API support
      const hasDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
      if (!hasDetector) {
        setStatus('unsupported');
        return;
      }
      // Check camera support
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('noaccess');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        // eslint-disable-next-line no-undef
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        setStatus('scanning');

        const tick = async () => {
          if (cancelled) return;
          if (!videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onResult(codes[0].rawValue);
              return;
            }
          } catch { /* ignore frame errors */ }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
          setStatus('denied');
        } else {
          setStatus('noaccess');
          setErrorMsg(e?.message ?? 'Camera unavailable');
        }
      }
    }
    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black animate-[fadeIn_0.2s_ease-out]">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold">Scan QR code</span>
        <span className="w-10" />
      </div>

      {/* Camera area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Reticle */}
        {status === 'scanning' && (
          <div
            className="relative w-64 h-64 rounded-3xl"
            style={{
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              border: '2px solid rgba(255,255,255,0.85)',
            }}
          >
            {/* corners */}
            {['top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl',
              'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl',
              'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl',
              'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl',
            ].map((c, i) => (
              <span key={i} className={`absolute w-7 h-7 ${c}`} style={{ borderColor: '#fff' }} />
            ))}
          </div>
        )}

        {/* States */}
        {status === 'starting' && (
          <div className="text-white text-center">
            <div className="w-8 h-8 mx-auto rounded-full border-2 border-white/30 border-t-white animate-spin mb-3" />
            <p className="text-sm">Opening camera…</p>
          </div>
        )}

        {(status === 'unsupported' || status === 'noaccess' || status === 'denied') && (
          <div className="text-white text-center px-8 max-w-sm">
            <Camera className="w-10 h-10 mx-auto opacity-70 mb-3" />
            <p className="font-semibold mb-1">
              {status === 'denied' ? 'Camera access denied'
                : status === 'unsupported' ? 'QR scanning isn\'t supported here'
                : 'Camera unavailable'}
            </p>
            <p className="text-sm opacity-80">
              {status === 'denied'
                ? 'Allow camera access in your browser settings, or paste the token manually instead.'
                : status === 'unsupported'
                ? 'Your browser doesn\'t support live QR scanning. Paste your invite token on the previous screen.'
                : (errorMsg ?? 'Try paste the token manually instead.')}
            </p>
            <button
              onClick={onClose}
              className="mt-5 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold bg-white text-black"
            >
              Use token instead
            </button>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {status === 'scanning' && (
        <div className="px-8 pb-10 pt-4 text-center text-white/80 text-sm">
          Point your camera at the studio's QR code.
        </div>
      )}
    </div>
  );
}

