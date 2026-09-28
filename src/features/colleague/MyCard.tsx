import { EyeOff, Pencil } from 'lucide-react';
import { Card } from '../../components/Card';
import { QRBlock } from '../../components/QRBlock';
import { PageTransition, TopBar } from '../../components/Shell';
import { Panel, PillLink, Spinner, Toggle } from '../../components/ui';
import { api } from '../../lib/api';
import { useData } from '../../lib/hooks';
import { cardUrl } from '../../lib/progress';
import type { Session } from '../../lib/session';

export function MyCard({ session }: { session: Session }) {
  const { data, loading, setData } = useData(async () => {
    const [me, token] = await Promise.all([api.getPerson(session.personId), api.getMyQrToken(session.personId)]);
    return { me, token };
  }, [session.personId]);

  if (loading || !data?.me) return <div className="page"><Spinner /></div>;
  const { me, token } = data;
  const scale = Math.min(0.62, (Math.min(window.innerWidth, 560) - 32) / 360);

  const setOpen = async (open: boolean) => {
    setData({ ...data, me: { ...me, open_to_chat: open } });
    try {
      await api.setOpenToChat(me.id, open);
    } catch {
      setData({ ...data, me: { ...me, open_to_chat: !open } });
    }
  };

  return (
    <div className="page">
      <PageTransition>
        <TopBar me={me} />
        <h1 className="text-title">Show this to a new colleague</h1>

        {!me.card_claimed && (
          <Panel color="lime" className="mt-4">
            <p className="text-[15px] font-semibold">Your card isn't set up yet. Newcomers will see "Card coming soon".</p>
            <PillLink to="/me/edit" variant="dark" block className="mt-3">
              <Pencil size={18} /> Set up my card
            </PillLink>
          </Panel>
        )}
        {me.hidden && (
          <Panel color="pink" className="mt-4 flex items-center gap-3">
            <EyeOff size={20} />
            <p className="text-[15px] font-semibold">Your card is hidden. Newcomers can't collect it.</p>
          </Panel>
        )}

        <div className="mt-5 flex flex-col items-center">
          <QRBlock value={cardUrl(token)} size={Math.min(248, window.innerWidth - 100)} />
          <p className="mt-2 text-[13px] text-muted">
            Can't scan? Code: <b className="font-mono text-[15px] text-ink">{token}</b>
          </p>
        </div>

        <Panel color="white" className="mt-5 !py-2">
          <Toggle checked={me.open_to_chat} onChange={setOpen} label="Open to chat right now" />
        </Panel>

        <div className="mt-6 flex justify-center">
          <Card person={me} scale={scale} holo />
        </div>

        <PillLink to="/me/edit" variant="secondary" block className="mt-6">
          <Pencil size={18} /> Edit my card
        </PillLink>
      </PageTransition>
    </div>
  );
}
