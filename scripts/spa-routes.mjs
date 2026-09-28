// GitHub Pages has no rewrites: unknown paths get 404.html (HTTP 404). QR scanners and some in-app
// browsers treat that as an error, so give the entry points people actually open a real index.html.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const dist = 'dist';
const seed = JSON.parse(readFileSync('seed/demo-company.json', 'utf8'));
const routes = [
  'demo', 'demo/yunfei', 'demo/patrik', 'demo/hr', `join/${seed.company.join_code}`,
  'quest', 'quest/org', 'quest/quiz', 'quest/party',
  'me', 'me/card', 'me/edit', 'me/org',
  'hr', 'hr/new', 'hr/team', 'hr/impact', 'dev',
  ...seed.people.map((p) => `c/${p.qr_token}`),
];

copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));
for (const r of routes) {
  const target = join(dist, r, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(dist, 'index.html'), target);
}
console.log(`SPA fallback: 404.html + ${routes.length} route pages`);
