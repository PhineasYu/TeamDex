# 03 · 技术方案

## 1. 架构总览

```
手机浏览器 (React SPA, Vercel)
   │
   ├── src/lib/api  ← 统一数据接口
   │       ├── LocalAdapter     (localStorage + seed JSON + BroadcastChannel)
   │       └── SupabaseAdapter  (Postgres + RPC 函数 + Realtime)
   │
   └── 路由：/  /join/:code  /c/:token  /quest/*  /me/*  /hr/*
```

- 单页应用，所有页面都在前端路由里。
- 业务规则（收集、双向交换、答案校验、party 解锁）在 Supabase 模式下由数据库函数执行，在本地模式下由 `LocalAdapter` 用同样的规则实现。**两种模式对 UI 必须表现一致。**
- 演示阶段不做真实账号：身份 = 加入码 + 选择的 person_id，保存在 localStorage 的 `teamdex.session`。

## 2. 项目结构

```
src/
  main.tsx
  App.tsx                      路由与布局
  styles/tokens.css            CSS 变量（颜色、圆角、阴影）
  lib/
    session.ts                 读写当前身份 {companyId, personId, role}
    api/
      types.ts                 所有类型与 TeamdexApi 接口
      index.ts                 按 VITE_DATA_MODE 导出 api 实例
      local.ts                 LocalAdapter
      supabase.ts              SupabaseAdapter
    quiz.ts                    生成测验题
    badges.ts                  计算勋章（P1）
    sound.ts / haptics.ts      音效与震动（P1）
  data/seed.ts                 导入 seed/demo-company.json
  components/
    Card.tsx                   员工卡（正面）
    CardBack.tsx               卡背（私人笔记，P1）
    Sprite.tsx                 像素小人 SVG
    CardReveal.tsx             翻卡揭晓动画
    QRBlock.tsx                二维码
    Pill.tsx, Panel.tsx        按钮与色块面板
    Toast.tsx                  实时通知提示
    ProgressBar.tsx
    PixelParty.tsx             派对画面
  features/
    entry/   Landing.tsx, JoinPick.tsx
    collect/ CollectPage.tsx   处理 /c/:token
    newcomer/ QuestHome.tsx, CardDetail.tsx, Quiz.tsx, Party.tsx
    colleague/ MyCard.tsx, EditCard.tsx, ColleagueHome.tsx
    hr/ HrHome.tsx, NewQuest.tsx, TeamList.tsx, Impact.tsx
```

## 3. 路由

| 路径 | 页面 | 谁用 | 说明 |
|---|---|---|---|
| `/` | Landing | 所有人 | 输入加入码；已有身份则跳转到角色首页 |
| `/join/:code` | JoinPick | 所有人 | 显示该公司所有人（头像 + 名字 + 职位），点选"我是谁"；底部有 "I'm from HR" |
| `/c/:token` | CollectPage | 新人扫码进入 | 见 §7 收集流程 |
| `/quest` | QuestHome | 新人 | 收藏网格、进度、测验与 party 入口 |
| `/quest/card/:personId` | CardDetail | 新人 | 大卡片、开场白、fun fact 解锁、私人笔记 |
| `/quest/quiz` | Quiz | 新人 | "Who do I ask?" |
| `/quest/party` | Party | 新人 | 像素派对 |
| `/me` | ColleagueHome | 同事 | 本周新人、动态流、我收到的新人卡 |
| `/me/card` | MyCard | 同事 | 我的卡片 + 大二维码 + Open to chat |
| `/me/edit` | EditCard | 同事 | 编辑卡片，实时预览 |
| `/hr` | HrHome | HR | 新人进度列表 + 实时动态流 |
| `/hr/new` | NewQuest | HR | 创建入职任务 |
| `/hr/team` | TeamList | HR | 团队成员、卡片完成状态、领卡链接、Reset demo |
| `/hr/impact` | Impact | HR | 成效看板（P1） |

角色判断：`person.kind === 'newcomer'` → `/quest`；`person.is_hr` 且从 "I'm from HR" 进入 → `/hr`；其余 → `/me`。HR 同事（如 Alva）也有自己的卡片，可以在 `/me` 与 `/hr` 之间切换。

