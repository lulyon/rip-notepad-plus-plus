# OpenAI 兼容 API 支持 — 实现方案

## 调研结论

### 实测 DeepSeek OpenAI 端点

```
POST https://api.deepseek.com/v1/chat/completions
Authorization: Bearer <key>
```

**基础流式（deepseek-chat）：**
```
data: {"choices":[{"delta":{"content":"That"}}]}
data: {"choices":[{"delta":{"content":"'s"}}]}
data: {"choices":[{"delta":{"content":""},"finish_reason":"stop"}]}
data: [DONE]
```

**推理流式（deepseek-reasoner → 实际映射到 v4-flash）：**
```
data: {"choices":[{"delta":{"content":null,"reasoning_content":"We need"}}]}
data: {"choices":[{"delta":{"content":null,"reasoning_content":" to"}}]}
... (reasoning) ...
data: {"choices":[{"delta":{"content":"Answer"},"reasoning_content":null}]}
```

**Web 搜索：** DeepSeek OpenAI 端点不支持 `web_search: true` 参数。OpenAI 自己通过 `web_search_options` 支持，但格式完全不同（需要 tool_calls 循环）。v1 对 OpenAI provider 禁用联网搜索。

## 架构设计

### Provider 模型

```typescript
type ApiProvider = "anthropic" | "openai";
```

请求/响应差异：

| 维度 | Anthropic | OpenAI |
|------|-----------|--------|
| 端点 | `/v1/messages` | `/v1/chat/completions` |
| 认证 | `x-api-key` | `Authorization: Bearer` |
| 系统提示 | `system` 顶层字段 | `messages[0] {role: "system"}` |
| 流式文本 | `content_block_delta.text_delta` | `choices[0].delta.content` |
| 流式思考 | `content_block_delta.thinking_delta` | `choices[0].delta.reasoning_content` |
| 结束信号 | `message_stop` | `[DONE]` |
| 联网搜索 | `web_search_20250305` server tool | ❌ v1 不支持 |

### 代码结构

```
aiClient.ts
├── streamChat()             ← 调度器：根据 provider 分发
├── anthropicStream()        ← 现有实现，提取为独立函数
└── openaiStream()           ← 新实现

导出不变：
  StreamCallbacks  (onToken / onThinking / onSearchStart / onSearchResult / onDone / onError)
  SearchResult
```

### Provider 自动检测

在 `aiStore.loadFromClaudeConfig()` 和用户手动输入时自动检测：

```typescript
function detectProvider(url: string): ApiProvider {
  if (/openai/i.test(url)) return "openai";
  return "anthropic"; // default, backward compatible
}
```

用户在设置界面可以手动覆盖。

### `openaiStream()` 实现要点

```typescript
async function openaiStream(
  baseUrl: string, apiKey: string, model: string,
  messages: AiMessage[], systemPrompt: string,
  callbacks: StreamCallbacks,
): Promise<void> {
  const url = `${baseUrl}/v1/chat/completions`;

  // 构建 OpenAI 格式消息列表
  const openaiMessages = [];
  if (systemPrompt) {
    openaiMessages.push({ role: "system", content: systemPrompt });
  }
  for (const m of messages) {
    // OpenAI 只需要 role + content 字符串
    openaiMessages.push({ role: m.role, content: m.content });
  }

  const body = {
    model,
    max_tokens: 8192,
    stream: true,
    messages: openaiMessages,
    // OpenAI 特有的流式选项：在最终 chunk 中包含 usage
    stream_options: { include_usage: true },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  // SSE 解析：
  // data: {"choices":[{"delta":{"content":"text"}}]}
  //   → onToken
  // data: {"choices":[{"delta":{"reasoning_content":"think"}}]}
  //   → onThinking
  // data: [DONE]
  //   → onDone
}
```

## 改动范围

### 1. `src/lib/aiClient.ts`

- 导出 `ApiProvider` 类型
- 将现有代码提取为 `anthropicStream()`
- 新增 `openaiStream()`
- `streamChat()` 改为调度器，新增 `provider` 参数

```typescript
export type ApiProvider = "anthropic" | "openai";

// 调度器
export async function streamChat(
  baseUrl, apiKey, model, messages, systemPrompt,
  enableWebSearch, userTimezone, provider, callbacks,
): Promise<void> {
  if (provider === "openai") {
    return openaiStream(baseUrl, apiKey, model, messages, systemPrompt, callbacks);
  }
  return anthropicStream(baseUrl, apiKey, model, messages, systemPrompt,
    enableWebSearch, userTimezone, callbacks);
}
```

### 2. `src/stores/aiStore.ts`

- `PersistedConfig` 加 `provider?: ApiProvider`
- `AiState` 加 `provider: ApiProvider`
- `setConfig` 加 provider 参数
- 检测逻辑：

```typescript
function detectProvider(url: string): ApiProvider {
  if (/openai/i.test(url)) return "openai";
  return "anthropic";
}
```

### 3. `src/components/Panels/AiPanel.tsx`

- `AiTabPane`: 传 `provider` 给 `streamChat`
- `AiTabPane`: 当 `provider === "openai"` 时隐藏 🌐 搜索开关
- `AiConfigScreen`: 加 provider 下拉选择

### 4. `src/components/Panels/AiPanel.css`

- 新增 ~10 行：provider 下拉样式

### 5. i18n

- `ai.configProvider`: "API Provider" / "API 提供商"

### 6. 测试

- `aiClient.test.ts`: 新增 openaiStream 测试（mock OpenAI SSE 格式）
- `aiStore.test.ts`: 新增 provider 检测 + 持久化测试

## 不做的

- ❌ OpenAI Tool Calling / Function Calling（v1 不做，需完整的 Agent Loop）
- ❌ OpenAI 联网搜索（格式差异大，v1 禁用）
- ❌ 多 Provider 同时使用（一次只连一个）

## 预估

| 文件 | 改动 | 行数 |
|------|------|------|
| `aiClient.ts` | 拆分 + openaiStream | ~120 |
| `aiStore.ts` | provider 字段 + 检测 | ~25 |
| `AiPanel.tsx` | provider 传参 + 下拉 + 隐藏搜索 | ~25 |
| `AiPanel.css` | 下拉样式 | ~10 |
| `en.ts` `zh.ts` | +1 key | ~2 |
| `aiClient.test.ts` | OpenAI SSE 测试 | ~50 |
| **总计** | | **~230** |
