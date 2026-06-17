# AI 联网搜索实现计划（Server-Side Search）

> ✅ **已实现** (2026-06)，包含 `user_location` 时区注入 + 日期注入 + XML 后处理

## 方案概述

利用 DeepSeek/Anthropic API 内建的 `web_search_20250305` 服务端工具，模型在服务端自动执行搜索，客户端无需实现 Agent Loop。客户端只需在请求中声明该 tool，并在 SSE 流中解析新增的 content block 类型。

## 调研结论

### 实测验证（DeepSeek API `https://api.deepseek.com/anthropic`）

| 项目 | 结论 |
|------|------|
| 是否支持 `web_search_20250305` | ✅ 是 |
| 搜索是否服务端执行 | ✅ 是，客户端无需参与 |
| 搜索结果是结构化数据 | ✅ `web_search_tool_result.content` 返回 `web_search_result[]` |
| 搜索结果字段 | `url`, `title`, `encrypted_content`；`page_age` 为 null |
| 模型自主决定搜索 | ✅ 简单问题(2+2)不搜索，需要实时信息时自动搜索 |
| 搜索计数 | `usage.server_tool_use.web_search_requests` |
| 多轮对话 | ✅ 支持，搜索结果参与上下文 |
| `pause_turn` | 未触发（正常查询 `max_tokens=2048` 足够） |
| 响应格式一致性 | ⚠️ 偶尔 text 内容为 XML tool_call 格式而非自然语言 |

### Anthropic 官方 API 行为（参考文档）

| 项目 | 结论 |
|------|------|
| Tool 版本 | `web_search_20250305`（基础版）和 `web_search_20260209`（动态过滤版） |
| 引用格式 | text block 上带结构化的 `citations` 数组（`web_search_result_location`） |
| 费用 | $10/1000 次搜索，另计 token |
| `pause_turn` | 长搜索可能暂停，需客户端发送 continuation 请求 |
| 搜索结果 | `url`, `title`, `encrypted_content`, `page_age`, `encrypted_index` |

### 实测 SSE 事件流（DeepSeek）

```
content_block_start  index=0  type=thinking          → 模型决定是否搜索
content_block_delta  index=0  thinking_delta         → 思考过程
content_block_stop   index=0

content_block_start  index=1  type=server_tool_use   → "我要搜索了"
content_block_delta  index=1  input_json_delta       → {"query":"..."}
content_block_stop   index=1

content_block_start  index=2  type=web_search_tool_result  → 10 条搜索结果
content_block_delta  index=2  (无 delta，结果在 start 的 content 数组中)
content_block_stop   index=2

content_block_start  index=3  type=thinking          → 模型分析搜索结果
content_block_delta  index=3  thinking_delta
content_block_stop   index=3

content_block_start  index=4  type=text              → 最终回答
content_block_delta  index=4  text_delta
content_block_stop   index=4

message_delta  stop_reason="end_turn"  usage={server_tool_use:{web_search_requests:1}}
message_stop
```

## 改动范围

### 1. `src/lib/aiClient.ts` — 核心改动 ⭐

改动量最大，新增三个回调 + tools 参数。

```typescript
// 新增类型
export interface SearchResult {
  url: string;
  title: string;
  pageAge?: string | null;
}

export interface StreamCallbacks {
  onToken: (text: string) => void;
  onThinking: (text: string) => void;
  onSearchStart: (query: string, toolUseId: string) => void;
  onSearchResult: (results: SearchResult[], toolUseId: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}

export async function streamChat(
  baseUrl: string, apiKey: string, model: string,
  messages: AiMessage[],
  systemPrompt: string,
  enableWebSearch: boolean,  // 🆕 参数
  callbacks: StreamCallbacks,
): Promise<void>
```

**SSE 解析新增逻辑：**

```
content_block_start:
  type=server_tool_use → 记录 blockIndex → toolUseId
  type=web_search_tool_result → 提取 content[] 中的 url/title → onSearchResult()

content_block_delta:
  type=input_json_delta → 累积 partial_json → 解析 query → onSearchStart()

message_delta:
  提取 usage.server_tool_use.web_search_requests → 存入 convSearchCount
```

**请求体新增：**
```json
{
  "tools": [{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}]
}
```
仅当 `enableWebSearch=true` 时添加。

**text 后处理：** `onDone` 回调中暴露完整文本，由调用方（`AiPanel.tsx`）在 `onDone` 时执行 `sanitizeText()` 清理残留 XML tag（详见上方"XML tool_call 后处理方案"）。不放在 aiClient 内部以避免流式状态机复杂度。

### 2. `src/stores/aiStore.ts` — 数据结构扩展

```typescript
// AiMessage 新增可选字段
export interface AiMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  // 🆕 搜索相关
  searchQuery?: string;
  searchResults?: { url: string; title: string }[];
  searchCount?: number;
}

// AiState 新增
interface AiState {
  // ...existing...
  enableWebSearch: boolean;  // 🆕 默认 true
  toggleWebSearch: () => void;  // 🆕

  // 🆕 更新最后一条消息的搜索元数据
  updateLastMessageMeta: (convId: string, meta: Partial<AiMessage>) => void;
}
```

