import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { Avatar } from '../lib/api';
import { Sprite } from './Sprite';

const CONFETTI = ['#C8F53C', '#FF7AB8', '#3DDBB0', '#6FD3FF', '#A86BFF', '#FFFFFF'];

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dancing pixel people + falling square confetti. The newcomer is placed in the middle. */
export function PixelParty({ dancers, height = 360, background = true }: { dancers: { avatar: Avatar; name: string; me?: boolean }[]; height?: number; background?: boolean }) {
  const reduce = useReducedMotion();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setFrame((f) => f ^ 1), 250);
    return () => clearInterval(t);
  }, [reduce]);

  const confetti = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: 34 }, (_, i) => ({
      left: r() * 100,
      size: 8 + Math.round(r() * 3) * 4,
      color: CONFETTI[i % CONFETTI.length],
      dur: 2.4 + r() * 1.4,
      delay: -r() * 3.8,
      drift: (r() - 0.5) * 60,
      spin: (r() - 0.5) * 720,
    }));
  }, []);

  const n = dancers.length;
  const spriteH = Math.min(92, Math.floor((Math.min(window.innerWidth, 560) - 32) / Math.max(n, 1) / 0.923) - 4);

  return (
    <div className="relative overflow-hidden" style={{ height, background: background ? 'linear-gradient(180deg,#9FD3F3 0%,#CFEAFA 62%)' : 'transparent' }}>
      <div className="party-floor" />
      {!reduce &&
        confetti.map((c, i) => (
          <motion.span
            key={i}
            className="absolute top-0 block"
            style={{ left: `${c.left}%`, width: c.size, height: c.size, background: c.color }}
            initial={{ y: -30, x: 0, rotate: 0 }}
            animate={{ y: height + 30, x: c.drift, rotate: c.spin }}
            transition={{ duration: c.dur, delay: c.delay, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      <div className="absolute inset-x-0 flex items-end justify-center gap-1" style={{ bottom: height * 0.14 }}>
        {dancers.map((d, i) => (
          <motion.div
            key={i}
            className="flex flex-col items-center"
            animate={reduce ? {} : { y: (frame + i) % 2 ? -22 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Sprite avatar={d.avatar} frame={reduce ? 'cheer' : frame ? 'cheer' : 'idle'} style={{ height: d.me ? spriteH * 1.15 : spriteH }} />
            <span className={`mt-1 rounded-full px-2 text-[11px] font-bold ${d.me ? 'bg-ink text-white' : 'bg-white/80 text-ink'}`}>{d.me ? 'You' : d.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
