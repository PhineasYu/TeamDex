import { ArrowRight, PartyPopper, RotateCcw, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { QRBlock } from '../../components/QRBlock';
import { useToast } from '../../components/Toast';
import { AvatarBubble, ErrorNote, Panel, Pill, Spinner } from '../../components/ui';
import { api } from '../../lib/api';
import { useData } from '../../lib/hooks';
import { publicBaseUrl } from '../../lib/progress';
import { homeFor, setPendingToken, setSession, type Role } from '../../lib/session';
import { play, unlockAudio } from '../../lib/sound';

// The two people on stage, plus HR for the dashboard.
const DEMO_CODE = 'FIKA24';
const CAST: { slug: string; name: string; role: Role; blurb: string }[] = [
  { slug: 'yunfei', name: 'Yunfei', role: 'newcomer', blurb: 'The newcomer. Scans cards with the phone camera.' },
  { slug: 'patrik', name: 'Patrik', role: 'colleague', blurb: 'The colleague. Shows his card QR code.' },
  { slug: 'hr', name: 'Johan', role: 'hr', blurb: 'HR console with live progress.' },
];

async function loadCompany() {
  const company = await api.getCompanyByCode(DEMO_CODE);
  if (!company) return null;
  return { company, people: await api.listPeople(company.id) };
}

/** Clears who this phone is, so the app starts again at the team-code screen. */
function forgetThisDevice() {
  setSession(null);
  setPendingToken(null);
}

/** /demo/:who — one-tap sign-in for the demo cast. */
export function DemoLogin() {
  const { who = '' } = useParams();
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const cast = CAST.find((c) => c.slug === who.toLowerCase());
      if (!cast) return setErr(`No demo person called "${who}".`);
      const data = await loadCompany().catch(() => null);
      const person = data?.people.find((p) => p.display_name.toLowerCase() === cast.name.toLowerCase());
      if (!data) return setErr("Couldn't load the demo team. Check the connection and try again.");
      if (!person) return setErr(`${cast.name} isn't in the demo data yet. Re-run supabase/schema.sql in the Supabase SQL Editor, then scan again.`);
      setPendingToken(null);
      setSession({ companyId: data.company.id, joinCode: data.company.join_code, personId: person.id, role: cast.role });
      nav(cast.role === 'colleague' ? '/me/card' : homeFor(cast.role), { replace: true });
    })();
  }, [who, nav]);

  return (
    <div className="page page-bare flex min-h-[100dvh] flex-col items-center justify-center text-center">
      {err ? (
        <>
          <ErrorNote>{err}</ErrorNote>
          <Pill className="mt-4" onClick={() => nav('/demo')}>
            Demo control
          </Pill>
        </>
      ) : (
        <Spinner label="Signing in" />
      )}
    </div>
  );
}

