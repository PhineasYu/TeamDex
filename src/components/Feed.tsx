import { PartyPopper, Sparkles, Flag, IdCard, HelpCircle, Layers } from 'lucide-react';
import type { Person, TeamdexEvent } from '../lib/api';
import { relativeTime } from '../lib/progress';
import { AvatarBubble } from './ui';

function describe(e: TeamdexEvent, byId: Map<string, Person>): string {
  const a = e.actor_id ? byId.get(e.actor_id)?.display_name ?? 'Someone' : 'Someone';
  const t = e.target_id ? byId.get(e.target_id)?.display_name ?? 'someone' : '';
  switch (e.type) {
    case 'card_collected':
      return `${a} collected ${t}'s card`;
    case 'fact_unlocked':
      return `${a} unlocked ${t}'s fun fact`;
    case 'party_unlocked':
      return `${a} unlocked their onboarding party`;
    case 'quest_created':
      return `Onboarding quest created for ${a}`;
    case 'card_claimed':
      return `${a} set up their card`;
    case 'quiz_done': {
      const p = e.payload as { score?: number; total?: number };
      return `${a} scored ${p.score ?? '?'} / ${p.total ?? 5} on the quiz`;
    }
    default:
      return `${a} did something`;
  }
}

const ICON = {
  card_collected: Layers,
  fact_unlocked: Sparkles,
  party_unlocked: PartyPopper,
  quest_created: Flag,
  card_claimed: IdCard,
  quiz_done: HelpCircle,
};

export function Feed({ events, people, empty = 'Nothing yet. It gets lively once newcomers start collecting.' }: { events: TeamdexEvent[]; people: Person[]; empty?: string }) {
  const byId = new Map(people.map((p) => [p.id, p]));
  if (!events.length) return <p className="rounded-[22px] bg-white px-4 py-4 text-[15px] text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {events.map((e) => {
        const actor = e.actor_id ? byId.get(e.actor_id) : undefined;
        const Icon = ICON[e.type] ?? Layers;
        return (
          <li key={e.id} className="flex items-center gap-3 rounded-[22px] bg-white px-3 py-2.5">
            {actor ? <AvatarBubble person={actor} size={40} /> : <span className="h-10 w-10 rounded-full bg-line" />}
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-snug">{describe(e, byId)}</span>
              <span className="text-[12px] text-muted">{relativeTime(e.created_at)}</span>
            </span>
            <Icon size={18} className="flex-none text-muted" />
          </li>
        );
      })}
    </ul>
  );
}
