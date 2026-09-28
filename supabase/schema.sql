-- =====================================================================
-- Teamdex · Supabase schema, business functions and demo data
-- Paste the whole file into Supabase > SQL Editor and click Run.
-- Safe to re-run: it drops and recreates everything.
--
-- DEMO SECURITY NOTE: there is no real login in the hackathon build.
-- Functions take the acting person's id as a parameter. In production,
-- replace p_person / p_collector with the person linked to auth.uid().
-- =====================================================================

drop table if exists events, pulse_checks, quiz_attempts, private_notes, connections,
  quest_targets, quests, person_secrets, people, companies cascade;

-- ---------- tables ----------
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table people (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  display_name text not null,
  role_title text not null default '',
  department text not null default 'ops'
    check (department in ('design','engineering','sales','people','finance','product','ops')),
  help_topics text[] not null default '{}',
  avatar jsonb not null default '{}'::jsonb,
  card_no int not null default 0,
  kind text not null default 'colleague' check (kind in ('colleague','newcomer')),
  is_hr boolean not null default false,
  start_date date,
  fun_fact_prompt text,
  open_to_chat boolean not null default true,
  card_claimed boolean not null default false,
  hidden boolean not null default false,
  qr_token text not null unique default substr(md5(random()::text), 1, 10),
  created_at timestamptz not null default now()
);

-- never readable from the client; only unlock_fact() returns the text
create table person_secrets (
  person_id uuid primary key references people(id) on delete cascade,
  fun_fact_text text not null default '',
  answer_keywords text[] not null default '{}'
);

create table quests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  newcomer_id uuid not null references people(id) on delete cascade,
  party_goal int not null default 5,
  party_unlocked_at timestamptz,
  created_at timestamptz not null default now()
);

create table quest_targets (
  quest_id uuid not null references quests(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  reason text not null default '',
  sort int not null default 0,
  primary key (quest_id, person_id)
);

create table connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  collector_id uuid not null references people(id) on delete cascade,
  collected_id uuid not null references people(id) on delete cascade,
  method text not null default 'qr' check (method in ('qr','exchange')),
  fact_unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (collector_id, collected_id),
  check (collector_id <> collected_id)
);

-- private to the collector; no select policy, read via get_notes()
create table private_notes (
  collector_id uuid not null references people(id) on delete cascade,
  collected_id uuid not null references people(id) on delete cascade,
  impression text not null default '',
  quote text not null default '',
  updated_at timestamptz not null default now(),
  primary key (collector_id, collected_id)
);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  score int not null,
  total int not null,
  created_at timestamptz not null default now()
);

create table pulse_checks (
  id uuid primary key default gen_random_uuid(),
  newcomer_id uuid not null references people(id) on delete cascade,
  day int not null,
  score int not null check (score between 1 and 5),
  created_at timestamptz not null default now()
);

