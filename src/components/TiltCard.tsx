import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';

type OrientationCtor = { requestPermission?: () => Promise<'granted' | 'denied'> };

/**
 * Drag (or tilt the phone) to rotate the card in 3D. A gloss highlight follows the finger
 * and the card's holo shine (--shine) sweeps with the tilt.
 */
export function TiltCard({ children, radius, enabled = true }: { children: React.ReactNode; radius: number; enabled?: boolean }) {
  const rx = useSpring(0, { stiffness: 170, damping: 14 });
  const ry = useSpring(0, { stiffness: 170, damping: 14 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(30);
  const shine = useTransform(ry, [-18, 18], ['150%', '-50%']);
  const gloss = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,.42), rgba(255,255,255,0) 48%)`;
  const glossOpacity = useTransform([rx, ry] as never, ([a, b]: number[]) => Math.min(1, (Math.abs(a) + Math.abs(b)) / 14));
  const dragging = useRef(false);
  const askedGyro = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (dragging.current || e.gamma == null || e.beta == null) return;
      const g = Math.max(-30, Math.min(30, e.gamma));
      const b = Math.max(-30, Math.min(30, e.beta - 45));
      ry.set(g * 0.6);
      rx.set(-b * 0.5);
      gx.set(50 + g * 1.5);
      gy.set(30 + b * 1.2);
    };
    window.addEventListener('deviceorientation', onOrient);
    return () => window.removeEventListener('deviceorientation', onOrient);
  }, [enabled, rx, ry, gx, gy]);

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 36);
    rx.set(-(py - 0.5) * 36);
    gx.set(px * 100);
    gy.set(py * 100);
  };

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    move(e);
    // iOS only allows motion access after a tap
    const DOE = (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent;
    if (!askedGyro.current && DOE?.requestPermission) {
      askedGyro.current = true;
      DOE.requestPermission().catch(() => {});
    }
  };

  const release = () => {
    dragging.current = false;
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      onPointerDown={down}
      onPointerMove={(e) => (e.pointerType === 'mouse' || dragging.current) && move(e)}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900, ['--shine' as string]: shine, touchAction: enabled ? 'none' : 'auto', position: 'relative' }}
    >
      {children}
      <motion.div
        aria-hidden
        style={{ position: 'absolute', inset: 0, borderRadius: radius, pointerEvents: 'none', background: gloss, opacity: glossOpacity }}
      />
    </motion.div>
  );
}
