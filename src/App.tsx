import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import "./i18n";
import { useEditorStore } from "./stores/editorStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useWindowTitle } from "./hooks/useWindowTitle";
import { useFileDrop } from "./hooks/useFileDrop";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useMenuActions } from "./hooks/useMenuActions";
import { useMacroRecorder } from "./hooks/useMacroRecorder";
import { usePluginBridge } from "./hooks/usePluginBridge";
import { useAutoSave } from "./hooks/useAutoSave";
import { useFileWatcher } from "./hooks/useFileWatcher";
import { useSnapshotAutoSave } from "./hooks/useSnapshotAutoSave";
import { useUpdateChecker } from "./hooks/useUpdateChecker";
import { ipc } from "./lib/ipc";
import { detectLanguage } from "./lib/constants";
import { MenuBar } from "./components/MenuBar/MenuBar";
import { TabBar } from "./components/TabBar/TabBar";
import { SplitEditor } from "./components/Editor/SplitEditor";
import { StatusBar } from "./components/StatusBar/StatusBar";
import { SearchPanel } from "./components/SearchPanel/SearchPanel";
import { Sidebar } from "./components/Panels/Sidebar";
import { GenericPreview } from "./components/Panels/GenericPreview";
import { ToolsDialog } from "./components/Dialogs/ToolsDialog";
import { hasPreview } from "./lib/previewEngine";

// ── Lazy-loaded dialogs (code-split, loaded on first open) ──
const EncodingDialog = lazy(() => import("./components/Dialogs/EncodingDialog").then(m => ({ default: m.EncodingDialog })));
const GoToLineDialog = lazy(() => import("./components/Dialogs/GoToLineDialog").then(m => ({ default: m.GoToLineDialog })));
const PreferencesDialog = lazy(() => import("./components/Dialogs/PreferencesDialog").then(m => ({ default: m.PreferencesDialog })));
const ShortcutMapperDialog = lazy(() => import("./components/Dialogs/ShortcutMapperDialog").then(m => ({ default: m.ShortcutMapperDialog })));
const RunDialog = lazy(() => import("./components/Dialogs/RunDialog").then(m => ({ default: m.RunDialog })));
const AboutDialog = lazy(() => import("./components/Dialogs/AboutDialog").then(m => ({ default: m.AboutDialog })));
const PluginDialog = lazy(() => import("./components/Dialogs/PluginDialog").then(m => ({ default: m.PluginDialog })));
const CompareDialog = lazy(() => import("./components/Dialogs/CompareDialog").then(m => ({ default: m.CompareDialog })));
const CommandPalette = lazy(() => import("./components/Dialogs/CommandPalette").then(m => ({ default: m.CommandPalette })));
const UdlDialog = lazy(() => import("./components/Dialogs/UdlDialog").then(m => ({ default: m.UdlDialog })));
const ContextMenuDialog = lazy(() => import("./components/Dialogs/ContextMenuDialog").then(m => ({ default: m.ContextMenuDialog })));
const HashDialog = lazy(() => import("./components/Dialogs/HashDialog").then(m => ({ default: m.HashDialog })));
const SummaryDialog = lazy(() => import("./components/Dialogs/SummaryDialog").then(m => ({ default: m.SummaryDialog })));
const UnsavedChangesDialog = lazy(() => import("./components/Dialogs/UnsavedChangesDialog").then(m => ({ default: m.UnsavedChangesDialog })));

