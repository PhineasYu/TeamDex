import { CARD_H, CARD_W } from './Card';
import { Sprite } from './Sprite';

const MARK = { hair: '#13222E', skin: '#F3D1B0', shirt: '#5AAFE3', pants: '#13222E', shoes: '#C8F53C' };

/** Face-down card: holographic border, ink body with a pixel grid and the Teamdex mark. */
export function CardBack({ scale = 1 }: { scale?: number }) {
  return (
    <div style={{ width: CARD_W * scale, height: CARD_H * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0', width: CARD_W, height: CARD_H }}>
        <div className="card holo-spin" style={{ ['--c1' as string]: '#FF7AB8', ['--c2' as string]: '#C8F53C', ['--c3' as string]: '#5AAFE3' }}>
          <div className="card-back-body">
            <div className="card-back-mark">
              <Sprite avatar={MARK} style={{ height: 118 }} />
            </div>
            <div className="card-back-word">Teamdex</div>
            <div className="card-back-sub">Meet · Scan · Swap</div>
          </div>
          <div className="card-shine" />
        </div>
      </div>
    </div>
  );
}
