import { useEffect, useState } from 'react';

/** Reveals text letter by letter over `duration` seconds. */
export function Typewriter({ text, duration = 1.2 }: { text: string; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setN(text.length);
      return;
    }
    setN(0);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / (duration * 1000));
      setN(Math.round(k * text.length));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration]);
  return (
    <span aria-label={text}>
      <span aria-hidden>{text.slice(0, n)}</span>
    </span>
  );
}
