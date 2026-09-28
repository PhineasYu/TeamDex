import { Network, RotateCcw, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { PageTransition, TopBar } from '../../components/Shell';
import { useToast } from '../../components/Toast';
import { AvatarBubble, Panel, Pill, PillLink, ProgressBar, SectionTitle, Spinner } from '../../components/ui';
import { api, DEPARTMENTS, type Department } from '../../lib/api';
import { DEPT_LABEL } from '../../lib/departments';
import { publicBaseUrl } from '../../lib/progress';
import type { Session } from '../../lib/session';
import { CopyButton } from './NewQuest';
import { useHr } from './useHr';

const inputCls = 'h-12 w-full rounded-2xl border-[1.5px] border-line bg-white px-4 text-[16px] focus:border-ink focus:outline-none';

export function TeamList({ session }: { session: Session }) {
  const { data, loading, reload } = useHr(session);
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', role: '', dept: 'engineering' as Department });

  if (loading || !data) return <div className="page"><Spinner /></div>;
  const colleagues = data.people.filter((p) => p.kind === 'colleague');
  const claimed = colleagues.filter((p) => p.card_claimed).length;
  const claimUrl = `${publicBaseUrl()}/join/${data.company?.join_code ?? ''}`;

  const reset = async () => {
    setResetting(true);
    try {
      await api.resetDemo(session.companyId);
      toast({ title: 'Demo reset', body: 'Everything is back to the starting state.' });
      setConfirmReset(false);
      reload();
    } finally {
      setResetting(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    await api.hrAddPerson({ company_id: session.companyId, display_name: draft.name.trim(), role_title: draft.role.trim(), department: draft.dept, kind: 'colleague' });
    setDraft({ name: '', role: '', dept: draft.dept });
    setAdding(false);
    reload();
  };

  return (
    <div className="page">
      <PageTransition>
        <TopBar me={data.me} />
        <h1 className="text-hero">Team</h1>

        <Panel color="mint" className="mt-4">
          <p className="mb-3 text-[17px] font-bold">
            {claimed} of {colleagues.length} cards set up
          </p>
          <ProgressBar value={claimed} max={colleagues.length} label={`${Math.round((claimed / Math.max(1, colleagues.length)) * 100)}%`} />
          <p className="mt-3 text-[14px]">Share the claim link. Colleagues pick their name and set up their card in two minutes.</p>
          <p className="mt-2 break-all rounded-xl bg-white/70 px-3 py-2 font-mono text-[13px]">{claimUrl}</p>
          <CopyButton text={claimUrl} />
        </Panel>
        <PillLink to="/me/org" variant="secondary" block className="mt-[10px]">
          <Network size={18} /> Open the org chart
        </PillLink>

        <SectionTitle
          right={
            <button type="button" onClick={() => setAdding((v) => !v)} className="flex min-h-[44px] items-center gap-1 text-[14px] font-semibold underline underline-offset-4">
              <UserPlus size={16} /> Add
            </button>
          }
        >
          Colleagues
        </SectionTitle>
        {adding && (
          <form onSubmit={add} className="mb-3 flex flex-col gap-2 rounded-panel bg-white p-4">
            <input className={inputCls} placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="Name" />
            <input className={inputCls} placeholder="Role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} aria-label="Role" />
            <select className={inputCls} value={draft.dept} onChange={(e) => setDraft({ ...draft, dept: e.target.value as Department })} aria-label="Department">
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {DEPT_LABEL[d]}
                </option>
              ))}
            </select>
            <Pill type="submit" disabled={!draft.name.trim()}>
              Add colleague
            </Pill>
          </form>
        )}
        <ul className="flex flex-col gap-2">
          {colleagues.map((p) => (
            <li key={p.id} className="flex min-h-[60px] items-center gap-3 rounded-[22px] bg-white px-3 py-2">
              <AvatarBubble person={p} size={44} silhouette={!p.card_claimed} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold leading-tight">
                  {p.display_name}
                  {p.is_hr && <span className="ml-1.5 rounded-full bg-paper px-2 py-0.5 text-[11px] font-semibold text-muted">HR</span>}
                </span>
                <span className="block truncate text-[13px] text-muted">
                  {p.role_title || DEPT_LABEL[p.department]}
                </span>
              </span>
              {p.card_claimed ? (
                <span className="rounded-full bg-mint px-2.5 py-1 text-[12px] font-bold">Card ready</span>
              ) : (
                <span className="rounded-full bg-pink px-2.5 py-1 text-[12px] font-bold">Coming soon</span>
              )}
            </li>
          ))}
        </ul>

        <SectionTitle>Demo</SectionTitle>
        <Panel color="white">
          {confirmReset ? (
            <>
              <p className="mb-3 text-[15px] font-semibold">Reset all demo data? Collected cards, quests and quiz scores go back to the start.</p>
              <div className="flex gap-2">
                <Pill variant="dark" className="flex-1" disabled={resetting} onClick={reset}>
                  {resetting ? 'Resetting…' : 'Yes, reset'}
                </Pill>
                <Pill variant="secondary" className="flex-1" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Pill>
              </div>
            </>
          ) : (
            <Pill variant="secondary" block onClick={() => setConfirmReset(true)}>
              <RotateCcw size={18} /> Reset demo
            </Pill>
          )}
        </Panel>
      </PageTransition>
    </div>
  );
}
