import { memo } from 'react';
import type { Avatar } from '../lib/api';

export const FRAME_IDLE = [
  '....hhhh....', '...hhhhhh...', '...hssssh...', '...sesses...', '...ssssss...',
  '....smms....', '..cccccccc..', '.sccccccccs.', '.s.cccccc.s.', '...cccccc...',
  '...pp..pp...', '...pp..pp...', '..bbb..bbb..',
];
export const FRAME_CHEER = [
  '.s..hhhh..s.', '.s.hhhhhh.s.', '.s.hssssh.s.', '.s.sesses.s.', '.s.ssssss.s.',
  '.s..smms..s.', '.sccccccccs.', '..cccccccc..', '...cccccc...', '...cccccc...',
  '..pp....pp..', '..pp....pp..', '.bbb....bbb.',
];

const SILHOUETTE = '#C3CFC9';

export type SpriteFrame = 'idle' | 'cheer' | 'silhouette';

function colorFor(ch: string, a: Avatar): string {
  switch (ch) {
    case 'h': return a.hair;
    case 's': return a.skin;
    case 'e': return '#13222E';
    case 'm': return '#E0567A';
    case 'c': return a.shirt;
    case 'p': return a.pants;
    case 'b': return a.shoes;
    default: return 'transparent';
  }
}

function Rects({ map, avatar, sil }: { map: string[]; avatar: Avatar; sil: boolean }) {
  const out: JSX.Element[] = [];
  map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      out.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.03} height={1.03} fill={sil ? SILHOUETTE : colorFor(ch, avatar)} />);
    });
  });
  return <>{out}</>;
}

interface Props {
  avatar: Avatar;
  frame?: SpriteFrame;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export const Sprite = memo(function Sprite({ avatar, frame = 'idle', className, style, title }: Props) {
  const map = frame === 'cheer' ? FRAME_CHEER : FRAME_IDLE;
  return (
    <svg
      viewBox="0 0 12 13"
      shapeRendering="crispEdges"
      className={className}
      style={{ display: 'block', height: '100%', width: 'auto', ...style }}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <Rects map={map} avatar={avatar} sil={frame === 'silhouette'} />
    </svg>
  );
});