create table events (
  id bigserial primary key,
  company_id uuid not null references companies(id) on delete cascade,
  type text not null,
  actor_id uuid references people(id) on delete set null,
  target_id uuid references people(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on events (company_id, created_at desc);
create index on connections (collector_id);

-- ---------- row level security: read-only for clients ----------
alter table companies enable row level security;
alter table people enable row level security;
alter table person_secrets enable row level security;
alter table quests enable row level security;
alter table quest_targets enable row level security;
alter table connections enable row level security;
alter table private_notes enable row level security;
alter table quiz_attempts enable row level security;
alter table pulse_checks enable row level security;
alter table events enable row level security;

create policy demo_read on companies for select using (true);
create policy demo_read on people for select using (true);
create policy demo_read on quests for select using (true);
create policy demo_read on quest_targets for select using (true);
create policy demo_read on connections for select using (true);
create policy demo_read on quiz_attempts for select using (true);
create policy demo_read on pulse_checks for select using (true);
create policy demo_read on events for select using (true);
-- person_secrets and private_notes: no policies = no direct access

-- realtime for the live feed
do $$ begin
  alter publication supabase_realtime add table public.events;
exception when duplicate_object then null; end $$;

-- ---------- business functions ----------

-- Newcomer scans a colleague's QR code. Creates both directions of the exchange.
create or replace function collect_card(p_collector uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_collector people%rowtype;
  v_target people%rowtype;
  v_inserted int;
  v_quest quests%rowtype;
  v_done int;
  v_party boolean := false;
begin
  select * into v_collector from people where id = p_collector;
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown_collector'); end if;

  select * into v_target from people where qr_token = p_token;
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown_card'); end if;
  if v_target.company_id <> v_collector.company_id then return jsonb_build_object('ok', false, 'error', 'other_company'); end if;
  if v_target.id = v_collector.id then return jsonb_build_object('ok', false, 'error', 'own_card'); end if;
  if v_target.hidden then return jsonb_build_object('ok', false, 'error', 'card_hidden'); end if;

  insert into connections (company_id, collector_id, collected_id, method)
  values (v_collector.company_id, v_collector.id, v_target.id, 'qr')
  on conflict (collector_id, collected_id) do nothing;
  get diagnostics v_inserted = row_count;

  insert into connections (company_id, collector_id, collected_id, method)
  values (v_collector.company_id, v_target.id, v_collector.id, 'exchange')
  on conflict (collector_id, collected_id) do nothing;

  if v_inserted > 0 then
    insert into events (company_id, type, actor_id, target_id)
    values (v_collector.company_id, 'card_collected', v_collector.id, v_target.id);
  end if;

  select * into v_quest from quests where newcomer_id = v_collector.id order by created_at desc limit 1;
  if found and v_quest.party_unlocked_at is null then
    select count(*) into v_done
    from quest_targets qt
    join connections c on c.collected_id = qt.person_id and c.collector_id = v_collector.id
    where qt.quest_id = v_quest.id;
    if v_done >= v_quest.party_goal then
      update quests set party_unlocked_at = now() where id = v_quest.id;
      insert into events (company_id, type, actor_id, payload)
      values (v_collector.company_id, 'party_unlocked', v_collector.id, jsonb_build_object('quest_id', v_quest.id));
      v_party := true;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'already', v_inserted = 0,
    'partyUnlocked', v_party,
    'person', to_jsonb(v_target) - 'qr_token'
  );
end $$;

-- Newcomer types the answer they heard in person.
create or replace function unlock_fact(p_collector uuid, p_collected uuid, p_guess text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_conn connections%rowtype;
  v_secret person_secrets%rowtype;
  v_guess text := lower(trim(coalesce(p_guess, '')));
  v_match boolean;
begin
  select * into v_conn from connections where collector_id = p_collector and collected_id = p_collected;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_collected'); end if;

  select * into v_secret from person_secrets where person_id = p_collected;
  if not found or v_secret.fun_fact_text = '' then return jsonb_build_object('ok', false, 'error', 'no_fact'); end if;

  if v_conn.fact_unlocked_at is not null then
    return jsonb_build_object('ok', true, 'fact', v_secret.fun_fact_text, 'already', true);
  end if;

  if length(v_guess) < 2 then return jsonb_build_object('ok', false, 'error', 'too_short'); end if;

  select exists (
    select 1 from unnest(v_secret.answer_keywords) k
    where length(trim(k)) > 0 and position(lower(trim(k)) in v_guess) > 0
  ) into v_match;
  if not v_match then return jsonb_build_object('ok', false, 'error', 'no_match'); end if;

  update connections set fact_unlocked_at = now() where id = v_conn.id;
  insert into events (company_id, type, actor_id, target_id)
  values (v_conn.company_id, 'fact_unlocked', p_collector, p_collected);

  return jsonb_build_object('ok', true, 'fact', v_secret.fun_fact_text);
end $$;

create or replace function get_unlocked_facts(p_collector uuid)
returns table (person_id uuid, fun_fact_text text)
language sql security definer set search_path = public as $$
  select c.collected_id, s.fun_fact_text
  from connections c join person_secrets s on s.person_id = c.collected_id
  where c.collector_id = p_collector and c.fact_unlocked_at is not null;
$$;

-- Colleague sets up or edits their card. Null arguments keep the current value.
create or replace function update_my_card(
  p_person uuid,
  p_role_title text default null,
  p_department text default null,
  p_help_topics text[] default null,
  p_avatar jsonb default null,
  p_fun_fact_prompt text default null,
  p_fun_fact_text text default null,
  p_answer_keywords text[] default null,
  p_open_to_chat boolean default null,
  p_hidden boolean default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_company uuid; v_was_claimed boolean;
begin
  select company_id, card_claimed into v_company, v_was_claimed from people where id = p_person;
  if not found then raise exception 'unknown person'; end if;

  update people set
    role_title = coalesce(p_role_title, role_title),
    department = coalesce(p_department, department),
    help_topics = coalesce(p_help_topics[1:3], help_topics),
    avatar = coalesce(p_avatar, avatar),
    fun_fact_prompt = coalesce(p_fun_fact_prompt, fun_fact_prompt),
    open_to_chat = coalesce(p_open_to_chat, open_to_chat),
    hidden = coalesce(p_hidden, hidden),
    card_claimed = true
  where id = p_person;

  if p_fun_fact_text is not null or p_answer_keywords is not null then
    insert into person_secrets (person_id, fun_fact_text, answer_keywords)
    values (p_person, coalesce(p_fun_fact_text, ''), coalesce(p_answer_keywords, '{}'))
    on conflict (person_id) do update set
      fun_fact_text = coalesce(p_fun_fact_text, person_secrets.fun_fact_text),
      answer_keywords = coalesce(p_answer_keywords, person_secrets.answer_keywords);
  end if;

  if not v_was_claimed then
    insert into events (company_id, type, actor_id) values (v_company, 'card_claimed', p_person);
  end if;
end $$;

create or replace function set_open_to_chat(p_person uuid, p_open boolean)
returns void language sql security definer set search_path = public as $$
  update people set open_to_chat = p_open where id = p_person;
$$;

create or replace function save_note(p_collector uuid, p_collected uuid, p_impression text, p_quote text)
returns void language sql security definer set search_path = public as $$
  insert into private_notes (collector_id, collected_id, impression, quote, updated_at)
  values (p_collector, p_collected, coalesce(p_impression, ''), coalesce(p_quote, ''), now())
  on conflict (collector_id, collected_id) do update
    set impression = excluded.impression, quote = excluded.quote, updated_at = now();
$$;

create or replace function get_notes(p_collector uuid)
returns table (collected_id uuid, impression text, quote text)
language sql security definer set search_path = public as $$
  select collected_id, impression, quote from private_notes where collector_id = p_collector;
$$;

create or replace function submit_quiz(p_quest uuid, p_score int, p_total int)
returns void language plpgsql security definer set search_path = public as $$
declare v_q quests%rowtype;
begin
  select * into v_q from quests where id = p_quest;
  if not found then raise exception 'unknown quest'; end if;
  insert into quiz_attempts (quest_id, score, total) values (p_quest, p_score, p_total);
  insert into events (company_id, type, actor_id, payload)
  values (v_q.company_id, 'quiz_done', v_q.newcomer_id, jsonb_build_object('score', p_score, 'total', p_total));
end $$;

create or replace function submit_pulse(p_newcomer uuid, p_day int, p_score int)
returns void language sql security definer set search_path = public as $$
  insert into pulse_checks (newcomer_id, day, score) values (p_newcomer, p_day, p_score);
$$;

-- HR: add a person
create or replace function hr_add_person(
  p_company uuid, p_name text, p_role text, p_department text,
  p_kind text default 'colleague', p_start_date date default null
) returns people language plpgsql security definer set search_path = public as $$
declare v_row people%rowtype; v_no int;
begin
  select coalesce(max(card_no), 0) + 1 into v_no from people where company_id = p_company;
  insert into people (company_id, display_name, role_title, department, kind, start_date, card_no,
                      card_claimed, avatar)
  values (p_company, p_name, coalesce(p_role, ''), coalesce(p_department, 'ops'), coalesce(p_kind, 'colleague'),
          p_start_date, v_no, p_kind = 'newcomer',
          '{"hair":"#13222E","skin":"#F1C6A0","shirt":"#5AAFE3","pants":"#13222E","shoes":"#C8F53C"}'::jsonb)
  returning * into v_row;
  return v_row;
end $$;

-- HR: create an onboarding quest with key colleagues and reasons
create or replace function hr_create_quest(
  p_newcomer uuid, p_targets uuid[], p_reasons text[], p_goal int default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_company uuid; v_id uuid;
begin
  select company_id into v_company from people where id = p_newcomer and kind = 'newcomer';
  if not found then raise exception 'not a newcomer'; end if;

  insert into quests (company_id, newcomer_id, party_goal)
  values (v_company, p_newcomer, coalesce(p_goal, coalesce(array_length(p_targets, 1), 5)))
  returning id into v_id;

  insert into quest_targets (quest_id, person_id, reason, sort)
  select v_id, t.pid, coalesce(p_reasons[t.ord], ''), t.ord
  from unnest(p_targets) with ordinality as t(pid, ord);

  insert into events (company_id, type, actor_id, payload)
  values (v_company, 'quest_created', p_newcomer, jsonb_build_object('quest_id', v_id, 'targets', to_jsonb(p_targets)));
  return v_id;
end $$;

-- ---------- demo data ----------
create or replace function seed_demo()
returns void language plpgsql security definer set search_path = public as $$
declare
  c uuid := 'c0000000-0000-4000-8000-000000000001';
  elin uuid := 'a0000000-0000-4000-8000-000000000001';
  patrik uuid := 'a0000000-0000-4000-8000-000000000002';
  maja uuid := 'a0000000-0000-4000-8000-000000000003';
  johan uuid := 'a0000000-0000-4000-8000-000000000004';
  sara uuid := 'a0000000-0000-4000-8000-000000000005';
  ahmed uuid := 'a0000000-0000-4000-8000-000000000006';
  lina uuid := 'a0000000-0000-4000-8000-000000000007';
  viktor uuid := 'a0000000-0000-4000-8000-000000000008';
  yunfei uuid := 'a0000000-0000-4000-8000-000000000009';
  noor uuid := 'a0000000-0000-4000-8000-000000000010';
  q_yunfei uuid := 'b0000000-0000-4000-8000-000000000001';
  q_noor uuid := 'b0000000-0000-4000-8000-000000000002';
  t uuid;
begin
  delete from companies where id = c;
  insert into companies (id, name, join_code) values (c, 'Fika Labs', 'FIKA24');

  insert into people (id, company_id, display_name, role_title, department, help_topics, avatar, card_no, kind, is_hr, start_date, fun_fact_prompt, card_claimed, qr_token) values
  (elin,   c, 'Elin',   'Product Designer',   'design',      '{"user flows","Figma files","the best fika spot"}',
     '{"hair":"#F2C14E","skin":"#F6D2B8","shirt":"#FF7AB8","pants":"#13222E","shoes":"#5AAFE3"}', 1, 'colleague', false, null, 'Ask Elin what she sketches in meetings', true, 'fk-elin'),
  (patrik,  c, 'Patrik',  'Backend Engineer',   'engineering', '{"APIs","servers","why the build is red"}',
     '{"hair":"#6B3E26","skin":"#F1C6A0","shirt":"#3DDBB0","pants":"#13222E","shoes":"#13222E"}', 2, 'colleague', false, null, 'Ask Patrik how he gets to work in winter', true, 'fk-patrik'),
  (maja,   c, 'Maja',   'Account Executive',  'sales',       '{"clients","demos","pricing questions"}',
     '{"hair":"#2B1D14","skin":"#E8B48A","shirt":"#C8F53C","pants":"#13222E","shoes":"#FF7AB8"}', 3, 'colleague', false, null, 'Ask Maja what she does every Tuesday night', true, 'fk-maja'),
  (johan,  c, 'Johan',  'People Partner',     'people',      '{"contracts","benefits","how things work here"}',
     '{"hair":"#D9B38C","skin":"#F6D2B8","shirt":"#FF8A7A","pants":"#13222E","shoes":"#13222E"}', 4, 'colleague', true,  null, 'Ask Johan what he bakes on Fridays', true, 'fk-johan'),
  (sara,   c, 'Sara',   'Finance Lead',       'finance',     '{"budgets","invoices","expense reports"}',
     '{"hair":"#13222E","skin":"#C68B59","shirt":"#2FD18A","pants":"#13222E","shoes":"#C8F53C"}', 5, 'colleague', false, null, 'Ask Sara about the strangest race she has run', true, 'fk-sara'),
  (ahmed,  c, 'Ahmed',  'Product Manager',    'product',     '{"the roadmap","priorities","customer feedback"}',
     '{"hair":"#13222E","skin":"#8D5A3B","shirt":"#A86BFF","pants":"#13222E","shoes":"#5AAFE3"}', 6, 'colleague', false, null, 'Ask Ahmed which language he is learning, and how', true, 'fk-ahmed'),
  (lina,   c, 'Lina',   'Office Manager',     'ops',         '{"keys and access","laptops and equipment","booking rooms"}',
     '{"hair":"#FF7AB8","skin":"#F6D2B8","shirt":"#FFB36B","pants":"#13222E","shoes":"#13222E"}', 7, 'colleague', false, null, 'Ask Lina about her dog', true, 'fk-lina'),
  (viktor, c, 'Viktor', 'Frontend Engineer',  'engineering', '{"the design system","the mobile app","accessibility"}',
     '{"hair":"#6B3E26","skin":"#F1C6A0","shirt":"#5AAFE3","pants":"#13222E","shoes":"#FF7AB8"}', 8, 'colleague', false, null, null, false, 'fk-viktor'),
  (yunfei, c, 'Yunfei', 'Design Intern',      'design',      '{"service design","prototyping","user research"}',
     '{"hair":"#13222E","skin":"#F3D1B0","shirt":"#5AAFE3","pants":"#13222E","shoes":"#C8F53C"}', 9, 'newcomer', false, current_date, null, true, 'fk-yunfei'),
  (noor,   c, 'Noor',   'Data Analyst',       'product',     '{"dashboards","SQL","data questions"}',
     '{"hair":"#2B1D14","skin":"#C68B59","shirt":"#BDF4E0","pants":"#13222E","shoes":"#FF7AB8"}', 10, 'newcomer', false, current_date - 4, null, true, 'fk-noor');

  insert into person_secrets (person_id, fun_fact_text, answer_keywords) values
  (elin,  'Has sketched every plant in the office.',   '{"plant"}'),
  (patrik, 'Skates to work across the lake in winter.', '{"skate","skating","ice"}'),
  (maja,  'Sings in a choir every Tuesday.',           '{"choir","sing"}'),
  (johan, 'Bakes cinnamon buns every Friday.',         '{"cinnamon","bun","kanelbulle"}'),
  (sara,  'Has run a marathon in the snow.',           '{"marathon","snow"}'),
  (ahmed, 'Is learning Swedish through ABBA songs.',   '{"abba"}'),
  (lina,  'Her dog has its own office badge.',         '{"badge"}');

  -- Yunfei: fresh quest, nothing collected (live demo)
  insert into quests (id, company_id, newcomer_id, party_goal) values (q_yunfei, c, yunfei, 5);
  insert into quest_targets (quest_id, person_id, reason, sort) values
  (q_yunfei, elin,  'Your buddy for week one', 1),
  (q_yunfei, patrik, 'Ask him when the build breaks', 2),
  (q_yunfei, johan, 'Your People Partner', 3),
  (q_yunfei, lina,  'Keys, laptop and room bookings', 4),
  (q_yunfei, sara,  'Expenses and invoices', 5);

  -- Noor: completed quest (backup for the demo and a populated HR view)
  insert into quests (id, company_id, newcomer_id, party_goal, party_unlocked_at, created_at)
  values (q_noor, c, noor, 5, now() - interval '1 day', now() - interval '6 days');
  insert into quest_targets (quest_id, person_id, reason, sort) values
  (q_noor, ahmed, 'Your manager', 1),
  (q_noor, maja,  'Understand our clients', 2),
  (q_noor, johan, 'Your People Partner', 3),
  (q_noor, lina,  'Keys, laptop and room bookings', 4),
  (q_noor, sara,  'Finance data owner', 5);

  foreach t in array array[ahmed, maja, johan, lina, sara] loop
    insert into connections (company_id, collector_id, collected_id, method, created_at)
      values (c, noor, t, 'qr', now() - interval '3 days');
    insert into connections (company_id, collector_id, collected_id, method, created_at)
      values (c, t, noor, 'exchange', now() - interval '3 days');
  end loop;
  update connections set fact_unlocked_at = now() - interval '2 days'
    where collector_id = noor and collected_id in (ahmed, maja, johan);
  insert into quiz_attempts (quest_id, score, total, created_at) values (q_noor, 4, 5, now() - interval '1 day');
  insert into pulse_checks (newcomer_id, day, score, created_at) values
    (noor, 1, 2, now() - interval '4 days'), (noor, 5, 4, now() - interval '1 hour');

  insert into events (company_id, type, actor_id, target_id, created_at) values
    (c, 'card_collected', noor, ahmed, now() - interval '3 days'),
    (c, 'card_collected', noor, maja,  now() - interval '3 days'),
    (c, 'fact_unlocked',  noor, johan, now() - interval '2 days'),
    (c, 'party_unlocked', noor, null,  now() - interval '1 day'),
    (c, 'quest_created',  yunfei, null, now() - interval '1 hour');
end $$;

create or replace function reset_demo(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_company = 'c0000000-0000-4000-8000-000000000001'::uuid then perform seed_demo(); end if;
end $$;

-- ---------- permissions ----------
grant usage on schema public to anon, authenticated;
grant select on companies, people, quests, quest_targets, connections, quiz_attempts, pulse_checks, events to anon, authenticated;
grant execute on function
  collect_card(uuid, text), unlock_fact(uuid, uuid, text), get_unlocked_facts(uuid),
  update_my_card(uuid, text, text, text[], jsonb, text, text, text[], boolean, boolean),
  set_open_to_chat(uuid, boolean), save_note(uuid, uuid, text, text), get_notes(uuid),
  submit_quiz(uuid, int, int), submit_pulse(uuid, int, int),
  hr_add_person(uuid, text, text, text, text, date), hr_create_quest(uuid, uuid[], text[], int),
  reset_demo(uuid)
to anon, authenticated;
revoke execute on function seed_demo() from anon, authenticated, public;

select seed_demo();