/** /demo — control panel for running the pitch demo again and again. */
export function DemoPage() {
  const nav = useNavigate();
  const toast = useToast();
  const { data, loading, reload } = useData(loadCompany, []);
  const [busy, setBusy] = useState<string | null>(null);
  const base = publicBaseUrl();

  if (loading) return <div className="page"><Spinner /></div>;
  if (!data) return <div className="page"><ErrorNote>Couldn't load the demo team ({DEMO_CODE}).</ErrorNote></div>;
  const { company, people } = data;
  const byName = (n: string) => people.find((p) => p.display_name === n);

  const resetAll = async () => {
    setBusy('reset');
    try {
      await api.resetDemo(company.id);
      forgetThisDevice();
      play('pop');
      toast({ title: 'Demo reset', body: 'Data is back to the start. This phone is signed out.' });
      reload();
    } finally {
      setBusy(null);
    }
  };

  // Yunfei collects every key colleague except Patrik, so scanning Patrik live unlocks the party.
  const prepareFinale = async () => {
    setBusy('finale');
    try {
      const yunfei = byName('Yunfei');
      const patrik = byName('Patrik');
      if (!yunfei || !patrik) return;
      const quest = await api.getQuestForNewcomer(yunfei.id);
      const others = (quest?.targets ?? []).filter((t) => t.person_id !== patrik.id);
      for (const t of others) {
        const token = await api.getMyQrToken(t.person_id);
        await api.collectCard(yunfei.id, token);
      }
      play('pop');
      toast({ title: 'Finale ready', body: `Yunfei has ${others.length} of ${quest?.party_goal ?? 5}. Scanning Patrik unlocks the party.` });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page page-bare">
      <Logo size={22} />
      <h1 className="text-hero mt-5">Demo control</h1>
      <p className="mt-2 text-[15px] text-muted">
        {company.name} · code {company.join_code}. Keep this page open on a laptop during the pitch.
      </p>

      <Panel color="lime" className="mt-5">
        <h2 className="text-[18px] font-bold">1. Reset before each run</h2>
        <p className="mt-1 text-[14px]">Clears every collected card, fun fact, quiz and party. This phone goes back to the team-code screen.</p>
        <Pill variant="dark" block className="mt-3" disabled={!!busy} onClick={resetAll}>
          <RotateCcw size={18} /> {busy === 'reset' ? 'Resetting…' : 'Reset all demo data'}
        </Pill>
      </Panel>

      <h2 className="mb-2 mt-7 text-[18px] font-bold">2. Put each person on their phone</h2>
      <p className="mb-3 text-[14px] text-muted">Scan a code with that phone's camera. It signs straight in, no team code needed.</p>
      <div className="flex flex-col gap-[10px]">
        {CAST.map((c) => {
          const person = byName(c.name);
          const url = `${base}/demo/${c.slug}/`;
          return (
            <Panel key={c.slug} color={c.role === 'newcomer' ? 'mint' : c.role === 'colleague' ? 'sky' : 'white'} className="!p-4">
              <div className="flex items-center gap-3">
                {person && <AvatarBubble person={person} size={48} />}
                <div className="min-w-0 flex-1">
                  <p className="text-[18px] font-bold leading-tight">
                    {c.name} <span className="text-[13px] font-semibold opacity-60">· {c.role === 'hr' ? 'HR' : c.role}</span>
                  </p>
                  <p className="text-[13px] leading-snug">{c.blurb}</p>
                </div>
              </div>
              {c.role !== 'hr' && (
                <div className="mt-3 flex items-center gap-3">
                  <QRBlock value={url} size={112} />
                  <p className="min-w-0 flex-1 break-all text-[12px] opacity-80">{url}</p>
                </div>
              )}
              <Pill
                variant={c.role === 'hr' ? 'secondary' : 'ghost'}
                block
                className="mt-3"
                onClick={() => {
                  unlockAudio();
                  nav(`/demo/${c.slug}`);
                }}
              >
                <Smartphone size={18} /> Be {c.name} on this device <ArrowRight size={16} />
              </Pill>
            </Panel>
          );
        })}
      </div>

      <h2 className="mb-2 mt-7 text-[18px] font-bold">3. Optional: party finale</h2>
      <Panel color="pink">
        <p className="text-[14px]">
          Gives Yunfei four of her five key colleagues now, leaving Patrik. When Yunfei scans Patrik on stage, the swap plays and the onboarding party unlocks.
        </p>
        <Pill block className="mt-3" disabled={!!busy} onClick={prepareFinale}>
          <PartyPopper size={18} /> {busy === 'finale' ? 'Collecting…' : 'Prepare the party finale'}
        </Pill>
      </Panel>

      <h2 className="mb-2 mt-7 text-[18px] font-bold">Show the sign-up flow</h2>
      <Panel color="white">
        <p className="text-[14px]">Want to show entering the team code on Yunfei's phone? Start over there, then type {company.join_code} and pick Yunfei.</p>
        <Pill
          variant="secondary"
          block
          className="mt-3"
          onClick={() => {
            forgetThisDevice();
            nav('/');
          }}
        >
          Start over on this device
        </Pill>
      </Panel>
    </div>
  );
}
