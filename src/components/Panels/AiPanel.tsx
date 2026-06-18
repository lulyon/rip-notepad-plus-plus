import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js/lib/core";
// Tree-shaken language registrations (only ~20 langs, ~30KB gzipped)
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";
import shell from "highlight.js/lib/languages/shell";
import java from "highlight.js/lib/languages/java";
import go from "highlight.js/lib/languages/go";
import cpp from "highlight.js/lib/languages/cpp";
import ruby from "highlight.js/lib/languages/ruby";
import php from "highlight.js/lib/languages/php";
import swift from "highlight.js/lib/languages/swift";
import kotlin from "highlight.js/lib/languages/kotlin";
import { useAiStore } from "../../stores/aiStore";
import type { Conversation } from "../../stores/aiStore";
import { useEditorStore } from "../../stores/editorStore";
import { streamChat } from "../../lib/aiClient";
import type { StreamCallbacks, SearchResult, ApiProvider } from "../../lib/aiClient";
import "./AiPanel.css";

// ── highlight.js language registration ──
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("rs", rust);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);
hljs.registerLanguage("shell", shell);
hljs.registerLanguage("java", java);
hljs.registerLanguage("go", go);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("c++", cpp);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("rb", ruby);
hljs.registerLanguage("php", php);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("kt", kotlin);

