# 05 · 黑客松当天开发计划

> 默认 18:00 冻结功能、18:00 之后只修 bug 和准备 pitch。早上到场后先向组织者确认 pitch 时间，再按比例调整。
> 每个阶段：把"指令"整段复制给 Claude Code → 等它完成 → 用手机按"检查"逐条验证 → 通过后进入下一阶段。

## 时间表

| 时间 | 阶段 | 结果 |
|---|---|---|
| 8:30–9:00 | 0 · 准备 | 项目跑起来，部署链接能在手机上打开 |
| 9:00–10:45 | 1 · 卡片与像素小人 | 员工卡组件在手机上好看 |
| 10:45–12:30 | 2 · 三方页面（本地模式） | 新人、同事、HR 页面在一部手机上走通 |
| 12:30–13:15 | 午饭 | |
| 13:15–14:45 | 3 · 扫码收集与揭晓 | 核心"哇"时刻完成 |
| 14:45–16:15 | 4 · Supabase 与实时通知 | 两部手机之间真正交换卡片 |
| 16:15–17:15 | 5 · 测验与 Party | 学习检验与情绪收尾 |
| 17:15–18:00 | 6 · 打磨与冻结 | 演示数据、真机测试、修 bug |
| 18:00– | Pitch 准备 | 影片 + 现场演示彩排 |

**砍需求规则**：13:15 时如果阶段 2 还没完成，放弃 HR 的"新建任务"页面（用演示数据代替）。15:30 时如果 Supabase 还没跑通，放弃云端，用本地模式 + 两个浏览器标签页演示（见"兜底方案"）。

---

## 阶段 0 · 准备（8:30–9:00）

### 你需要先做的

