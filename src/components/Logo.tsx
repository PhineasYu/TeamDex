import { Sprite } from './Sprite';

const ME = { hair: '#13222E', skin: '#F3D1B0', shirt: '#5AAFE3', pants: '#13222E', shoes: '#C8F53C' };

/** Stacked-cards mark + wordmark, as in the pitch film. */
export function Logo({ size = 28 }: { size?: number }) {
  const w = size * 0.74;
  return (
    <span className="inline-flex items-center font-extrabold text-ink" style={{ fontSize: size, gap: size * 0.4, letterSpacing: '-0.045em', lineHeight: 1 }}>
      <span className="logo-mark" style={{ width: w, height: w * 1.37 }} aria-hidden>
        <span className="bk bk1" />
        <span className="bk bk2" />
        <span className="face">
          <i>
            <Sprite avatar={ME} style={{ height: '72%' }} />
          </i>
        </span>
      </span>
      Teamdex
    </span>
  );
}
