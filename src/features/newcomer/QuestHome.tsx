import { motion, useReducedMotion } from 'framer-motion';
import { Camera, Keyboard, PartyPopper } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/Card';
import { PageTransition, TopBar } from '../../components/Shell';
import { Panel, Pill, PillLink, ProgressBar, SectionTitle, Spinner } from '../../components/ui';
import type { Person } from '../../lib/api';
import type { Session } from '../../lib/session';
import { useNewcomer } from './useNewcomer';

export function QuestHome({ session }: { session: Session }) {
  const { data, loading } = useNewcomer(session);
  const [codeOpen, setCodeOpen] = useState(false);
  const [params] = useSearchParams();
  const newId = params.get('new');

  if (loading || !data) return <div className="page"><Spinner /></div>;
  const { me, people, quest, facts, collected, progress } = data;

  const targetIds = new Set(quest?.targets.map((t) => t.person_id) ?? []);
  const byId = new Map(people.map((p) => [p.id, p]));
  const keyPeople = (quest?.targets ?? []).map((t) => ({ person: byId.get(t.person_id), reason: t.reason })).filter((x): x is { person: Person; reason: string } => !!x.person);
  const others = people.filter((p) => p.kind === 'colleague' && !targetIds.has(p.id) && p.id !== session.personId);
  // Collected cards first within "everyone else"
  others.sort((a, b) => Number(collected.has(b.id)) - Number(collected.has(a.id)) || a.card_no - b.card_no);
  const collectedCount = people.filter((p) => collected.has(p.id) && p.kind === 'colleague').length;

  return (
    <div className="page">
      <PageTransition>
        <TopBar me={me} />
        <h1 className="text-hero">Your Teamdex</h1>

        {quest ? (
          <Panel color="mint" className="mt-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <span className="text-[17px] font-bold">
                {progress.done} of {progress.goal} key colleagues
              </span>
              <span className="text-[13px] font-semibold text-muted">{collectedCount} {collectedCount === 1 ? "card" : "cards"} total</span>
            </div>
            <ProgressBar value={progress.done} max={progress.goal} label={`${progress.done} of ${progress.goal}`} />
            {quest.party_unlocked_at ? (
              <PillLink to="/quest/party" block className="mt-4">
                <PartyPopper size={18} /> Party unlocked!
              </PillLink>
            ) : (
              <p className="mt-3 text-[14px]">
                Meet all {progress.goal} to unlock your <b>onboarding party</b>.
              </p>
            )}
          </Panel>
        ) : (
          <Panel color="pink" className="mt-4">
            <p className="text-[15px] font-medium">Your HR hasn't set up your quest yet. You can still collect any colleague's card.</p>
          </Panel>
        )}

        <Panel color="white" className="mt-[10px] flex items-center gap-3 !py-4">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sky text-white">
            <Camera size={22} />
          </span>
          <p className="flex-1 text-[14px] leading-snug">
            <b>To collect:</b> open your phone camera and scan a colleague's card.
          </p>
          <button type="button" onClick={() => setCodeOpen((v) => !v)} className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-paper" aria-label="Enter a code instead">
            <Keyboard size={20} />
          </button>
        </Panel>
        {codeOpen && <CodeEntry />}

        {keyPeople.length > 0 && (
          <>
            <SectionTitle>Key colleagues</SectionTitle>
            <CardGrid
              highlight={newId}
              items={keyPeople.map(({ person, reason }) => ({ person, reason, collected: collected.has(person.id), fact: facts[person.id] }))}
            />
          </>
        )}

        <SectionTitle right={<Link to="/quest/quiz" className="text-[14px] font-semibold underline underline-offset-4">Quiz</Link>}>
          Everyone else
        </SectionTitle>
        <CardGrid highlight={newId} items={others.map((person) => ({ person, collected: collected.has(person.id), fact: facts[person.id] }))} />
      </PageTransition>
    </div>
  );
}

function CardGrid({ items, highlight }: { items: { person: Person; reason?: string; collected: boolean; fact?: string }[]; highlight?: string | null }) {
  const reduce = useReducedMotion();
  // Scroll the card that was just collected into view
  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => document.getElementById(`card-${highlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 450);
    return () => clearTimeout(t);
  }, [highlight]);
  const scale = (Math.min(window.innerWidth, 560) - 32 - 10) / 2 / 360;
  return (
    <div className="grid grid-cols-2 gap-[10px]">
      {items.map(({ person, reason, collected, fact }, i) => {
        const variant = !person.card_claimed ? 'unclaimed' : collected ? 'collected' : 'silhouette';
        return (
          <motion.div
            key={person.id}
            id={`card-${person.id}`}
            className="relative"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: Math.min(i, 8) * 0.04 }}
          >
            <Link to={`/quest/card/${person.id}`} className="block transition-transform active:scale-[.97]" aria-label={`${person.display_name}${collected ? '' : ', not collected yet'}`}>
              <Card person={person} variant={variant} reason={reason} fact={fact} scale={scale} />
            </Link>
            {highlight === person.id && collected && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -inset-1.5 rounded-[22px] border-[3px] border-lime"
                initial={{ opacity: 0 }}
                animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 0.4, 1, 0.4, 1], scale: [0.96, 1.02, 1, 1.02, 1, 1] }}
                transition={{ duration: 2.2, delay: 0.5 }}
              />
            )}
            {highlight === person.id && collected && (
              <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-lime px-2.5 py-0.5 text-[12px] font-extrabold shadow">Just added</span>
            )}
            {!collected && person.card_claimed && person.open_to_chat && (
              <div className="mt-1.5 flex items-center gap-1.5 pl-2 text-[12px] font-semibold text-muted">
                <span className="h-2 w-2 rounded-full bg-success" /> Open to chat
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function CodeEntry() {
  const nav = useNavigate();
  const [code, setCode] = useState('');
  return (
    <form
      className="mt-[10px] flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) nav(`/c/${encodeURIComponent(code.trim().toLowerCase())}`);
      }}
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Code under their QR"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoFocus
        className="h-12 min-w-0 flex-1 rounded-full border-[1.5px] border-line bg-white px-5 font-semibold focus:border-ink focus:outline-none"
      />
      <Pill type="submit" disabled={!code.trim()}>
        Collect
      </Pill>
    </form>
  );
}
