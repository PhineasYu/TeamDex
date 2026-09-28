import { animate, motion, useMotionValue, useReducedMotion, useTransform, type AnimationPlaybackControls } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { Person } from '../lib/api';
import { HOLO } from '../lib/departments';
import { play, unlockAudio, vibrate } from '../lib/sound';
import { Card, CARD_H, CARD_W } from './Card';
import { CardBack } from './CardBack';
import { TiltCard } from './TiltCard';

interface Props {
  /** The card you receive. */
  theirs: Person;
  /** Your own card, which flies out to them. Omit to skip the swap. */
  mine?: Person | null;
  title: string;
  subtitle?: string;
  fact?: string | null;
  /** Skip the swap sequence (e.g. "Already in your Teamdex"). */
  still?: boolean;
  children?: React.ReactNode;
  onBackdrop?: () => void;
  /** Wait for a tap before playing, so the browser allows sound (no tap has happened on this page yet). */
  gate?: boolean;
}

// Timeline (seconds)
const T_MEET = 0.5; // cards arrive on screen
const T_HIT = 0.85; // cards collide
const T_FLIP_END = 1.95; // their card has flipped and landed
const T_UI = 2.05; // title and buttons

const BACK_OUT: [number, number, number, number] = [0.34, 1.56, 0.64, 1];
const PARTICLE_COLORS = ['#C8F53C', '#FF7AB8', '#3DDBB0', '#6FD3FF', '#A86BFF', '#FFFFFF', '#FFB36B'];

/**
 * The card exchange: your card rises, theirs drops in face-down, they collide (flash, shockwave,
 * pixel burst, shake), yours flies off to them and theirs flips face-up under rotating rays.
 */
