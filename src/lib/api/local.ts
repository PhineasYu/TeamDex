// LocalAdapter: localStorage + seed JSON + BroadcastChannel.
// Mirrors the business rules of the SQL functions in supabase/schema.sql so the UI behaves
// identically in both modes. Secrets live in localStorage only because there is no server;
// the UI must never render answer_keywords.
import { seed } from '../../data/seed';
import { uid, shortToken } from '../uid';
import type {
  CardInput,
  CollectResult,
  Company,
  Connection,
  NewPersonInput,
  Note,
  Person,
  PulseCheck,
  Quest,
  QuestTarget,
  QuizAttempt,
  TeamdexApi,
  TeamdexEvent,
  UnlockResult,
} from './types';

const DB_KEY = 'teamdex.db';
const DB_VERSION = 2;
const CHANNEL = 'teamdex';

interface Secret {
  person_id: string;
  fun_fact_text: string;
  answer_keywords: string[];
}

interface LocalDb {
  version: number;
  companies: Company[];
  people: Person[];
  secrets: Secret[];
  quests: Quest[];
  connections: Connection[];
  notes: (Note & { collector_id: string; collected_id: string })[];
  quiz_attempts: QuizAttempt[];
  pulse_checks: PulseCheck[];
  events: TeamdexEvent[];
  next_event_id: number;
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Converts NOW / DAY_0 / DAY_MINUS_n / DAYS_AGO_n / HOURS_AGO_n markers into real values. */
function resolveTime(v: string | null): string | null {
  if (v == null) return null;
  const now = Date.now();
  const date = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  if (v === 'NOW') return new Date(now).toISOString();
  if (v === 'DAY_0') return date(now);
  let m = /^DAY_MINUS_(\d+)$/.exec(v);
  if (m) return date(now - Number(m[1]) * DAY);
  m = /^DAYS_AGO_(\d+)$/.exec(v);
  if (m) return new Date(now - Number(m[1]) * DAY).toISOString();
  m = /^HOURS_AGO_(\d+)$/.exec(v);
  if (m) return new Date(now - Number(m[1]) * HOUR).toISOString();
  return v;
}

function buildInitialDb(): LocalDb {
  const s = structuredClone(seed);
  const events = s.events.map((e) => ({ ...e, created_at: resolveTime(e.created_at)! })) as TeamdexEvent[];
  return {
    version: DB_VERSION,
    companies: [s.company],
    people: s.people.map((p) => ({ ...p, start_date: resolveTime(p.start_date) })) as Person[],
    secrets: s.secrets,
    quests: s.quests.map((q) => ({
      ...q,
      created_at: resolveTime(q.created_at)!,
      party_unlocked_at: resolveTime(q.party_unlocked_at),
    })),
    connections: s.connections.map((c) => ({
      ...c,
      method: c.method as Connection['method'],
      created_at: resolveTime(c.created_at)!,
      fact_unlocked_at: resolveTime(c.fact_unlocked_at),
    })),
    notes: [],
    quiz_attempts: s.quiz_attempts.map((q) => ({ ...q, created_at: resolveTime(q.created_at)! })),
    pulse_checks: s.pulse_checks.map((p) => ({ ...p, created_at: resolveTime(p.created_at)! })),
    events,
    next_event_id: Math.max(0, ...events.map((e) => e.id)) + 1,
  };
}

function load(): LocalDb {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const db = JSON.parse(raw) as LocalDb;
      if (db.version === DB_VERSION) return db;
    }
  } catch {
    // fall through to a fresh database
  }
  const db = buildInitialDb();
  save(db);
  return db;
}

function save(db: LocalDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/** Random 60–240ms delay so loading states get exercised in local mode too. */
function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 60 + Math.random() * 180));
}

const clone = <T,>(v: T): T => (v == null ? v : structuredClone(v));

/** Strip the QR token so other people's tokens never reach the UI. */
const publicPerson = (p: Person): Person => {
  const { qr_token: _t, ...rest } = p;
  return clone(rest);
};

