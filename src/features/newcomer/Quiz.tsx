import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageTransition, TopBar } from '../../components/Shell';
import { AvatarBubble, Panel, Pill, PillLink, ProgressBar, Spinner } from '../../components/ui';
import { api } from '../../lib/api';
import { buildQuiz, type QuizQuestion } from '../../lib/quiz';
import type { Session } from '../../lib/session';
import { play } from '../../lib/sound';
import { useNewcomer } from './useNewcomer';

const MIN_CARDS = 3;

export function Quiz({ session }: { session: Session }) {
  const { data, loading } = useNewcomer(session);
  const [round, setRound] = useState(0);

  const pool = useMemo(() => data?.people.filter((p) => p.kind === 'colleague' && data.collected.has(p.id)) ?? [], [data]);
  // Rebuild only when a new round starts or the pool size changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questions = useMemo(() => buildQuiz(pool, 5), [round, pool.length]);

  if (loading || !data) return <div className="page"><Spinner /></div>;

  return (
    <div className="page">
      <PageTransition>
        <TopBar me={data.me} />
        <h1 className="text-hero">Who do I ask?</h1>
        {pool.length < MIN_CARDS ? (
          <Panel color="pink" className="mt-4">
            <p className="mb-3 text-[17px] font-bold">Collect {MIN_CARDS} cards to unlock the quiz</p>
            <ProgressBar value={pool.length} max={MIN_CARDS} />
            <p className="mt-3 text-[14px]">The quiz asks who to go to for real work questions, using what your colleagues said they can help with.</p>
            <PillLink to="/quest" block className="mt-4">
              Back to my Teamdex
            </PillLink>
          </Panel>
        ) : (
          <QuizRun key={round} questions={questions} questId={data.quest?.id ?? null} onAgain={() => setRound((r) => r + 1)} />
        )}
      </PageTransition>
    </div>
  );
}

function QuizRun({ questions, questId, onAgain }: { questions: QuizQuestion[]; questId: string | null; onAgain: () => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<(string | null)[]>(() => questions.map(() => null));
  const done = i >= questions.length;
  const score = picked.filter((id, k) => id === questions[k]?.answer.id).length;

  useEffect(() => {
    if (done && questId) api.submitQuiz(questId, score, questions.length).catch(() => {});
    if (done) play(score === questions.length ? 'party' : 'pop');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (done) {
    const perfect = score === questions.length;
    return (
      <div className="mt-4">
        <Panel color={perfect ? 'lime' : 'mint'}>
          <p className="text-[56px] font-extrabold leading-none tracking-[-0.04em]">
            {score} / {questions.length}
          </p>
          <p className="mt-2 text-[17px] font-semibold">
            {perfect ? 'Perfect. You know exactly who to ask.' : score >= 3 ? 'Nice! You already know who to ask.' : 'Good start. Every chat makes this easier.'}
          </p>
        </Panel>
        <ul className="mt-[10px] flex flex-col gap-2">
          {questions.map((q, k) => {
            const ok = picked[k] === q.answer.id;
            return (
              <li key={k} className="flex items-center gap-3 rounded-[22px] bg-white px-3 py-2.5">
                <AvatarBubble person={q.answer} size={40} />
                <span className="min-w-0 flex-1 text-[14px] leading-snug">
                  <span className="text-muted">{q.topic}</span>
                  <br />
                  <b>{q.answer.display_name}</b>
                </span>
                <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${ok ? 'bg-success' : 'bg-pink'}`}>{ok ? <Check size={18} /> : <X size={18} />}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex flex-col gap-3">
          <Pill block onClick={onAgain}>
            Play again
          </Pill>
          <PillLink to="/quest" variant="secondary" block>
            Back to my Teamdex
          </PillLink>
        </div>
      </div>
    );
  }

  const q = questions[i];
  const chosen = picked[i];
  const answered = chosen != null;

  return (
    <div className="mt-4">
      <ProgressBar value={i + (answered ? 1 : 0)} max={questions.length} label={`${i + 1} of ${questions.length}`} />
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
          <Panel color="sky" className="mt-3">
            <p className="text-[22px] font-bold leading-tight tracking-[-0.02em]">
              You need help with <span className="hl">{q.topic}</span>. Who do you ask?
            </p>
          </Panel>
          <div className="mt-[10px] grid grid-cols-2 gap-[10px]">
            {q.options.map((o) => {
              const isAnswer = o.id === q.answer.id;
              const isChosen = o.id === chosen;
              const bg = !answered ? 'bg-white' : isAnswer ? 'bg-success' : isChosen ? 'bg-pink' : 'bg-white opacity-50';
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={answered}
                  onClick={() => {
                    setPicked((p) => p.map((v, k) => (k === i ? o.id : v)));
                    play(isAnswer ? 'pop' : 'wrong');
                  }}
                  className={`flex min-h-[112px] flex-col items-center justify-center gap-1 rounded-[24px] p-3 text-center transition-all active:scale-[.97] ${bg}`}
                >
                  <AvatarBubble person={o} size={52} />
                  <span className="text-[16px] font-bold leading-tight">{o.display_name}</span>
                  <span className="text-[12px] leading-tight text-ink/70">{o.role_title}</span>
                </button>
              );
            })}
          </div>
          {answered && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              <p className="mb-3 text-center text-[16px] font-semibold">
                {chosen === q.answer.id ? 'Right!' : `It's ${q.answer.display_name}, the ${q.answer.role_title}.`}
              </p>
              <Pill block onClick={() => setI(i + 1)}>
                {i + 1 < questions.length ? 'Next' : 'See my score'}
              </Pill>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
