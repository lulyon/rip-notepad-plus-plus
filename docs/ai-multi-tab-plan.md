# AI Tab 多会话支持 — 实现方案

> ✅ **已实现** (2026-06)

## 现状

```
aiStore.ts (Zustand, 全局单例)
├── apiBaseUrl, apiKey, model        ← 共享配置（localStorage）
├── messages[], streaming, error      ← 单会话
└── AiPanel.tsx                        ← 直接消费 store
```

一个全局 store 绑定一个 AiPanel，天然单会话。要支持多 tab，必须把 `messages[] + streaming + error` 从全局提升到"每个会话一份"。

## 核心设计决策

### 共享配置 vs 独立配置？

| 方案 | 描述 | 类比 |
|------|------|------|
| **A. 共享配置（推荐）** | 所有 tab 共享 apiUrl/key/model，只分叉 messages | ChatGPT/Claude.ai 侧边栏 |
| B. 独立配置 | 每个 tab 独立配置 | Chrome profiles |

方案 A 是默认。方案 B 可后续加（每个 tab 配置面板里加 override）。

### 会话粒度

- 一个 tab = 一个会话 = 一份 messages 历史
- 新建 tab → 空会话 → 初次对话
- 关闭 tab → 丢弃该会话（可恢复？见下）
- 切换 tab → 切换消息列表和输入状态

## 数据模型

```typescript
// per-conversation state (每个 tab 独立)
interface Conversation {
  id: string;           // "conv-1712345678-1"
  title: string;        // 首条用户消息截断，或 "New Chat"
  messages: AiMessage[];
  streaming: boolean;
  streamThinking: string;
  error: string | null;
  createdAt: number;
}

// aiStore — shared + multi-conversation
interface AiState {
  // Shared config (all tabs)
  apiBaseUrl: string;
  apiKey: string;
  model: string;

  // Multi-conversation
  conversations: Conversation[];
  activeId: string | null;

  // Actions
  setConfig: (url, key, model) => void;
  newConversation: () => string;          // returns id
  closeConversation: (id: string) => void;
  setActive: (id: string) => void;
  // per-conversation actions (take conversation id)
  addMessage: (convId, msg) => void;
  updateLastMessage: (convId, content) => void;
  setStreaming: (convId, v: boolean) => void;
  setError: (convId, err: string | null) => void;
  setStreamThinking: (convId, text: string) => void;
  setTitle: (convId, title: string) => void;
  loadFromClaudeConfig: () => Promise<boolean>;
}
```

### Persistence

```
localStorage:
  ripnotepadpp-ai-config        → { url, key, model }        (不变)
  ripnotepadpp-ai-conversations → [{ id, title, messages[], createdAt }, ...]
```

迁移策略：首次加载时检测旧 `ripnotepadpp-ai-chat` key，有数据则迁移为第一条 conversation。

## 组件树

```
AiPanel.tsx (tab manager)
├── Tab bar
│   ├── [tab] × N   (可关闭，最后一个不能关)
│   └── [+]
├── AiTabPane (active tab, visible)
│   ├── Messages area (scroll, thinking, markdown)
│   ├── Input area (textarea + send button)
│   └── Config screen (when no API key configured)
├── AiTabPane (hidden tabs, display:none)
│   └── ...
```

每个 `AiTabPane` 逻辑和当前的 AiPanel 几乎完全一样，只是从 `aiStore` 里拿属于自己的 `conversation` slice，通过 `convId` 调用 actions。

## 交互细节

| 操作 | 行为 |
|------|------|
| 点击 `+` | newConversation() → 新建空会话 → 切换到新 tab → focus 输入框 |
| 点击 tab | setActive(id) → 切换 visible。tab 标签显示 loading 指示器（⏳）当该会话正在 streaming |
| 点击 `×` | closeConversation(id) → 删除历史（不可恢复） → 切到相邻 tab（最后 1 个不能关） |
| 发送消息 | 当前 tab 的 addMessage + streamChat |
| 清空对话 | clearMessages(convId)（只清空当前 tab） |
| 切换 tab 时正在 streaming | 后台继续 stream。源 tab 标签显示 ⏳，目标 tab 正常显示。切回来时消息已更新 |
| 关闭 streaming 中的 tab | fetch 继续但丢弃后续 token，避免竞态污染其他 tab |

### Tab 标签状态

```
🟢 title     — 正常（有消息历史）
⚪ New Chat  — 空会话，尚未发消息
⏳ title     — 正在 streaming（loading 指示器）
```

在 tab 按钮上直接显示 emoji 状态，不需要额外 UI 元素。

## Tab 标题

策略：首条用户消息前 20 字符作为标题。

```typescript
// 在 addMessage 里自动设标题
if (conv.messages.length === 0 && msg.role === "user") {
  setTitle(convId, msg.content.slice(0, 20) + (msg.content.length > 20 ? "…" : ""));
}
```

初始标题："New Chat"（或 i18n key `ai.newChat`）。

## 与 Terminal 多 tab 的异同

| 维度 | Terminal | AI Chat |
|------|----------|---------|
| 后端状态 | PTY 进程（Rust PtyManager） | 无后端（纯前端 fetch） |
| 关闭 tab 清理 | kill PTY + dispose xterm | 删除 conversation 对象 + localStorage |
| 每个 tab 生命周期管理 | useEffect 管理 xterm 实例 | 无副作用（纯数据） |
| 自动创建 | mount 时 auto-spawn | 点 + 手动创建 |
| 状态位置 | React state（TerminalPanel） | Zustand store（aiStore） |

## 改动范围

| 文件 | 改动 |
|------|------|
| `src/stores/aiStore.ts` | 重构：conversations[] + activeId + per-conv actions |
| `src/components/Panels/AiPanel.tsx` | 重写：tab bar + AiTabPane 列表 |
| `src/components/Panels/AiPanel.css` | 加 tab bar 样式 |
| `src/i18n/en.ts`, `zh.ts` | 加 `ai.newChat` key |
| 其他文件 | 零改动 |

## 不变的部分

- `src/lib/aiClient.ts` — fetch 封装完全无状态，无需改动
- `src/hooks/useMenuActions.ts` — AI 菜单动作不变
- `src/components/Panels/Sidebar.tsx` — AiPanel 接口不变
- 任何 Rust 代码

## 风险点

1. **localStorage 容量** — 多会话历史累积。缓解：每个 conversation 最多保留 100 条消息，超出自动裁剪。

2. **API key 未配置** — 显示全局配置界面（所有 tab 共享同一个配置界面）。

3. **旧数据迁移** — 首次加载时把 `ripnotepadpp-ai-chat` 迁移为第一条 conversation。迁移后删除旧 key。

## 工作量

约 3-4 小时，主要是 aiStore 重构 + AiPanel 重写。没有 Rust 改动，没有新依赖。

## 已确认决策

1. **关闭 tab = 删除历史**（不可恢复，简洁）。
2. **Loading 指示器**：streaming 中的 tab 标签显示 ⏳ emoji，切回来消息已更新。
3. **Quick actions 保持现状**：预填 prompt 到当前 tab 的输入框。