// ---------- event bus ----------
type Listener = (e: TeamdexEvent) => void;
const listeners = new Set<Listener>();
const channel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
channel?.addEventListener('message', (msg) => {
  if (msg.data?.type === 'event') listeners.forEach((l) => l(msg.data.event));
});
// Tabs without BroadcastChannel (old Safari) still hear about changes via the storage event.
window.addEventListener('storage', (e) => {
  if (e.key !== 'teamdex.lastEvent' || !e.newValue || channel) return;
  try {
    const ev = JSON.parse(e.newValue) as TeamdexEvent;
    listeners.forEach((l) => l(ev));
  } catch {
    /* ignore */
  }
});

function emit(db: LocalDb, partial: Omit<TeamdexEvent, 'id' | 'created_at'>): TeamdexEvent {
  const ev: TeamdexEvent = { ...partial, id: db.next_event_id++, created_at: new Date().toISOString() };
  db.events.push(ev);
  return ev;
}

function broadcast(events: TeamdexEvent[]) {
  // Deliver after the write resolves, like a realtime push would.
  setTimeout(() => {
    for (const ev of events) {
      listeners.forEach((l) => l(ev));
      channel?.postMessage({ type: 'event', event: ev });
      try {
        localStorage.setItem('teamdex.lastEvent', JSON.stringify(ev));
      } catch {
        /* ignore */
      }
    }
  }, 30);
}

