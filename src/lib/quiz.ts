import type { Person } from './api';

export interface QuizQuestion {
  topic: string;
  answer: Person;
  options: Person[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Builds "Who do I ask?" questions from collected colleagues' help topics.
 * Each person is the right answer at most twice; topics never repeat.
 */
export function buildQuiz(collected: Person[], count = 5): QuizQuestion[] {
  const pool = collected.filter((p) => p.help_topics.length > 0);
  if (pool.length === 0) return [];
  const pairs = shuffle(pool.flatMap((p) => p.help_topics.map((topic) => ({ p, topic }))));
  const used = new Map<string, number>();
  const out: QuizQuestion[] = [];

  // First pass spreads people out; second pass allows a second appearance.
  for (const limit of [1, 2]) {
    for (const { p, topic } of pairs) {
      if (out.length >= count) break;
      if ((used.get(p.id) ?? 0) >= limit) continue;
      if (out.some((q) => q.topic === topic)) continue;
      used.set(p.id, (used.get(p.id) ?? 0) + 1);
      const others = shuffle(pool.filter((o) => o.id !== p.id)).slice(0, 3);
      out.push({ topic, answer: p, options: shuffle([p, ...others]) });
    }
  }
  return shuffle(out);
}
