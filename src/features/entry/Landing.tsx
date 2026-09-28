import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Logo } from '../../components/Logo';
import { Pill } from '../../components/ui';
import { seed } from '../../data/seed';
import type { Person } from '../../lib/api';
import { homeFor, useSession } from '../../lib/session';
import { unlockAudio } from '../../lib/sound';

const FAN = ['Elin', 'Oskar', 'Maja'].map((n) => seed.people.find((p) => p.display_name === n) as unknown as Person);

export function Landing() {
  const session = useSession();
  const nav = useNavigate();
  const [code, setCode] = useState('');

  if (session) return <Navigate to={homeFor(session.role)} replace />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    unlockAudio();
    const c = code.trim().toUpperCase();
    if (c) nav(`/join/${c}`);
  };

  return (
    <div className="page page-bare flex min-h-[100dvh] flex-col">
      <Logo size={26} />

      <div className="relative mx-auto mt-6 h-[250px] w-full max-w-[360px]" aria-hidden>
        {FAN.map((p, i) => (
          <div
            key={p.id}
            className="absolute left-1/2 top-2"
            style={{ transform: `translateX(-50%) translateX(${(i - 1) * 86}px) rotate(${(i - 1) * 9}deg) translateY(${Math.abs(i - 1) * 16}px)`, zIndex: i === 1 ? 3 : 1 }}
          >
            <Card person={p} scale={0.42} holo={i === 1} />
          </div>
        ))}
      </div>

      <h1 className="mt-6 text-[38px] font-extrabold leading-[1.05] tracking-[-0.035em]">
        Your new team, as a <span className="hl">card</span> collection.
      </h1>
      <p className="mt-3 text-[16px] text-muted">Meet your colleagues in person, scan their card, and learn who to ask for what.</p>

      <form onSubmit={submit} className="mt-auto pt-8">
        <label htmlFor="code" className="mb-2 block text-[13px] font-semibold text-muted">
          Team code
        </label>
        <div className="flex gap-2">
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Team code"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-14 min-w-0 flex-1 rounded-full border-[1.5px] border-line bg-white px-5 text-[18px] font-semibold uppercase tracking-[0.12em] placeholder:normal-case placeholder:tracking-normal placeholder:text-muted/60 focus:border-ink focus:outline-none"
          />
          <Pill type="submit" className="h-14 px-6" disabled={!code.trim()} aria-label="Join">
            Join <ArrowRight size={18} />
          </Pill>
        </div>
        <button type="button" onClick={() => nav('/join/FIKA24')} className="mt-3 min-h-[44px] text-[14px] font-medium text-muted underline underline-offset-4">
          Trying the demo? Use code FIKA24
        </button>
      </form>
    </div>
  );
}
