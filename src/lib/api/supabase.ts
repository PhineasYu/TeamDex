// SupabaseAdapter: reads with select, writes only through rpc() (tables have no write policies),
// events through realtime. Behaviour must match LocalAdapter exactly.
//
// DEMO SECURITY NOTE: there is no real login. Anyone with the join code can act as anyone.
// In production, switch to Supabase Auth and derive p_person / p_collector from auth.uid().
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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

const PERSON_COLS =
  'id, company_id, display_name, role_title, department, help_topics, avatar, card_no, kind, is_hr, start_date, fun_fact_prompt, open_to_chat, card_claimed, hidden';
const QUEST_COLS = '*, targets:quest_targets(person_id, reason, sort)';

type QuestRow = Omit<Quest, 'targets'> & { targets: (QuestTarget & { sort: number })[] };

function toQuest(row: QuestRow): Quest {
  return {
    ...row,
    targets: [...(row.targets ?? [])].sort((a, b) => a.sort - b.sort).map(({ person_id, reason }) => ({ person_id, reason })),
  };
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export class SupabaseAdapter implements TeamdexApi {
  private sb: SupabaseClient;

  constructor(url: string, key: string) {
    this.sb = createClient(url, key, { auth: { persistSession: false } });
  }

  async getCompanyByCode(code: string) {
    const res = await this.sb.from('companies').select('id, name, join_code').ilike('join_code', code.trim()).maybeSingle();
    return check(res) as Company | null;
  }

  async getCompany(companyId: string) {
    const res = await this.sb.from('companies').select('id, name, join_code').eq('id', companyId).maybeSingle();
    return check(res) as Company | null;
  }

  async listPeople(companyId: string) {
    const res = await this.sb
      .from('people')
      .select(PERSON_COLS)
      .eq('company_id', companyId)
      .eq('hidden', false)
      .order('card_no');
    return check(res) as Person[];
  }

  async getPerson(personId: string) {
    const res = await this.sb.from('people').select(PERSON_COLS).eq('id', personId).maybeSingle();
    return check(res) as Person | null;
  }

  async getPersonByToken(token: string) {
    const res = await this.sb
      .from('people')
      .select(PERSON_COLS)
      .eq('qr_token', token.trim().toLowerCase())
      .eq('hidden', false)
      .maybeSingle();
    return check(res) as Person | null;
  }

  // ---------- newcomer ----------
  async getQuestForNewcomer(newcomerId: string) {
    const res = await this.sb
      .from('quests')
      .select(QUEST_COLS)
      .eq('newcomer_id', newcomerId)
      .order('created_at', { ascending: false })
      .limit(1);
    const rows = check(res) as QuestRow[];
    return rows[0] ? toQuest(rows[0]) : null;
  }

  async listConnections(collectorId: string) {
    const res = await this.sb.from('connections').select('*').eq('collector_id', collectorId);
    return check(res) as Connection[];
  }

  async collectCard(collectorId: string, qrToken: string) {
    const res = await this.sb.rpc('collect_card', { p_collector: collectorId, p_token: qrToken.trim().toLowerCase() });
    return check(res) as CollectResult;
  }

  async unlockFact(collectorId: string, collectedId: string, guess: string) {
    const res = await this.sb.rpc('unlock_fact', { p_collector: collectorId, p_collected: collectedId, p_guess: guess });
    return check(res) as UnlockResult;
  }

  async getUnlockedFacts(collectorId: string) {
    const res = await this.sb.rpc('get_unlocked_facts', { p_collector: collectorId });
    const rows = check(res) as { person_id: string; fun_fact_text: string }[];
    return Object.fromEntries(rows.map((r) => [r.person_id, r.fun_fact_text]));
  }

  async saveNote(collectorId: string, collectedId: string, note: Note) {
    check(
      await this.sb.rpc('save_note', {
        p_collector: collectorId, p_collected: collectedId, p_impression: note.impression, p_quote: note.quote,
      }),
    );
  }

  async getNotes(collectorId: string) {
    const res = await this.sb.rpc('get_notes', { p_collector: collectorId });
    const rows = check(res) as { collected_id: string; impression: string; quote: string }[];
    return Object.fromEntries(rows.map((r) => [r.collected_id, { impression: r.impression, quote: r.quote }]));
  }

  async submitQuiz(questId: string, score: number, total: number) {
    check(await this.sb.rpc('submit_quiz', { p_quest: questId, p_score: score, p_total: total }));
  }

  async submitPulse(newcomerId: string, day: number, score: number) {
    check(await this.sb.rpc('submit_pulse', { p_newcomer: newcomerId, p_day: day, p_score: score }));
  }

  // ---------- colleague ----------
  async updateMyCard(personId: string, input: CardInput) {
    // Only send fields that changed; null arguments keep the current value in SQL.
    const args: Record<string, unknown> = { p_person: personId };
    const map: [keyof CardInput, string][] = [
      ['role_title', 'p_role_title'],
      ['department', 'p_department'],
      ['help_topics', 'p_help_topics'],
      ['avatar', 'p_avatar'],
      ['fun_fact_prompt', 'p_fun_fact_prompt'],
      ['fun_fact_text', 'p_fun_fact_text'],
      ['answer_keywords', 'p_answer_keywords'],
      ['open_to_chat', 'p_open_to_chat'],
      ['hidden', 'p_hidden'],
    ];
    for (const [k, p] of map) if (input[k] !== undefined) args[p] = input[k];
    check(await this.sb.rpc('update_my_card', args));
  }

  async setOpenToChat(personId: string, open: boolean) {
    check(await this.sb.rpc('set_open_to_chat', { p_person: personId, p_open: open }));
  }

  async getMyQrToken(personId: string) {
    const res = await this.sb.from('people').select('qr_token').eq('id', personId).single();
    return (check(res) as { qr_token: string }).qr_token;
  }

  // ---------- HR ----------
  async hrAddPerson(input: NewPersonInput) {
    const res = await this.sb.rpc('hr_add_person', {
      p_company: input.company_id,
      p_name: input.display_name,
      p_role: input.role_title,
      p_department: input.department,
      p_kind: input.kind,
      p_start_date: input.start_date ?? null,
    });
    const { qr_token: _t, ...person } = check(res) as Person;
    return person as Person;
  }

  async hrCreateQuest(newcomerId: string, targets: QuestTarget[], goal?: number) {
    const res = await this.sb.rpc('hr_create_quest', {
      p_newcomer: newcomerId,
      p_targets: targets.map((t) => t.person_id),
      p_reasons: targets.map((t) => t.reason),
      p_goal: goal ?? null,
    });
    const id = check(res) as string;
    const q = check(await this.sb.from('quests').select(QUEST_COLS).eq('id', id).single()) as QuestRow;
    return toQuest(q);
  }

  async listQuests(companyId: string) {
    const res = await this.sb.from('quests').select(QUEST_COLS).eq('company_id', companyId);
    return (check(res) as QuestRow[]).map(toQuest);
  }

  async listAllConnections(companyId: string) {
    const res = await this.sb.from('connections').select('*').eq('company_id', companyId);
    return check(res) as Connection[];
  }

  async listQuizAttempts(companyId: string) {
    const res = await this.sb
      .from('quiz_attempts')
      .select('id, quest_id, score, total, created_at, quests!inner(company_id)')
      .eq('quests.company_id', companyId);
    return (check(res) as (QuizAttempt & { quests: unknown })[]).map(({ quests: _q, ...a }) => a);
  }

  async listPulseChecks(companyId: string) {
    const res = await this.sb
      .from('pulse_checks')
      .select('newcomer_id, day, score, created_at, people!inner(company_id)')
      .eq('people.company_id', companyId);
    return (check(res) as (PulseCheck & { people: unknown })[]).map(({ people: _p, ...a }) => a);
  }

  async resetDemo(companyId: string) {
    check(await this.sb.rpc('reset_demo', { p_company: companyId }));
  }

  // ---------- events ----------
  async listEvents(companyId: string, limit = 50) {
    const res = await this.sb
      .from('events')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);
    return check(res) as TeamdexEvent[];
  }

  subscribeEvents(companyId: string, onEvent: (e: TeamdexEvent) => void) {
    const ch = this.sb
      .channel('events-' + companyId + '-' + Math.random().toString(36).slice(2, 7))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events', filter: 'company_id=eq.' + companyId },
        (payload) => onEvent(payload.new as TeamdexEvent),
      )
      .subscribe();
    return () => {
      this.sb.removeChannel(ch);
    };
  }
}
