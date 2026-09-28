export type Department = 'design' | 'engineering' | 'sales' | 'people' | 'finance' | 'product' | 'ops';

export const DEPARTMENTS: Department[] = ['design', 'engineering', 'sales', 'people', 'finance', 'product', 'ops'];

export interface Avatar {
  hair: string;
  skin: string;
  shirt: string;
  pants: string;
  shoes: string;
}

export interface Company {
  id: string;
  name: string;
  join_code: string;
}

export interface Person {
  id: string;
  company_id: string;
  display_name: string;
  role_title: string;
  department: Department;
  help_topics: string[];
  avatar: Avatar;
  card_no: number;
  kind: 'colleague' | 'newcomer';
  is_hr: boolean;
  start_date: string | null;
  fun_fact_prompt: string | null;
  open_to_chat: boolean;
  card_claimed: boolean;
  hidden: boolean;
  /** Only used to build the owner's own QR code. Never shown to others. */
  qr_token?: string;
}

export interface QuestTarget {
  person_id: string;
  reason: string;
}

export interface Quest {
  id: string;
  company_id: string;
  newcomer_id: string;
  party_goal: number;
  party_unlocked_at: string | null;
  created_at: string;
  targets: QuestTarget[];
}

export interface Connection {
  id: string;
  company_id: string;
  collector_id: string;
  collected_id: string;
  method: 'qr' | 'exchange';
  fact_unlocked_at: string | null;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  quest_id: string;
  score: number;
  total: number;
  created_at: string;
}

export interface PulseCheck {
  newcomer_id: string;
  day: number;
  score: number;
  created_at: string;
}

export type EventType =
  | 'card_claimed'
  | 'card_collected'
  | 'fact_unlocked'
  | 'quest_created'
  | 'party_unlocked'
  | 'quiz_done';

export interface TeamdexEvent {
  id: number;
  company_id: string;
  type: EventType;
  actor_id: string | null;
  target_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export type CollectResult =
  | { ok: true; already: boolean; partyUnlocked: boolean; person: Person }
  | { ok: false; error: 'unknown_card' | 'own_card' | 'other_company' | 'unknown_collector' | 'card_hidden' };

export type UnlockResult =
  | { ok: true; fact: string; already?: boolean }
  | { ok: false; error: 'not_collected' | 'no_fact' | 'no_match' | 'too_short' };

export interface CardInput {
  role_title?: string;
  department?: Department;
  help_topics?: string[];
  avatar?: Avatar;
  fun_fact_prompt?: string;
  fun_fact_text?: string;
  answer_keywords?: string[];
  open_to_chat?: boolean;
  hidden?: boolean;
}

export interface NewPersonInput {
  company_id: string;
  display_name: string;
  role_title: string;
  department: Department;
  kind: 'colleague' | 'newcomer';
  start_date?: string | null;
}

export interface Note {
  impression: string;
  quote: string;
}

export interface TeamdexApi {
  // entry
  getCompanyByCode(code: string): Promise<Company | null>;
  getCompany(companyId: string): Promise<Company | null>;
  listPeople(companyId: string): Promise<Person[]>;
  getPerson(personId: string): Promise<Person | null>;
  /** Public card lookup for /c/:token (no secrets, no token). */
  getPersonByToken(token: string): Promise<Person | null>;

  // newcomer
  getQuestForNewcomer(newcomerId: string): Promise<Quest | null>;
  listConnections(collectorId: string): Promise<Connection[]>;
  collectCard(collectorId: string, qrToken: string): Promise<CollectResult>;
  unlockFact(collectorId: string, collectedId: string, guess: string): Promise<UnlockResult>;
  getUnlockedFacts(collectorId: string): Promise<Record<string, string>>;
  saveNote(collectorId: string, collectedId: string, note: Note): Promise<void>;
  getNotes(collectorId: string): Promise<Record<string, Note>>;
  submitQuiz(questId: string, score: number, total: number): Promise<void>;
  submitPulse(newcomerId: string, day: number, score: number): Promise<void>;

  // colleague
  updateMyCard(personId: string, input: CardInput): Promise<void>;
  setOpenToChat(personId: string, open: boolean): Promise<void>;
  getMyQrToken(personId: string): Promise<string>;

  // HR
  hrAddPerson(input: NewPersonInput): Promise<Person>;
  hrCreateQuest(newcomerId: string, targets: QuestTarget[], goal?: number): Promise<Quest>;
  listQuests(companyId: string): Promise<Quest[]>;
  listAllConnections(companyId: string): Promise<Connection[]>;
  listQuizAttempts(companyId: string): Promise<QuizAttempt[]>;
  listPulseChecks(companyId: string): Promise<PulseCheck[]>;
  resetDemo(companyId: string): Promise<void>;

  // events
  listEvents(companyId: string, limit?: number): Promise<TeamdexEvent[]>;
  subscribeEvents(companyId: string, onEvent: (e: TeamdexEvent) => void): () => void;
}
