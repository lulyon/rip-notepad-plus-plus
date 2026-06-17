# AI Tab Markdown 实时渲染方案

## 现状

`AiPanel.tsx` 的 `formatContent()` 用 4 行正则做简陋转换：

```typescript
const formatContent = (content: string) => content
  .replace(/```(\w+)?\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/\*([^*]+)\*/g, "<em>$1</em>")
  .replace(/\n/g, "<br>");
```

不支持表格、列表、标题、引用、链接、分割线，代码块无语法高亮，正则易错（嵌套 `\*\*` 匹配错误）。

## 方案选择

### 最终选择：`markdown-it` + `highlight.js`

**不需要 DOMPurify**。markdown-it 默认 `html: false`，所有 HTML 标签被转义，XSS 天然安全。实测验证：

| 输入 | markdown-it 输出 |
|------|-----------------|
| `<script>alert(1)</script>` | `&lt;script&gt;...`（文本） |
| `[click](javascript:alert(1))` | 不生成链接，保留原始文本 |
| `<img src=x onerror=...>` | `&lt;img...`（文本） |
| `<https://example.com>` | 正确渲染为安全链接 |

### 为什么不用 DOMPurify

- markdown-it 默认不输出 raw HTML，攻击面为零
- DOMPurify 增加 ~10KB gzipped + `JSDOM` 依赖
- 仅当配置 `html: true` 时才需要，AI chat 场景不应开启

### 为什么不用 marked

- `markdown-it` 已是项目依赖（`previewEngine.ts` 使用），零新增依赖
- 两者流式容错能力相当（不完整语法均能尽力渲染）
- `markdown-it` 插件生态更丰富，未来可扩展 Katex 数学公式

## 依赖

| 包 | 版本 | 新增? | 作用 |
|---|------|------|------|
| `markdown-it` | ^14.2.0 | ❌ 已在 | Markdown → HTML |
| `highlight.js` | ^11.11 | ✅ 新增 | 代码块语法高亮 |
| `@types/markdown-it` | ^14.1 | ❌ 已在 | TypeScript 类型 |

## 实现细节

### 1. `AiPanel.tsx` — 渲染引擎替换

**新增 `md` 实例**（组件外定义，避免每次渲染重建）：

```typescript
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

// highlight.js 按需注册常用语言（tree-shake 友好）
const HLJS_LANGS = [
  "javascript", "typescript", "python", "rust", "bash", "json",
  "css", "html", "xml", "sql", "yaml", "shell", "java", "go",
  "c", "cpp", "ruby", "php", "swift", "kotlin", "markdown",
];
// 注册核心包 + 语言
hljs.registerLanguage("javascript", require("highlight.js/lib/languages/javascript"));
// ... (or use lowlight / createLowlight for tree-shaking)

const md = new MarkdownIt({
  html: false,       // 🔒 安全：禁用 raw HTML
  linkify: true,     // 自动识别 URL 转为链接
  breaks: true,      // \n → <br>
  typographer: false,// 关闭自动排版（避免干扰代码块）
  highlight(str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});
```

**为什么 `highlight.js` 而不是轻量方案：**
- AI 回复中代码块占比高（50%+），无高亮体验差
- 核心 + 常用语言 ~30KB gzipped，可接受
- 已有 `.hljs` CSS class（`previewEngine.ts` 也使用），样式复用

**替代轻量方案（如果体积敏感）：**
- 不引入 highlight.js，使用纯 `<pre><code>` + `md.utils.escapeHtml()`
- 代码块无语法着色，但有等宽字体 + 背景色，体验仍比现在好得多

### 2. 流式渲染策略

```
onToken 触发
  → full += token (纯字符串拼接，< 0.01ms)
  → lastRender = Date.now()
  → 如果距上次渲染 < 50ms: 跳过
  → 否则: md.render(full) → innerHTML

onDone 触发
  → md.render(full) → innerHTML（强制最后一次渲染）
```

**节流原因：** 快速 token 流（每 5-20ms 一个）时，逐 token 调用 `md.render()` 浪费 CPU。50ms 节流 => 每秒最多 20 次 re-render，用户感知流畅。

**节流实现：**

```typescript
// send() 函数内
let lastRenderTime = 0;

const renderMarkdown = (text: string) => {
  const html = md.render(text);
  // 通过 DOM ref 直接更新，避免 React re-render
  if (contentRef.current) {
    contentRef.current.innerHTML = html;
  }
};

const onToken = (token: string) => {
  full += token;
  const now = Date.now();
  if (now - lastRenderTime > 50) {
    renderMarkdown(full);
    lastRenderTime = now;
  }
  // Still update store for persistence
  useAiStore.getState().updateLastMessage(conv.id, full);
};

const onDone = () => {
  renderMarkdown(full);  // final render, no throttle
  useAiStore.getState().updateLastMessage(conv.id, full);
  // ...rest
};
```

**为什么不直接 replace `formatContent`：** 现有实现通过 React re-render（`updateLastMessage` → state change → component re-render）。加节流后，50ms 内仅更新 store（持久化），不触发 re-render；只有实际渲染时才更新 DOM。DOM 直接操作比 React reconciliation 更快。

### 3. 消息渲染结构调整