function App() {
  const { t } = useTranslation();
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const unsavedTabs = useEditorStore((s) => s.unsavedTabs);
  const [showMdPreview, setShowMdPreview] = useState(false);
  // ── Preview pane resize: ratio of preview width to split view width (0.2–0.5) ──
  const [previewRatio, setPreviewRatio] = useState(0.5);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const splitViewRef = useRef<HTMLDivElement>(null);
  const MIN_PREVIEW_RATIO = 0.2;
  const MAX_PREVIEW_RATIO = 0.5;

  // ── Divider drag handlers ──
  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingDivider(true);
  }, []);

  useEffect(() => {
    if (!isDraggingDivider) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!splitViewRef.current) return;
      const rect = splitViewRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const ratio = 1 - offsetX / rect.width;
      setPreviewRatio(Math.min(MAX_PREVIEW_RATIO, Math.max(MIN_PREVIEW_RATIO, ratio)));
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingDivider]);

  const showMenuBar = useSettingsStore((s) => s.showMenuBar);
  const showStatusBar = useSettingsStore((s) => s.showStatusBar);

  const [gotoLineOpen, setGotoLineOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [shortcutMapperOpen, setShortcutMapperOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [pluginOpen, setPluginOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [hashOpen, setHashOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [udlOpen, setUdlOpen] = useState(false);
  const [ctxConfigOpen, setCtxConfigOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  // ── Disable native webview context menu (prevents accidental Reload) ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Allow custom context menus (Monaco, TabBar, etc.) to handle their own events
      // by checking if the target already prevented default
      if (e.defaultPrevented) return;
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  // ── Session: load on startup (guarded against React StrictMode double-fire) ──
  const sessionLoaded = useRef(false);
  useEffect(() => {
    if (sessionLoaded.current) return; // Prevent double restore in StrictMode
    sessionLoaded.current = true;

    ipc.loadSession().then(async (session) => {
      if (!session) return;
      if (session.project_root) {
        useSettingsStore.getState().updateSetting("projectRoot", session.project_root);
        useSettingsStore.getState().addProjectRoot(session.project_root);
        useSettingsStore.getState().updateSetting("showSidebar", true);
      }
      if (session.open_tabs && session.open_tabs.length > 0) {
        const store = useEditorStore.getState();
        const existingPaths = new Set(store.tabs.map((t) => t.path).filter(Boolean));
        const openPromises = session.open_tabs
          .filter((tab) => !existingPaths.has(tab.path)) // Deduplicate: skip already-open files
          .map((tab) =>
            ipc.readFile(tab.path).then((data) => {
              return store.openTab({
                path: tab.path,
                name: tab.path.split(/[/\\]/).pop() || tab.path,
                content: data.content,
                encoding: tab.encoding,
                language: tab.language,
              });
            }).catch(() => null)
          );
        const tabIds = (await Promise.all(openPromises)).filter(Boolean);
        if (tabIds.length > 0) {
          store.setActiveTab(tabIds[tabIds.length - 1]!);
        }
      }
    }).catch(() => {});
  }, []);

  // ── Session: auto-save on changes ──
  const tabs = useEditorStore((s) => s.tabs);
  const projectRoot = useSettingsStore((s) => s.projectRoot);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const hasFilePreview = activeTab ? hasPreview(activeTab.name, activeTab.language) : false;

  useEffect(() => {
    const debounce = setTimeout(() => {
      const sessionTabs = tabs
        .filter((t) => t.path)
        .map((t) => ({ path: t.path!, encoding: t.encoding, language: t.language }));
      if (sessionTabs.length > 0) {
        ipc.saveSession({
          open_tabs: sessionTabs,
          active_tab_id: activeTabId,
          project_root: projectRoot,
          window_width: null,
          window_height: null,
        }).catch(() => {});
      } else {
        // No tabs with paths → clear stale session
        ipc.clearSession().catch(() => {});
      }
    }, 1000);
    return () => clearTimeout(debounce);
  }, [tabs, activeTabId, projectRoot]);

  // Global hooks
  useWindowTitle();
  useFileDrop();
  useKeyboardShortcuts();
  useMenuActions();
  useMacroRecorder();
  usePluginBridge();
  useAutoSave();
  useFileWatcher();
  useSnapshotAutoSave();
  useUpdateChecker();

  // Listen for custom events
  useEffect(() => {
    function onOpenGoToLine() { setGotoLineOpen(true); }
    function onNavigateToMatch(e: Event) {
      const match = (e as CustomEvent).detail;
      if (!match?.path) return;
      const tabs = useEditorStore.getState().tabs;
      const existingTab = tabs.find((t) => t.path === match.path);
      if (existingTab) {
        useEditorStore.getState().setActiveTab(existingTab.id);
      } else {
        ipc.readFile(match.path).then((result) => {
          const name = match.path.split(/[/\\]/).pop() || match.path;
          const ext = match.path.split(".").pop() || "";
          useEditorStore.getState().openTab({
            path: match.path, name,
            content: result.content, encoding: result.encoding,
            language: detectLanguage(ext),
          });
        }).catch((err) => console.error("Failed to open from search:", err));
      }
    }

    function onOpenCommandPalette() { setCmdPaletteOpen(true); }
    function onOpenToolsConfig() { setToolsOpen(true); }
    function onToggleMdPreview() { setShowMdPreview((prev) => !prev); }
    window.addEventListener("open-go-to-line", onOpenGoToLine);
    window.addEventListener("navigate-to-match", onNavigateToMatch);
    window.addEventListener("open-command-palette", onOpenCommandPalette);
    window.addEventListener("toggle-markdown-preview", onToggleMdPreview);
    window.addEventListener("open-tools-config", onOpenToolsConfig);
    return () => {
      window.removeEventListener("open-go-to-line", onOpenGoToLine);
      window.removeEventListener("navigate-to-match", onNavigateToMatch);
      window.removeEventListener("open-command-palette", onOpenCommandPalette);
      window.removeEventListener("toggle-markdown-preview", onToggleMdPreview);
      window.removeEventListener("open-tools-config", onOpenToolsConfig);
    };
  }, []);

  // Listen for menu actions that trigger dialogs (not handled by useMenuActions)
  useEffect(() => {
    function handler(e: Event) {
      const actionId = (e as CustomEvent).detail as string;
      if (actionId === "file.preferences") {
        setPrefsOpen(true);
      } else if (actionId === "file.shortcutMapper") {
        setShortcutMapperOpen(true);
      } else if (actionId === "run.dialog") {
        setRunOpen(true);
      } else if (actionId === "help.checkUpdate") {
        window.dispatchEvent(new CustomEvent("check-for-updates"));
      } else if (actionId === "help.about") {
        setAboutOpen(true);
      } else if (actionId === "plugins.manager") {
        setPluginOpen(true);
      } else if (actionId === "plugins.compare") {
        setCompareOpen(true);
      } else if (actionId === "run.openTerminal") {
        const tab = useEditorStore.getState().tabs.find(
          (t) => t.id === useEditorStore.getState().activeTabId,
        );
        const cwd = tab?.path
          ? tab.path.split(/[/\\]/).slice(0, -1).join("/") || "."
          : useSettingsStore.getState().projectRoot || ".";
        const projectRoot = useSettingsStore.getState().projectRoot;
        const wd = projectRoot || cwd;
        ipc.openTerminal(wd, "").catch(console.error);
      } else if (actionId === "run.codex") {
        const tab = useEditorStore.getState().tabs.find(
          (t) => t.id === useEditorStore.getState().activeTabId,
        );
        const cwd = tab?.path
          ? tab.path.split(/[/\\]/).slice(0, -1).join("/") || "."
          : useSettingsStore.getState().projectRoot || ".";
        const projectRoot = useSettingsStore.getState().projectRoot;
        const wd = projectRoot || cwd;
        ipc.openTerminal(wd, "codex").catch(console.error);
      } else if (actionId === "tool.openHash") {
        setHashOpen(true);
      } else if (actionId === "view.openSummary") {
        setSummaryOpen(true);
      } else if (actionId === "language.openUdl") {
        setUdlOpen(true);
      } else if (actionId === "settings.editContextMenu") {
        setCtxConfigOpen(true);
      } else if (actionId.startsWith("tool.run.")) {
        (async () => {
          const toolId = actionId.replace("tool.run.", "");
          const { useToolStore } = await import("./stores/toolStore");
          const tool = useToolStore.getState().tools.find((t: any) => t.id === toolId);
        if (tool) {
          const tab = useEditorStore.getState().tabs.find((t2) => t2.id === activeTabId);
          let cmd = tool.command;
          const wd = tool.cwd || useSettingsStore.getState().projectRoot || (tab?.path ? tab.path.split(/[/\\]/).slice(0, -1).join("/") : ".");
          if (tab) {
            cmd = cmd.replace(/\$\(FULL_CURRENT_PATH\)/g, tab.path || "");
            cmd = cmd.replace(/\$\(CURRENT_DIRECTORY\)/g, tab.path ? tab.path.split(/[/\\]/).slice(0, -1).join("/") : ".");
            cmd = cmd.replace(/\$\(FILE_NAME\)/g, tab.name);
            cmd = cmd.replace(/\$\(CURRENT_LINE\)/g, String(tab.cursorLine));
          }
          cmd = cmd.replace(/\$\(PROJECT_ROOT\)/g, useSettingsStore.getState().projectRoot || ".");
          ipc.runCommand(cmd, wd || undefined).then((result: any) => {
            window.dispatchEvent(new CustomEvent("tool-output", { detail: { name: tool.name, output: result.stderr || result.stdout || "Done" } }));
          }).catch((e: any) => console.error(e));
        }
        })();
      } else if (actionId === "workspace.save") {
        (async () => {
          const { save } = await import("@tauri-apps/plugin-dialog");
          const filePath = await save({ title: "Save Workspace", defaultPath: "my.ripworkspace", filters: [{ name: "ripNotepad++ Workspace", extensions: ["ripworkspace"] }] });
          if (!filePath) return;
          const tabs = useEditorStore.getState().tabs.filter(t => t.path);
          await ipc.saveWorkspace(filePath, {
            version: 1, name: filePath.split(/[/\\]/).pop() || "Untitled", roots: [useSettingsStore.getState().projectRoot || "."],
            active_root: useSettingsStore.getState().projectRoot, open_tabs: tabs.map(t => ({ path: t.path!, language: t.language, encoding: t.encoding })),
            active_tab_path: tabs.find(t => t.id === activeTabId)?.path || null, split_view: useSettingsStore.getState().splitView,
            sidebar_tab: "files", created_at: new Date().toISOString(),
          });
        })().catch(console.error);
      } else if (actionId === "workspace.load") {
        (async () => {
          const { open } = await import("@tauri-apps/plugin-dialog");
          const filePath = await open({ title: "Open Workspace", filters: [{ name: "ripNotepad++ Workspace", extensions: ["ripworkspace"] }] });
          if (!filePath) return;
          try {
            const ws = await ipc.loadWorkspace(filePath as string);
            if (ws.roots?.[0]) useSettingsStore.getState().updateSetting("projectRoot", ws.roots[0]);
            if (ws.open_tabs) {
              const store = useEditorStore.getState();
              for (const st of ws.open_tabs) {
                try {
                  const data = await ipc.readFile(st.path);
                  store.openTab({ path: st.path, name: st.path.split(/[/\\]/).pop() || st.path, content: data.content, encoding: st.encoding, language: st.language });
                } catch {}
              }
            }
            if (ws.split_view) useSettingsStore.getState().updateSetting("splitView", ws.split_view as any);
          } catch (e) { console.error("Load workspace failed:", e); }
        })().catch(console.error);
      } else if (actionId === "run.claudeCode") {
        const tab = useEditorStore.getState().tabs.find(
          (t) => t.id === useEditorStore.getState().activeTabId,
        );
        const cwd = tab?.path
          ? tab.path.split(/[/\\]/).slice(0, -1).join("/") || "."
          : useSettingsStore.getState().projectRoot || ".";
        const projectRoot = useSettingsStore.getState().projectRoot;
        const wd = projectRoot || cwd;
        ipc.openTerminal(wd, "claude").catch(console.error);
      }
      // file.open and file.saveAs use Tauri dialog (native), triggered in useMenuActions
    }
    window.addEventListener("menu-action", handler);
    return () => window.removeEventListener("menu-action", handler);
  }, []);

  return (
    <div className="app">
      {showMenuBar && <MenuBar />}
      <TabBar />
      <div className="main-content">
        <Sidebar />
        <div className="editor-area">
          {activeTabId && hasFilePreview && (
            <button
              className="md-preview-toggle-btn"
              onClick={() => setShowMdPreview((prev) => !prev)}
              title={showMdPreview ? t("preview.close") : t("preview.open", { shortcut: "Ctrl+Shift+V" })}
            >
              {showMdPreview ? "✕" : "👁"}
            </button>
          )}
          {activeTabId && showMdPreview && hasFilePreview ? (
            <div
              className={`md-split-view${isDraggingDivider ? " md-dragging" : ""}`}
              ref={splitViewRef}
            >
              <div className="md-editor-pane" style={{ flex: `0 0 ${(1 - previewRatio) * 100}%` }}>
                <SplitEditor />
              </div>
              <div
                className="md-preview-divider"
                onMouseDown={onDividerMouseDown}
              />
              <div className="md-preview-pane" style={{ flex: `0 0 ${previewRatio * 100}%` }}>
                <GenericPreview />
              </div>
            </div>
          ) : activeTabId ? (
            <SplitEditor />
          ) : (
            <div className="welcome">
              <h1>{t("welcome.title")}</h1>
              <p>{t("welcome.subtitle")}</p>
              <p>{t("welcome.dropHint")}</p>
            </div>
          )}
          <SearchPanel />
        </div>
      </div>
      {showStatusBar && <StatusBar />}

      {/* Dialogs (lazy-loaded, code-split) */}
      <Suspense fallback={null}>
        <EncodingDialog />
      <GoToLineDialog open={gotoLineOpen} onClose={() => setGotoLineOpen(false)} />
      <PreferencesDialog open={prefsOpen} onClose={() => setPrefsOpen(false)} />
      <ShortcutMapperDialog open={shortcutMapperOpen} onClose={() => setShortcutMapperOpen(false)} />
      <RunDialog open={runOpen} onClose={() => setRunOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <PluginDialog open={pluginOpen} onClose={() => setPluginOpen(false)} />
      <CompareDialog open={compareOpen} onClose={() => setCompareOpen(false)} />
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
      <HashDialog open={hashOpen} onClose={() => setHashOpen(false)} />
      <SummaryDialog open={summaryOpen} onClose={() => setSummaryOpen(false)} />
      <UdlDialog open={udlOpen} onClose={() => setUdlOpen(false)} />
      <ContextMenuDialog open={ctxConfigOpen} onClose={() => setCtxConfigOpen(false)} />
      <ToolsDialog open={toolsOpen} onClose={() => setToolsOpen(false)} />
      <UnsavedChangesDialog
        unsavedTabs={unsavedTabs || []}
        onSaveAll={async () => {
          const store = useEditorStore.getState();
          const tabsToSave = unsavedTabs || [];
          for (const tab of tabsToSave) {
            if (tab.path) {
              try {
                await ipc.writeFile(tab.path, tab.content, tab.encoding);
                store.markTabSaved(tab.id, tab.path);
              } catch (err) {
                console.error("Failed to save before close:", err);
              }
            }
          }
          // Close after saving
          if (store.pendingCloseAll) {
            store.forceCloseAllTabs();
          } else {
            for (const tab of tabsToSave) {
              store.forceCloseTab(tab.id);
            }
          }
          store.dismissUnsavedDialog();
        }}
        onDiscardAll={() => {
          const store = useEditorStore.getState();
          for (const tab of (unsavedTabs || [])) {
            store.clearModified(tab.id);
          }
          if (store.pendingCloseAll) {
            store.forceCloseAllTabs();
          } else {
            for (const tab of (unsavedTabs || [])) {
              store.forceCloseTab(tab.id);
            }
          }
          store.dismissUnsavedDialog();
        }}
        onCancel={() => useEditorStore.getState().dismissUnsavedDialog()}
      />
      </Suspense>
    </div>
  );
}

export default App;
