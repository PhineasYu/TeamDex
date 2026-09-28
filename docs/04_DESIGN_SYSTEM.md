# 04 · 设计系统

视觉方向与 `reference/pitch-film.html` 保持一致：**柔和的彩色大色块 + 深青墨色文字 + 荧光青柠只用于关键词和主按钮 + 全息闪卡 + 像素小人**。整体参考运动类 App 的色块式界面：页面由大圆角的彩色面板堆叠而成，按钮是胶囊形。

## 1. 颜色

| Token | 值 | 用途 |
|---|---|---|
| `ink` | `#13222E` | 所有正文与标题文字、深色按钮、图标 |
| `paper` | `#EEF5F1` | 页面背景 |
| `lime` | `#C8F53C` | 主按钮背景、关键词高亮、进度条填充。**不要大面积用作文字颜色** |
| `mint` | `#BDF4E0` | 面板背景（收藏、详情） |
| `pink` | `#FCD9EF` | 面板背景（提示、fun fact） |
| `sky` | `#5AAFE3` | 面板背景（扫码揭晓、同事通知）、次要强调 |
| `white` | `#FFFFFF` | 卡片底色、输入框 |
| `line` | `#DCE5E0` | 分割线、输入框边框 |
| `muted` | `#5E6B72` | 次要文字 |
| `success` | `#3DDBB0` | 解锁成功、在线状态 |

规则：
- 深色大背景只用于极少数场景（例如全屏揭晓的遮罩），避免和浅色页面产生强烈反差。
- 青柠色高亮只包裹**单个关键词**，形式为圆角色块：`background: lime; padding: 0 .14em; border-radius: .16em`。
- 文字永远是 `ink` 或白色（仅在 `sky` 以上的深色块中），不要用彩色文字承载信息。

### 部门全息色（卡片边框）

| 部门 | `c1` | `c2` | `c3` |
|---|---|---|---|
| design | `#FF7AB8` | `#A86BFF` | `#6FD3FF` |
| engineering | `#3DDBB0` | `#6FD3FF` | `#5AAFE3` |
| sales | `#C8F53C` | `#FF9F43` | `#FF7AB8` |
| people | `#FF8A7A` | `#C8F53C` | `#FF7AB8` |
| finance | `#2FD18A` | `#B8F35A` | `#3DDBB0` |
| product | `#A86BFF` | `#5AAFE3` | `#BDF4E0` |
| ops | `#FFB36B` | `#FCD9EF` | `#5AAFE3` |
| newcomer 卡 | `#FF7AB8` | `#C8F53C` | `#BDF4E0` |（新人卡额外加 "New" 角标）

## 2. 字体

- **Onest**（Google Fonts）：全站唯一正文与标题字体。
  - 大标题 800，字距 -0.03em
  - 页面标题 700
  - 按钮与标签 600
  - 正文 400–500
- **Press Start 2P**：只用于 Party 页标题和勋章获得弹窗，营造像素游戏感。

字号（移动端）：大标题 34px / 页面标题 26px / 卡片名字 28px / 正文 16px / 小字 13px。行高：标题 1.1，正文 1.45。

## 3. 布局与组件

- 页面左右边距 16px，面板之间间距 10px。
- **Panel**：大圆角色块，`border-radius: 28px`，内边距 20px，背景用 mint / pink / sky / lime / white 之一。
- **Pill 按钮**：高度 48px，圆角 999px。主按钮 = 青柠底 + 深色字；次按钮 = 透明底 + 1.5px 深色描边 + 深色字（参考图里的 "Join" 按钮）。
- **底部导航**：白色胶囊浮在底部，距底部 `env(safe-area-inset-bottom) + 12px`，当前项用青柠色圆底图标。
- **进度条**：高 10px，圆角，底色 `line`，填充 `lime`，右侧显示 `3 of 5`。
- **Toast**：从顶部滑入的白色圆角条，左侧小卡片图标，3 秒后自动消失。

## 4. 员工卡（最重要的组件）

卡片比例 5:7（基准 360×504），通过 `transform: scale()` 缩放到不同场景：收藏网格约 0.45，详情页约 0.9，揭晓动画 0.8。

