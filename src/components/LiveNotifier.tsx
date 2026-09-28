import { useRef } from 'react';
import { api, type Person, type TeamdexEvent } from '../lib/api';
import { useLiveEvents } from '../lib/hooks';
import { useSession } from '../lib/session';
import { play, vibrate } from '../lib/sound';
import { useToast } from './Toast';

/** Global realtime toasts for colleagues and HR (works on every page, e.g. while showing My card). */
export function LiveNotifier() {
  const session = useSession();
  const toast = useToast();
  const cache = useRef(new Map<string, Person>());
  const active = session && session.role !== 'newcomer';

  const person = async (id: string | null) => {
    if (!id) return undefined;
    if (!cache.current.has(id)) {
      const p = await api.getPerson(id);
      if (p) cache.current.set(id, p);
    }
    return cache.current.get(id);
  };

  useLiveEvents(active ? session.companyId : undefined, async (e: TeamdexEvent) => {
    if (!session) return;
    const me = session.personId;
    const actor = await person(e.actor_id);
    const name = actor?.display_name ?? 'Someone';

    if (session.role === 'colleague') {
      if (e.type === 'card_collected' && e.target_id === me) {
        toast({ title: `${name} collected your card.`, body: 'You got their newcomer card too.', person: actor });
        play('pop');
        vibrate(40);
      } else if (e.type === 'party_unlocked' || e.type === 'quest_created') {
        const quest = await api.getQuestForNewcomer(e.actor_id ?? '');
        if (!quest?.targets.some((t) => t.person_id === me)) return;
        if (e.type === 'party_unlocked') {
          toast({ title: `${name} unlocked their onboarding party.`, body: 'Fika invite: today 15:00.', person: actor });
          play('party');
        } else {
          toast({ title: `${name} starts soon.`, body: `You're one of ${quest.targets.length} people they'll meet first.`, person: actor });
        }
        vibrate(40);
      }
      return;
    }

    // HR sees everything, lightly.
    const target = await person(e.target_id);
    const t = target?.display_name ?? 'someone';
    const title =
      e.type === 'card_collected'
        ? `${name} collected ${t}'s card`
        : e.type === 'fact_unlocked'
          ? `${name} unlocked ${t}'s fun fact`
          : e.type === 'party_unlocked'
            ? `${name} unlocked their party!`
            : e.type === 'quiz_done'
              ? `${name} finished the quiz`
              : e.type === 'card_claimed'
                ? `${name} set up their card`
                : `New quest for ${name}`;
    toast({ title, person: actor });
  });

  return null;
}
