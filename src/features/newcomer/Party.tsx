import { useEffect, useRef } from 'react';
import { PixelParty } from '../../components/PixelParty';
import { Sprite } from '../../components/Sprite';
import { PageTransition, TopBar } from '../../components/Shell';
import { Panel, PillLink, ProgressBar, Spinner } from '../../components/ui';
import { formatNames } from '../../lib/progress';
import type { Session } from '../../lib/session';
import { play } from '../../lib/sound';
import { useNewcomer } from './useNewcomer';

export function Party({ session }: { session: Session }) {
  const { data, loading } = useNewcomer(session);
  const played = useRef(false);
  const unlocked = !!data?.quest?.party_unlocked_at;

  useEffect(() => {
    if (unlocked && !played.current) {
      played.current = true;
      play('party');
    }
  }, [unlocked]);

  if (loading || !data) return <div className="page"><Spinner /></div>;
  const { me, quest, people, progress } = data;
  const keyPeople = (quest?.targets ?? []).map((t) => people.find((p) => p.id === t.person_id)).filter((p) => !!p);
  const names = keyPeople.map((p) => p!.display_name);

  if (!me) return <div className="page"><Spinner /></div>;

  if (!unlocked) {
    return (
      <div className="page">
        <PageTransition>
          <TopBar me={me} />
          <h1 className="text-hero">Onboarding party</h1>
          <Panel color="pink" className="mt-4">
            <p className="mb-3 text-[17px] font-bold">
              {quest ? `Collect all ${progress.goal} key colleagues to unlock your party.` : 'Your party unlocks once HR sets up your quest.'}
            </p>
            {quest && <ProgressBar value={progress.done} max={progress.goal} />}
            <p className="mt-3 text-[14px]">When you do, everyone you met gets a fika invite.</p>
          </Panel>
          <Panel color="white" className="mt-[10px] flex h-[150px] items-end justify-center gap-2">
            {[...keyPeople.slice(0, 2), null, ...keyPeople.slice(2)].map((p, i) => (
              <Sprite key={i} avatar={p ? p.avatar : me.avatar} frame={p && progress.collectedTargets.has(p.id) ? 'idle' : p ? 'silhouette' : 'idle'} style={{ height: p ? 72 : 88 }} />
            ))}
          </Panel>
          <PillLink to="/quest" block className="mt-4">
            Back to my Teamdex
          </PillLink>
        </PageTransition>
      </div>
    );
  }

  const dancers = [
    ...keyPeople.slice(0, Math.ceil(keyPeople.length / 2)).map((p) => ({ avatar: p!.avatar, name: p!.display_name })),
    { avatar: me.avatar, name: me.display_name, me: true },
    ...keyPeople.slice(Math.ceil(keyPeople.length / 2)).map((p) => ({ avatar: p!.avatar, name: p!.display_name })),
  ];

  return (
    <div className="relative min-h-[100dvh] overflow-hidden" style={{ background: 'linear-gradient(180deg,#9FD3F3 0%,#CFEAFA 62%)' }}>
      <div className="mx-auto max-w-[560px] px-4" style={{ paddingTop: 'calc(var(--safe-top) + 16px)' }}>
        <TopBar me={me} />
        <h1 className="pixel-title mt-6 text-center text-[22px]">
          Onboarding party
          <br />
          unlocked!
        </h1>
      </div>
      <PixelParty dancers={dancers} height={Math.min(420, Math.max(300, window.innerHeight * 0.45))} />
      <div className="mx-auto max-w-[560px] px-4" style={{ paddingBottom: 'calc(var(--safe-bottom) + 112px)' }}>
        <div className="-mt-4 rounded-[24px] bg-white px-5 py-4 text-center text-[16px] font-semibold shadow-[0_6px_0_#C8F53C]">Fika invite sent to {formatNames(names)}</div>
        <p className="mt-4 text-center text-[15px]">Today 15:00 in the kitchen. Your first week ends with people who know you.</p>
      </div>
    </div>
  );
}
