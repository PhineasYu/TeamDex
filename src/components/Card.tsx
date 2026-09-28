import { forwardRef } from 'react';
import type { Person } from '../lib/api';
import { DEPT_LABEL, HOLO } from '../lib/departments';
import { Sprite } from './Sprite';
import { Lock } from './icons';

export const CARD_W = 360;
export const CARD_H = 504;

export type CardVariant = 'collected' | 'silhouette' | 'unclaimed';

interface Props {
  person: Person;
  variant?: CardVariant;
  /** Unlocked fun fact text. */
  fact?: string | null;
  /** Why the newcomer should meet this person (shown on silhouettes). */
  reason?: string;
  scale?: number;
  /** Rotate the holographic border. Only turn on for cards that are on screen and large. */
  holo?: boolean;
  /** Extra node rendered in the fun-fact row slot (e.g. animated text). */
  factSlot?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const GREY: [string, string, string] = ['#D5DED9', '#E6ECE9', '#C3CFC9'];

export function holoVars(person: Person): React.CSSProperties {
  const c = person.kind === 'newcomer' ? HOLO.newcomer : HOLO[person.department] ?? HOLO.ops;
  return { ['--c1' as string]: c[0], ['--c2' as string]: c[1], ['--c3' as string]: c[2] };
}

/** Employee card, authored at 360×504 and scaled with transform. */
export const Card = forwardRef<HTMLDivElement, Props>(function Card(
  { person, variant = 'collected', fact, reason, scale = 1, holo, factSlot, className = '', style },
  ref,
) {
  const isNewcomer = person.kind === 'newcomer';
  const nameSize = person.display_name.length > 9 ? 30 : person.display_name.length > 7 ? 34 : 40;
  const deptLabel = isNewcomer ? 'New here' : DEPT_LABEL[person.department];
  const no = String(person.card_no).padStart(2, '0');

  let body: React.ReactNode;
  let vars: React.CSSProperties = holoVars(person);

  if (variant === 'unclaimed') {
    body = (
      <div className="card-placeholder">
        <div className="card-top">
          <span className="chip chip-muted">{deptLabel}</span>
          <span className="card-no">No. {no}</span>
        </div>
        <div className="card-art card-art-empty">
          <Sprite avatar={person.avatar} frame="silhouette" style={{ height: 140 }} />
        </div>
        <div>
          <div className="card-name" style={{ fontSize: nameSize }}>{person.display_name}</div>
          <div className="card-role">{person.role_title}</div>
        </div>
        <div className="card-ask card-soon">
          <b>Card coming soon</b>
          {reason ?? `${person.display_name} hasn't set up their card yet.`}
        </div>
      </div>
    );
  } else {
    const sil = variant === 'silhouette';
    if (sil) vars = { ['--c1' as string]: GREY[0], ['--c2' as string]: GREY[1], ['--c3' as string]: GREY[2] };
    const unlocked = !!fact;
    body = (
      <div className="card-body">
        <div className="card-top">
          <span className="chip">{deptLabel}</span>
          <span className="card-no">No. {no}</span>
        </div>
        <div className={'card-art' + (sil ? ' card-art-sil' : '')}>
          <Sprite avatar={person.avatar} frame={sil ? 'silhouette' : 'idle'} style={{ height: 140 }} />
        </div>
        <div>
          <div className="card-name" style={{ fontSize: nameSize }}>{person.display_name}</div>
          <div className="card-role">{person.role_title}</div>
        </div>
        {sil && reason ? (
          <div className="card-ask card-reason">
            <b>Why meet</b>
            {reason}
          </div>
        ) : (
          <div className="card-ask">
            <b>Ask me about</b>
            {person.help_topics.length ? person.help_topics.join(', ') : 'Anything, really'}
          </div>
        )}
        {isNewcomer ? (
          <div className="card-fact">
            <b>Started</b>
            <span className="fact-val">{person.start_date ? formatDate(person.start_date) : 'This week'}</span>
          </div>
        ) : (
          <div className={'card-fact' + (unlocked ? ' unlocked' : '')}>
            <b>Fun fact</b>
            <span className="fact-val">{factSlot ?? (unlocked ? fact : '???')}</span>
            <Lock open={unlocked} />
          </div>
        )}
      </div>
    );
  }

  const inner = (
    <div
      className={'card' + (holo ? ' holo-spin' : '') + (variant === 'unclaimed' ? ' card-unclaimed' : '') + (variant === 'silhouette' ? ' card-sil' : '')}
      style={vars}
    >
      {body}
      {isNewcomer && variant !== 'unclaimed' && <span className="new-badge">New</span>}
      {variant === 'collected' && <div className="card-shine" />}
    </div>
  );

  return (
    <div
      ref={ref}
      className={'card-scale ' + className}
      style={{ width: CARD_W * scale, height: CARD_H * scale, ...style }}
      aria-label={`${person.display_name}, ${person.role_title}`}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0', width: CARD_W, height: CARD_H }}>{inner}</div>
    </div>
  );
});

function formatDate(d: string) {
  try {
    return new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return d;
  }
}