底部导航：新人（Teamdex / Quiz / Party），同事（Home / My card），HR（Newcomers / New quest / Team / Impact）。

## 4. 数据模型

权威定义见 `supabase/schema.sql`。TypeScript 类型：

```ts
export type Department = 'design' | 'engineering' | 'sales' | 'people' | 'finance' | 'product' | 'ops';

export interface Avatar { hair: string; skin: string; shirt: string; pants: string; shoes: string; }

export interface Company { id: string; name: string; join_code: string; }

export interface Person {
  id: string;
  company_id: string;
  display_name: string;
  role_title: string;
  department: Department;
  help_topics: string[];        // "Ask me about"，也是测验题来源，最多 3 个
  avatar: Avatar;
  card_no: number;
  kind: 'colleague' | 'newcomer';
  is_hr: boolean;
  start_date: string | null;    // 仅新人
  fun_fact_prompt: string | null; // 公开的提示问题，如 "Ask me how I get to work in winter"
  open_to_chat: boolean;
  card_claimed: boolean;
  hidden: boolean;
  qr_token: string;             // 仅用于生成自己的二维码，不在列表接口中暴露给他人（本地模式可忽略）
}

export interface Quest {
  id: string;
  company_id: string;
  newcomer_id: string;
  party_goal: number;            // 默认 5
  party_unlocked_at: string | null;
  created_at: string;
  targets: { person_id: string; reason: string }[];
}

export interface Connection {
  id: string;
  collector_id: string;          // 谁收集的
  collected_id: string;          // 被收集的是谁
  method: 'qr' | 'exchange';     // exchange = 对方扫我时自动获得的反向卡片
  fact_unlocked_at: string | null;
  created_at: string;
}

export type EventType = 'card_claimed' | 'card_collected' | 'fact_unlocked' | 'quest_created' | 'party_unlocked' | 'quiz_done';

export interface TeamdexEvent {
  id: number; company_id: string; type: EventType;
  actor_id: string | null; target_id: string | null;
  payload: Record<string, unknown>; created_at: string;
}
```

fun fact 的**全文与答案关键词**存放在单独的 `person_secrets` 表，任何人都不能直接读取，只能通过 `unlock_fact` 函数在答对后拿到全文。

## 5. 统一数据接口

```ts
export interface TeamdexApi {
  // 进入
  getCompanyByCode(code: string): Promise<Company | null>;
  listPeople(companyId: string): Promise<Person[]>;
  getPerson(personId: string): Promise<Person | null>;

  // 新人
  getQuestForNewcomer(newcomerId: string): Promise<Quest | null>;
  listConnections(collectorId: string): Promise<Connection[]>;
  collectCard(collectorId: string, qrToken: string): Promise<CollectResult>;
  unlockFact(collectorId: string, collectedId: string, guess: string): Promise<UnlockResult>;
  getUnlockedFacts(collectorId: string): Promise<Record<string, string>>; // personId -> 全文
  saveNote(collectorId: string, collectedId: string, note: { impression: string; quote: string }): Promise<void>; // P1
  getNotes(collectorId: string): Promise<Record<string, { impression: string; quote: string }>>;            // P1
  submitQuiz(questId: string, score: number, total: number): Promise<void>;
  submitPulse(newcomerId: string, day: number, score: number): Promise<void>; // P1

  // 同事
  updateMyCard(personId: string, input: CardInput): Promise<void>;
  setOpenToChat(personId: string, open: boolean): Promise<void>;
  getMyQrToken(personId: string): Promise<string>;

  // HR
  hrAddPerson(input: NewPersonInput): Promise<Person>;
  hrCreateQuest(newcomerId: string, targets: { person_id: string; reason: string }[], goal?: number): Promise<Quest>;
  listQuests(companyId: string): Promise<Quest[]>;
  listAllConnections(companyId: string): Promise<Connection[]>;
  resetDemo(companyId: string): Promise<void>;

  // 事件
  listEvents(companyId: string, limit?: number): Promise<TeamdexEvent[]>;
  subscribeEvents(companyId: string, onEvent: (e: TeamdexEvent) => void): () => void;
}

export type CollectResult =
  | { ok: true; already: boolean; partyUnlocked: boolean; person: Person }
  | { ok: false; error: 'unknown_card' | 'own_card' | 'other_company' | 'unknown_collector' | 'card_hidden' };

export type UnlockResult =
  | { ok: true; fact: string; already?: boolean }
  | { ok: false; error: 'not_collected' | 'no_fact' | 'no_match' | 'too_short' };

export interface CardInput {
  role_title?: string; department?: Department; help_topics?: string[]; avatar?: Avatar;
  fun_fact_prompt?: string; fun_fact_text?: string; answer_keywords?: string[]; open_to_chat?: boolean; hidden?: boolean;
}
```

