import { MotionConfig } from 'framer-motion';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installAudioUnlock } from './lib/sound';
import './styles/index.css';

// Unlock Web Audio on the first tap anywhere, so later reveals (even ones triggered by realtime events) have sound.
installAudioUnlock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
