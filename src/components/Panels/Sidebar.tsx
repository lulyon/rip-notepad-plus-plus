import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { useEditorRefStore } from "../../stores/editorRefStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { ipc } from "../../lib/ipc";
import { detectLanguage } from "../../lib/constants";
import type { DirEntry } from "../../types/ipc";
import { GitPanel } from "./GitPanel";
import "./Sidebar.css";

export function Sidebar() {
  const { t } = useTranslation();
  const showSidebar = useSettingsStore((s) => s.showSidebar);
  const [activeTab, setActiveTab] = useState<"files" | "git" | "symbols">("files");

  if (!showSidebar) return null;

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === "files" ? "active" : ""}`}
          onClick={() => setActiveTab("files")}
        >
          📁 {t("sidebar.files")}
        </button>
        <button
          className={`sidebar-tab ${activeTab === "git" ? "active" : ""}`}
          onClick={() => setActiveTab("git")}
        >
          ⎇ {t("sidebar.git")}
        </button>
        <button
          className={`sidebar-tab ${activeTab === "symbols" ? "active" : ""}`}
          onClick={() => setActiveTab("symbols")}
        >
          🔣 {t("sidebar.symbols")}
        </button>
      </div>
      <div className="sidebar-content">
        {activeTab === "files" && <ProjectPanel />}
        {activeTab === "git" && <GitPanel />}
        {activeTab === "symbols" && <FunctionList />}
      </div>
    </div>
  );
}

// ── ProjectPanel (File Tree) ──

function ProjectPanel() {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const projectRoot = useSettingsStore((s) => s.projectRoot);
  const [root, setRoot] = useState<string>(".");
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Determine root: fixed project root > active tab parent > cwd
  useEffect(() => {
    const dir = projectRoot
      || (activeTab?.path
        ? activeTab.path.split(/[/\\]/).slice(0, -1).join("/") || "."
        : ".");
    if (dir !== root) {
      setRoot(dir);
      loadDir(dir);
    }
  }, [projectRoot, activeTab?.path]);

  const loadDir = useCallback(async (dir: string) => {
    setLoading(true);
    try {
      const items = await ipc.listDirectory(dir);
      setEntries(items);
    } catch (err) {
      console.error("Failed to list directory:", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleExpand = useCallback(async (entry: DirEntry) => {
    if (!entry.is_dir) return;
    const key = entry.path;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleOpenFile = useCallback(
    async (entry: DirEntry) => {
      if (entry.is_dir) {
        toggleExpand(entry);
        return;
      }
      const existingTab = tabs.find((t) => t.path === entry.path);
      if (existingTab) {
        useEditorStore.getState().setActiveTab(existingTab.id);
        return;
      }
      try {
        const data = await ipc.readFile(entry.path);
        useEditorStore.getState().openTab({
          path: entry.path,
          name: entry.name,
          content: data.content,
          encoding: data.encoding,
          language: detectLanguage(entry.extension || ""),
        });
      } catch (err) {
        console.error("Failed to open file:", err);
      }
    },
    [tabs, toggleExpand],
  );

  return (
    <div className="project-panel">
      <div className="project-root">{root}</div>
      {loading ? (
        <div className="project-loading">...</div>
      ) : (
        <div className="project-tree">
          {entries.map((entry) => (
            <div key={entry.path} className="tree-item">
              <FileTreeNode
                entry={entry}
                depth={0}
                expanded={expanded}
                onToggle={toggleExpand}
                onOpen={handleOpenFile}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FileTreeNode({
  entry,
  depth,
  expanded,
  onToggle,
  onOpen,
}: {
  entry: DirEntry;
  depth: number;
  expanded: Set<string>;
  onToggle: (e: DirEntry) => void;
  onOpen: (e: DirEntry) => void;
}) {
  const [children, setChildren] = useState<DirEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const isExpanded = expanded.has(entry.path);

  const handleToggle = useCallback(async () => {
    if (!entry.is_dir) {
      onOpen(entry);
      return;
    }
    if (!loaded) {
      try {
        const items = await ipc.listDirectory(entry.path);
        setChildren(items);
        setLoaded(true);
      } catch {
        setChildren([]);
      }
    }
    onToggle(entry);
  }, [entry, loaded, onToggle, onOpen]);

  const icon = entry.is_dir ? (isExpanded ? "📂" : "📁") : "📄";
  const sizeStr = entry.size > 1024 * 1024
    ? `${(entry.size / (1024 * 1024)).toFixed(1)}MB`
    : entry.size > 1024
      ? `${(entry.size / 1024).toFixed(0)}KB`
      : `${entry.size}B`;

  return (
    <>
      <div
        className="tree-node"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={handleToggle}
      >
        <span className="tree-icon">{icon}</span>
        <span className="tree-name">{entry.name}</span>
        {!entry.is_dir && <span className="tree-size">{sizeStr}</span>}
      </div>
      {isExpanded && entry.is_dir && loaded && children.map((child) => (
        <FileTreeNode
          key={child.path}
          entry={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      ))}
    </>
  );
}

// ── FunctionList (Document Symbols) ──

function FunctionList() {
  const { t } = useTranslation();
  const editorRef = useEditorRefStore((s) => s.editorRef);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const activeTab = useEditorStore((s) =>
    s.tabs.find((tab) => tab.id === activeTabId),
  );
  const [symbols, setSymbols] = useState<{ name: string; kind: string; line: number }[]>([]);

  // Fetch symbols when active tab changes
  useEffect(() => {
    if (!editorRef) {
      setSymbols([]);
      return;
    }
    const model = editorRef.getModel();
    if (!model) {
      setSymbols([]);
      return;
    }

    const fetchSymbols = () => {
      try {
        const lines = model.getLinesContent();
        const found: { name: string; kind: string; line: number }[] = [];
        lines.forEach((line, i) => {
          const trimmed = line.trim();
          // Match common symbol patterns: functions, classes, methods, fields
          const symbolMatch = trimmed.match(
            /^(?:export\s+|public\s+|private\s+|protected\s+|static\s+|async\s+)*(?:function|class|def|fn\s+|func\s+|void\s+|int\s+|const\s+|let\s+|var\s+)\s*(\w+)/,
          );
          if (symbolMatch) {
            const name = symbolMatch[1];
            const kind = trimmed.startsWith("class") || trimmed.includes("class ") ? "class" : "fn";
            found.push({ name, kind, line: i + 1 });
          }
        });
        setSymbols(found);
      } catch {
        setSymbols([]);
      }
    };

    fetchSymbols();
  }, [editorRef, activeTab?.content]);

  const goToLine = useCallback(
    (line: number) => {
      if (!editorRef) return;
      editorRef.revealLineInCenter(line);
      editorRef.setPosition({ lineNumber: line, column: 1 });
      editorRef.focus();
    },
    [editorRef],
  );

  if (symbols.length === 0) {
    return (
      <div className="function-list">
        <div className="function-empty">
          {activeTab ? t("panel.noSymbols") : t("panel.noFile")}
        </div>
      </div>
    );
  }

  return (
    <div className="function-list">
      {symbols.map((sym, i) => (
        <div
          key={i}
          className="function-item"
          onClick={() => goToLine(sym.line)}
        >
          <span className="function-kind">{sym.kind}</span>
          <span className="function-name">{sym.name}</span>
          <span className="function-line">:{sym.line}</span>
        </div>
      ))}
    </div>
  );
}
