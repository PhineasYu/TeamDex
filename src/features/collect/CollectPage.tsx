import { PartyPopper } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/Card';
import { ExchangeReveal } from '../../components/ExchangeReveal';
import { Pill, PillLink, Spinner } from '../../components/ui';
import { api, type Person } from '../../lib/api';
import { homeFor, setPendingToken, useSession } from '../../lib/session';
import { play } from '../../lib/sound';

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

  useEffect(() => {
    const key = `${token}|${session?.personId ?? ''}`;
    if (ran.current === key) return; // StrictMode / re-render guard: collect exactly once
    ran.current = key;

    (async () => {
      try {
        // 1. No identity yet: preview the card, then send them to pick who they are.
        if (!session) {
          const person = await api.getPersonByToken(token);
          if (!person) return setView({ kind: 'unavailable' });
          const company = await api.getCompany(person.company_id);
          if (!company) return setView({ kind: 'unavailable' });
          return setView({ kind: 'join', person, joinCode: company.join_code });
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
            const me = await api.getPerson(session.personId);
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
    return (
      <ExchangeReveal
        theirs={person}
        mine={me}
        fact={fact}
        still={already}
        title={already ? 'Already in your Teamdex' : 'New card!'}
        subtitle={already ? 'Drag the card to tilt it.' : `You swapped cards with ${person.display_name}.`}
      >
        {partyUnlocked && (
          <Pill
            block
            onClick={() => {
              play('party');
              nav('/quest/party');
            }}
          >
            <PartyPopper size={18} /> Your party is unlocked!
          </Pill>
        )}
        <PillLink to={`/quest/card/${person.id}`} variant={partyUnlocked ? 'light' : 'primary'} block>
          Open card
        </PillLink>
        <PillLink to="/quest" variant="light" block>
          Back to my Teamdex
        </PillLink>
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
