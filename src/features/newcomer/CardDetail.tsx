import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, Sparkles } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card } from '../../components/Card';
import { PageTransition } from '../../components/Shell';
import { Typewriter } from '../../components/Typewriter';
import { Panel, Pill, Spinner } from '../../components/ui';
import { api, type Person } from '../../lib/api';
import type { Session } from '../../lib/session';
import { play, vibrate } from '../../lib/sound';
import { useNewcomer } from './useNewcomer';

function openers(p: Person, me: Person | null): string[] {
  const topic = p.help_topics[0];
  const lines = [
    `Hi ${p.display_name}, I'm ${me?.display_name ?? 'new here'}${me ? `, the new ${me.role_title}` : ''}. I'm doing my Teamdex quest!`,
    topic ? `I heard you're the person to ask about ${topic}. What does that usually look like?` : `What's one thing you wish you'd known in your first week here?`,
  ];
  return lines;
}

function promptLine(p: Person): string {
  const prompt = p.fun_fact_prompt ?? '';
  return /^ask\b/i.test(prompt) ? prompt : `Ask ${p.display_name}: ${prompt}`;
}

export function CardDetail({ session }: { session: Session }) {
  const { personId = '' } = useParams();
  const { data, loading, setData } = useNewcomer(session);
  const [guess, setGuess] = useState('');
  const [msg, setMsg] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const person = data?.people.find((p) => p.id === personId);
  const lines = useMemo(() => (person ? openers(person, data?.me ?? null) : []), [person, data?.me]);

  if (loading || !data) return <div className="page"><Spinner /></div>;
  if (!person) {
    return (
      <div className="page page-bare">
        <BackLink />
        <p className="mt-6">This card isn't available.</p>
      </div>
    );
  }

  const collected = data.collected.has(person.id);
  const fact = data.facts[person.id];
  const reason = data.quest?.targets.find((t) => t.person_id === person.id)?.reason;
  const variant = !person.card_claimed ? 'unclaimed' : collected ? 'collected' : 'silhouette';
  const scale = Math.min(0.9, (Math.min(window.innerWidth, 560) - 32) / 360);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.unlockFact(session.personId, person.id, guess);
      if (res.ok) {
        setData({ ...data, facts: { ...data.facts, [person.id]: res.fact } });
        setJustUnlocked(true);
        setMsg({ tone: 'ok', text: 'Unlocked!' });
        setGuess('');
        // Bring the card into view so the lock opening is seen
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          play('unlock');
          vibrate(30);
        }, 420);
      } else {
        const text =
          res.error === 'no_match'
            ? 'Not quite. Ask them again!'
            : res.error === 'too_short'
              ? 'Type a word or two of what they said.'
              : res.error === 'no_fact'
                ? `${person.display_name} hasn't added a fun fact yet.`
                : 'Collect this card first.';
        setMsg({ tone: 'error', text });
        setShakeKey((k) => k + 1);
        play('wrong');
      }
    } catch {
      setMsg({ tone: 'error', text: "Couldn't check right now. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-bare">
      <PageTransition>
        <BackLink />
        <div className="flex justify-center">
          <Card
            ref={cardRef}
            person={person}
            variant={variant}
            reason={reason}
            fact={fact}
            scale={scale}
            holo={collected}
            factSlot={fact && justUnlocked ? <Typewriter text={fact} /> : undefined}
          />
        </div>

        {reason && (
          <p className="mt-4 text-center text-[15px]">
            <span className="font-semibold text-muted">Why meet: </span>
            {reason}
          </p>
        )}

        {!collected && person.card_claimed && (
          <Panel color="sky" className="mt-4 text-ink">
            <p className="text-[17px] font-bold">Find {person.display_name} and scan their card.</p>
            <p className="mt-1 text-[15px]">
              {person.open_to_chat ? `${person.display_name} is open to chat right now.` : `${person.display_name} is heads-down right now. Try a bit later.`}
            </p>
          </Panel>
        )}
        {!person.card_claimed && (
          <Panel color="white" className="mt-4">
            <p className="text-[15px]">{person.display_name}'s card is coming soon. You can still say hi in person!</p>
          </Panel>
        )}

        {person.card_claimed && (
          <Panel color="mint" className="mt-[10px]">
            <h2 className="mb-3 flex items-center gap-2 text-[17px] font-bold">
              <MessageCircle size={18} /> Say hi with
            </h2>
            <ul className="flex flex-col gap-2">
              {lines.map((l) => (
                <li key={l} className="rounded-[18px] rounded-bl-[6px] bg-white px-4 py-3 text-[15px] leading-snug">
                  “{l}”
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {collected && person.kind === 'colleague' && (
          <Panel color="pink" className="mt-[10px]">
            <h2 className="mb-1 flex items-center gap-2 text-[17px] font-bold">
              <Sparkles size={18} /> Fun fact
            </h2>
            {fact ? (
              <p className="text-[15px]">{justUnlocked ? 'Unlocked! You only learn this face to face.' : 'You unlocked this one in person.'}</p>
            ) : person.fun_fact_prompt ? (
              <>
                <p className="text-[16px] font-medium">{promptLine(person)}</p>
                <motion.form
                  key={shakeKey}
                  onSubmit={submit}
                  className="mt-3 flex gap-2"
                  animate={shakeKey ? { x: [0, -8, 8, -6, 6, 0] } : {}}
                  transition={{ duration: 0.35 }}
                >
                  <input
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="What did they say?"
                    autoCapitalize="none"
                    className="h-12 min-w-0 flex-1 rounded-full border-[1.5px] border-transparent bg-white px-5 focus:border-ink focus:outline-none"
                    aria-label="What did they say?"
                  />
                  <Pill type="submit" disabled={busy || !guess.trim()}>
                    Unlock
                  </Pill>
                </motion.form>
              </>
            ) : (
              <p className="text-[15px]">{person.display_name} hasn't added a fun fact yet. Ask them anything!</p>
            )}
            {msg && (
              <p role="status" className={`mt-2 text-[15px] font-semibold ${msg.tone === 'ok' ? '' : ''}`}>
                {msg.tone === 'ok' ? <span className="hl">{msg.text}</span> : msg.text}
              </p>
            )}
          </Panel>
        )}
      </PageTransition>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/quest" className="mb-2 inline-flex min-h-[44px] items-center gap-1 text-[15px] font-semibold text-muted">
      <ArrowLeft size={18} /> My Teamdex
    </Link>
  );
}
