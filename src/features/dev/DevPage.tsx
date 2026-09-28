import { useState } from 'react';
import { Card } from '../../components/Card';
import { ExchangeReveal } from '../../components/ExchangeReveal';
import { PixelParty } from '../../components/PixelParty';
import { Sprite } from '../../components/Sprite';
import { useToast } from '../../components/Toast';
import { Panel, Pill, ProgressBar, SectionTitle, Spinner } from '../../components/ui';
import { api, dataMode } from '../../lib/api';
import { useData } from '../../lib/hooks';
import { unlockAudio } from '../../lib/sound';

/** Component gallery for checking visuals on a phone. */
export function DevPage() {
  const toast = useToast();
  const [reveal, setReveal] = useState(0);
  const { data, loading } = useData(async () => {
    const c = await api.getCompanyByCode('FIKA24');
    return c ? api.listPeople(c.id) : [];
  }, []);

  if (loading || !data) return <div className="page"><Spinner /></div>;
  const oskar = data.find((p) => p.display_name === 'Oskar') ?? data[0];
  const scale = (Math.min(window.innerWidth, 560) - 32 - 10) / 2 / 360;

  if (reveal > 0) {
    return (
      <ExchangeReveal key={reveal} theirs={oskar} mine={data.find((p) => p.kind === 'newcomer')} title="New card!" subtitle="You swapped cards with Oskar.">
        <Pill block onClick={() => setReveal((r) => r + 1)}>
          Replay reveal
        </Pill>
        <Pill variant="light" block onClick={() => setReveal(0)}>
          Close
        </Pill>
      </ExchangeReveal>
    );
  }

  return (
    <div className="page page-bare">
      <h1 className="text-hero">/dev</h1>
      <p className="text-muted">Data mode: {dataMode}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Pill
          onClick={() => {
            unlockAudio();
            setReveal(1);
          }}
        >
          Replay reveal
        </Pill>
        <Pill variant="secondary" onClick={() => toast({ title: 'Yunfei collected your card.', body: 'You got their newcomer card too.', person: data.find((p) => p.kind === 'newcomer') })}>
          Toast
        </Pill>
        <Pill variant="dark">Dark</Pill>
      </div>

      <SectionTitle>Sprites</SectionTitle>
      <Panel color="white" className="flex h-[120px] items-end gap-3">
        <Sprite avatar={oskar.avatar} style={{ height: 80 }} />
        <Sprite avatar={oskar.avatar} frame="cheer" style={{ height: 80 }} />
        <Sprite avatar={oskar.avatar} frame="silhouette" style={{ height: 80 }} />
      </Panel>

      <SectionTitle>Card states</SectionTitle>
      <div className="grid grid-cols-2 gap-[10px]">
        <Card person={oskar} scale={scale} />
        <Card person={oskar} scale={scale} fact="Skates to work across the lake in winter." />
        <Card person={oskar} variant="silhouette" reason="Ask him when the build breaks" scale={scale} />
        <Card person={data.find((p) => !p.card_claimed) ?? oskar} variant="unclaimed" scale={scale} />
        <Card person={data.find((p) => p.kind === 'newcomer') ?? oskar} scale={scale} />
      </div>

      <SectionTitle>Every colleague</SectionTitle>
      <div className="grid grid-cols-2 gap-[10px]">
        {data.map((p) => (
          <Card key={p.id} person={p} scale={scale} variant={p.card_claimed ? 'collected' : 'unclaimed'} />
        ))}
      </div>

      <SectionTitle>Big card</SectionTitle>
      <div className="flex justify-center">
        <Card person={oskar} scale={Math.min(0.9, (Math.min(window.innerWidth, 560) - 32) / 360)} holo />
      </div>

      <SectionTitle>Panels & progress</SectionTitle>
      <div className="flex flex-col gap-[10px]">
        <Panel color="mint">
          <ProgressBar value={3} max={5} />
        </Panel>
        <Panel color="pink">Pink panel</Panel>
        <Panel color="sky">Sky panel</Panel>
        <Panel color="lime">Lime panel</Panel>
      </div>

      <SectionTitle>Party</SectionTitle>
      <div className="overflow-hidden rounded-panel">
        <PixelParty dancers={data.slice(0, 6).map((p, i) => ({ avatar: p.avatar, name: p.display_name, me: i === 3 }))} height={300} />
      </div>
    </div>
  );
}