export function ExchangeReveal({ theirs, mine, title, subtitle, fact, still, children, onBackdrop, gate }: Props) {
  const reduce = useReducedMotion();
  const animated = !still && !reduce;
  const swap = animated && !!mine;
  const [landed, setLanded] = useState(!animated);
  const [started, setStarted] = useState(!(gate && animated));

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const S = Math.max(0.52, Math.min(0.78, (vw - 56) / CARD_W, (vh - 300) / CARD_H));
  const SMALL = 0.42;
  const k = SMALL / S; // their card starts at the small size
  const glow = theirs.kind === 'newcomer' ? HOLO.newcomer : HOLO[theirs.department];

  // Motion values for the sequence
  const tY = useMotionValue(swap ? -vh * 0.62 : 0);
  const tRot = useMotionValue(swap ? -14 : 0);
  const tScale = useMotionValue(swap ? k : animated ? 0.5 : 1);
  const tFlip = useMotionValue(animated ? 180 : 0);
  const tOpacity = useMotionValue(animated ? 0 : 1);
  const mY = useMotionValue(vh * 0.62);
  const mRot = useMotionValue(14);
  const mScale = useMotionValue(1);
  const mOpacity = useMotionValue(0);
  const stageX = useMotionValue(0);
  const frontOpacity = useTransform(tFlip, [91, 89], [0, 1]);
  const backOpacity = useTransform(tFlip, [91, 89], [1, 0]);

  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const a = (i / 30) * Math.PI * 2 + Math.random() * 0.3;
        const d = 120 + Math.random() * Math.min(200, vw * 0.5);
        return { x: Math.cos(a) * d, y: Math.sin(a) * d, size: 8 + Math.round(Math.random() * 3) * 4, color: PARTICLE_COLORS[i % PARTICLE_COLORS.length], rot: (Math.random() - 0.5) * 540 };
      }),
    [vw],
  );

  useEffect(() => {
    if (!animated || !started) return;
    const ctrls: AnimationPlaybackControls[] = [];
    const timers: number[] = [];
    const at = (s: number, fn: () => void) => timers.push(window.setTimeout(fn, s * 1000));

    if (swap) {
      const tt = (xs: number[]) => xs.map((x) => x / T_FLIP_END);
      // their card: drop in face-down, hit, then flip up to full size
      ctrls.push(animate(tY, [-vh * 0.62, -150, -12, 0], { duration: T_FLIP_END, times: tt([0, T_MEET, T_HIT, T_FLIP_END]), ease: ['easeOut', 'easeIn', BACK_OUT] }));
      ctrls.push(animate(tRot, [-14, 6, 0, 0], { duration: T_FLIP_END, times: tt([0, T_MEET, T_HIT, T_FLIP_END]), ease: ['easeOut', 'easeIn', 'easeOut'] }));
      ctrls.push(animate(tScale, [k, k, k * 1.12, 1], { duration: T_FLIP_END, times: tt([0, T_MEET, T_HIT, T_FLIP_END]), ease: ['linear', 'easeIn', BACK_OUT] }));
      ctrls.push(animate(tFlip, [180, 180, 180, 0], { duration: T_FLIP_END, times: tt([0, T_MEET, T_HIT + 0.05, T_FLIP_END]), ease: ['linear', 'linear', BACK_OUT] }));
      ctrls.push(animate(tOpacity, [0, 1], { duration: 0.2 }));
      // my card: rise, hit, fly away to them
      const T_OUT = 1.45;
      const mt = (xs: number[]) => xs.map((x) => x / T_OUT);
      ctrls.push(animate(mY, [vh * 0.62, 150, 12, -vh * 0.75], { duration: T_OUT, times: mt([0, T_MEET, T_HIT, T_OUT]), ease: ['easeOut', 'easeIn', 'easeIn'] }));
      ctrls.push(animate(mRot, [14, -6, 0, 24], { duration: T_OUT, times: mt([0, T_MEET, T_HIT, T_OUT]), ease: ['easeOut', 'easeIn', 'easeIn'] }));
      ctrls.push(animate(mScale, [1, 1, 1.06, 0.35], { duration: T_OUT, times: mt([0, T_MEET, T_HIT, T_OUT]) }));
      ctrls.push(animate(mOpacity, [0, 1, 1, 0], { duration: T_OUT, times: mt([0, 0.15, T_HIT + 0.2, T_OUT]) }));
      // screen shake on impact
      at(T_HIT, () => ctrls.push(animate(stageX, [0, -10, 9, -6, 4, 0], { duration: 0.38 })));

      play('whoosh');
      at(T_HIT, () => {
        play('impact');
        vibrate([30, 40, 70]);
      });
      at(T_HIT + 0.45, () => play('reveal'));
      at(T_UI - 0.1, () => play('pop'));
    } else {
      // single card: classic flip-in
      ctrls.push(animate(tFlip, [180, 0], { duration: 1.1, ease: BACK_OUT }));
      ctrls.push(animate(tScale, [0.5, 1], { duration: 1.1, ease: BACK_OUT }));
      ctrls.push(animate(tOpacity, [0, 1], { duration: 0.2 }));
      at(0.1, () => {
        play('reveal');
        vibrate(40);
      });
    }
    at(swap ? T_UI : 1.2, () => setLanded(true));

    return () => {
      ctrls.forEach((c) => c.stop());
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated, swap, started]);

  const hit = swap ? T_HIT : 0.1;
  const cardW = CARD_W * S;
  const cardH = CARD_H * S;
  // Card centre sits a little above the middle to leave room for the title and buttons
  const centerTop = Math.max(96 + cardH / 2, vh * 0.43);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-ink text-white" onClick={onBackdrop}>
      <motion.div className="absolute inset-x-0 top-0 h-[100dvh] overflow-hidden" style={{ x: stageX }}>
        {/* coloured glow + rotating rays behind the landed card */}
        {started && <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(circle at 50% ${centerTop}px, ${glow[0]}AA 0%, ${glow[2]}44 32%, transparent 62%)` }}
          initial={{ opacity: animated ? 0 : 0.7 }}
          animate={{ opacity: 0.85 }}
          transition={{ delay: animated ? hit : 0, duration: 0.6 }}
        />}
        {!reduce && started && (
          <motion.div className="pointer-events-none absolute inset-x-0" style={{ top: centerTop, height: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: animated ? hit + 0.1 : 0, duration: 0.8 }}>
            <div className="rays" />
          </motion.div>
        )}
        {/* soften the ray edges into the background */}
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 50% ${centerTop}px, transparent 0%, transparent 30%, #13222E 78%)` }} />

        {/* shockwave rings */}
        {animated && started &&
          [0, 0.1].map((d, i) => (
            <motion.div
              key={i}
              className="pointer-events-none absolute rounded-full"
              style={{ left: '50%', top: centerTop, width: 160, height: 160, marginLeft: -80, marginTop: -80, border: `${i ? 4 : 8}px solid ${i ? '#C8F53C' : '#FFFFFF'}` }}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 0.2, 3.4], opacity: [0, 0.95, 0] }}
              transition={{ delay: hit + d, duration: 0.78, times: [0, 0.04, 1], ease: 'easeOut' }}
            />
          ))}

        {/* pixel burst */}
        {animated && started &&
          particles.map((p, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute block"
              style={{ left: '50%', top: centerTop, width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2, background: p.color }}
              initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 1 }}
              animate={{ x: p.x, y: p.y + 60, opacity: [0, 1, 1, 0], rotate: p.rot, scale: [1, 1, 0.6] }}
              transition={{ delay: hit, duration: 1.1, ease: [0.2, 0.8, 0.4, 1] }}
            />
          ))}

        {/* their card */}
        <div className="absolute left-1/2" style={{ top: centerTop, width: cardW, height: cardH, marginLeft: -cardW / 2, marginTop: -cardH / 2, perspective: 1200 }}>
          <motion.div style={{ y: tY, rotate: tRot, scale: tScale, rotateY: tFlip, opacity: tOpacity, transformStyle: 'preserve-3d', width: cardW, height: cardH }}>
            <motion.div className="absolute inset-0" style={{ opacity: backOpacity, rotateY: 180 }}>
              <CardBack scale={S} />
            </motion.div>
            <motion.div className="absolute inset-0" style={{ opacity: frontOpacity }}>
              <div className={landed && !reduce ? 'float-bob' : undefined}>
                <TiltCard radius={30 * S} enabled={landed}>
                  <Card person={theirs} fact={fact} scale={S} holo={!reduce} />
                </TiltCard>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* my card, flying out */}
        {swap && mine && (
          <div className="pointer-events-none absolute left-1/2" style={{ top: centerTop, width: CARD_W * SMALL, height: CARD_H * SMALL, marginLeft: (-CARD_W * SMALL) / 2, marginTop: (-CARD_H * SMALL) / 2 }}>
            <motion.div style={{ y: mY, rotate: mRot, scale: mScale, opacity: mOpacity }}>
              <Card person={mine} scale={SMALL} />
            </motion.div>
          </div>
        )}

        {/* "Swapping cards" hint during the swap */}
        {swap && started && (
          <motion.p
            className="pointer-events-none absolute inset-x-0 text-center text-[15px] font-semibold uppercase tracking-[0.2em] text-white/70"
            style={{ top: 'calc(var(--safe-top) + 34px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: T_HIT + 0.3, times: [0, 0.2, 0.8, 1] }}
          >
            Swapping cards…
          </motion.p>
        )}
      </motion.div>

      {/* title */}
      <div className="pointer-events-none absolute inset-x-0 px-4 text-center" style={{ top: 'calc(var(--safe-top) + 22px)' }}>
        <h1 className="text-[36px] font-extrabold leading-none tracking-[-0.035em]" aria-label={title}>
          {[...title].map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="inline-block"
              style={{ whiteSpace: 'pre' }}
              initial={animated ? { opacity: 0, y: 26, scale: 0.4 } : { opacity: 1 }}
              animate={landed || !animated ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ delay: i * 0.03, duration: 0.45, ease: BACK_OUT }}
            >
              {ch}
            </motion.span>
          ))}
        </h1>
      </div>

      {/* subtitle + actions */}
      <motion.div
        className="absolute inset-x-0 mx-auto flex max-w-[380px] flex-col items-center gap-3 px-5 pb-[calc(var(--safe-bottom)+24px)]"
        style={{ top: centerTop + cardH / 2 + 22, pointerEvents: landed ? 'auto' : 'none' }}
        initial={{ opacity: 0, y: 16 }}
        animate={landed ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: animated ? 0.25 : 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {subtitle && <p className="text-center text-[16px] font-medium text-white/85">{subtitle}</p>}
        {/* mounted only after landing, so timers inside (auto-continue) start when the card is visible */}
        <div className="flex w-full flex-col gap-3">{landed && children}</div>
      </motion.div>

      {/* tap to start: gives the browser the tap it needs before it will play sound */}
      {!started && (
        <button
          type="button"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-ink px-6 text-white"
          onClick={(e) => {
            e.stopPropagation();
            unlockAudio();
            setStarted(true);
          }}
        >
          <span className="text-[15px] font-semibold uppercase tracking-[0.2em] text-white/70">{theirs.display_name}'s card is here</span>
          <span className="float-bob block">
            <CardBack scale={Math.min(0.5, S)} />
          </span>
          <motion.span
            className="rounded-full bg-lime px-7 py-3.5 text-[18px] font-bold text-ink shadow-[0_5px_0_#9CC21F]"
            animate={reduce ? {} : { scale: [1, 1.06, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            Tap to swap cards
          </motion.span>
        </button>
      )}

      {/* white flash on impact */}
      {animated && started && (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.95, 0] }}
          transition={{ delay: hit - 0.04, duration: 0.6, times: [0, 0.12, 1] }}
        />
      )}
    </div>
  );
}
