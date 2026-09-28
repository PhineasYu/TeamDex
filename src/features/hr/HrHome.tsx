import { PartyPopper, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Feed } from '../../components/Feed';
import { PageTransition, TopBar } from '../../components/Shell';
import { AvatarBubble, Panel, PillLink, ProgressBar, SectionTitle, Spinner } from '../../components/ui';
import { questProgress, relativeTime } from '../../lib/progress';
import type { Session } from '../../lib/session';
import { useHr } from './useHr';

export function HrHome({ session }: { session: Session }) {
  const { data, loading } = useHr(session);
  if (loading || !data) return <div className="page"><Spinner /></div>;
  const { me, people, quests, connections, attempts, events } = data;
  const byId = new Map(people.map((p) => [p.id, p]));
  const newcomers = people.filter((p) => p.kind === 'newcomer');

  return (
    <div className="page">
      <PageTransition>
        <TopBar me={me} />
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-hero">Newcomers</h1>
          <Link to="/hr/new" className="flex h-11 items-center gap-1 rounded-full bg-lime px-4 text-[14px] font-semibold">
            <Plus size={18} /> New quest
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-[10px]">
          {newcomers.map((n) => {
            const quest = quests.filter((q) => q.newcomer_id === n.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
            const mine = connections.filter((c) => c.collector_id === n.id);
            const { done, goal, collectedTargets } = questProgress(quest, connections, n.id);
            const facts = mine.filter((c) => c.fact_unlocked_at).length;
            const quiz = quest ? attempts.filter((a) => a.quest_id === quest.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] : undefined;
            const last = events.find((e) => e.actor_id === n.id);
            const complete = !!quest?.party_unlocked_at;
            return (
              <Panel key={n.id} color={complete ? 'mint' : 'white'} className="!p-4">
                <div className="flex items-center gap-3">
                  <AvatarBubble person={n} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[18px] font-bold leading-tight">{n.display_name}</p>
                    <p className="truncate text-[14px] text-muted">
                      {n.role_title}
                      {n.start_date ? ` · starts ${new Date(n.start_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                    </p>
                  </div>
                  {complete && (
                    <span className="flex items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-[12px] font-bold">
                      <PartyPopper size={14} /> Complete
                    </span>
                  )}
                </div>
                {quest ? (
                  <>
                    <div className="mt-3">
                      <ProgressBar value={done} max={goal} label={`${done}/${goal}`} />
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      {quest.targets.map((t) => {
                        const p = byId.get(t.person_id);
                        return p ? <AvatarBubble key={t.person_id} person={p} size={34} silhouette={!collectedTargets.has(t.person_id)} /> : null;
                      })}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <Stat label="Cards" value={String(mine.filter((c) => c.method === 'qr').length)} />
                      <Stat label="Fun facts" value={String(facts)} />
                      <Stat label="Quiz" value={quiz ? `${quiz.score}/${quiz.total}` : '–'} />
                    </div>
                    <p className="mt-3 text-[13px] text-muted">{last ? `Last activity ${relativeTime(last.created_at)}` : 'No activity yet'}</p>
                  </>
                ) : (
                  <PillLink to={`/hr/new?newcomer=${n.id}`} block className="mt-3">
                    Create onboarding quest
                  </PillLink>
                )}
              </Panel>
            );
          })}
        </div>

        <SectionTitle>Live activity</SectionTitle>
        <Feed events={events} people={people} />
      </PageTransition>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-paper px-2 py-2">
      <div className="text-[20px] font-extrabold leading-none tabular-nums">{value}</div>
      <div className="mt-1 text-[12px] font-semibold text-muted">{label}</div>
    </div>
  );
}
