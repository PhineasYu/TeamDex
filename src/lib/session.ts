// Demo identity: join code + chosen person, stored on this device.
// DEMO SECURITY NOTE: no real login. Production would use Supabase Auth.
import { useSyncExternalStore } from 'react';

export type Role = 'newcomer' | 'colleague' | 'hr';

export interface Session {
  companyId: string;
  joinCode: string;
  personId: string;
  role: Role;
}

const KEY = 'teamdex.session';
const PENDING = 'teamdex.pendingToken';
const subs = new Set<() => void>();

let cached: Session | null = read();

function read(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  return cached;
}

export function setSession(s: Session | null) {
  cached = s;
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: keep in memory */
  }
  subs.forEach((f) => f());
}

export function useSession(): Session | null {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => cached,
  );
}

export function homeFor(role: Role): string {
  return role === 'newcomer' ? '/quest' : role === 'hr' ? '/hr' : '/me';
}

// A scanned token waiting for the visitor to pick who they are.
export function setPendingToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(PENDING, token);
    else sessionStorage.removeItem(PENDING);
  } catch {
    /* ignore */
  }
}

export function getPendingToken(): string | null {
  try {
    return sessionStorage.getItem(PENDING);
  } catch {
    return null;
  }
}