// ── Markdown renderer (created once, reused) ──
const md: MarkdownIt = new MarkdownIt({
  html: false,       // Security: strip raw HTML
  linkify: true,     // Auto-link URLs
  breaks: true,      // \n → <br>
  typographer: false, // Keep it simple for code-heavy output
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch { /* fall through to escaped */ }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

/** Render markdown to HTML. Safe — HTML is escaped by markdown-it by default. */
function renderMarkdown(content: string): string {
  if (!content) return "";
  return md.render(content);
}

// ── Helpers ──

/** Strip XML tool_call blocks that DeepSeek occasionally leaks into text responses. */
function sanitizeText(text: string): string {
  return text
    .replace(/<invoke[\s\S]*?<\/invoke>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Sub-components ──

function ThinkingBlock({ text, defaultOpen }: { text: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div className="ai-thinking">
      <div className="ai-thinking-toggle" onClick={() => setOpen(!open)}>
        {open ? "▾" : "▸"} Thinking {text.length > 0 ? `(${text.length} chars)` : ""}
      </div>
      {open && <div className="ai-thinking-content">{text}</div>}
    </div>
  );
}

function SearchBlock({ query, results }: { query: string; results: { url: string; title: string }[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  if (!query && results.length === 0) return null;
  return (
    <div className="ai-search-block">
      <div className="ai-search-toggle" onClick={() => setOpen(!open)}>
        {open ? "▾" : "▸"} 🔍{" "}
        {query
          ? t("ai.searchedN", { query, count: results.length })
          : t("ai.searchedN", { query: "", count: results.length })}
      </div>
      {open && results.length > 0 && (
        <div className="ai-search-results">
          {results.map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ai-search-result-item"
              title={r.url}
            >
              {r.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

const QUICK_ACTIONS = [
  { key: "explain", keyLabel: "ai.quickExplain", prompt: "Explain the following code in detail:\n\n" },
  { key: "refactor", keyLabel: "ai.quickRefactor", prompt: "Refactor the following code to improve readability and performance:\n\n" },
  { key: "test", keyLabel: "ai.quickTest", prompt: "Generate unit tests for the following code:\n\n" },
  { key: "fix", keyLabel: "ai.quickFix", prompt: "Find and fix bugs in the following code:\n\n" },
];

// ── AiTabPane (single conversation tab) ──

interface TabPaneProps {
  conv: Conversation;
  visible: boolean;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  enableWebSearch: boolean;
  provider: ApiProvider;
}

function AiTabPane({ conv, visible, apiBaseUrl, apiKey, model, enableWebSearch, provider }: TabPaneProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showConfig, setShowConfig] = useState(!apiKey);
  // Track in-progress search for streaming UI
  const [currentSearchQuery, setCurrentSearchQuery] = useState("");
  // Ref to the streaming message content span for direct DOM updates
  const streamingContentRef = useRef<HTMLSpanElement>(null);

  const {
    addMessage,
    updateLastMessageMeta,
    setStreaming,
    setStreamThinking,
    setConvError,
  } = useAiStore();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (visible) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv.messages, visible]);

  const send = async () => {
    const text = input.trim();
    if (!text || conv.streaming) return;
    if (!apiKey) { setShowConfig(true); return; }

    setInput("");
    setConvError(conv.id, null);

    addMessage(conv.id, { role: "user", content: text, timestamp: Date.now() });
    addMessage(conv.id, { role: "assistant", content: "", timestamp: Date.now() });
    setStreaming(conv.id, true);

    // Use getConversation() to get latest state after addMessage
    const latest = useAiStore.getState().getConversation(conv.id);
    if (!latest) return;

    setStreamThinking(conv.id, "");
    setCurrentSearchQuery("");

    let full = "";
    let thinkingFull = "";
    let searchQuery = "";
    const searchResults: SearchResult[] = [];
    let lastRenderTime = 0;
    const THROTTLE_MS = 50;

    const updateStreamingDom = (html: string) => {
      if (streamingContentRef.current) {
        streamingContentRef.current.innerHTML = html;
      }
    };

    const callbacks: StreamCallbacks = {
      onToken: (token) => {
        full += token;
        // Always persist to store (batched by Zustand)
        useAiStore.getState().updateLastMessage(conv.id, full);
        // Throttle DOM render — markdown-it.parse is ~1-2ms, fine at 20fps
        const now = Date.now();
        if (now - lastRenderTime > THROTTLE_MS) {
          updateStreamingDom(renderMarkdown(full));
          lastRenderTime = now;
        }
      },
      onThinking: (thinking) => {
        thinkingFull += thinking;
        setStreamThinking(conv.id, thinkingFull);
      },
      onSearchStart: (query, _toolUseId) => {
        searchQuery = query;
        setCurrentSearchQuery(query);
      },
      onSearchResult: (results, _toolUseId) => {
        for (const r of results) {
          searchResults.push(r);
        }
      },
      onDone: () => {
        // Post-process: strip XML tool_call tags leaked by DeepSeek
        full = sanitizeText(full);
        // Final render (no throttle)
        updateStreamingDom(renderMarkdown(full));
        useAiStore.getState().updateLastMessage(conv.id, full);
        // Attach search metadata to the last assistant message
        if (searchQuery || searchResults.length > 0) {
          updateLastMessageMeta(conv.id, {
            searchQuery,
            searchResults: [...searchResults],
          });
        }
        setCurrentSearchQuery("");
        setStreaming(conv.id, false);
      },
      onError: (err) => {
        setCurrentSearchQuery("");
        setConvError(conv.id, err);
      },
    };

    // Resolve user timezone for search localization (e.g. weather, local news)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    await streamChat(
      apiBaseUrl, apiKey, model, latest.messages,
      `You are a helpful coding assistant. Today is ${new Date().toISOString().split("T")[0]}. Respond in Markdown. Keep answers concise.`,
      enableWebSearch,  // streamChat dispatcher handles endpoint routing
      tz,
      provider,
      callbacks,
    );
  };

  const doQuickAction = (prompt: string) => {
    const editorStore = useEditorStore.getState();
    const activeEditor = editorStore.tabs.find((tt) => tt.id === editorStore.activeTabId);
    if (activeEditor) {
      const code = activeEditor.content.slice(0, 8000);
      setInput(prompt + "```" + activeEditor.language + "\n" + code + "\n```");
    } else {
      setInput(prompt);
    }
    inputRef.current?.focus();
  };

  // Config screen (shared config)
  if (showConfig) {
    return (
      <div className="ai-tab-pane" style={{ display: visible ? "flex" : "none" }}>
        <AiConfigScreen onSaved={() => setShowConfig(false)} />
      </div>
    );
  }

  // Are we currently searching? (thinking but no specific query decoded yet)
  const isSearching = conv.streaming && !currentSearchQuery && conv.streamThinking.length > 0;

  // Chat UI
  return (
    <div className="ai-tab-pane" style={{ display: visible ? "flex" : "none" }}>
      <div className="ai-messages">
        {conv.messages.length === 0 && (
          <div className="ai-empty">
            <p>{t("ai.emptyHint")}</p>
            <div className="ai-quick-actions">
              {QUICK_ACTIONS.map((qa) => (
                <button key={qa.key} className="ai-quick-btn" onClick={() => doQuickAction(qa.prompt)}>
                  {t(qa.keyLabel)}
                </button>
              ))}
            </div>
          </div>
        )}
        {conv.messages.map((msg, i) => {
          const isLast = i === conv.messages.length - 1;
          const hasSearch = !!(msg.searchQuery || (msg.searchResults && msg.searchResults.length > 0));
          const showSearching = isLast && conv.streaming && !!currentSearchQuery && !msg.searchQuery;
          const isStreamingMessage = isLast && msg.role === "assistant" && conv.streaming;

          return (
            <React.Fragment key={i}>
              <div className={`ai-msg ${msg.role}`}>
                <div className="ai-msg-role">{msg.role === "user" ? "👤" : "🤖"}</div>
                <div className="ai-msg-content">
                  {/* Show thinking for non-streaming messages that have it */}
                  {(msg as any).thinking && !conv.streaming && (
                    <ThinkingBlock text={(msg as any).thinking} />
                  )}
                  {/* Show search block for messages with search metadata */}
                  {hasSearch && (
                    <SearchBlock
                      query={msg.searchQuery || ""}
                      results={msg.searchResults || []}
                    />
                  )}
                  {/* Show searching indicator during streaming */}
                  {showSearching && (
                    <div className="ai-searching">🔍 {t("ai.searching")} "{currentSearchQuery}"</div>
                  )}
                  {/* Show searching when we're in thinking phase (model is deciding) */}
                  {isSearching && (
                    <div className="ai-searching">🔍 {t("ai.searching")}</div>
                  )}
                  {/* Streaming message: use ref for direct DOM update; historical: render once */}
                  {isStreamingMessage ? (
                    <span
                      ref={streamingContentRef}
                      className="ai-markdown-content"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) || "▊" }}
                    />
                  ) : (
                    <span
                      className="ai-markdown-content"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  )}
                </div>
              </div>
              {/* Streaming thinking block (shown during streaming before the assistant message) */}
              {conv.streamThinking && msg.role === "user" && i === conv.messages.length - 2 && (
                <div className="ai-msg assistant">
                  <div className="ai-msg-role">🤖</div>
                  <div className="ai-msg-content">
                    <ThinkingBlock text={conv.streamThinking} defaultOpen />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
        {conv.error && <div className="ai-error">{conv.error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-input-area">
        <textarea
          ref={inputRef}
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder={t("ai.placeholder")}
          rows={2}
          disabled={conv.streaming}
        />
        <button className="ai-btn ai-btn-primary" onClick={send} disabled={conv.streaming || !input.trim()}>
          {conv.streaming ? "..." : t("ai.send")}
        </button>
      </div>
    </div>
  );
}

// ── Config screen (shared, shown when API key not set) ──

function AiConfigScreen({ onSaved }: { onSaved?: () => void }) {
  const { t } = useTranslation();
  const { apiBaseUrl, apiKey, model, provider, setConfig, loadFromClaudeConfig } = useAiStore();
  const [cfgUrl, setCfgUrl] = useState(apiBaseUrl);
  const [cfgKey, setCfgKey] = useState(apiKey);
  const [cfgModel, setCfgModel] = useState(model);
  const [cfgProvider, setCfgProvider] = useState<ApiProvider>(provider);

  const handleSave = () => {
    setConfig(cfgUrl, cfgKey, cfgModel, cfgProvider);
    onSaved?.();
  };

  return (
    <div className="ai-config">
      <h3>{t("ai.configTitle")}</h3>
      <p className="ai-config-desc">{t("ai.configDesc")}</p>
      <label>{t("ai.configApiUrl")}</label>
      <input className="ai-input" value={cfgUrl} onChange={(e) => setCfgUrl(e.target.value)}
        placeholder="https://api.deepseek.com/anthropic" />
      <label>{t("ai.configApiKey")}</label>
      <input className="ai-input" type="password" value={cfgKey} onChange={(e) => setCfgKey(e.target.value)}
        placeholder="sk-..." />
      <label>{t("ai.configModel")}</label>
      <input className="ai-input" value={cfgModel} onChange={(e) => setCfgModel(e.target.value)}
        placeholder="deepseek-v4-pro[1m]" />
      <label>{t("ai.configProvider")}</label>
      <select className="ai-select" value={cfgProvider} onChange={(e) => setCfgProvider(e.target.value as ApiProvider)}>
        <option value="anthropic">Anthropic Compatible</option>
        <option value="openai">OpenAI Compatible</option>
      </select>
      <div className="ai-config-actions">
        <button className="ai-btn ai-btn-primary" onClick={handleSave}>{t("ai.save")}</button>
        <button className="ai-btn" onClick={async () => {
          const found = await loadFromClaudeConfig();
          if (found) {
            const s = useAiStore.getState();
            setCfgUrl(s.apiBaseUrl); setCfgKey(s.apiKey); setCfgModel(s.model);
          }
        }}>{t("ai.autoDetect")}</button>
      </div>
    </div>
  );
}

// ── AiPanel (tab manager) ──

export function AiPanel() {
  const { t } = useTranslation();
  const {
    apiBaseUrl, apiKey, model, enableWebSearch, provider,
    conversations, activeId,
    newConversation, closeConversation, setActive, clearMessages,
    loadFromClaudeConfig, toggleWebSearch,
  } = useAiStore();

  const [showConfig, setShowConfig] = useState(!apiKey);

  // Auto-detect Claude config on first load
  useEffect(() => {
    if (!apiKey) {
      loadFromClaudeConfig().then((found) => {
        if (found) setShowConfig(false);
      });
    }
  }, []);

  // Ensure at least one conversation exists
  useEffect(() => {
    if (conversations.length === 0) {
      newConversation();
    }
  }, [conversations.length]);

  // ── Tab actions ──

  const handleAddTab = () => {
    newConversation();
  };

  const handleCloseTab = (id: string) => {
    closeConversation(id);
  };

  // ── Render ──

  return (
    <div className="ai-panel">
      {/* Tab bar */}
      <div className="ai-tab-bar">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            className={`ai-tab ${conv.id === activeId ? "active" : ""}`}
            onClick={() => setActive(conv.id)}
            title={conv.title}
          >
            <span className="ai-tab-status">
              {conv.streaming ? "⏳" : conv.messages.length > 0 ? "🟢" : "⚪"}
            </span>
            <span className="ai-tab-title">{conv.title}</span>
            {conversations.length > 1 && (
              <span
                className="ai-tab-close"
                onClick={(e) => { e.stopPropagation(); handleCloseTab(conv.id); }}
                title={t("tab.close")}
              >×</span>
            )}
          </button>
        ))}
        <button className="ai-tab ai-tab-plus" onClick={handleAddTab} title={t("ai.newChat")}>
          +
        </button>
        <div className="ai-header-actions">
          {/* Web search toggle */}
          <button
            className={`ai-btn-sm ai-web-search-toggle ${enableWebSearch ? "active" : ""}`}
            onClick={toggleWebSearch}
            title={enableWebSearch ? t("ai.webSearchOn") : t("ai.webSearchOff")}
          >
            🌐
          </button>
          <button className="ai-btn-sm" onClick={() => setShowConfig(!showConfig)} title={t("ai.settings")}>⚙</button>
          {activeId && (
            <button className="ai-btn-sm" onClick={() => clearMessages(activeId)} title={t("ai.clearChat")}>🗑</button>
          )}
        </div>
      </div>

      {/* Tab panes */}
      {conversations.map((conv) => (
        <AiTabPane
          key={conv.id}
          conv={conv}
          visible={conv.id === activeId && !showConfig}
          apiBaseUrl={apiBaseUrl}
          apiKey={apiKey}
          model={model}
          enableWebSearch={enableWebSearch}
          provider={provider}
        />
      ))}

      {/* Shared config screen (overlays all tabs) */}
      {showConfig && (
        <div className="ai-tab-pane" style={{ display: "flex" }}>
          <AiConfigScreen onSaved={() => setShowConfig(false)} />
        </div>
      )}
    </div>
  );
}
