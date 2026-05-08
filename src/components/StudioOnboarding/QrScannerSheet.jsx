import { useState, useRef, useEffect } from 'react';
import { X, Camera } from 'lucide-react';

/**
 * Full-screen QR scanner sheet.
 * Uses BarcodeDetector + getUserMedia where available; gracefully falls
 * back to a "use token instead" CTA on browsers without support
 * (notably iOS Safari today).
 *
 * Props:
 *  - onClose: () => void
 *  - onResult: (rawQrText: string) => void
 */
export default function QrScannerSheet({ onClose, onResult }) {
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('starting'); // 'starting' | 'scanning' | 'unsupported' | 'denied' | 'noaccess'
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const hasDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
      if (!hasDetector) {
        setStatus('unsupported');
        return;
      }
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
                : status === 'unsupported' ? "QR scanning isn't supported here"
                : 'Camera unavailable'}
            </p>
            <p className="text-sm opacity-80">
              {status === 'denied'
                ? 'Allow camera access in your browser settings, or paste the token manually instead.'
                : status === 'unsupported'
                ? "Your browser doesn't support live QR scanning. Paste your invite token on the previous screen."
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