### LocalAdapter 规则

- 首次运行从 `seed/demo-company.json` 初始化，存入 `localStorage['teamdex.db']`。JSON 中的相对时间标记（`NOW`、`DAY_0`、`DAY_MINUS_4`、`DAYS_AGO_n`、`HOURS_AGO_n`）在初始化时换算成真实的 ISO 时间。`secrets` 只在本地模式存在，任何界面都不得显示 `answer_keywords`。
- `resetDemo` 清空 `teamdex.db` 后重新初始化。
- 规则与 SQL 函数一致：收集时写入两条连接（`qr` 与反向 `exchange`），重复收集返回 `already: true`，集齐关键同事时设置 `party_unlocked_at` 并写入 `party_unlocked` 事件。
- 答案匹配：猜测文本转小写、去首尾空格，只要包含任一关键词（小写）即匹配；少于 2 个字符返回 `too_short`。
- 事件通过 `BroadcastChannel('teamdex')` 广播，同一浏览器的多个标签页能互相收到（便于在电脑上用两个标签页模拟两部手机）。
- 所有方法返回 Promise，并加 150ms 随机延迟，保证 UI 的加载状态在本地模式下也被测试到。

### SupabaseAdapter 规则

- 读取：直接 `select` 表（已开放只读策略）。
- 写入：**只能**调用 `rpc('函数名', 参数)`，表上没有写入策略。
- 接口与数据库函数的对应关系（参数名必须完全一致）：

| 接口方法 | Supabase 调用 |
|---|---|
| `collectCard` | `rpc('collect_card', { p_collector, p_token })` |
| `unlockFact` | `rpc('unlock_fact', { p_collector, p_collected, p_guess })` |
| `getUnlockedFacts` | `rpc('get_unlocked_facts', { p_collector })` |
| `updateMyCard` | `rpc('update_my_card', { p_person, p_role_title, p_department, p_help_topics, p_avatar, p_fun_fact_prompt, p_fun_fact_text, p_answer_keywords, p_open_to_chat, p_hidden })`（未修改的字段不传） |
| `setOpenToChat` | `rpc('set_open_to_chat', { p_person, p_open })` |
| `saveNote` / `getNotes` | `rpc('save_note', { p_collector, p_collected, p_impression, p_quote })` / `rpc('get_notes', { p_collector })` |
| `submitQuiz` | `rpc('submit_quiz', { p_quest, p_score, p_total })` |
| `submitPulse` | `rpc('submit_pulse', { p_newcomer, p_day, p_score })` |
| `hrAddPerson` | `rpc('hr_add_person', { p_company, p_name, p_role, p_department, p_kind, p_start_date })` |
| `hrCreateQuest` | `rpc('hr_create_quest', { p_newcomer, p_targets, p_reasons, p_goal })` |
| `resetDemo` | `rpc('reset_demo', { p_company })` |
| `getQuestForNewcomer` / `listQuests` | `from('quests').select('*, targets:quest_targets(person_id, reason, sort)')`，targets 按 sort 排序 |

- 实时：`supabase.channel('events-'+companyId).on('postgres_changes', {event:'INSERT', schema:'public', table:'events', filter:'company_id=eq.'+companyId}, cb).subscribe()`。

## 6. 环境变量

