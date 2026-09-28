import { PageTransition, TopBar } from '../../components/Shell';
import { Panel, SectionTitle, Spinner } from '../../components/ui';
import type { Session } from '../../lib/session';
import { useHr } from './useHr';

/** P1-6: team-level outcomes, computed from connections, quizzes and pulse checks. */
export function Impact({ session }: { session: Session }) {
  const { data, loading } = useHr(session);
  if (loading || !data) return <div className="page"><Spinner /></div>;
  const { people, quests, connections, attempts, pulses } = data;

  const colleagues = people.filter((p) => p.kind === 'colleague');
  const cardRate = colleagues.length ? colleagues.filter((p) => p.card_claimed).length / colleagues.length : 0;

  const newcomerIds = new Set(people.filter((p) => p.kind === 'newcomer').map((p) => p.id));
  const scans = connections.filter((c) => c.method === 'qr' && newcomerIds.has(c.collector_id));
  const factRate = scans.length ? scans.filter((c) => c.fact_unlocked_at).length / scans.length : 0;

  // Hours from quest creation to the newcomer's first collected card
  const firstTimes = quests
    .map((q) => {
      const first = scans.filter((c) => c.collector_id === q.newcomer_id).sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      return first ? (new Date(first.created_at).getTime() - new Date(q.created_at).getTime()) / 3600_000 : null;
    })
    .filter((h): h is number => h != null && h >= 0);
  const avgFirst = firstTimes.length ? firstTimes.reduce((a, b) => a + b, 0) / firstTimes.length : null;

  const quizAvg = attempts.length ? attempts.reduce((a, b) => a + b.score / b.total, 0) / attempts.length : null;
  const completed = quests.filter((q) => q.party_unlocked_at).length;

  const day1 = pulses.filter((p) => p.day === 1);
  const day5 = pulses.filter((p) => p.day === 5);
  const avg = (xs: { score: number }[]) => (xs.length ? xs.reduce((a, b) => a + b.score, 0) / xs.length : null);
  const p1 = avg(day1);
  const p5 = avg(day5);

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div className="page">
      <PageTransition>
        <TopBar me={data.me} />
        <h1 className="text-hero">Impact</h1>
        <p className="mt-2 text-[15px] text-muted">Is the team ready, and are newcomers actually meeting people?</p>

        <div className="mt-4 grid grid-cols-2 gap-[10px]">
          <Metric color="mint" value={pct(cardRate)} label="Colleague cards set up" />
          <Metric color="pink" value={pct(factRate)} label="Fun facts unlocked in person" />
          <Metric color="white" value={avgFirst == null ? '–' : avgFirst < 1 ? '<1 h' : `${Math.round(avgFirst)} h`} label="To first card collected" />
          <Metric color="white" value={quizAvg == null ? '–' : pct(quizAvg)} label="Quiz accuracy" />
          <Metric color="lime" value={`${completed}/${quests.length}`} label="Quests completed" />
          <Metric color="sky" value={String(scans.length)} label="Real conversations started" />
        </div>

        <SectionTitle>"I know who to ask for help"</SectionTitle>
        <Panel color="white">
          <div className="flex items-end gap-6">
            <PulseBar label="Day 1" value={p1} />
            <PulseBar label="Day 5" value={p5} highlight />
            <div className="flex-1 pb-1 text-[15px]">
              {p1 != null && p5 != null ? (
                <>
                  <span className="text-[34px] font-extrabold leading-none tracking-[-0.03em]">
                    {p5 - p1 >= 0 ? '+' : ''}
                    {(p5 - p1).toFixed(1)}
                  </span>
                  <br />
                  points self-rated confidence, first week
                </>
              ) : (
                'Collected on day 1 and day 5.'
              )}
            </div>
          </div>
        </Panel>
      </PageTransition>
    </div>
  );
}

function Metric({ value, label, color }: { value: string; label: string; color: 'mint' | 'pink' | 'white' | 'lime' | 'sky' }) {
  return (
    <Panel color={color} className="!p-4">
      <div className="text-[34px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{value}</div>
      <div className="mt-2 text-[13px] font-semibold leading-snug">{label}</div>
    </Panel>
  );
}

function PulseBar({ label, value, highlight }: { label: string; value: number | null; highlight?: boolean }) {
  const h = value == null ? 6 : (value / 5) * 110;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[15px] font-bold tabular-nums">{value == null ? '–' : value.toFixed(1)}</span>
      <div className="flex h-[110px] w-12 items-end rounded-xl bg-paper">
        <div className={`w-full rounded-xl ${highlight ? 'bg-lime' : 'bg-line'}`} style={{ height: h }} />
      </div>
      <span className="text-[12px] font-semibold text-muted">{label}</span>
    </div>
  );
}
