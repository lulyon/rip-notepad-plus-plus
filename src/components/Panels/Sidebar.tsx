import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { useEditorRefStore } from "../../stores/editorRefStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { ipc } from "../../lib/ipc";
import { detectLanguage } from "../../lib/constants";
import type { DirEntry } from "../../types/ipc";
import { GitPanel } from "./GitPanel";
import { AiPanel } from "./AiPanel";
import { TerminalPanel } from "./Terminal";
import "./Sidebar.css";

export function Sidebar() {
  const { t } = useTranslation();
  const showSidebar = useSettingsStore((s) => s.showSidebar);
  const sidebarWidth = useSettingsStore((s) => s.sidebarWidth);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const [activeTab, setActiveTab] = useState<"files" | "ai" | "git" | "symbols" | "terminal">("files");
  const resizing = useRef(false);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    const startX = e.clientX;
    const startW = sidebarWidth;
    const maxW = Math.max(180, Math.floor(window.innerWidth / 2));
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const w = Math.max(180, Math.min(maxW, startW + ev.clientX - startX));
      updateSetting("sidebarWidth", w);
    };
    const onUp = () => { resizing.current = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  if (!showSidebar) return null;

  return (
    <div className="sidebar" style={{ width: sidebarWidth, minWidth: sidebarWidth }}>
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === "files" ? "active" : ""}`}
          onClick={() => setActiveTab("files")}
        >
          📁 {t("sidebar.files")}
        </button>
        <button
          className={`sidebar-tab ${activeTab === "terminal" ? "active" : ""}`}
          onClick={() => setActiveTab("terminal")}
        >
          💻 {t("sidebar.terminal")}
        </button>
        <button
          className={`sidebar-tab ${activeTab === "ai" ? "active" : ""}`}
          onClick={() => setActiveTab("ai")}
        >
          🤖 {t("ai.title")}
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
        {activeTab === "ai" && <AiPanel />}
        {activeTab === "git" && <GitPanel />}
        {activeTab === "symbols" && <FunctionList />}
        <TerminalPanel visible={activeTab === "terminal"} />
      </div>
      <div className="sidebar-resize-handle" onMouseDown={startResize} />
    </div>
  );
}

// ── ProjectPanel (File Tree) ──

function ProjectPanel() {
  const projectRoots = useSettingsStore((s) => s.projectRoots);
  const activeProjectRoot = useSettingsStore((s) => s.activeProjectRoot);
  const addProjectRoot = useSettingsStore((s) => s.addProjectRoot);
  const removeProjectRoot = useSettingsStore((s) => s.removeProjectRoot);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  // Use roots if available, otherwise fall back to auto-detect single root
  const roots = projectRoots.length > 0 ? projectRoots : activeTabDerivedRoots();

  function activeTabDerivedRoots(): string[] {
    const tabs1 = useEditorStore.getState().tabs;
    const activeId = useEditorStore.getState().activeTabId;
    const tab = tabs1.find((t) => t.id === activeId);
    if (!tab?.path) return [];
    const dir = tab.path.split(/[/\\]/).slice(0, -1).join("/");
    return dir ? [dir] : [];
  }

  const handleAddRoot = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const dir = await open({ title: "Add Project Folder", directory: true });
    if (dir) addProjectRoot(dir as string);
  };

  const panelRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Listen to Tauri drag-drop events, filter to this panel's area
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    const getCoords = (e: any) => {
      const pos = e.payload?.position || e.position;
      if (!pos) return null;
      return { x: pos.x || pos.Physical?.x || 0, y: pos.y || pos.Physical?.y || 0 };
    };
    import("@tauri-apps/api/webview").then(({ getCurrentWebview }) => {
      if (cancelled) return;
      const promise = getCurrentWebview().onDragDropEvent(async (e: any) => {
        const coords = getCoords(e);
        if (!coords) return;
        const rect = panelRef.current?.getBoundingClientRect();
        if (!rect) return;
        if (coords.x >= rect.left && coords.x <= rect.right && coords.y >= rect.top && coords.y <= rect.bottom) {
          if (e.payload?.type === "over") setDragOver(true);
          if (e.payload?.type === "leave") setDragOver(false);
          if (e.payload?.type === "drop") {
            setDragOver(false);
            const paths: string[] = e.payload?.paths || [];
            for (const p of paths) {
              try { await ipc.listDirectory(p); addProjectRoot(p); } catch {}
            }
          }
        }
      });
      promise.then((fn) => { if (!cancelled) unlisten = fn; });
    });
    return () => { cancelled = true; unlisten?.(); };
  }, []);

  return (
    <div className={`project-panel ${dragOver ? "drag-over" : ""}`} ref={panelRef}>
      {roots.map((root) => (
        <RootTree key={root} root={root} isActive={root === activeProjectRoot}
          onRemove={projectRoots.includes(root) ? () => removeProjectRoot(root) : undefined}
          onActivate={() => updateSetting("projectRoot", root)}
        />
      ))}
      <button className="project-add-root" onClick={handleAddRoot}>
        + Add Folder...
      </button>
    </div>
  );
}

function RootTree({ root, isActive, onRemove, onActivate }: {
  root: string; isActive: boolean; onRemove?: () => void; onActivate: () => void;
}) {
  const tabs = useEditorStore((s) => s.tabs);
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const name = root.split(/[/\\]/).pop() || root;

  useEffect(() => { loadDir(root); }, [root]);

  const loadDir = useCallback(async (dir: string) => {
    setLoading(true);
    try {
      const items = await ipc.listDirectory(dir);
      setEntries(items.sort((a, b) => (a.is_dir === b.is_dir ? a.name.localeCompare(b.name) : a.is_dir ? -1 : 1)));
    } catch {
      setEntries([]);
    } finally { setLoading(false); }
  }, []);

  const toggleExpand = useCallback(async (entry: DirEntry) => {
    if (!entry.is_dir) return;
    const key = entry.path;
    setExpanded((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  }, []);

  const handleOpenFile = useCallback(async (entry: DirEntry) => {
    if (entry.is_dir) { toggleExpand(entry); return; }
    const existingTab = tabs.find((t) => t.path === entry.path);
    if (existingTab) { useEditorStore.getState().setActiveTab(existingTab.id); return; }
    try {
      const data = await ipc.readFile(entry.path);
      useEditorStore.getState().openTab({ path: entry.path, name: entry.name, content: data.content, encoding: data.encoding, language: detectLanguage(entry.extension || "") });
    } catch (err) { console.error("Failed to open file:", err); }
  }, [tabs, toggleExpand]);

  return (
    <div className="root-tree">
      <div className={`project-root ${isActive ? "active" : ""}`} onClick={onActivate} title={root}>
        <span className="root-collapse" onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}>{collapsed ? "▸" : "▾"}</span>
        <span>{name}</span>
        {onRemove && <button className="root-remove" onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Remove root">×</button>}
        <button className="root-refresh" onClick={(e) => { e.stopPropagation(); loadDir(root); }} title="Refresh">↻</button>
      </div>
      {!collapsed && (loading ? <div className="project-loading">...</div> : (
        <div className="project-tree">
          {entries.map((entry) => (
            <div key={entry.path}><FileTreeNode entry={entry} depth={0} expanded={expanded} onToggle={toggleExpand} onOpen={handleOpenFile} /></div>
          ))}
        </div>
      ))}
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