```
┌──────────────────────────────┐  ← 9px 全息边框（conic-gradient，部门色）
│ [Engineering]         No. 02 │  ← 部门胶囊 + 编号
│ ┌──────────────────────────┐ │
│ │      像素小人（渐变底）      │ │  ← 高 158px
│ └──────────────────────────┘ │
│ Patrik                        │  ← 28–40px / 800
│ Backend Engineer             │  ← 次要色
│ ┌ Ask me about ────────────┐ │
│ │ APIs, servers, CI         │ │  ← paper 底色小块
│ └──────────────────────────┘ │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│ Fun fact   ???           🔒  │  ← 解锁后显示全文 + 绿色开锁图标
└──────────────────────────────┘
```

参考 CSS（从 pitch 影片中提取，已去掉耗性能的混合模式）：

```css
.card{position:relative;width:360px;height:504px;border-radius:30px;padding:9px;
  background:conic-gradient(from var(--ang,0deg),var(--c1),var(--c2),var(--c3),var(--c1));
  box-shadow:0 34px 60px -24px rgba(19,34,46,.55)}
.card-body{height:100%;border-radius:22px;background:#fff;padding:18px 20px;display:flex;flex-direction:column;gap:10px;overflow:hidden}
.card-art{position:relative;height:158px;border-radius:16px;background:linear-gradient(160deg,var(--c1),var(--c3));display:flex;align-items:flex-end;justify-content:center}
.card-art::after{content:'';position:absolute;inset:0;border-radius:16px;
  background:repeating-linear-gradient(115deg,#ff6fb5 0 7%,#c8f53c 7% 14%,#3ddbb0 14% 21%,#6fd3ff 21% 28%,#a86bff 28% 35%);
  background-size:300% 100%;background-position:var(--shine,150%) 0;opacity:.16}
.card-shine{position:absolute;inset:0;border-radius:30px;pointer-events:none;
  background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.55) 50%,transparent 58%);
  background-size:300% 100%;background-position:var(--shine,150%) 0}
```

状态：
| 状态 | 表现 |
|---|---|
| 未收集（关键同事） | 整卡灰度 + 60% 透明，头像为剪影，显示名字与"为什么要认识他" |
| 未领卡 | 虚线边框占位，"Card coming soon" |
| 已收集 | 正常显示，fun fact 锁定 |
| fun fact 已解锁 | 锁变为绿色开锁图标，fun fact 行背景 `rgba(61,219,176,.25)` |
| 新人卡 | 右上角 "New" 角标（青柠底） |

**手机倾斜光泽（P1）**：在卡片详情页，用 `deviceorientation` 的 `gamma` 值驱动 `--shine`（-30°~30° 映射到 150%~-50%）。iOS 需要在用户点击后调用 `DeviceOrientationEvent.requestPermission()`，做一个 "Tilt to shine ✨" 按钮。

## 5. 像素小人

12×13 像素网格，SVG 渲染（`shape-rendering="crispEdges"`），每个格子一个 `<rect>`。

字符含义：`h` 头发、`s` 皮肤、`e` 眼睛（固定 `#13222E`）、`m` 嘴（固定 `#E0567A`）、`c` 衣服、`p` 裤子、`b` 鞋、`.` 透明。

```ts
export const FRAME_IDLE = [
  "....hhhh....","...hhhhhh...","...hssssh...","...sesses...","...ssssss...",
  "....smms....","..cccccccc..",".sccccccccs.",".s.cccccc.s.","...cccccc...",
  "...pp..pp...","...pp..pp...","..bbb..bbb..",
];
export const FRAME_CHEER = [
  ".s..hhhh..s.",".s.hhhhhh.s.",".s.hssssh.s.",".s.sesses.s.",".s.ssssss.s.",
  ".s..smms..s.",".sccccccccs.","..cccccccc..","...cccccc...","...cccccc...",
  "..pp....pp..","..pp....pp..",".bbb....bbb.",
];
```

剪影：所有像素统一使用 `#C3CFC9`。