```
VITE_DATA_MODE=local            # local | supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_PUBLIC_BASE_URL=https://你的域名.vercel.app   # 用于生成二维码里的完整网址
```

`vercel.json`：

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

## 7. 收集流程（最关键的链路）

```
同事打开 /me/card → 屏幕显示二维码，内容为 {BASE_URL}/c/{qr_token}
新人用手机原生相机扫码 → 浏览器打开 /c/{qr_token}
CollectPage:
  1. 读取本机 session
     - 无 session → 显示"Join Teamdex to collect this card"，进入 /join/:code 选择身份，
       完成后自动回到 /c/{token}（把 token 暂存在 sessionStorage['teamdex.pendingToken']）
     - 有 session 但不是新人 → 显示这张卡片 + "Only newcomers collect cards. Say hi anyway!"
  2. 调用 api.collectCard(session.personId, token)
  3. 结果处理
     - ok && !already → 播放 CardReveal（翻卡 + 闪光 + 音效），标题 "New card!"
     - ok && already  → 直接显示卡片，标题 "Already in your Teamdex"
     - partyUnlocked  → 揭晓结束后显示 "Your onboarding party is unlocked!" 按钮 → /quest/party
     - own_card       → 显示自己的卡片，"That's you!"
     - unknown_card / card_hidden → "This card isn't available." + 返回按钮
  4. 揭晓后按钮："Open card" → /quest/card/:personId，"Back to my Teamdex" → /quest
```

二维码尺寸：在同事手机上至少 240×240 CSS 像素，四周留白，深色码、白色底，确保在会场灯光下能扫。

## 8. 实时通知

- 同事首页与 HR 首页订阅事件。
- 同事收到 `card_collected` 且 `target_id === 自己` → Toast："{新人名} collected your card. You got their newcomer card too."，并刷新"我收到的新人卡"。
- 同事收到 `party_unlocked` 且自己是该任务的关键同事 → Toast："{新人名} unlocked their onboarding party. Fika invite: today 15:00."
- HR 动态流显示所有事件，最新在上，每条带头像与相对时间。
- 本地模式通过 BroadcastChannel 模拟同样的效果。

## 9. 测验生成（`lib/quiz.ts`）

- 题库来源：已收集同事的 `help_topics`。
- 每题：随机选一位已收集同事 A 和他的一个话题 T → 题干 "You need help with {T}. Who do you ask?" → 选项 = A + 最多 3 位其他已收集同事（不足 4 位时用剩余全部）。
- 共 5 题，同一人最多出现 2 次作为正确答案；每题答后立即显示对错与正确人的小卡片。
- 结束调用 `submitQuiz`，显示 `x / 5` 与鼓励文案。

## 10. 错误与空状态

| 场景 | 显示 |
|---|---|
| 加入码错误 | "We couldn't find that team. Check the code with your HR." |
| 新人还没有任务 | "Your HR hasn't set up your quest yet. You can still collect any colleague's card." |
| 同事未领卡 | 收藏页剪影标注 "Card coming soon" |
| 同事隐藏卡片 | 不出现在列表；扫码显示 "This card isn't available." |
| 网络失败 | 顶部横幅 "Offline. We'll retry." 并自动重试 3 次 |
| 测验不足 3 张卡 | "Collect 3 cards to unlock the quiz" + 当前进度 |

## 11. 性能要求

- 首屏 JS 压缩后 < 250KB；首屏在 4G 网络下 < 2 秒可交互。
- 动画只使用 `transform` 与 `opacity`；全息边框的旋转只在卡片可见时运行。
- 不使用 `mix-blend-mode`、大面积 `filter: blur`。

## 12. 安全说明（演示版的已知限制）

演示版没有真实登录，任何人知道加入码都能选择任意身份。这对黑客松演示可以接受，但要在代码中以注释标明，正式版本改为 Supabase Auth，并把所有 RPC 函数中的 `p_person` 参数替换为 `auth.uid()` 对应的人员。fun fact 答案在两种模式下都不应出现在前端可见的数据中（本地模式因为数据都在本机，只能做到"不在 UI 中展示"）。
