import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import type { Avatar as AvatarT, Person } from '../lib/api';
import { HOLO } from '../lib/departments';
import { Sprite } from './Sprite';

type PillVariant = 'primary' | 'secondary' | 'dark' | 'ghost';

const pillBase =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 font-semibold transition-transform active:scale-[.97] disabled:opacity-40 disabled:active:scale-100 select-none';
const pillVariants: Record<PillVariant, string> = {
  primary: 'bg-lime text-ink shadow-[0_5px_0_#9CC21F] active:shadow-[0_2px_0_#9CC21F] active:translate-y-[3px]',
  secondary: 'border-[1.5px] border-ink bg-transparent text-ink',
  dark: 'bg-ink text-white',
  ghost: 'bg-white/70 text-ink',
};

export function pillClass(variant: PillVariant = 'primary', extra = '') {
  return `${pillBase} ${pillVariants[variant]} ${extra}`;
}

interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PillVariant;
  block?: boolean;
}

export const Pill = forwardRef<HTMLButtonElement, PillProps>(function Pill(
  { variant = 'primary', block, className = '', ...rest },
  ref,
) {
  return <button ref={ref} type="button" className={pillClass(variant, `${block ? 'w-full' : ''} ${className}`)} {...rest} />;
});

export function PillLink({ to, variant = 'primary', block, className = '', children }: { to: string; variant?: PillVariant; block?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <Link to={to} className={pillClass(variant, `${block ? 'w-full' : ''} ${className}`)}>
      {children}
    </Link>
  );
}

type PanelColor = 'mint' | 'pink' | 'sky' | 'lime' | 'white' | 'paper';
const panelColors: Record<PanelColor, string> = {
  mint: 'bg-mint',
  pink: 'bg-pink',
  sky: 'bg-sky',
  lime: 'bg-lime',
  white: 'bg-white',
  paper: 'bg-paper',
};

export function Panel({ color = 'white', className = '', children, ...rest }: { color?: PanelColor } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-panel p-5 ${panelColors[color]} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-[10px] flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <div className="h-full rounded-full bg-lime transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums">{label ?? `${value} of ${max}`}</span>
    </div>
  );
}

/** Small round avatar with the department gradient. */
export function AvatarBubble({ person, avatar, size = 40, silhouette }: { person?: Person; avatar?: AvatarT; size?: number; silhouette?: boolean }) {
  const a = avatar ?? person?.avatar;
  if (!a) return null;
  const c = person ? (person.kind === 'newcomer' ? HOLO.newcomer : HOLO[person.department]) : HOLO.newcomer;
  return (
    <span
      className="inline-flex flex-none items-end justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size, background: silhouette ? '#E6ECE9' : `linear-gradient(160deg, ${c[0]}, ${c[2]})` }}
      aria-hidden
    >
      <Sprite avatar={a} frame={silhouette ? 'silhouette' : 'idle'} style={{ height: size * 0.84 }} />
    </span>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted" role="status">
      <span className="h-3 w-3 animate-bounce rounded-[2px] bg-lime [animation-delay:-.2s]" />
      <span className="h-3 w-3 animate-bounce rounded-[2px] bg-sky [animation-delay:-.1s]" />
      <span className="h-3 w-3 animate-bounce rounded-[2px] bg-[#FF7AB8]" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-[48px] w-full items-center justify-between gap-3 text-left font-semibold"
    >
      <span>{label}</span>
      <span className={`relative h-8 w-14 flex-none rounded-full transition-colors ${checked ? 'bg-success' : 'bg-line'}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
      </span>
    </button>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-baseline justify-between gap-3">
      <h2 className="text-[19px] font-bold tracking-[-0.02em]">{children}</h2>
      {right}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-pink px-4 py-3 text-[15px] font-medium">{children}</p>;
}
