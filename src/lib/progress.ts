import type { Connection, Quest } from './api';

/** Key colleagues collected by the newcomer (method 'qr' from the newcomer's side). */
export function questProgress(quest: Quest | null, connections: Connection[], newcomerId: string) {
  if (!quest) return { done: 0, goal: 0, collectedTargets: new Set<string>() };
  const mine = new Set(connections.filter((c) => c.collector_id === newcomerId).map((c) => c.collected_id));
  const collectedTargets = new Set(quest.targets.filter((t) => mine.has(t.person_id)).map((t) => t.person_id));
  return { done: collectedTargets.size, goal: quest.party_goal, collectedTargets };
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

export function formatNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

export function publicBaseUrl(): string {
  const env = import.meta.env.VITE_PUBLIC_BASE_URL;
  return (env && env.trim() ? env.trim() : window.location.origin).replace(/\/$/, '');
}

export function cardUrl(token: string): string {
  return `${publicBaseUrl()}/c/${token}`;
}
