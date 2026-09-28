# Teamdex：开发文档包

> Teamdex 是一个线上 + 线下结合的入职游戏：新人通过和同事当面交换"员工卡"，收集整个团队，
> 在收集的过程中学会"谁是谁、谁做什么、遇到问题该找谁"，集齐后解锁 onboarding party。
> 本文档包用于 2026-09-28 Uniplay Hackathon 当天，交给 Claude Code 直接开发。

## 文件清单

| 文件 | 用途 | 谁读 |
|---|---|---|
| `CLAUDE.md` | Claude Code 的工作守则：项目背景、技术栈、开发顺序、完成标准 | Claude Code 自动读取 |
| `docs/01_PRD.md` | 产品需求：问题、目标、三方用户故事、P0/P1/P2 需求与验收标准 | 你 + Claude Code |
| `docs/02_SERVICE_DESIGN.md` | 服务设计：三方角色、服务蓝图、关键时刻、价值交换、隐私原则 | 你（pitch 素材）+ Claude Code |
| `docs/03_TECH_SPEC.md` | 技术方案：架构、路由、数据模型、接口、二维码流程、实时通知 | Claude Code |
| `docs/04_DESIGN_SYSTEM.md` | 视觉与动效：色彩、字体、卡片结构、像素小人、动效参数、文案 | Claude Code |
| `docs/05_BUILD_PLAN.md` | 当天时间表、每个阶段可直接粘贴的 Claude Code 指令、测试与演示脚本 | 你 |
| `supabase/schema.sql` | 数据库建表 + 业务函数 + 演示数据，一次粘贴运行 | 你（在 Supabase 里运行） |
| `seed/demo-company.json` | 本地模式用的演示公司数据（与 SQL 里的数据一致） | Claude Code |
| `reference/pitch-film.html` | 已完成的 pitch 影片，卡片、配色、动效的视觉参考 | Claude Code |

## 明天怎么用（最短路径）

1. 8:30 之后，新建一个空文件夹，把这整个文件包复制进去。
2. 在这个文件夹里打开终端，运行 `claude` 启动 Claude Code。
3. 打开 `docs/05_BUILD_PLAN.md`，从"阶段 0"开始，把每个阶段的指令复制给 Claude Code。
4. 每完成一个阶段，用手机打开部署后的链接检查一遍，再进入下一阶段。

> 活动规则允许提前构思和规划，但不要在 8:30 前开始写代码。这份文档属于规划，明天再让 Claude Code 动手。