function questFor(db: LocalDb, newcomerId: string): Quest | null {
  const qs = db.quests
    .filter((q) => q.newcomer_id === newcomerId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return qs[0] ?? null;
}

export class LocalAdapter implements TeamdexApi {
  async getCompanyByCode(code: string) {
    const db = load();
    const c = db.companies.find((x) => x.join_code.toUpperCase() === code.trim().toUpperCase());
    return delay(clone(c ?? null));
  }

  async getCompany(companyId: string) {
    return delay(clone(load().companies.find((c) => c.id === companyId) ?? null));
  }

  async listPeople(companyId: string) {
    const db = load();
    return delay(
      db.people
        .filter((p) => p.company_id === companyId && !p.hidden)
        .sort((a, b) => a.card_no - b.card_no)
        .map(publicPerson),
    );
  }

  async getPerson(personId: string) {
    const p = load().people.find((x) => x.id === personId);
    return delay(p ? publicPerson(p) : null);
  }

  async getPersonByToken(token: string) {
    const p = load().people.find((x) => x.qr_token === token.trim().toLowerCase());
    return delay(p && !p.hidden ? publicPerson(p) : null);
  }

  // ---------- newcomer ----------
  async getQuestForNewcomer(newcomerId: string) {
    return delay(clone(questFor(load(), newcomerId)));
  }

  async listConnections(collectorId: string) {
    return delay(clone(load().connections.filter((c) => c.collector_id === collectorId)));
  }

  async collectCard(collectorId: string, qrToken: string): Promise<CollectResult> {
    const db = load();
    const collector = db.people.find((p) => p.id === collectorId);
    if (!collector) return delay({ ok: false, error: 'unknown_collector' });
    const target = db.people.find((p) => p.qr_token === qrToken.trim().toLowerCase());
    if (!target) return delay({ ok: false, error: 'unknown_card' });
    if (target.company_id !== collector.company_id) return delay({ ok: false, error: 'other_company' });
    if (target.id === collector.id) return delay({ ok: false, error: 'own_card' });
    if (target.hidden) return delay({ ok: false, error: 'card_hidden' });

    const now = new Date().toISOString();
    const events: TeamdexEvent[] = [];
    const has = (a: string, b: string) => db.connections.some((c) => c.collector_id === a && c.collected_id === b);

    const inserted = !has(collector.id, target.id);
    if (inserted) {
      db.connections.push({
        id: uid(), company_id: collector.company_id, collector_id: collector.id, collected_id: target.id,
        method: 'qr', fact_unlocked_at: null, created_at: now,
      });
    }
    if (!has(target.id, collector.id)) {
      db.connections.push({
        id: uid(), company_id: collector.company_id, collector_id: target.id, collected_id: collector.id,
        method: 'exchange', fact_unlocked_at: null, created_at: now,
      });
    }
    if (inserted) {
      events.push(emit(db, {
        company_id: collector.company_id, type: 'card_collected', actor_id: collector.id, target_id: target.id, payload: {},
      }));
    }

    let partyUnlocked = false;
    const quest = questFor(db, collector.id);
    if (quest && !quest.party_unlocked_at) {
      const done = quest.targets.filter((t) => has(collector.id, t.person_id)).length;
      if (done >= quest.party_goal) {
        quest.party_unlocked_at = now;
        events.push(emit(db, {
          company_id: collector.company_id, type: 'party_unlocked', actor_id: collector.id, target_id: null,
          payload: { quest_id: quest.id },
        }));
        partyUnlocked = true;
      }
    }

    save(db);
    broadcast(events);
    return delay({ ok: true, already: !inserted, partyUnlocked, person: publicPerson(target) });
  }

  async unlockFact(collectorId: string, collectedId: string, guess: string): Promise<UnlockResult> {
    const db = load();
    const conn = db.connections.find((c) => c.collector_id === collectorId && c.collected_id === collectedId);
    if (!conn) return delay({ ok: false, error: 'not_collected' });
    const secret = db.secrets.find((s) => s.person_id === collectedId);
    if (!secret || !secret.fun_fact_text) return delay({ ok: false, error: 'no_fact' });
    if (conn.fact_unlocked_at) return delay({ ok: true, fact: secret.fun_fact_text, already: true });

    const g = (guess ?? '').trim().toLowerCase();
    if (g.length < 2) return delay({ ok: false, error: 'too_short' });
    const match = secret.answer_keywords.some((k) => k.trim().length > 0 && g.includes(k.trim().toLowerCase()));
    if (!match) return delay({ ok: false, error: 'no_match' });

    conn.fact_unlocked_at = new Date().toISOString();
    const ev = emit(db, {
      company_id: conn.company_id, type: 'fact_unlocked', actor_id: collectorId, target_id: collectedId, payload: {},
    });
    save(db);
    broadcast([ev]);
    return delay({ ok: true, fact: secret.fun_fact_text });
  }

  async getUnlockedFacts(collectorId: string) {
    const db = load();
    const out: Record<string, string> = {};
    for (const c of db.connections) {
      if (c.collector_id !== collectorId || !c.fact_unlocked_at) continue;
      const s = db.secrets.find((x) => x.person_id === c.collected_id);
      if (s) out[c.collected_id] = s.fun_fact_text;
    }
    return delay(out);
  }

  async saveNote(collectorId: string, collectedId: string, note: Note) {
    const db = load();
    const existing = db.notes.find((n) => n.collector_id === collectorId && n.collected_id === collectedId);
    if (existing) Object.assign(existing, note);
    else db.notes.push({ collector_id: collectorId, collected_id: collectedId, ...note });
    save(db);
    return delay(undefined);
  }

  async getNotes(collectorId: string) {
    const out: Record<string, Note> = {};
    for (const n of load().notes) {
      if (n.collector_id === collectorId) out[n.collected_id] = { impression: n.impression, quote: n.quote };
    }
    return delay(out);
  }

  async submitQuiz(questId: string, score: number, total: number) {
    const db = load();
    const q = db.quests.find((x) => x.id === questId);
    if (!q) throw new Error('unknown quest');
    db.quiz_attempts.push({ id: uid(), quest_id: questId, score, total, created_at: new Date().toISOString() });
    const ev = emit(db, {
      company_id: q.company_id, type: 'quiz_done', actor_id: q.newcomer_id, target_id: null, payload: { score, total },
    });
    save(db);
    broadcast([ev]);
    return delay(undefined);
  }

  async submitPulse(newcomerId: string, day: number, score: number) {
    const db = load();
    db.pulse_checks.push({ newcomer_id: newcomerId, day, score, created_at: new Date().toISOString() });
    save(db);
    return delay(undefined);
  }

  // ---------- colleague ----------
  async updateMyCard(personId: string, input: CardInput) {
    const db = load();
    const p = db.people.find((x) => x.id === personId);
    if (!p) throw new Error('unknown person');
    const wasClaimed = p.card_claimed;
    if (input.role_title != null) p.role_title = input.role_title;
    if (input.department != null) p.department = input.department;
    if (input.help_topics != null) p.help_topics = input.help_topics.slice(0, 3);
    if (input.avatar != null) p.avatar = input.avatar;
    if (input.fun_fact_prompt != null) p.fun_fact_prompt = input.fun_fact_prompt;
    if (input.open_to_chat != null) p.open_to_chat = input.open_to_chat;
    if (input.hidden != null) p.hidden = input.hidden;
    p.card_claimed = true;

    if (input.fun_fact_text != null || input.answer_keywords != null) {
      let s = db.secrets.find((x) => x.person_id === personId);
      if (!s) {
        s = { person_id: personId, fun_fact_text: '', answer_keywords: [] };
        db.secrets.push(s);
      }
      if (input.fun_fact_text != null) s.fun_fact_text = input.fun_fact_text;
      if (input.answer_keywords != null) s.answer_keywords = input.answer_keywords;
    }

    const events: TeamdexEvent[] = [];
    if (!wasClaimed) {
      events.push(emit(db, { company_id: p.company_id, type: 'card_claimed', actor_id: p.id, target_id: null, payload: {} }));
    }
    save(db);
    broadcast(events);
    return delay(undefined);
  }

  async setOpenToChat(personId: string, open: boolean) {
    const db = load();
    const p = db.people.find((x) => x.id === personId);
    if (p) p.open_to_chat = open;
    save(db);
    return delay(undefined);
  }

  async getMyQrToken(personId: string) {
    const p = load().people.find((x) => x.id === personId);
    if (!p?.qr_token) throw new Error('unknown person');
    return delay(p.qr_token);
  }

  // ---------- HR ----------
  async hrAddPerson(input: NewPersonInput) {
    const db = load();
    const cardNo = Math.max(0, ...db.people.filter((p) => p.company_id === input.company_id).map((p) => p.card_no)) + 1;
    const person: Person = {
      id: uid(),
      company_id: input.company_id,
      display_name: input.display_name,
      role_title: input.role_title,
      department: input.department,
      help_topics: [],
      avatar: { hair: '#13222E', skin: '#F1C6A0', shirt: '#5AAFE3', pants: '#13222E', shoes: '#C8F53C' },
      card_no: cardNo,
      kind: input.kind,
      is_hr: false,
      start_date: input.start_date ?? null,
      fun_fact_prompt: null,
      open_to_chat: true,
      card_claimed: input.kind === 'newcomer',
      hidden: false,
      qr_token: shortToken(),
    };
    db.people.push(person);
    save(db);
    return delay(publicPerson(person));
  }

  async hrCreateQuest(newcomerId: string, targets: QuestTarget[], goal?: number) {
    const db = load();
    const n = db.people.find((p) => p.id === newcomerId && p.kind === 'newcomer');
    if (!n) throw new Error('not a newcomer');
    const quest: Quest = {
      id: uid(),
      company_id: n.company_id,
      newcomer_id: newcomerId,
      party_goal: goal ?? (targets.length || 5),
      party_unlocked_at: null,
      created_at: new Date().toISOString(),
      targets: targets.map((t) => ({ person_id: t.person_id, reason: t.reason })),
    };
    db.quests.push(quest);
    const ev = emit(db, {
      company_id: n.company_id, type: 'quest_created', actor_id: newcomerId, target_id: null,
      payload: { quest_id: quest.id, targets: targets.map((t) => t.person_id) },
    });
    save(db);
    broadcast([ev]);
    return delay(clone(quest));
  }

  async listQuests(companyId: string) {
    return delay(clone(load().quests.filter((q) => q.company_id === companyId)));
  }

  async listAllConnections(companyId: string) {
    return delay(clone(load().connections.filter((c) => c.company_id === companyId)));
  }

  async listQuizAttempts(companyId: string) {
    const db = load();
    const ids = new Set(db.quests.filter((q) => q.company_id === companyId).map((q) => q.id));
    return delay(clone(db.quiz_attempts.filter((a) => ids.has(a.quest_id))));
  }

  async listPulseChecks(companyId: string) {
    const db = load();
    const ids = new Set(db.people.filter((p) => p.company_id === companyId).map((p) => p.id));
    return delay(clone(db.pulse_checks.filter((p) => ids.has(p.newcomer_id))));
  }

  async resetDemo(_companyId: string) {
    localStorage.removeItem(DB_KEY);
    save(buildInitialDb());
    channel?.postMessage({ type: 'reset' });
    return delay(undefined);
  }

  // ---------- events ----------
  async listEvents(companyId: string, limit = 50) {
    const evs = load()
      .events.filter((e) => e.company_id === companyId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
      .slice(0, limit);
    return delay(clone(evs));
  }

  subscribeEvents(companyId: string, onEvent: (e: TeamdexEvent) => void) {
    const l: Listener = (e) => {
      if (e.company_id === companyId) onEvent(e);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }
}
