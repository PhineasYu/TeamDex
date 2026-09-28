import { motion } from 'framer-motion';

/** Padlock from the pitch film. The shackle swings open when unlocked. */
export function Lock({ open, size = 24 }: { open: boolean; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', flex: 'none', color: open ? '#3DDBB0' : '#9AA8A2', transition: 'color .2s .42s' }}>
    <motion.svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      style={{ overflow: 'visible' }}
      initial={false}
      // Shake three times, then the shackle swings open
      animate={open ? { x: [0, -3, 3, -3, 3, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.42 }}
    >
      <motion.path
        d="M8 11V7.5a4 4 0 0 1 8 0V11"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        initial={false}
        animate={open ? { x: 3, y: -3, rotate: 18 } : { x: 0, y: 0, rotate: 0 }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1], delay: open ? 0.42 : 0 }}
      />
      <rect x="5" y="10.5" width="14" height="11" rx="3" fill="currentColor" />
    </motion.svg>
    </span>
  );
}
