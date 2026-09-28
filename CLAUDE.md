# CLAUDE.md — Teamdex

## 你在做什么

Teamdex 是一个移动端优先的 Web App（PWA），服务三类用户：

1. **新人（Newcomer）**：通过扫描同事的员工卡二维码"收集"同事，当面聊天解锁 fun fact，用小测验检验"遇到问题该找谁"，集齐关键同事后解锁 onboarding party。
2. **在职同事（Colleague）**：两分钟内设置好自己的卡片（像素头像、职位、可以找我聊什么、一个只能当面问到的 fun fact），被新人扫码时收到通知，并反向获得新人的卡片。
3. **HR（People team）**：录入团队、给新人创建入职任务（指定 5 位关键同事）、发出邀请、查看入职进展和成效。

这是一场一天的黑客松作品（Uniplay Hackathon，评审标准：好玩、能在手机上运行、能教会玩家东西）。
**优先级是：一个在手机上跑得通、演示起来惊艳的完整闭环 > 功能数量。**

## 必读文档（按需查阅，不要一次全部加载）

- `docs/01_PRD.md`：需求与验收标准（P0 必须做完）
- `docs/02_SERVICE_DESIGN.md`：三方体验与服务蓝图（理解"为什么"时读）
- `docs/03_TECH_SPEC.md`：架构、数据模型、接口、路由（写代码前读相关章节）
- `docs/04_DESIGN_SYSTEM.md`：颜色、字体、卡片、像素小人、动效（做 UI 时读）
- `docs/05_BUILD_PLAN.md`：开发阶段顺序
- `supabase/schema.sql`：数据库与业务函数的唯一真相来源
- `seed/demo-company.json`：本地模式的演示数据
- `reference/pitch-film.html`：视觉参考（卡片样式、像素小人、配色都从这里来）

## 技术栈（已定，不要替换）

- Vite + React 18 + TypeScript
- Tailwind CSS（颜色、字体写进 `tailwind.config` 的 theme，见设计系统）
- `react-router-dom` 做路由
- `framer-motion` 做动效
- `qrcode.react` 生成二维码
- `lucide-react` 图标
- `@supabase/supabase-js` 做数据库与实时通知
- 部署：Vercel（需要 `vercel.json` 把所有路径重写到 `index.html`，否则 `/c/:token` 深链接会 404）

## 开发规则

1. **移动端优先**：以 390×844 的视口设计和测试，所有可点击区域至少 44×44px。HR 控制台也要能在手机上用，但可以在桌面上更宽。
2. **数据层先本地、后云端**：所有数据读写都通过 `src/lib/api` 里的统一接口（见技术方案 §5）。先实现 `LocalAdapter`（localStorage + 演示数据），UI 全部跑通后再实现 `SupabaseAdapter`。用环境变量 `VITE_DATA_MODE=local|supabase` 切换。
3. **所有写操作走接口函数**，UI 组件里不要直接写 localStorage 或直接调用 Supabase 表。
4. **始终保持可部署**：每完成一个阶段就 `npm run build` 确认无报错，提交 git，并部署一次。
5. **不要超出需求**：P0 没做完之前不要做 P1。想加东西时先问用户。
6. **UI 文案用英语**（评委和场景都是英语），代码注释用英语。和用户沟通用中文。
7. **动效要尊重 `prefers-reduced-motion`**：开启时用淡入淡出替代位移与翻转。
8. **不要使用会拖慢手机的效果**：不要用 `mix-blend-mode`，不要在大面积元素上用 `filter: blur()`，不要让不在屏幕上的元素持续动画。
9. **用户不是专业开发者**：每次需要用户操作（装依赖、建 Supabase 项目、填环境变量、部署）时，给出逐步、可直接复制的命令，并说明预期看到什么。

## 完成标准（Definition of Done）

一个阶段算完成，必须同时满足：

- `npm run build` 无报错、无 TypeScript 错误
- 在手机浏览器（iPhone Safari 或 Android Chrome）上打开部署链接，该阶段的验收标准逐条通过
- 没有控制台报错
- 已提交 git

## 常用命令

```bash
npm run dev -- --host   # 本地开发，--host 让同一 Wi-Fi 下的手机能访问
npm run build           # 构建检查
npx vercel --prod       # 部署
```