1. 注册或登录 [supabase.com](https://supabase.com) 和 [vercel.com](https://vercel.com)（都可以用 GitHub 登录）。
2. 在 Supabase 新建一个项目（区域选 Stockholm 或 Frankfurt），等它创建完成（约 2 分钟）。
3. 把整个文档包放进一个空文件夹，在文件夹里打开终端，输入 `claude`。

### 指令

```
读一下 CLAUDE.md 和 docs/03_TECH_SPEC.md 的第 1、2、6 节。然后：
1. 在当前文件夹初始化 Vite + React + TypeScript 项目（保留现有的 docs、supabase、seed、reference 文件夹）。
2. 安装技术栈里列出的依赖，配置 Tailwind，把 docs/04_DESIGN_SYSTEM.md 里的颜色做成 Tailwind theme，并通过 Google Fonts 引入 Onest 和 Press Start 2P。
3. 按技术方案的项目结构建好空文件夹和路由骨架，每个路由先显示页面名字。
4. 添加 vercel.json 和 .env.example，默认 VITE_DATA_MODE=local。
5. 初始化 git 并提交。
6. 一步步告诉我如何部署到 Vercel，以及如何用 npm run dev -- --host 在手机上预览。
```

### 检查

- [ ] 手机打开部署链接，能看到首页
- [ ] 直接访问 `/c/test` 不是 404（说明 vercel.json 生效）

---

## 阶段 1 · 卡片与像素小人（9:00–10:45）

### 指令

```
读 docs/04_DESIGN_SYSTEM.md 的第 1、4、5、6 节，参考 reference/pitch-film.html 里的卡片和像素小人实现。
实现以下组件，并做一个临时的 /dev 页面把它们都展示出来：
1. Sprite：根据 Avatar 和帧（idle / cheer / silhouette）渲染 12×13 像素 SVG。
2. Card：员工卡，支持 scale 缩放、所有状态（未收集剪影、未领卡、已收集、已解锁、新人卡），部门全息色。
3. CardReveal：翻卡揭晓动画 + 白色闪光 + 闪光扫过，支持 prefers-reduced-motion。
4. Pill、Panel、ProgressBar、Toast 基础组件。
/dev 页面上要有一个 "Replay reveal" 按钮。然后实现 LocalAdapter 的读取部分（getCompanyByCode、listPeople、getPerson），用 seed/demo-company.json 的数据渲染所有同事的卡片。
完成后 build、提交、部署。
```

### 检查

- [ ] 手机上 `/dev` 所有卡片清晰、文字不溢出
- [ ] "Replay reveal" 动画流畅，不卡顿
- [ ] 部门颜色各不相同，fun fact 显示 `???` 和锁

---

## 阶段 2 · 三方页面（本地模式）（10:45–12:30）

### 指令

```
读 docs/01_PRD.md 的 P0 需求和 docs/03_TECH_SPEC.md 的第 3、4、5 节（LocalAdapter 规则）。
用 LocalAdapter 实现以下页面，全部走 src/lib/api 接口：
1. Landing 与 JoinPick：输入 FIKA24 → 选择身份 → 按角色跳转（P0-1）。
2. 新人 QuestHome：关键同事剪影 + 原因、其他同事、进度条（P0-7）。
3. 新人 CardDetail：大卡片、两句开场白、fun fact 提示与输入解锁（P0-8）。
4. 同事 MyCard：卡片 + 大二维码 + Open to chat 开关（P0-3）；EditCard：头像编辑器与所有字段，实时预览（P0-4）。
5. 同事 ColleagueHome：动态流、我收到的新人卡。
6. HR HrHome：新人进度列表与动态流（P0-11、P0-13）；NewQuest：勾选 5 位同事并填原因（P0-12）；TeamList：成员列表与 Reset demo（P0-14）。
7. 底部导航与"切换身份"入口。
先把 LocalAdapter 的全部方法按规则实现好（包括 collectCard、unlockFact、事件广播），再做页面。完成后 build、提交、部署。
```

### 检查

- [ ] 以 Yunfei 身份进入，能看到 5 个关键同事剪影和原因
- [ ] 以 Patrik 身份进入，能看到自己的二维码，能编辑头像并立即生效
- [ ] 以 HR（Alva）身份进入，能看到 Yunfei 的进度 0/5
- [ ] 在 HR 里点 Reset demo，数据恢复初始状态

---

## 阶段 3 · 扫码收集与揭晓（13:15–14:45）

### 指令

```
读 docs/03_TECH_SPEC.md 第 7 节"收集流程"，严格按它实现 CollectPage（/c/:token），覆盖所有分支：
未登录、非新人、新收集、已收集、扫到自己、无效卡片、集齐后解锁 party。
揭晓使用 CardReveal，并在揭晓后显示 "Open card" 和 "Back to my Teamdex" 两个按钮。
二维码内容必须是 VITE_PUBLIC_BASE_URL + /c/ + qr_token。
加入 P1-8 的收集音效和安卓震动（iPhone 按设计系统第 7 节处理静音开关）。
完成后 build、提交、部署，并告诉我如何用两部手机测试（本地模式下同一部手机也可以：用相机扫电脑屏幕上的二维码）。
```

### 检查

- [ ] 电脑上打开 Patrik 的 MyCard，用手机相机扫码 → 手机打开链接 → 选择 Yunfei → 自动回到收集并播放揭晓
- [ ] 再扫一次显示 "Already in your Teamdex"
- [ ] 在详情页输入 "skate" 解锁 Patrik 的 fun fact

---

## 阶段 4 · Supabase 与实时通知（14:45–16:15）

### 你需要先做的

1. 在 Supabase 项目里打开 SQL Editor，粘贴 `supabase/schema.sql` 的全部内容，点 Run。
2. 在 Project Settings → API 复制 `Project URL` 和 `anon public key`。
3. 在 Vercel 项目的 Environment Variables 里添加 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`、`VITE_DATA_MODE=supabase`、`VITE_PUBLIC_BASE_URL`，然后重新部署。

### 指令

```
读 docs/03_TECH_SPEC.md 第 5 节 SupabaseAdapter 规则、第 8 节实时通知，以及 supabase/schema.sql 里所有函数的签名。
实现 SupabaseAdapter，保证它和 LocalAdapter 对 UI 的行为完全一致：读取用 select，写入只用 rpc，事件用 realtime 订阅。
同事和 HR 页面订阅事件并弹出 Toast（文案见设计系统第 8 节）。
在 .env.local 里我会填好 Supabase 的地址和 key。先在本地用 VITE_DATA_MODE=supabase 跑通，再部署。
完成后告诉我如何用两部手机做端到端测试。
```

### 检查

- [ ] 手机 A 以 Patrik 身份打开 MyCard；手机 B 以 Yunfei 身份扫码
- [ ] 5 秒内手机 A 弹出 "Yunfei collected your card…"
- [ ] HR 页面动态流实时出现这条事件
- [ ] fun fact 答错提示 "Not quite"，答对解锁

---

## 阶段 5 · 测验与 Party（16:15–17:15）

### 指令

```
实现 P0-9 测验（按 docs/03_TECH_SPEC.md 第 9 节生成题目）和 P0-10 Party 页：
Party 用 Press Start 2P 标题 "Onboarding party unlocked!"、新人与所有关键同事的像素小人跳舞（两帧切换 + 上下跳动）、方块纸屑、"Fika invite sent to …"。
Party 解锁时关键同事收到通知。
如果时间允许，加 P1-2 勋章中的 Full house 和 Quiz whiz 两个。
完成后 build、提交、部署。
```

### 检查

- [ ] 收集 3 张后测验解锁，5 道题都能作答并看到结果
- [ ] 收集完 5 位关键同事后自动出现 party 入口，画面流畅

---

## 阶段 6 · 打磨与冻结（17:15–18:00）

### 指令

```
按下面的真机测试清单逐项自查并修复问题，然后把演示数据重置为初始状态。
不要再加新功能。最后 build、提交、部署，并告诉我最终链接。
```

### 真机测试清单

- [ ] iPhone Safari 与 Android Chrome 各走一遍完整流程
- [ ] 所有按钮至少 44px，文字不被底部导航或刘海遮挡
- [ ] 横屏不崩（可以只是居中显示）
- [ ] 弱网下（关掉 Wi-Fi 用 4G）收集仍能完成
- [ ] 刷新任何页面不丢身份、不 404
- [ ] 静音开关打开时，音效按设计工作或安静失败，不报错

---

## Pitch 演示脚本（约 3 分钟）

| 时间 | 做什么 | 说什么（要点） |
|---|---|---|
| 0:00 | 播放 pitch 影片前半段（到 Logo） | 我自己的实习经历：不敢去找同事 |
| 0:45 | 切到现场演示，投屏 HR 页面 | HR 给新人创建任务，指定 5 位关键同事 |
| 1:10 | 请一位评委拿着"Patrik"的手机（或亮出打印卡），你用新人手机扫码 | 扫码的一秒：卡片揭晓；评委手机弹出通知 |
| 1:40 | 当场问评委 fun fact，输入答案解锁 | 只有当面聊天才能解锁 |
| 2:00 | 快速切到已集齐的演示账号，展示 Party | 第一周以被欢迎结束 |
| 2:20 | 回到 HR 成效页 | HR 第一次能看到"融入"的进度 |
| 2:40 | 收尾 | Uniplay teaches the company. Teamdex introduces the people. 同一套机制可以成为 Uniplay 的新模板 |

演示前准备：先 Reset demo，再用 Yunfei 收集 4 位关键同事，把第 5 位（例如 Patrik）留到现场扫码，扫完直接触发 party。Noor 是已集齐的备用账号，现场出问题时切换到她展示 party 与 HR 数据。

## 兜底方案

| 问题 | 兜底 |
|---|---|
| 会场 Wi-Fi 不稳 | 用手机热点；提前在两部手机上打开页面 |
| Supabase 没跑通 | `VITE_DATA_MODE=local`，在一台电脑上开两个标签页（Patrik 与 Yunfei），用手机扫电脑屏幕上的码 |
| 扫码失败 | MyCard 下方显示 6 位短码，新人可手动输入（P1，如有时间） |
| 一切都坏了 | 播放完整 pitch 影片 + 已部署版本的截图 |
