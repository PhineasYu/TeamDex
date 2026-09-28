import { motion, useReducedMotion } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Avatar } from '../lib/api';
import { play, vibrate } from '../lib/sound';
import { Sprite } from './Sprite';

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type JsQR = (data: Uint8ClampedArray, w: number, h: number, opts?: { inversionAttempts?: string }) => { data: string } | null;

const FRAME = 264;

/** Pulls the card token out of a scanned Teamdex link (…/c/<token>/) or a bare short code. */
export function tokenFromScan(text: string): string | null {
  const m = /\/c\/([^/?#\s]+)/.exec(text);
  if (m) return decodeURIComponent(m[1]).toLowerCase();
  const t = text.trim();
  return /^[a-z0-9-]{3,40}$/i.test(t) && !/^https?:/i.test(t) ? t.toLowerCase() : null;
}

/**
 * In-app QR scanner. Uses the browser's BarcodeDetector when it has one (Android Chrome) and falls back
 * to jsQR (iPhone Safari). Camera access needs HTTPS, which the deployed site has.
 */
export function QRScanner({ me, onToken, onClose, onTypeCode }: { me?: Avatar; onToken: (token: string) => void; onClose: () => void; onTypeCode: () => void }) {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<'starting' | 'scanning' | 'found' | 'denied' | 'unsupported'>('starting');
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setState('unsupported');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      } catch {
        return setState('denied');
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => {});
      setState('scanning');

      // Prefer the native detector; otherwise load jsQR only when it's needed
      let detector: Detector | null = null;
      const BD = (window as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
      if (BD) {
        try {
          const formats = (await BD.getSupportedFormats?.()) ?? ['qr_code'];
          if (formats.includes('qr_code')) detector = new BD({ formats: ['qr_code'] });
        } catch {
          detector = null;
        }
      }
      const jsQR: JsQR | null = detector ? null : ((await import('jsqr')).default as unknown as JsQR);

      const tick = async () => {
        if (stopped) return;
        try {
          if (video.readyState >= 2) {
            let text: string | null = null;
            if (detector) {
              const codes = await detector.detect(video);
              text = codes[0]?.rawValue ?? null;
            } else if (jsQR && ctx) {
              // Decode a centre crop, downscaled, so older phones keep up
              const vw = video.videoWidth, vh = video.videoHeight;
              const side = Math.min(vw, vh);
              const size = Math.min(640, side);
              canvas.width = size;
              canvas.height = size;
              ctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, size, size);
              const img = ctx.getImageData(0, 0, size, size);
              text = jsQR(img.data, size, size, { inversionAttempts: 'dontInvert' })?.data ?? null;
            }
            if (text) {
              const token = tokenFromScan(text);
              if (token) {
                stopped = true;
                setState('found');
                vibrate(40);
                play('pop');
                setTimeout(() => onToken(token), reduce ? 0 : 280);
                return;
              }
              setHint("That's not a Teamdex card. Scan the code on a colleague's My card page.");
            }
          }
        } catch {
          /* keep trying */
        }
        timer = window.setTimeout(tick, 120);
      };
      tick();
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const found = state === 'found';
  const failed = state === 'denied' || state === 'unsupported';

  return (
    <motion.div className="fixed inset-0 z-[65] overflow-hidden bg-ink text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted autoPlay />

      {/* frame: ink mask outside, holo border, lime corners, lime→mint scan line */}
      <div className="absolute left-1/2 top-[42%]" style={{ width: FRAME, height: FRAME, marginLeft: -FRAME / 2, marginTop: -FRAME / 2 }}>
        <div className="absolute inset-0 rounded-[34px]" style={{ boxShadow: '0 0 0 200vmax rgba(19,34,46,.82)' }} />
        <div className={'scan-holo absolute -inset-[5px] rounded-[38px]' + (reduce ? '' : ' holo-spin')} style={{ opacity: found ? 0 : 1 }} />
        {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
          <span key={c} className={`scan-corner scan-${c}`} />
        ))}
        {!found && !failed && !reduce && (
          <motion.span
            className="absolute left-4 right-4 h-[5px] rounded-full"
            style={{ background: 'linear-gradient(90deg,#C8F53C,#3DDBB0)', boxShadow: '0 0 18px 4px rgba(200,245,60,.55)' }}
            initial={{ top: 16 }}
            animate={{ top: [16, FRAME - 22, 16] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {found && (
          <motion.div className="absolute inset-0 rounded-[34px] bg-lime" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: [0, 0.9, 0.55], scale: 1 }} transition={{ duration: 0.28 }} />
        )}
      </div>

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 flex items-start gap-3 px-4" style={{ paddingTop: 'calc(var(--safe-top) + 14px)' }}>
        {me && (
          <span className="flex h-11 w-11 flex-none items-end justify-center overflow-hidden rounded-full" style={{ background: 'linear-gradient(160deg,#FF7AB8,#BDF4E0)' }}>
            <Sprite avatar={me} style={{ height: 36 }} />
          </span>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[19px] font-extrabold leading-tight tracking-[-0.02em]">Scan a colleague's card</p>
          <p className="text-[14px] text-white/70">Point at the QR code on their My card page</p>
        </div>
        <button type="button" onClick={onClose} className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white text-ink" aria-label="Close scanner">
          <X size={20} />
        </button>
      </div>

      {/* bottom */}
      <div className="absolute inset-x-0 flex flex-col items-center gap-3 px-6 text-center" style={{ top: `calc(42% + ${FRAME / 2 + 28}px)` }}>
        {failed ? (
          <p className="max-w-[320px] rounded-2xl bg-white/10 px-4 py-3 text-[15px] font-medium">
            {state === 'denied' ? 'Camera access is off. Allow the camera for this site, or use your phone camera or the card code.' : "This browser can't open the camera here. Use your phone camera or the card code."}
          </p>
        ) : (
          <p className="text-[15px] font-semibold text-white/85">{found ? 'Got it!' : hint ?? (state === 'starting' ? 'Starting the camera…' : 'Hold steady, it scans by itself')}</p>
        )}
        <button type="button" onClick={onTypeCode} className="flex min-h-[48px] items-center gap-2 rounded-full border-[1.5px] border-white/70 px-5 text-[15px] font-semibold">
          <Keyboard size={18} /> Type a code instead
        </button>
      </div>
    </motion.div>
  );
}