**现有结构：**
```tsx
<span dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
```

**新结构：**
```tsx
<span
  ref={isLast && conv.streaming ? contentRef : undefined}
  className="ai-markdown-content"
  dangerouslySetInnerHTML={
    isLast && conv.streaming
      ? undefined  // streaming: use direct DOM update via ref
      : { __html: md.render(msg.content) }  // historical: render once
  }
/>
```

- 历史消息（非 streaming）：直接用 `md.render()` + `dangerouslySetInnerHTML`
- 当前 streaming 消息：通过 `ref` 直接操作 DOM，避免 React reconciliation
- 切换 conversation 时，历史消息已存储完整 content，渲染成本 O(1)

### 4. highlight.js 加载优化

**方案 A：静态 import（简单）**
```typescript
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
// ... register all needed langs
```
✅ 简单直接，~30KB gzipped，Vite tree-shake 友好

**方案 B：动态 import（按需）**
```typescript
let hljs: typeof import("highlight.js") | null = null;
async function ensureHljs() {
  if (!hljs) hljs = await import("highlight.js");
  return hljs;
}
```
✅ 首次使用才加载，不影响初始 bundle

**选择方案 A**。AI tab 在侧边栏，首次点击 AI tab 时整个组件才渲染（React lazy），highlighter 只在此时加载。不需要动态 import 的额外复杂度。

### 5. CSS 调整

现有 `.ai-msg-content pre/code` 样式已覆盖代码块基础样式。新增：

```css
/* highlight.js 主题覆写（暗色主题） */
.ai-markdown-content .hljs {
  background: var(--bg-primary, #1e1e1e);
  border-radius: 4px;
  padding: 10px;
  font-size: 12px;
  line-height: 1.5;
}

/* 表格样式 */
.ai-markdown-content table {
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 12px;
}
.ai-markdown-content th,
.ai-markdown-content td {
  border: 1px solid var(--border-color, #444);
  padding: 4px 8px;
  text-align: left;
}
.ai-markdown-content th {
  background: var(--bg-secondary, #2a2a2a);
  font-weight: 600;
}

/* 引用块 */
.ai-markdown-content blockquote {
  border-left: 3px solid var(--accent-color, #4a9eff);
  margin: 8px 0;
  padding: 4px 12px;
  color: var(--text-secondary, #999);
}

/* 列表缩进 */
.ai-markdown-content ul, .ai-markdown-content ol {
  padding-left: 20px;
  margin: 4px 0;
}

/* 链接颜色 */
.ai-markdown-content a {
  color: var(--accent-color, #4a9eff);
}
```

highlight.js 主题可以直接复用 VS Code Dark 风格对应的 `atom-one-dark` 或自定义一套 CSS 变量取色的主题。最简单方案：从 `highlight.js/styles/atom-one-dark.css` 导入（~2KB），颜色与当前暗色主题一致。

### 6. 清除 `formatContent`

`formatContent()` 函数完全删除，替换为 `md.render()`。

### 7. sanitizeText 保留

`sanitizeText()`（XML tool_call 清理）在 `onDone` 中仍在 `md.render()` 之前调用。两者互不干扰——先清理纯文本，再做 Markdown 渲染。

## 改动汇总

| 文件 | 改动 | 行数 |
|------|------|------|
| `AiPanel.tsx` | 新增 md 实例 + ref 直接操作 DOM + 节流逻辑；删除 formatContent | ~60 |
| `AiPanel.css` | 新增 table/th/td/blockquote/ul/ol/a/hljs 样式 | ~50 |
| `package.json` | 新增 `highlight.js` 依赖 | +1 行 |
| **总计** | | **~110 行** |

## 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| `md.render()` 性能 | 长文档（>5000 tokens）渲染 > 5ms | 50ms 节流保证不卡 UI；最终渲染一次性 |
| 流式内容闪烁 | 不完整 Markdown 语法临时显示为文本 | markdown-it 容错好，已测试 6 类场景均无破坏性渲染 |
| highlight.js 体积 | 增加 bundle | 仅注册 AI 回复常见语言（~15 种），~30KB gzipped |
| DOM ref 与 React 状态不一致 | streaming 时 DOM 更新但 store content 未同步 | `updateLastMessage` 仍每 token 调一次，store 始终最新 |

## 不做的

- ❌ 不实现数学公式（Katex/KaTeX）— v1 范围外
- ❌ 不支持 Mermaid 图表渲染 — 预览引擎已有，AI tab 先不加
- ❌ 不实现流式 level-1 sanitize（XML tag 仍在 onDone 处理）

## 验证要点

| 场景 | 预期 |
|------|------|
| AI 输出表格 | 正确渲染 `<table>`，半成品暂不显示 |
| AI 输出代码块 | 语法高亮 + 等宽字体 + 暗色背景 |
| AI 输出列表 | `<ul>/<ol>` + 缩进 |
| AI 输出链接 | 自动识别 URL，可点击 |
| 流式输出到一半 | markdown-it 尽力渲染已到达的内容 |
| XSS 注入尝试 | 所有 HTML 被转义显示为文本 |
| DeepSeek XML tool_call | sanitizeText 先清理，md 再渲染 |
