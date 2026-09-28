import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH is set by the GitHub Pages workflow (site lives under /TeamDex/). Vercel and local use '/'.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: { host: true },
});
