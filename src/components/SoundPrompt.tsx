import { AnimatePresence, motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from '../lib/session';
import { audioReady, onAudioReady, soundEnabled, unlockAudio } from '../lib/sound';

/**
 * A colleague's swap animation is triggered remotely, so there's no tap to unlock sound first.
 * Ask for one tap while they wait on their card.
 */
export function SoundPrompt() {
  const session = useSession();
  const { pathname } = useLocation();
  const [ready, setReady] = useState(audioReady());

  useEffect(() => onAudioReady(() => setReady(true)), []);

  const show = !ready && soundEnabled() && !!session && session.role !== 'newcomer' && pathname.startsWith('/me');
  return (
    <AnimatePresence>
      {show && (
        <div className="pointer-events-none fixed inset-x-0 z-50 flex justify-center" style={{ bottom: 'calc(var(--safe-bottom) + 96px)' }}>
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={() => {
            unlockAudio();
            setTimeout(() => setReady(audioReady()), 300);
          }}
          className="pointer-events-auto flex min-h-[48px] items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(19,34,46,.6)]"
        >
          <Volume2 size={18} /> Tap to turn on sound
        </motion.button>
        </div>
      )}
    </AnimatePresence>
  );
}
