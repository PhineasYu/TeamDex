import { ArrowLeft, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { PageTransition } from '../../components/Shell';
import { useToast } from '../../components/Toast';
import { ErrorNote, Panel, Pill, Spinner, Toggle } from '../../components/ui';
import { api, DEPARTMENTS, type Avatar, type CardInput, type Department, type Person } from '../../lib/api';
import { DEPT_LABEL, HOLO } from '../../lib/departments';
import { useData } from '../../lib/hooks';
import type { Session } from '../../lib/session';
import { play } from '../../lib/sound';

const HAIR = ['#13222E', '#2B1D14', '#6B3E26', '#D9B38C', '#F2C14E', '#FF7AB8'];
const SKIN = ['#F6D2B8', '#F1C6A0', '#E8B48A', '#C68B59', '#8D5A3B'];
const SHIRT_EXTRA = ['#BDF4E0', '#FCD9EF', '#5AAFE3', '#C8F53C', '#FFFFFF'];
const SHOES = ['#C8F53C', '#FF7AB8', '#5AAFE3', '#13222E'];

export function EditCard({ session }: { session: Session }) {
  const { data: me, loading } = useData(() => api.getPerson(session.personId), [session.personId]);
  if (loading || !me) return <div className="page"><Spinner /></div>;
  return <Editor me={me} />;
}

function Editor({ me }: { me: Person }) {
  const nav = useNavigate();
  const toast = useToast();
  const [avatar, setAvatar] = useState<Avatar>(me.avatar);
  const [role, setRole] = useState(me.role_title);
  const [dept, setDept] = useState<Department>(me.department);
  const [topics, setTopics] = useState<string[]>([0, 1, 2].map((i) => me.help_topics[i] ?? ''));
  const [prompt, setPrompt] = useState(me.fun_fact_prompt ?? '');
  const [factText, setFactText] = useState('');
  const [keywords, setKeywords] = useState('');
  const [hidden, setHidden] = useState(me.hidden);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hasFact = !!me.fun_fact_prompt && me.card_claimed;

  // Changing department: if the shirt was the old department colour, follow the new one.
  useEffect(() => {
    setAvatar((a) => (Object.values(HOLO).some((c) => c[0] === a.shirt) ? { ...a, shirt: HOLO[dept][0] } : a));
  }, [dept]);

  const preview: Person = {
    ...me,
    avatar,
    role_title: role || 'Your role',
    department: dept,
    help_topics: topics.map((t) => t.trim()).filter(Boolean),
    card_claimed: true,
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const kw = keywords.split(',').map((k) => k.trim().toLowerCase()).filter((k) => k.length > 0);
    if (!role.trim()) return setErr('Add your role so newcomers know what you do.');
    if (factText.trim() && kw.length === 0) return setErr('Add at least one answer word, so we can check what newcomers type.');
    if (factText.trim() && !prompt.trim()) return setErr('Add the question newcomers should ask you.');
    if (!hasFact && prompt.trim() && !factText.trim()) return setErr('Add the fun fact itself, revealed once they ask you.');

    const input: CardInput = {
      role_title: role.trim(),
      department: dept,
      help_topics: topics.map((t) => t.trim()).filter(Boolean).slice(0, 3),
      avatar,
      hidden,
    };
    if (prompt.trim()) input.fun_fact_prompt = prompt.trim();
    if (factText.trim()) {
      input.fun_fact_text = factText.trim();
      input.answer_keywords = kw;
    }
    setSaving(true);
    try {
      await api.updateMyCard(me.id, input);
      play('pop');
      toast({ title: 'Card saved', body: 'Newcomers will see your new card right away.', person: preview });
      nav('/me/card');
    } catch {
      setErr("Couldn't save. Check your connection and try again.");
      setSaving(false);
    }
  };

  return (
    <div className="page page-bare">
      <PageTransition>
        <Link to="/me/card" className="mb-2 inline-flex min-h-[44px] items-center gap-1 text-[15px] font-semibold text-muted">
          <ArrowLeft size={18} /> My card
        </Link>
        <h1 className="text-title">{me.card_claimed ? 'Edit my card' : 'Claim your card'}</h1>

        <div className="sticky top-0 z-10 -mx-4 mt-3 flex items-center gap-4 bg-paper/95 px-4 py-3" style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
          <Card person={preview} scale={0.4} />
          <div className="text-[14px] leading-snug text-muted">
            <b className="text-ink">Live preview.</b>
            <br />
            This is what newcomers see when they scan you.
          </div>
        </div>

        <form onSubmit={save} className="mt-3 flex flex-col gap-[10px]">
          <Panel color="white">
            <h2 className="mb-3 text-[17px] font-bold">Your pixel self</h2>
            <Swatches label="Hair" options={HAIR} value={avatar.hair} onChange={(hair) => setAvatar({ ...avatar, hair })} />
            <Swatches label="Skin" options={SKIN} value={avatar.skin} onChange={(skin) => setAvatar({ ...avatar, skin })} />
            <Swatches label="Top" options={[HOLO[dept][0], ...SHIRT_EXTRA]} value={avatar.shirt} onChange={(shirt) => setAvatar({ ...avatar, shirt })} />
            <Swatches label="Shoes" options={SHOES} value={avatar.shoes} onChange={(shoes) => setAvatar({ ...avatar, shoes })} />
          </Panel>

          <Panel color="white">
            <Field label="Role">
              <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={32} className={inputCls} placeholder="Backend Engineer" />
            </Field>
            <div className="mt-4">
              <span className="mb-2 block text-[13px] font-semibold text-muted">Department</span>
              <div className="flex flex-wrap gap-2">
                {DEPARTMENTS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDept(d)}
                    aria-pressed={dept === d}
                    className={`min-h-[44px] rounded-full px-4 text-[14px] font-semibold ${dept === d ? 'text-ink ring-2 ring-ink' : 'bg-paper text-muted'}`}
                    style={dept === d ? { background: `linear-gradient(90deg, ${HOLO[d][0]}, ${HOLO[d][1]})` } : undefined}
                  >
                    {DEPT_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel color="mint">
            <h2 className="text-[17px] font-bold">Ask me about</h2>
            <p className="mb-3 text-[14px]">Up to three things newcomers can come to you for. These also power their "Who do I ask?" quiz.</p>
            <div className="flex flex-col gap-2">
              {topics.map((t, i) => (
                <input
                  key={i}
                  value={t}
                  onChange={(e) => setTopics(topics.map((x, k) => (k === i ? e.target.value : x)))}
                  maxLength={40}
                  className={inputCls}
                  placeholder={['APIs', 'servers', 'why the build is red'][i]}
                  aria-label={`Topic ${i + 1}`}
                />
              ))}
            </div>
          </Panel>

          <Panel color="pink">
            <h2 className="text-[17px] font-bold">A fun fact, face to face only</h2>
            <p className="mb-3 text-[14px]">Newcomers see the question. They unlock the answer by asking you in person.</p>
            <Field label="The question they see">
              <input value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={80} className={inputCls} placeholder={`Ask ${me.display_name} how they get to work in winter`} />
            </Field>
            <Field label={hasFact ? 'New fun fact (leave empty to keep yours)' : 'The fun fact'} className="mt-3">
              <input value={factText} onChange={(e) => setFactText(e.target.value)} maxLength={90} className={inputCls} placeholder="Skates to work across the lake in winter." />
            </Field>
            <Field label="Answer words that count (comma separated, kept secret)" className="mt-3">
              <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className={inputCls} placeholder="skate, ice" autoCapitalize="none" />
            </Field>
          </Panel>

          <Panel color="white" className="!py-2">
            <Toggle checked={hidden} onChange={setHidden} label="Hide my card from newcomers" />
          </Panel>

          {err && <ErrorNote>{err}</ErrorNote>}

          <Pill type="submit" block disabled={saving} className="mt-2">
            <Check size={18} /> {saving ? 'Saving…' : me.card_claimed ? 'Save my card' : 'Claim my card'}
          </Pill>
        </form>
      </PageTransition>
    </div>
  );
}

const inputCls = 'h-12 w-full rounded-2xl border-[1.5px] border-line bg-white px-4 text-[16px] focus:border-ink focus:outline-none';

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

function Swatches({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="w-12 flex-none text-[13px] font-semibold text-muted">{label}</span>
      <div className="flex flex-wrap gap-0.5">
        {options.map((c) => {
          const on = c.toLowerCase() === value.toLowerCase();
          return (
            <button key={c} type="button" onClick={() => onChange(c)} aria-label={`${label} ${c}`} aria-pressed={on} className="flex h-11 w-11 items-center justify-center">
              <span className={`h-8 w-8 rounded-full border border-ink/15 ${on ? 'ring-[3px] ring-ink ring-offset-2' : ''}`} style={{ background: c }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