`enableWebSearch` 持久化到 `localStorage`（`ripnotepadpp-ai-config` key）。

**新增 action 实现：**
```typescript
updateLastMessageMeta: (convId, meta) => {
  set((s) => ({
    conversations: s.conversations.map((c) => {
      if (c.id !== convId) return c;
      const messages = [...c.messages];
      const lastIdx = messages.length - 1;
      if (lastIdx >= 0 && messages[lastIdx].role === "assistant") {
        messages[lastIdx] = { ...messages[lastIdx], ...meta };
      }
      return { ...c, messages };
    }),
  }));
},
```

### 3. `src/components/Panels/AiPanel.tsx` — UI 改动

**新增 SearchBlock 组件：**
```tsx
function SearchBlock({ query, results }: { query: string; results: {url:string;title:string}[] }) {
  const [open, setOpen] = useState(true);  // 默认展开
  return (
    <div className="ai-search-block">
      <div className="ai-search-toggle" onClick={() => setOpen(!open)}>
        {open ? "▾" : "▸"} 🔍 Searched: {query} ({results.length} results)
      </div>
      {open && (
        <div className="ai-search-results">
          {results.map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noopener"
               className="ai-search-result-item">
              {r.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

**消息渲染改动：**
- 在 assistant 消息的 ThinkingBlock 之后、content 之前，插入 SearchBlock
- 搜索时显示状态指示器 "🔍 Searching..."
- `onDone` 回调中对完整文本执行 `sanitizeText()` 清理 XML tag，再做最后一次 `updateLastMessage`

**send() 函数改动关键片段：**
```typescript
// 新增：sanitize helper（放在 AiPanel.tsx 顶部）
function sanitizeText(text: string): string {
  return text
    .replace(/<invoke[\s\S]*?<\/invoke>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// send() 中的 streamChat 调用改为：
let full = "";
let thinkingFull = "";
let searchQuery = "";
let searchResults: {url:string;title:string}[] = [];

await streamChat(
  apiBaseUrl, apiKey, model, latest.messages,
  "You are a helpful coding assistant...",
  enableWebSearch,
  {
    onToken: (token) => {
      full += token;
      useAiStore.getState().updateLastMessage(conv.id, full);
    },
    onThinking: (thinking) => {
      thinkingFull += thinking;
      setStreamThinking(conv.id, thinkingFull);
    },
    onSearchStart: (query, _id) => {
      searchQuery = query;
      // 在消息中插入搜索占位
    },
    onSearchResult: (results, _id) => {
      searchResults = results;
    },
    onDone: () => {
      // 🆕 后处理：清理 XML tag
      full = sanitizeText(full);
      useAiStore.getState().updateLastMessage(conv.id, full);
      // 🆕 附加搜索元数据到消息
      if (searchQuery || searchResults.length > 0) {
        useAiStore.getState().updateLastMessageMeta(conv.id, {
          searchQuery,
          searchResults,
        });
      }
      setStreaming(conv.id, false);
    },
    onError: (err) => {
      setConvError(conv.id, err);
    },
  },
);
```

**Tab bar 新增开关：**
```
[🤖 Chat 1] [🤖 Chat 2] [+]  [🌐] [⚙] [🗑]
                               ↑ 联网搜索开关
```
一个小 toggle 按钮，绿色=开启，灰色=关闭。

### 4. `src/components/Panels/AiPanel.css` — 样式新增

```css
/* 搜索状态指示器 */
.ai-searching { /* 流式传输中显示 "Searching..." */ }

/* 搜索结果块 */
.ai-search-block { /* 可折叠容器，浅蓝色左边框 */ }
.ai-search-toggle { /* 类似 thinking toggle */ }
.ai-search-results { /* 结果链接列表 */ }
.ai-search-result-item { /* 单条结果，truncate */ }

/* 联网搜索开关 */
.ai-web-search-toggle { /* tab bar 中的小按钮 */ }
.ai-web-search-toggle.active { /* 开启态绿色 */ }
```

### 5. i18n 新增 key

| Key | English | 中文 |
|-----|---------|------|
| `ai.webSearch` | Web Search | 联网搜索 |
| `ai.searching` | Searching... | 搜索中... |
| `ai.searchedN` | Searched {{query}} ({{count}} results) | 搜索了 {{query}}（{{count}} 条结果） |

## 不做的

- ❌ **不实现 `pause_turn` 处理**：设置足够的 `max_tokens`（8192），正常查询不会触发。如未来需要可加。
- ❌ **不实现动态过滤**（`web_search_20260209`）：需要 code execution tool，DeepSeek 不支持。
- ❌ **不实现 `user_location` 本地化**：v1 范围外，后续可加。
- ❌ **不处理 Anthropic 的 `citations` 结构化数据**：DeepSeek 不返回此格式。如果未来切换 Anthropic API 可再加。

## 风险 & 注意事项

| 风险 | 影响 | 缓解 |
|------|------|------|
| DeepSeek 偶尔返回 XML tool_call 文本 | 用户看到乱格式 | `onDone` 时 `sanitizeText()` 清理 |
| 服务端搜索有延迟 | 回复变慢（~3-10s） | 显示 "Searching..." 状态 + 搜索动画 |
| 搜索可能不触发 | 模型认为不需要 | 正常行为，不强搜；用户可在 prompt 中明确要求搜索 |
| `encrypted_content` 跨轮次 | 下一轮模型看不到历史搜索结果 | 非关键；新问题会重新搜索 |
| 搜索结果 token 消耗 | API 用量增加 | `max_uses=5` 封顶；toggle 可随时关闭 |

## 预估工作量

| 文件 | 改动量 | 难度 |
|------|--------|------|
| `aiClient.ts` | ~80 行 | 中 |
| `aiStore.ts` | ~25 行 | 低 |
| `AiPanel.tsx` | ~80 行 | 中 |
| `AiPanel.css` | ~40 行 | 低 |
| `en.ts` + `zh.ts` | ~6 行 | 低 |
| **总计** | **~230 行** | |

## 已确认决策

| 决策 | 结论 |
|------|------|
| 搜索费用 | 不关注，忽略成本问题 |
| 默认开启 | `enableWebSearch: true`，tab bar 加 🌐 toggle |
| `max_uses` | **5** |
| 域过滤 | v1 不加 |
| XML 格式后处理 | 客户端 strip 处理（见下文详细方案） |

---

## XML tool_call 后处理方案

### 问题

DeepSeek 偶尔在 text 响应中返回 XML tool_call 格式而非自然语言（实测约 2/5 概率）：

```xml
<invoke name="web_search">
<parameter name="query" string="true">北京气温 2025-12-17</parameter>
</invoke>
```

这发生在模型"在脑中"调用了搜索，但搜索结果已通过结构化 `web_search_tool_result` block 返回。XML 文本是冗余的。

### 处理策略

在 `aiClient.ts` 的 text_delta 累积逻辑中，对流式文本做两级清理：

**Level 1 — 流式过滤（text_delta 级别）：**
- 维护一个状态机，跟踪当前是否在 XML tag 内部
- 遇到 `<invoke` / `<parameter` / `</invoke` 时进入 skip 模式
- 遇到 `</invoke>` 闭合时退出 skip 模式
- 在 skip 模式内的 text_delta 丢弃，不触发 `onToken`

**Level 2 — 最终清理（onDone 之前）：**
- 对完整文本做一次 regex cleanup，移除任何残留的 XML tag 块
- Pattern: `/<invoke[\s\S]*?<\/invoke>/g`

```typescript
// 在 onDone 触发前执行
function sanitizeText(text: string): string {
  return text
    .replace(/<invoke[\s\S]*?<\/invoke>/g, "")
    .replace(/\n{3,}/g, "\n\n")  // 清理多余空行
    .trim();
}
```

**Level 1 状态机设计：**

```
states: NORMAL | IN_XML
transitions:
  NORMAL + "<invoke"  → IN_XML (skip)
  NORMAL + anything   → emit onToken
  IN_XML + "</invoke>" → NORMAL
  IN_XML + anything   → skip
```

注意：流式场景下，`<invoke` 可能被拆成多个 text_delta（如 `<` + `invoke` + ` name=`...），需要维护一个 skip buffer 累积可能的 tag 开始标记。简化实现：累积到一段后再用 Level 2 regex，但每 500ms flush 一次非 XML 文本给 onToken。这避免了复杂的状态机。

**推荐实现（简化版）：**

```typescript
// 在 streamChat 内部
let textBuffer = "";
let lastFlush = Date.now();

function flushBuffer() {
  // Level 2 regex cleanup
  const cleaned = sanitizeText(textBuffer);
  if (cleaned) {
    onToken(cleaned);  // 注意：这是累积的，需要调整 onToken 为增量
  }
  textBuffer = "";
}

// 在 text_delta 处理中：
textBuffer += delta.text;

// 每 500ms 或遇到换行时 flush
if (Date.now() - lastFlush > 500 || delta.text.includes("\n")) {
  // 只 flush 非 XML 部分
  const safe = textBuffer.replace(/<invoke[\s\S]*?<\/invoke>/g, "");
  if (safe.length > 0) {
    onToken(safe);
    textBuffer = textBuffer.slice(textBuffer.lastIndexOf(safe) + safe.length);
    // 保留可能是 XML tag 开头的残余
  }
  lastFlush = Date.now();
}
```

实际上，更简单且可靠的方案是：**不在流式层面做过滤，只在最终 onDone 时做一次完整清理。** 原因：

1. XML tool_call 通常出现在响应开头（模型先说搜索什么再回答）
2. 对流式体验影响小——XML 文本和自然语言文本不会同时出现
3. 状态机在流式场景下有 bug 风险（tag 被拆成多个 chunk）

**最终方案：Level 2 仅 onDone 清理。** 在 `AiPanel.tsx` 的 send() 中，`onDone` 回调里对完整文本执行一次 `sanitizeText()`，然后更新最后一次消息。
