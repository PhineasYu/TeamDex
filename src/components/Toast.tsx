import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { Person } from '../lib/api';
import { holoVars } from './Card';
import { Sprite } from './Sprite';

interface ToastItem {
  id: number;
  title: string;
  body?: string;
  person?: Person;
}

const Ctx = createContext<(t: Omit<ToastItem, 'id'>) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const reduce = useReducedMotion();

  const show = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = next.current++;
    setItems((xs) => [...xs.slice(-2), { ...t, id }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-center gap-2 px-3" style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }} aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -40 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className="pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-[24px] bg-white px-4 py-3 shadow-[0_18px_36px_-16px_rgba(19,34,46,.5)]"
              onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}
            >
              {t.person && (
                <span className="flex h-[60px] w-[44px] flex-none rounded-[9px] p-[4px]" style={{ ...holoVars(t.person), background: 'conic-gradient(var(--c1),var(--c2),var(--c3),var(--c1))' }}>
                  <i className="flex h-full w-full items-end justify-center overflow-hidden rounded-[6px] bg-white">
                    <Sprite avatar={t.person.avatar} style={{ height: '80%' }} />
                  </i>
                </span>
              )}
              <div className="min-w-0">
                <b className="block text-[16px] leading-tight">{t.title}</b>
                {t.body && <span className="block text-[14px] leading-snug text-muted">{t.body}</span>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
