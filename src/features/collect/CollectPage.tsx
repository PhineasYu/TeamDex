import { motion } from 'framer-motion';
import { ArrowRight, PartyPopper } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/Card';
import { ExchangeReveal } from '../../components/ExchangeReveal';
import { Pill, PillLink, pillClass, Spinner } from '../../components/ui';
import { api, type Person } from '../../lib/api';
import { homeFor, setPendingToken, setSession, useSession } from '../../lib/session';
import { audioReady, soundEnabled } from '../../lib/sound';

type View =
  | { kind: 'loading' }
  | { kind: 'join'; person: Person; joinCode: string }
  | { kind: 'not_newcomer'; person: Person }
  | { kind: 'own'; person: Person }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'collected'; person: Person; me: Person | null; already: boolean; partyUnlocked: boolean; fact: string | null };

/** /c/:token — the link inside every card's QR code. See tech spec §7. */
export function CollectPage() {
  const { token = '' } = useParams();
  const session = useSession();
  const nav = useNavigate();
  const [view, setView] = useState<View>({ kind: 'loading' });
  const ran = useRef<string | null>(null);
  const [autoJoined, setAutoJoined] = useState(false);
  // Opened straight from the camera: nothing has been tapped yet, so the browser would mute the swap.
  const [needsTap] = useState(() => soundEnabled() && !audioReady());

  useEffect(() => {
    const key = `${token}|${session?.personId ?? ''}`;
    if (ran.current === key) return; // StrictMode / re-render guard: collect exactly once
    ran.current = key;

    (async () => {
      try {
        // 1. No identity yet (a friend scanning with the phone camera). For the demo we sign them in
        //    as the company's current newcomer so the swap plays straight away; they can switch after.
        if (!session) {
          const person = await api.getPersonByToken(token);
          if (!person) return setView({ kind: 'unavailable' });
          const company = await api.getCompany(person.company_id);
          if (!company) return setView({ kind: 'unavailable' });
          const newcomer = await pickDemoNewcomer(company.id, person.id);
          if (!newcomer) return setView({ kind: 'join', person, joinCode: company.join_code });
          setAutoJoined(true);
          // Changing the session re-runs this effect, which then collects as the newcomer.
          setSession({ companyId: company.id, joinCode: company.join_code, personId: newcomer.id, role: 'newcomer' });
          return;
        }

        // Colleagues and HR can look but not collect.
        if (session.role !== 'newcomer') {
          const person = await api.getPersonByToken(token);
          if (!person) return setView({ kind: 'unavailable' });
          if (person.id === session.personId) return setView({ kind: 'own', person });
          return setView({ kind: 'not_newcomer', person });
        }

        // 2. Collect.
        const [res, me] = await Promise.all([api.collectCard(session.personId, token), api.getPerson(session.personId)]);
        if (!res.ok) {
          if (res.error === 'own_card') {
            return me ? setView({ kind: 'own', person: me }) : setView({ kind: 'unavailable' });
          }
          return setView({ kind: 'unavailable' });
        }
        const facts = res.already ? await api.getUnlockedFacts(session.personId) : {};
        setView({ kind: 'collected', person: res.person, me, already: res.already, partyUnlocked: res.partyUnlocked, fact: facts[res.person.id] ?? null });
      } catch {
        setView({ kind: 'error' });
      }
    })();
  }, [token, session]);

  if (view.kind === 'loading') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-ink">
        <Spinner label="Collecting card" />
      </div>
    );
  }

  if (view.kind === 'collected') {
    const { person, me, already, partyUnlocked, fact } = view;
    const home = `/quest?new=${person.id}`;
    return (
      <ExchangeReveal
        theirs={person}
        mine={me}
        gate={needsTap}
        fact={fact}
        still={already}
        title={already ? 'Already in your Teamdex' : 'New card!'}
        subtitle={
          already
            ? 'Drag the card to tilt it.'
            : autoJoined && me
              ? `Welcome, ${me.display_name}! You swapped cards with ${person.display_name}.`
              : `You swapped cards with ${person.display_name}.`
        }
      >
        {partyUnlocked ? (
          <AutoContinue to="/quest/party" label="Your party is unlocked!" icon={<PartyPopper size={18} />} seconds={6} />
        ) : (
          <AutoContinue to={home} label={me ? `Continue as ${me.display_name}` : 'Go to my Teamdex'} seconds={already ? 0 : 6} />
        )}
        <PillLink to={`/quest/card/${person.id}`} variant="light" block>
          Open {person.display_name}'s card
        </PillLink>
        {autoJoined && me && (
          <button
            type="button"
            className="min-h-[44px] text-[14px] font-medium text-white/70 underline underline-offset-4"
            onClick={() => {
              setSession(null);
              setPendingToken(token);
              nav(`/join/${session?.joinCode ?? ''}`);
            }}
          >
            Not {me.display_name}? Switch
          </button>
        )}
      </ExchangeReveal>
    );
  }

  if (view.kind === 'join') {
    return (
      <Frame title="Join Teamdex to collect this card" person={view.person}>
        <Pill
          block
          onClick={() => {
            setPendingToken(token);
            nav(`/join/${view.joinCode}`);
          }}
        >
          Join Teamdex
        </Pill>
      </Frame>
    );
  }

  if (view.kind === 'own') {
    return (
      <Frame title="That's you!" person={view.person} note="Show this code to a new colleague so they can collect your card.">
        <PillLink to={homeFor(session!.role)} block>
          Back home
        </PillLink>
      </Frame>
    );
  }

  if (view.kind === 'not_newcomer') {
    return (
      <Frame title={`This is ${view.person.display_name}`} person={view.person} note="Only newcomers collect cards. Say hi anyway!">
        <PillLink to={homeFor(session!.role)} block>
          Back home
        </PillLink>
      </Frame>
    );
  }

  return (
    <div className="page page-bare flex min-h-[100dvh] flex-col items-center justify-center text-center">
      <h1 className="text-title">{view.kind === 'error' ? 'Connection trouble' : "This card isn't available."}</h1>
      <p className="mt-2 text-muted">{view.kind === 'error' ? "We couldn't reach Teamdex. Check your connection and scan again." : 'It may be hidden or the code is wrong.'}</p>
      <div className="mt-6 w-full max-w-[320px]">
        <PillLink to={session ? homeFor(session.role) : '/'} block>
          Go back
        </PillLink>
      </div>
    </div>
  );
}

