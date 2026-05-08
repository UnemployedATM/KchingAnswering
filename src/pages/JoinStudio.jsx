import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/Toast';
import JoinStudioForm from '@/components/StudioOnboarding/JoinStudioForm';
import QrScannerSheet from '@/components/StudioOnboarding/QrScannerSheet';
import { validateStudioToken, joinStudioById, extractTokenFromQr } from '@/lib/joinStudio';

/**
 * Authenticated full-bleed route at /join.
 * Two entry points:
 *   1. Auto-redirected by ProtectedRoutes when studios.length === 0
 *   2. Manual: Discover's dashed "Explore Studios" card → navigate('/join')
 *
 * The X close button only shows for users who already have studios — first-time
 * onboarding users have no escape (they must join a studio to use the app).
 */
export default function JoinStudio() {
  const { studios, reloadClient } = useAuth();
  const navigate = useNavigate();

  const [token,        setToken]      = useState('');
  const [validating,   setValidating] = useState(false);
  const [tokenError,   setTokenError] = useState(null);
  const [scannerOpen,  setScanner]    = useState(false);
  const [joiningName,  setJoiningName] = useState(null); // shows spinner overlay during join

  const hasStudios = studios.length > 0;

  // If a background join (post-OAuth pending_studio_id) completes while the
  // user is sitting on /join, bounce them straight to /discover.
  useEffect(() => {
    // Wait until we're not actively joining (otherwise the increment from
    // reloadClient below would yank the success toast off-screen)
    if (joiningName) return;
    if (studios.length > 0) navigate('/discover', { replace: true });
  }, [studios.length, joiningName, navigate]);

  async function handleSubmit(rawToken) {
    setValidating(true);
    setTokenError(null);
    let studio;
    try {
      studio = await validateStudioToken(rawToken, supabase);
    } catch (e) {
      setTokenError(e.message ?? 'Invalid token');
      setValidating(false);
      return;
    }

    // Validation passed — switch to "joining" mode (spinner overlay).
    setJoiningName(studio.brand_name || studio.name);
    setValidating(false);

    try {
      await joinStudioById(studio.id, supabase);
      await reloadClient();
      toast.success(`Joined ${studio.brand_name || studio.name}`);
      navigate('/discover', { replace: true });
    } catch (e) {
      setJoiningName(null);
      setTokenError(e.message ?? 'Could not join the studio. Please try again.');
    }
  }

  function handleQrResult(text) {
    setScanner(false);
    const extracted = extractTokenFromQr(text);
    setToken(extracted);
    handleSubmit(extracted);
  }

  return (
    <div
      className="min-h-full flex flex-col"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Top bar — only show X if user can escape (already has studios) */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        {hasStudios ? (
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" style={{ color: 'var(--ink)' }} />
          </button>
        ) : (
          <span className="w-10" />
        )}
        <span className="font-serif italic font-bold text-base select-none" style={{ color: 'var(--ink)' }}>
          B-Cool
        </span>
        <span className="w-10" />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-8">
        <h1
          className="font-serif font-bold text-center mb-2"
          style={{ fontSize: 32, color: 'var(--ink)', letterSpacing: '-0.01em' }}
        >
          {hasStudios ? 'Join another studio' : 'Join a studio'}
        </h1>
        <p className="text-sm text-center mb-10 max-w-[280px]" style={{ color: 'var(--muted)' }}>
          Enter your studio's invite token, or scan the QR code they shared with you.
        </p>

        <JoinStudioForm
          token={token}
          setToken={setToken}
          onSubmit={handleSubmit}
          validating={validating}
          tokenError={tokenError}
          openScanner={() => setScanner(true)}
        />

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

      {/* Spinner overlay while joining */}
      {joiningName && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--bg)]/80 backdrop-blur-sm">
          <div className="card px-8 py-7 text-center max-w-xs">
            <div className="w-10 h-10 mx-auto rounded-full border-2 border-[var(--border)] border-t-[var(--ink)] animate-spin mb-4" />
            <p className="font-serif font-bold text-lg mb-1" style={{ color: 'var(--ink)' }}>
              Joining {joiningName}…
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Setting up your access.
            </p>
          </div>
        </div>
      )}

      {/* QR scanner */}
      {scannerOpen && (
        <QrScannerSheet
          onClose={() => setScanner(false)}
          onResult={handleQrResult}
        />
      )}
    </div>
  );
}
