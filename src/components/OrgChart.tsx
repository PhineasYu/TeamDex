import { motion, useReducedMotion } from 'framer-motion';
import type { Company, Person } from '../lib/api';
import { DEPT_LONG, DEPT_ORDER, HOLO } from '../lib/departments';
import { Card, CARD_H, CARD_W } from './Card';
import { Sprite } from './Sprite';

const MINI = 0.34;
const MINI_W = CARD_W * MINI;
const LINE = 'rgba(19,34,46,.18)';
const TRUNK_X = 13; // trunk position inside the left gutter
const GUTTER = 30;

interface Props {
  company: Company | null;
  people: Person[];
  meId: string;
  /** Newcomers only see the colleagues they have met; everyone else is a silhouette. */
  collected?: Set<string>;
  onOpen: (p: Person) => void;
}

/**
 * The company as a card tree: company at the root, one branch per team, each team's cards hanging
 * off a rail. Teams also list what you can ask them about, which is what a newcomer needs to learn.
 */
export function OrgChart({ company, people, meId, collected, onOpen }: Props) {
  const reduce = useReducedMotion();
  const teams = DEPT_ORDER.map((d) => ({ dept: d, members: people.filter((p) => p.department === d).sort(byRole) })).filter((t) => t.members.length > 0);
  const total = people.length;

  return (
    <div>
      {/* root */}
      <div className="relative flex items-center gap-3 rounded-[24px] bg-ink px-4 py-3 text-white">
        <span className="flex h-12 w-12 flex-none items-end justify-center overflow-hidden rounded-2xl bg-white">
          <Sprite avatar={{ hair: '#13222E', skin: '#F3D1B0', shirt: '#5AAFE3', pants: '#13222E', shoes: '#C8F53C' }} style={{ height: 40 }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[19px] font-extrabold leading-tight tracking-[-0.02em]">{company?.name ?? 'Your company'}</div>
          <div className="text-[13px] text-white/70">
            {total} people · {teams.length} teams
          </div>
        </div>
      </div>

      <div className="relative" style={{ paddingLeft: GUTTER }}>
        {teams.map(({ dept, members }, ti) => {
          const c = HOLO[dept];
          const last = ti === teams.length - 1;
          const met = collected ? members.filter((m) => collected.has(m.id) || m.id === meId).length : null;
          const topics = [...new Set(members.flatMap((m) => m.help_topics.slice(0, 1)))].slice(0, 4);
          return (
            <motion.section
              key={dept}
              className="relative pt-4"
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: ti * 0.06 }}
            >
              {/* trunk segment + elbow into this team */}
              <span aria-hidden className="absolute" style={{ left: TRUNK_X - GUTTER, top: 0, width: 2, height: last ? 42 : '100%', background: LINE }} />
              <span aria-hidden className="absolute" style={{ left: TRUNK_X - GUTTER, top: 40, width: GUTTER - TRUNK_X, height: 2, background: LINE }} />

              {/* team node */}
              <div className="relative flex min-h-[48px] items-center gap-2 rounded-full py-1.5 pl-4 pr-2 text-ink" style={{ background: `linear-gradient(90deg, ${c[0]}, ${c[1]})` }}>
                <span className="flex-1 truncate text-[16px] font-bold">{DEPT_LONG[dept]}</span>
                <span className="flex-none rounded-full bg-white/80 px-2.5 py-0.5 text-[12px] font-bold tabular-nums">
                  {met != null ? `${met}/${members.length} met` : `${members.length}`}
                </span>
              </div>
              {topics.length > 0 && (
                <p className="mt-1.5 pl-4 text-[13px] leading-snug text-muted">
                  <b className="font-semibold text-ink/70">Ask about:</b> {topics.join(', ')}
                </p>
              )}

              {/* members hanging off a rail */}
              <div className="no-scrollbar -mr-4 overflow-x-auto pb-1 pr-4">
                <div className="relative flex min-w-max gap-2.5 pt-5">
                  <span aria-hidden className="absolute top-0" style={{ left: MINI_W / 2, width: 2, height: 10, background: LINE }} />
                  {members.length > 1 && (
                    <span aria-hidden className="absolute" style={{ top: 10, left: MINI_W / 2, right: MINI_W / 2, height: 2, background: LINE }} />
                  )}
                  {members.map((m) => {
                    const isMe = m.id === meId;
                    const known = !collected || isMe || collected.has(m.id);
                    const variant = !m.card_claimed ? 'unclaimed' : known ? 'collected' : 'silhouette';
                    return (
                      <div key={m.id} className="relative flex flex-col items-center">
                        <span aria-hidden className="absolute" style={{ top: -10, left: MINI_W / 2 - 1, width: 2, height: 10, background: LINE }} />
                        <button
                          type="button"
                          onClick={() => onOpen(m)}
                          className="block rounded-[12px] transition-transform active:scale-[.96]"
                          aria-label={`${m.display_name}, ${m.role_title}`}
                          style={{ width: MINI_W, height: CARD_H * MINI }}
                        >
                          <Card person={m} variant={variant} scale={MINI} />
                        </button>
                        {isMe && <span className="-mt-2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-white">You</span>}
                        {!isMe && m.open_to_chat && m.card_claimed && known && (
                          <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Open to chat
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}

// Keep HR and leads-ish roles first, newcomers last
function byRole(a: Person, b: Person) {
  const rank = (p: Person) => (p.kind === 'newcomer' ? 2 : /lead|manager|head|partner/i.test(p.role_title) ? 0 : 1);
  return rank(a) - rank(b) || a.card_no - b.card_no;
}
