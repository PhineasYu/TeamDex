import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Network, BarChart3, CreditCard, Home, LayoutGrid, Layers, PartyPopper, Plus, HelpCircle, Users, X, Volume2, VolumeX, Repeat, Briefcase, IdCard } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Navigate, useNavigate } from 'react-router-dom';
import { api, dataMode, type Person } from '../lib/api';
import { useData, useOnline } from '../lib/hooks';
import { homeFor, setSession, useSession, type Role, type Session } from '../lib/session';
import { setSoundEnabled, soundEnabled } from '../lib/sound';
import { Logo } from './Logo';
import { AvatarBubble, Pill } from './ui';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
}

const NAV: Record<Role, NavItem[]> = {
  newcomer: [
    { to: '/quest', label: 'Teamdex', icon: LayoutGrid, end: true },
    { to: '/quest/org', label: 'Org chart', icon: Network },
    { to: '/quest/quiz', label: 'Quiz', icon: HelpCircle },
    { to: '/quest/party', label: 'Party', icon: PartyPopper },
  ],
  colleague: [
    { to: '/me', label: 'Home', icon: Home, end: true },
    { to: '/me/card', label: 'My card', icon: CreditCard },
    { to: '/me/org', label: 'Org chart', icon: Network },
  ],
  hr: [
    { to: '/hr', label: 'Newcomers', icon: Layers, end: true },
    { to: '/hr/new', label: 'New quest', icon: Plus },
    { to: '/hr/team', label: 'Team', icon: Users },
    { to: '/hr/impact', label: 'Impact', icon: BarChart3 },
  ],
};

export function BottomNav({ role }: { role: Role }) {
  const items = NAV[role];
  return (
    <nav
      className="fixed inset-x-0 z-40 mx-auto flex w-[calc(100%-32px)] max-w-[440px] justify-around rounded-full bg-white px-2 py-2 shadow-[0_14px_34px_-14px_rgba(19,34,46,.45)]"
      style={{ bottom: 'calc(var(--safe-bottom) + 12px)' }}
      aria-label="Main"
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="group flex min-h-[48px] min-w-[64px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-muted aria-[current=page]:text-ink">
          {({ isActive }) => (
            <>
              <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-lime' : ''}`}>
                <Icon size={20} strokeWidth={2.2} />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/** Top bar: logo + the current identity, which opens the account sheet. */
export function TopBar({ me }: { me?: Person | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Logo size={22} />
        {me && (
          <button type="button" onClick={() => setOpen(true)} className="flex min-h-[44px] items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-[14px] font-semibold shadow-sm" aria-label="Account and switch identity">
            <AvatarBubble person={me} size={36} />
            {me.display_name}
          </button>
        )}
      </div>
      <AnimatePresence>{open && me && <AccountSheet me={me} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}

function AccountSheet({ me, onClose }: { me: Person; onClose: () => void }) {
  const session = useSession();
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const [sound, setSound] = useState(soundEnabled());

  const switchIdentity = () => {
    const code = session?.joinCode;
    setSession(null);
    nav(code ? `/join/${code}` : '/');
  };
  const go = (role: Role) => {
    if (!session) return;
    setSession({ ...session, role });
    onClose();
    nav(homeFor(role));
  };

  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-label="Account"
        className="w-full max-w-[560px] rounded-t-[32px] bg-paper px-5 pt-5"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 20px)' }}
        initial={reduce ? { opacity: 0 } : { y: 300 }}
        animate={reduce ? { opacity: 1 } : { y: 0 }}
        exit={reduce ? { opacity: 0 } : { y: 300 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <AvatarBubble person={me} size={52} />
          <div className="min-w-0 flex-1">
            <div className="text-[20px] font-bold leading-tight">{me.display_name}</div>
            <div className="text-[14px] text-muted">{me.role_title}</div>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-white" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {me.is_hr && session?.role === 'hr' && (
            <Pill variant="ghost" block onClick={() => go('colleague')} className="justify-start">
              <IdCard size={18} /> Switch to my card
            </Pill>
          )}
          {me.is_hr && session?.role === 'colleague' && (
            <Pill variant="ghost" block onClick={() => go('hr')} className="justify-start">
              <Briefcase size={18} /> Open HR console
            </Pill>
          )}
          <Pill
            variant="ghost"
            block
            className="justify-start"
            onClick={() => {
              setSoundEnabled(!sound);
              setSound(!sound);
            }}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />} Sound and vibration: {sound ? 'on' : 'off'}
          </Pill>
          <Pill variant="dark" block onClick={switchIdentity}>
            <Repeat size={18} /> Switch identity
          </Pill>
          <div className="mt-1 flex gap-2">
            <Pill
              variant="secondary"
              className="flex-1 !min-h-[44px] text-[14px]"
              onClick={() => {
                setSession(null);
                nav('/');
              }}
            >
              Start over
            </Pill>
            <Pill variant="secondary" className="flex-1 !min-h-[44px] text-[14px]" onClick={() => nav('/demo')}>
              Demo control
            </Pill>
          </div>
        </div>
        <p className="mt-4 text-center text-[12px] text-muted">Demo build · {dataMode === 'local' ? 'local data on this device' : 'live data'}</p>
      </motion.div>
    </motion.div>
  );
}

/** Guards role pages. HR may also visit colleague pages (they have a card too). */
export function RoleGate({ allow, children }: { allow: Role[]; children: (s: Session) => React.ReactNode }) {
  const session = useSession();
  if (!session) return <Navigate to="/" replace />;
  if (!allow.includes(session.role)) return <Navigate to={homeFor(session.role)} replace />;
  return <>{children(session)}</>;
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[90] bg-ink px-4 text-center text-[14px] font-semibold text-white" style={{ paddingTop: 'calc(var(--safe-top) + 6px)', paddingBottom: 6 }}>
      Offline. We'll retry.
    </div>
  );
}

export function useMe(personId: string | undefined) {
  return useData(() => (personId ? api.getPerson(personId) : Promise.resolve(null)), [personId]);
}
