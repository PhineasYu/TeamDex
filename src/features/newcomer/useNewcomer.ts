import { api } from '../../lib/api';
import { useData, useLiveEvents } from '../../lib/hooks';
import { questProgress } from '../../lib/progress';
import type { Session } from '../../lib/session';

/** Everything a newcomer screen needs, refreshed when this newcomer's events arrive. */
export function useNewcomer(session: Session) {
  const q = useData(async () => {
    const [me, people, quest, connections, facts] = await Promise.all([
      api.getPerson(session.personId),
      api.listPeople(session.companyId),
      api.getQuestForNewcomer(session.personId),
      api.listConnections(session.personId),
      api.getUnlockedFacts(session.personId),
    ]);
    const collected = new Set(connections.map((c) => c.collected_id));
    const progress = questProgress(quest, connections, session.personId);
    return { me, people, quest, connections, facts, collected, progress };
  }, [session.personId, session.companyId]);

  useLiveEvents(session.companyId, (e) => {
    if (e.actor_id === session.personId || e.type === 'card_claimed') q.reload();
  });

  return q;
}
