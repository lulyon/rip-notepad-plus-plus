import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAiStore } from "../../stores/aiStore";
import { useEditorStore } from "../../stores/editorStore";
import { streamChat } from "../../lib/aiClient";
import "./AiPanel.css";

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

const QUICK_ACTIONS = [
  { key: "explain", keyLabel: "ai.quickExplain", prompt: "Explain the following code in detail:\n\n" },
  { key: "refactor", keyLabel: "ai.quickRefactor", prompt: "Refactor the following code to improve readability and performance:\n\n" },
  { key: "test", keyLabel: "ai.quickTest", prompt: "Generate unit tests for the following code:\n\n" },
  { key: "fix", keyLabel: "ai.quickFix", prompt: "Find and fix bugs in the following code:\n\n" },
];

export function AiPanel() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    apiBaseUrl, apiKey, model, messages, streaming,
    clearMessages, loadFromClaudeConfig, setConfig,
  } = useAiStore();

  const [showConfig, setShowConfig] = useState(!apiKey);
  const [cfgUrl, setCfgUrl] = useState(apiBaseUrl);
  const [cfgKey, setCfgKey] = useState(apiKey);
  const [cfgModel, setCfgModel] = useState(model);
  const [error, setError] = useState("");
  const [streamThinking, setStreamThinking] = useState("");

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Auto-detect from Claude Code config on first load
  useEffect(() => {
    if (!apiKey) loadFromClaudeConfig().then((found) => {
      if (found) {
        const s = useAiStore.getState();
        setCfgUrl(s.apiBaseUrl); setCfgKey(s.apiKey); setCfgModel(s.model);
        setShowConfig(false);
      }
    });
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    if (!apiKey) { setShowConfig(true); return; }

    const store = useAiStore.getState();

    // Build context from active editor
    const editorStore = useEditorStore.getState();
    const activeTab = editorStore.tabs.find((tt) => tt.id === editorStore.activeTabId);
    let contextPrompt = "";
    if (activeTab) {
      const selection = window.getSelection?.()?.toString() || "";
      const code = selection || activeTab.content.slice(0, 8000);
      contextPrompt = `File: ${activeTab.path || activeTab.name}\n\`\`\`${activeTab.language}\n${code}\n\`\`\`\n\n`;
    }

    setInput("");
    setError("");
    store.addMessage({ role: "user", content: contextPrompt + text, timestamp: Date.now() });
    store.addMessage({ role: "assistant", content: "", timestamp: Date.now() });
    store.setStreaming(true);

    // Re-read state — addMessage replaces the messages array
    const latest = useAiStore.getState();

    setStreamThinking("");
    let full = "";
    let thinkingFull = "";
    await streamChat(
      latest.apiBaseUrl, latest.apiKey, latest.model, latest.messages,
      "You are a helpful coding assistant. Respond in Markdown. Keep answers concise.",
      (token) => { full += token; useAiStore.getState().updateLastMessage(full); },
      (thinking) => {
        thinkingFull += thinking;
        setStreamThinking(thinkingFull);
      },
      () => {
        // Store thinking
        if (thinkingFull) {
          const s = useAiStore.getState();
          const msgs = [...s.messages];
          if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
            (msgs[msgs.length - 1] as any).thinking = thinkingFull;
          }
        }
        useAiStore.getState().setStreaming(false);
      },
      (err) => { setError(err); setStreamThinking(""); useAiStore.getState().setStreaming(false); },
    );
  };

  const doQuickAction = (prompt: string) => {
    const editorStore = useEditorStore.getState();
    const activeTab = editorStore.tabs.find((tt) => tt.id === editorStore.activeTabId);
    if (activeTab) {
      const code = activeTab.content.slice(0, 8000);
      setInput(prompt + "```" + activeTab.language + "\n" + code + "\n```");
    } else {
      setInput(prompt);
    }
    inputRef.current?.focus();
  };

  const handleSaveConfig = () => {
    setConfig(cfgUrl, cfgKey, cfgModel);
    setShowConfig(false);
  };

  const formatContent = (content: string) => {
    // Basic markdown → HTML (code blocks, bold, italic, inline code)
    return content
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  };

  // Config screen
  if (showConfig) {
    return (
      <div className="ai-panel">
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
          <div className="ai-config-actions">
            <button className="ai-btn ai-btn-primary" onClick={handleSaveConfig}>{t("ai.save")}</button>
            <button className="ai-btn" onClick={async () => {
              const found = await loadFromClaudeConfig();
              if (found) { const s = useAiStore.getState(); setCfgUrl(s.apiBaseUrl); setCfgKey(s.apiKey); setCfgModel(s.model); setShowConfig(false); }
            }}>{t("ai.autoDetect")}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <span>🤖 {t("ai.title")}</span>
        <div className="ai-header-actions">
          <button className="ai-btn-sm" onClick={() => setShowConfig(true)} title={t("ai.settings")}>⚙</button>
          <button className="ai-btn-sm" onClick={clearMessages} title={t("ai.clearChat")}>🗑</button>
        </div>
      </div>

      <div className="ai-messages">
        {messages.length === 0 && (
          <div className="ai-empty">
            <p>{t("ai.emptyHint")}</p>
            <div className="ai-quick-actions">
              {QUICK_ACTIONS.map((qa) => (
                <button key={qa.key} className="ai-quick-btn" onClick={() => doQuickAction(qa.prompt)}>{t(qa.keyLabel)}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <React.Fragment key={i}>
            <div className={`ai-msg ${msg.role}`}>
              <div className="ai-msg-role">{msg.role === "user" ? "👤" : "🤖"}</div>
              <div className="ai-msg-content">
                {(msg as any).thinking && messages[messages.length - 1] !== msg && <ThinkingBlock text={(msg as any).thinking} />}
                <span dangerouslySetInnerHTML={{ __html: formatContent(msg.content) || (msg.role === "assistant" && streaming && i === messages.length - 1 ? "▊" : "") }} />
              </div>
            </div>
            {/* Stream thinking right after user message, before assistant response */}
            {streamThinking && msg.role === "user" && i === messages.length - 2 && (
              <div className="ai-msg assistant">
                <div className="ai-msg-role">🤖</div>
                <div className="ai-msg-content">
                  <ThinkingBlock text={streamThinking} defaultOpen />
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
        {error && <div className="ai-error">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-input-area">
        <textarea ref={inputRef} className="ai-input" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={t("ai.placeholder")}
          rows={2} disabled={streaming} />
        <button className="ai-btn ai-btn-primary" onClick={send} disabled={streaming || !input.trim()}>
          {streaming ? "..." : t("ai.send")}
        </button>
      </div>
    </div>
  );
}
