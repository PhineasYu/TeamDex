import { CreditCard, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Feed } from '../../components/Feed';
import { PageTransition, TopBar } from '../../components/Shell';
import { Panel, PillLink, SectionTitle, Spinner } from '../../components/ui';
import { api } from '../../lib/api';
import { useData, useLiveEvents } from '../../lib/hooks';
import type { Session } from '../../lib/session';

export function ColleagueHome({ session }: { session: Session }) {
  const { data, loading, reload } = useData(async () => {
    const [me, people, quests, connections, events] = await Promise.all([
      api.getPerson(session.personId),
      api.listPeople(session.companyId),
      api.listQuests(session.companyId),
      api.listConnections(session.personId),
      api.listEvents(session.companyId, 20),
    ]);
    return { me, people, quests, connections, events };
  }, [session.personId]);

  useLiveEvents(session.companyId, () => reload());

  if (loading || !data) return <div className="page"><Spinner /></div>;
  const { me, people, quests, connections, events } = data;
  const byId = new Map(people.map((p) => [p.id, p]));

  // Newcomers whose quest names me as a key colleague (and haven't collected me yet)
  const mine = new Set(connections.map((c) => c.collected_id));
  const incoming = quests
    .filter((q) => !q.party_unlocked_at)
    .map((q) => ({ q, t: q.targets.find((t) => t.person_id === session.personId), newcomer: byId.get(q.newcomer_id) }))
    .filter((x) => x.t && x.newcomer);
  const gotCards = connections
    .filter((c) => c.method === 'exchange')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((c) => byId.get(c.collected_id))
    .filter((p) => !!p);
  const scale = (Math.min(window.innerWidth, 560) - 32 - 10) / 2 / 360;

  return (
    <div className="page">
      <PageTransition>
        <TopBar me={me} />
        <h1 className="text-hero">Hi {me?.display_name}</h1>

        {me && !me.card_claimed ? (
          <Panel color="lime" className="mt-4">
            <p className="text-[19px] font-bold leading-tight">Claim your card</p>
            <p className="mt-1 text-[15px]">New colleagues are starting soon. Make your pixel self and pick what people can ask you about. Takes two minutes.</p>
            <PillLink to="/me/edit" variant="dark" block className="mt-4">
              <Pencil size={18} /> Set up my card
            </PillLink>
          </Panel>
        ) : (
          <Panel color="sky" className="mt-4 flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold leading-tight">Meeting a newcomer?</p>
              <p className="mt-1 text-[14px]">Show them your card so they can scan it. You'll get theirs too.</p>
            </div>
            <PillLink to="/me/card" variant="primary" className="flex-none">
              <CreditCard size={18} /> My card
            </PillLink>
          </Panel>
        )}

        <SectionTitle>Newcomer cards you got</SectionTitle>
        {gotCards.length ? (
          <div className="grid grid-cols-2 gap-[10px]">
            {gotCards.map((p) => (
              <Card key={p!.id} person={p!} scale={scale} />
            ))}
          </div>
        ) : (
          <p className="rounded-[22px] bg-white px-4 py-4 text-[15px] text-muted">When a newcomer scans your card, you get theirs here.</p>
        )}

        {incoming.length > 0 && (
          <>
            <SectionTitle>New this week</SectionTitle>
            <div className="flex flex-col gap-[10px]">
              {incoming.map(({ q, t, newcomer }) => (
                <Panel key={q.id} color="mint" className="flex items-center gap-4 !p-4">
                  <Card person={newcomer!} scale={0.3} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-bold leading-tight">
                      {newcomer!.display_name}, {newcomer!.role_title}
                    </p>
                    <p className="mt-1 text-[14px]">
                      {mine.has(newcomer!.id) ? 'You two have met. ' : ''}You're one of {q.targets.length} people they'll meet first.
                    </p>
                    <p className="mt-2 rounded-xl bg-white/70 px-3 py-1.5 text-[13px]">
                      <b>Why you:</b> {t!.reason || 'Key colleague'}
                    </p>
                  </div>
                </Panel>
              ))}
            </div>
          </>
        )}

        <SectionTitle right={<Link to="/me/card" className="text-[14px] font-semibold underline underline-offset-4">My card</Link>}>Around the team</SectionTitle>
        <Feed events={events} people={people} />
      </PageTransition>
    </div>
  );
}
