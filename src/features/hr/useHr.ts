import { api } from '../../lib/api';
import { useData, useLiveEvents } from '../../lib/hooks';
import type { Session } from '../../lib/session';

export function useHr(session: Session) {
  const q = useData(async () => {
    const [me, company, people, quests, connections, attempts, pulses, events] = await Promise.all([
      api.getPerson(session.personId),
      api.getCompany(session.companyId),
      api.listPeople(session.companyId),
      api.listQuests(session.companyId),
      api.listAllConnections(session.companyId),
      api.listQuizAttempts(session.companyId),
      api.listPulseChecks(session.companyId),
      api.listEvents(session.companyId, 30),
    ]);
    return { me, company, people, quests, connections, attempts, pulses, events };
  }, [session.companyId, session.personId]);

  useLiveEvents(session.companyId, () => q.reload());
  return q;
}
