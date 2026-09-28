import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Person } from '../lib/api';
import { play, vibrate } from '../lib/sound';
import { Card, CARD_H, CARD_W } from './Card';

interface Props {
  person: Person;
  title?: string;
  subtitle?: string;
  fact?: string | null;
  /** Play sound + haptics on reveal. */
  withSound?: boolean;
  /** Rendered under the card once the flip has landed. */
  children?: React.ReactNode;
  /** Skip the flip (e.g. "Already in your Teamdex"). */
  still?: boolean;
  fullscreen?: boolean;
}

const BACK_OUT = [0.34, 1.56, 0.64, 1] as const;

/** Flip-in reveal: white flash, card flips from -110° with back-out, then a shine sweep. */
export function CardReveal({ person, title = 'New card!', subtitle, fact, withSound = true, children, still, fullscreen = true }: Props) {
  const reduce = useReducedMotion();
  const [landed, setLanded] = useState(!!still);

  useEffect(() => {
    if (still) return;
    const t1 = setTimeout(() => {
      if (withSound) {
        play('reveal');
        vibrate(40);
      }
    }, reduce ? 0 : 120);
    const t2 = setTimeout(() => setLanded(true), reduce ? 300 : 1100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [still, reduce, withSound]);

  // Fit the card to the viewport: 0.8 on a 390px phone, smaller on short screens.
  const scale = Math.max(0.55, Math.min(0.8, (window.innerWidth - 48) / CARD_W, (window.innerHeight - 330) / CARD_H));

  const flip = still
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
      : {
          initial: { rotateY: -110, scale: 0.5, opacity: 0 },
          animate: { rotateY: 0, scale: 1, opacity: 1 },
          transition: { duration: 1.1, ease: BACK_OUT, opacity: { duration: 0.2 } },
        };

  return (
    <div
      className={(fullscreen ? 'fixed inset-0 z-[60] overflow-y-auto ' : 'relative ') + 'flex flex-col items-center bg-sky text-ink'}
      style={{ paddingTop: 'calc(var(--safe-top) + 28px)', paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}
    >
      <motion.h1
        className="px-4 text-center text-[34px] font-extrabold tracking-[-0.03em]"
        initial={still || reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: BACK_OUT, delay: still ? 0 : 0.2 }}
      >
        {title}
      </motion.h1>

      <div className="mt-4" style={{ perspective: 1400 }}>
        <motion.div
          {...flip}
          style={{ ['--shine' as string]: '150%', transformStyle: 'preserve-3d' }}
        >
          <motion.div
            initial={{ ['--shine' as string]: '150%' }}
            animate={reduce || still ? {} : { ['--shine' as string]: '-50%' }}
            transition={{ duration: 1.0, ease: 'easeInOut', delay: 1.4 }}
          >
            <Card person={person} fact={fact} scale={scale} holo={!reduce} />
          </motion.div>
        </motion.div>
      </div>

      {subtitle && (
        <motion.p className="mt-4 px-6 text-center text-[16px] font-medium" initial={{ opacity: 0 }} animate={{ opacity: landed ? 0.9 : 0 }}>
          {subtitle}
        </motion.p>
      )}

      <motion.div
        className="mt-5 flex w-full max-w-[360px] flex-col gap-3 px-4"
        initial={{ opacity: 0, y: 12 }}
        animate={landed ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.35 }}
        style={{ pointerEvents: landed ? 'auto' : 'none' }}
      >
        {children}
      </motion.div>

      {!still && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[70] bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: reduce ? 0 : [0, 1, 0] }}
          transition={{ duration: 0.63, times: [0, 0.127, 1] }}
        />
      )}
    </div>
  );
}