头像编辑器选项（同事设置卡片时选择）：

| 部位 | 选项 |
|---|---|
| 发色 | `#13222E` `#2B1D14` `#6B3E26` `#D9B38C` `#F2C14E` `#FF7AB8` |
| 肤色 | `#F6D2B8` `#F1C6A0` `#E8B48A` `#C68B59` `#8D5A3B` |
| 衣服 | 默认为部门 `c1` 色，可选 mint / pink / sky / lime / white |
| 裤子与鞋 | 裤子固定 `#13222E`；鞋可选 lime / pink / sky |

## 6. 动效

使用 `framer-motion`。所有时长与缓动如下，保证与 pitch 影片一致：

| 动效 | 参数 |
|---|---|
| 翻卡揭晓 | rotateY -110° → 0°，scale 0.5 → 1，1.1s，`cubic-bezier(.34,1.56,.64,1)`（back-out） |
| 揭晓前闪光 | 白色全屏 0 → 1（80ms）→ 0（550ms） |
| 闪光扫过 | `--shine` 150% → -50%，1.0s，ease-in-out，揭晓后 0.3s 开始 |
| 弹出（按钮、勋章、卡片进入网格） | scale 0 → 1，0.5s，back-out |
| 页面切换 | 新页面从下方 24px 淡入上移，0.35s |
| 解锁 | 锁图标左右晃动 3 次（每次 70ms），然后切换为开锁图标，fun fact 文字逐字出现 1.2s |
| Party | 像素小人每 250ms 在两帧之间切换并上下跳动 22px；彩色方块纸屑下落 2.4–3.8s |

`prefers-reduced-motion: reduce` 时：翻卡改为 0.3s 淡入，取消跳动与纸屑。

## 7. 音效与触感（P1，默认开启，可在设置关闭）

用 Web Audio 合成，不需要音频文件：

| 时刻 | 声音 |
|---|---|
| 卡片揭晓 | 上扬的五音闪烁（1318 / 1568 / 1976 / 2637 / 3136 Hz 正弦，间隔 50ms） |
| 弹出 | 540Hz → 190Hz 正弦滑音 140ms |
| 解锁 | 三角波 880Hz + 1320Hz 两音 |
| Party | 方波琶音 C5 E5 G5 C6 G5 C6 |

iPhone 上在首次点击时设置 `navigator.audioSession.type = 'playback'` 并 `resume()` AudioContext，否则静音开关会让声音消失。安卓上收集成功时 `navigator.vibrate(40)`。

## 8. 界面文案（英语）

| 位置 | 文案 |
|---|---|
| Landing 标题 | Your new team, as a card collection. |
| Landing 输入框 | Team code |
| JoinPick 标题 | Who are you? |
| 新人首页标题 | Your Teamdex |
| 进度 | {n} of {goal} key colleagues |
| 关键同事剪影 | {reason}（例如 "Your buddy for week one"） |
| 揭晓标题 | New card! |
| 已收集 | Already in your Teamdex |
| 开场白标题 | Say hi with |
| fun fact 提示 | Ask {name}: {prompt} |
| fun fact 输入框 | What did they say? |
| fun fact 错误 | Not quite. Ask them again! |
| fun fact 成功 | Unlocked! |
| 测验标题 | Who do I ask? |
| 测验题干 | You need help with {topic}. Who do you ask? |
| Party 标题 | Onboarding party unlocked! |
| Party 副标题 | Fika invite sent to {names} |
| 同事通知 | {name} collected your card. You got their newcomer card too. |
| 同事我的卡片 | Show this to a new colleague |
| Open to chat 开关 | Open to chat right now |
| HR 首页标题 | Newcomers |
| HR 新建任务 | Create onboarding quest |
| HR 原因输入框 | Why should they meet? |

### 开场白模板（按 help topic 自动生成，每张卡显示 2 句）

- "Hi {name}, I'm {me}, the new {my_role}. I'm doing my Teamdex quest!"
- "I heard you're the person to ask about {topic}. What does that usually look like?"
- "What's one thing you wish you'd known in your first week here?"
