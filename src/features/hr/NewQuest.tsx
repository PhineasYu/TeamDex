import { Check, Copy, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRBlock } from '../../components/QRBlock';
import { PageTransition, TopBar } from '../../components/Shell';
import { AvatarBubble, ErrorNote, Panel, Pill, PillLink, SectionTitle, Spinner } from '../../components/ui';
import { api, DEPARTMENTS, type Department, type Person } from '../../lib/api';
import { DEPT_LABEL } from '../../lib/departments';
import { formatNames, publicBaseUrl } from '../../lib/progress';
import type { Session } from '../../lib/session';
import { play } from '../../lib/sound';
import { useHr } from './useHr';

const GOAL = 5;
const inputCls = 'h-12 w-full rounded-2xl border-[1.5px] border-line bg-white px-4 text-[16px] focus:border-ink focus:outline-none';

export function NewQuest({ session }: { session: Session }) {
  const { data, loading, reload } = useHr(session);
  const [params] = useSearchParams();
  const [newcomerId, setNewcomerId] = useState<string | 'new' | null>(params.get('newcomer'));
  const [draft, setDraft] = useState({ name: '', role: '', dept: 'design' as Department, start: new Date().toISOString().slice(0, 10) });
  const [picked, setPicked] = useState<string[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ newcomer: Person; names: string[] } | null>(null);

  const colleagues = useMemo(() => data?.people.filter((p) => p.kind === 'colleague') ?? [], [data]);
  if (loading || !data) return <div className="page"><Spinner /></div>;
  const newcomers = data.people.filter((p) => p.kind === 'newcomer');
  const hasQuest = newcomerId && newcomerId !== 'new' && data.quests.some((q) => q.newcomer_id === newcomerId);
  const inviteUrl = `${publicBaseUrl()}/join/${data.company?.join_code ?? ''}`;

  const toggle = (id: string) => {
    setPicked((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : xs.length >= GOAL ? xs : [...xs, id]));
  };

  const create = async () => {
    setErr(null);
    if (!newcomerId) return setErr('Choose a newcomer first.');
    if (newcomerId === 'new' && !draft.name.trim()) return setErr("Add the newcomer's name.");
    if (picked.length === 0) return setErr('Pick the key colleagues they should meet.');
    setBusy(true);
    try {
      let newcomer: Person;
      if (newcomerId === 'new') {
        newcomer = await api.hrAddPerson({
          company_id: session.companyId,
          display_name: draft.name.trim(),
          role_title: draft.role.trim(),
          department: draft.dept,
          kind: 'newcomer',
          start_date: draft.start || null,
        });
      } else {
        newcomer = data.people.find((p) => p.id === newcomerId)!;
      }
      await api.hrCreateQuest(
        newcomer.id,
        picked.map((id) => ({ person_id: id, reason: (reasons[id] ?? '').trim() })),
        picked.length,
      );
      play('pop');
      setDone({ newcomer, names: picked.map((id) => colleagues.find((c) => c.id === id)?.display_name ?? '') });
      reload();
    } catch {
      setErr("Couldn't create the quest. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="page">
        <PageTransition>
          <TopBar me={data.me} />
          <h1 className="text-hero">
            Quest <span className="hl">ready</span>
          </h1>
          <Panel color="mint" className="mt-4">
            <p className="text-[17px] font-bold">{done.newcomer.display_name}'s onboarding quest is live.</p>
            <p className="mt-1 text-[15px]">{formatNames(done.names)} were told they're one of the first people {done.newcomer.display_name} will meet.</p>
          </Panel>
          <Panel color="white" className="mt-[10px] flex flex-col items-center text-center">
            <p className="mb-3 text-[15px] font-semibold">Send this invite to {done.newcomer.display_name}</p>
            <QRBlock value={inviteUrl} size={200} />
            <p className="mt-3 break-all text-[14px] text-muted">{inviteUrl}</p>
            <CopyButton text={inviteUrl} />
          </Panel>
          <PillLink to="/hr" variant="secondary" block className="mt-4">
            Back to newcomers
          </PillLink>
        </PageTransition>
      </div>
    );
  }

  return (
    <div className="page">
      <PageTransition>
        <TopBar me={data.me} />
        <h1 className="text-hero">Create onboarding quest</h1>

        <SectionTitle>1. Who's starting?</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {newcomers.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setNewcomerId(n.id)}
              aria-pressed={newcomerId === n.id}
              className={`flex min-h-[48px] items-center gap-2 rounded-full py-1 pl-1 pr-4 text-[15px] font-semibold ${newcomerId === n.id ? 'bg-ink text-white' : 'bg-white'}`}
            >
              <AvatarBubble person={n} size={40} /> {n.display_name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setNewcomerId('new')}
            aria-pressed={newcomerId === 'new'}
            className={`flex min-h-[48px] items-center gap-2 rounded-full px-4 text-[15px] font-semibold ${newcomerId === 'new' ? 'bg-ink text-white' : 'border-[1.5px] border-dashed border-ink/40'}`}
          >
            <UserPlus size={18} /> Someone new
          </button>
        </div>
        {hasQuest && <p className="mt-2 text-[14px] text-muted">They already have a quest. A new one replaces it.</p>}
        {newcomerId === 'new' && (
          <Panel color="white" className="mt-3 flex flex-col gap-3">
            <input className={inputCls} placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="Name" />
            <input className={inputCls} placeholder="Role, e.g. Design Intern" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} aria-label="Role" />
            <div className="flex gap-2">
              <select className={inputCls} value={draft.dept} onChange={(e) => setDraft({ ...draft, dept: e.target.value as Department })} aria-label="Department">
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {DEPT_LABEL[d]}
                  </option>
                ))}
              </select>
              <input type="date" className={inputCls} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} aria-label="Start date" />
            </div>
          </Panel>
        )}

        <SectionTitle right={<span className="text-[14px] font-semibold tabular-nums">{picked.length} of {GOAL}</span>}>2. Key colleagues</SectionTitle>
        <ul className="flex flex-col gap-2">
          {colleagues.map((c) => {
            const on = picked.includes(c.id);
            const full = !on && picked.length >= GOAL;
            return (
              <li key={c.id} className={`rounded-[22px] ${on ? 'bg-mint' : 'bg-white'} ${full ? 'opacity-50' : ''}`}>
                <button type="button" disabled={full} onClick={() => toggle(c.id)} className="flex min-h-[60px] w-full items-center gap-3 px-3 py-2 text-left" aria-pressed={on}>
                  <AvatarBubble person={c} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold leading-tight">{c.display_name}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {c.role_title}
                      {!c.card_claimed ? ' · card not set up' : ''}
                    </span>
                  </span>
                  <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-full ${on ? 'bg-ink text-white' : 'border-2 border-line'}`}>{on && <Check size={16} />}</span>
                </button>
                {on && (
                  <div className="px-3 pb-3">
                    <input
                      className={inputCls}
                      placeholder="Why should they meet?"
                      value={reasons[c.id] ?? ''}
                      maxLength={60}
                      onChange={(e) => setReasons({ ...reasons, [c.id]: e.target.value })}
                      aria-label={`Why should they meet ${c.display_name}?`}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {err && <div className="mt-4"><ErrorNote>{err}</ErrorNote></div>}
        <Pill block className="mt-5" disabled={busy} onClick={create}>
          {busy ? 'Creating…' : 'Create quest and invite'}
        </Pill>
      </PageTransition>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Pill
      variant="secondary"
      className="mt-3"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard blocked: the link is visible above */
        }
      }}
    >
      {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy link'}
    </Pill>
  );
}

export { CopyButton };
