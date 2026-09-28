import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CARD_H, CARD_W } from '../../components/Card';
import { OrgChart } from '../../components/OrgChart';
import { PageTransition, TopBar } from '../../components/Shell';
import { TiltCard } from '../../components/TiltCard';
import { Spinner } from '../../components/ui';
import { api, type Person } from '../../lib/api';
import { DEPT_LONG } from '../../lib/departments';
import { useData, useLiveEvents } from '../../lib/hooks';
import type { Session } from '../../lib/session';

/**
 * Org chart of cards. Colleagues and HR see everyone's card; newcomers see the people they've met
 * and silhouettes for the rest, so the chart doubles as a map of who they still need to meet.
 */
export function OrgPage({ session }: { session: Session }) {
  const nav = useNavigate();
  const newcomer = session.role === 'newcomer';
  const [open, setOpen] = useState<Person | null>(null);
  const { data, loading, reload } = useData(async () => {
    const [me, company, people, connections] = await Promise.all([
      api.getPerson(session.personId),
      api.getCompany(session.companyId),
      api.listPeople(session.companyId),
      api.listConnections(session.personId),
    ]);
    return { me, company, people, exchanged: new Set(connections.map((c) => c.collected_id)) };
  }, [session.personId, session.companyId]);

  useLiveEvents(session.companyId, (e) => {
    if (e.type === 'card_claimed' || e.actor_id === session.personId || e.target_id === session.personId) reload();
  });

  if (loading || !data) return <div className="page"><Spinner /></div>;
  const { me, company, people, exchanged } = data;

  return (
    <div className="page">
      <PageTransition>
        <TopBar me={me} />
        <h1 className="text-hero">Org chart</h1>
        <p className="mb-4 mt-2 text-[15px] text-muted">
          {newcomer ? 'Who does what at ' + (company?.name ?? 'your company') + '. Cards fill in as you meet people.' : 'Every team and every card. Tap a card to see who to ask for what.'}
        </p>
        <OrgChart
          company={company}
          people={people}
          meId={session.personId}
          collected={newcomer ? exchanged : undefined}
          onOpen={(p) => (newcomer && p.id !== session.personId ? nav(`/quest/card/${p.id}`) : setOpen(p))}
        />
      </PageTransition>
      <AnimatePresence>{open && <CardSheet person={open} exchanged={exchanged.has(open.id)} isMe={open.id === session.personId} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  );
}

function CardSheet({ person, exchanged, isMe, onClose }: { person: Person; exchanged: boolean; isMe: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const scale = Math.min(0.78, (window.innerWidth - 48) / CARD_W, (window.innerHeight - 240) / CARD_H);
  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-label={person.display_name}
        className="flex w-full max-w-[560px] flex-col items-center rounded-t-[32px] bg-paper px-5 pt-4"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 20px)' }}
        initial={reduce ? { opacity: 0 } : { y: 500 }}
        animate={reduce ? { opacity: 1 } : { y: 0 }}
        exit={reduce ? { opacity: 0 } : { y: 500 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex w-full items-center justify-between">
          <span className="text-[14px] font-semibold text-muted">
            {DEPT_LONG[person.department]}
            {isMe ? ' · You' : exchanged ? ' · Cards swapped' : ''}
          </span>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-white" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <TiltCard radius={30 * scale}>
          <Card person={person} variant={person.card_claimed ? 'collected' : 'unclaimed'} scale={scale} holo={!reduce} />
        </TiltCard>
        {!isMe && person.card_claimed && (
          <p className="mt-4 text-center text-[15px]">
            {person.open_to_chat ? `${person.display_name} is open to chat right now.` : `${person.display_name} is heads-down right now.`}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