function Frame({ title, person, note, children }: { title: string; person: Person; note?: string; children: React.ReactNode }) {
  const scale = Math.max(0.55, Math.min(0.72, (window.innerWidth - 48) / 360, (window.innerHeight - 320) / 504));
  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-mint px-4" style={{ paddingTop: 'calc(var(--safe-top) + 28px)', paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}>
      <h1 className="text-center text-[28px] font-extrabold leading-tight tracking-[-0.03em]">{title}</h1>
      {note && <p className="mt-2 max-w-[340px] text-center text-[16px]">{note}</p>}
      <div className="mt-5">
        <Card person={person} scale={scale} />
      </div>
      <div className="mt-6 flex w-full max-w-[360px] flex-col gap-3">{children}</div>
    </div>
  );
}

/** The newcomer with the most recent unfinished quest (Yunfei in the demo data). */
async function pickDemoNewcomer(companyId: string, scannedId: string): Promise<Person | null> {
  const [people, quests] = await Promise.all([api.listPeople(companyId), api.listQuests(companyId)]);
  const newcomers = people.filter((p) => p.kind === 'newcomer' && p.id !== scannedId);
  const open = quests
    .filter((q) => !q.party_unlocked_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((q) => newcomers.find((n) => n.id === q.newcomer_id))
    .find((n) => !!n);
  return open ?? newcomers[0] ?? null;
}

/** Primary button that fills up and continues on its own, unless the user interacts first. */
function AutoContinue({ to, label, seconds, icon }: { to: string; label: string; seconds: number; icon?: React.ReactNode }) {
  const nav = useNavigate();
  const [cancelled, setCancelled] = useState(seconds === 0);

  useEffect(() => {
    if (cancelled) return;
    const stop = () => setCancelled(true);
    const t = setTimeout(() => nav(to), seconds * 1000);
    // Touching the card (to tilt it) means they want to look a bit longer
    window.addEventListener('pointerdown', stop, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', stop);
    };
  }, [cancelled, nav, to, seconds]);

  return (
    <button type="button" onClick={() => nav(to)} className={pillClass('primary', 'relative w-full overflow-hidden')}>
      {!cancelled && (
        <motion.span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-[#B4E02A]"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: seconds, ease: 'linear' }}
        />
      )}
      <span className="relative flex items-center gap-2">
        {icon}
        {label} {!icon && <ArrowRight size={18} />}
      </span>
    </button>
  );
}
