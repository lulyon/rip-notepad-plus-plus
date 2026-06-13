import { useState, useEffect } from "react";
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
import { ipc } from "./lib/ipc";
import { detectLanguage } from "./lib/constants";
import { MenuBar } from "./components/MenuBar/MenuBar";
import { TabBar } from "./components/TabBar/TabBar";
import { SplitEditor } from "./components/Editor/SplitEditor";
import { StatusBar } from "./components/StatusBar/StatusBar";
import { SearchPanel } from "./components/SearchPanel/SearchPanel";
import { EncodingDialog } from "./components/Dialogs/EncodingDialog";
import { GoToLineDialog } from "./components/Dialogs/GoToLineDialog";
import { PreferencesDialog } from "./components/Dialogs/PreferencesDialog";
import { ShortcutMapperDialog } from "./components/Dialogs/ShortcutMapperDialog";
import { RunDialog } from "./components/Dialogs/RunDialog";
import { AboutDialog } from "./components/Dialogs/AboutDialog";
import { PluginDialog } from "./components/Dialogs/PluginDialog";
import { CompareDialog } from "./components/Dialogs/CompareDialog";
import { CommandPalette } from "./components/Dialogs/CommandPalette";
import { Sidebar } from "./components/Panels/Sidebar";

function App() {
  const { t } = useTranslation();
  const activeTabId = useEditorStore((s) => s.activeTabId);
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

  // ── Session: load on startup ──
  useEffect(() => {
    ipc.loadSession().then(async (session) => {
      if (!session) return;
      // Restore project root
      if (session.project_root) {
        useSettingsStore.getState().updateSetting("projectRoot", session.project_root);
        // If project root was saved, also restore sidebar
        useSettingsStore.getState().updateSetting("showSidebar", true);
      }
      // Restore open tabs
      if (session.open_tabs && session.open_tabs.length > 0) {
        const store = useEditorStore.getState();
        const openPromises = session.open_tabs.map((tab) =>
          ipc.readFile(tab.path).then((data) => {
            return store.openTab({
              path: tab.path,
              name: tab.path.split(/[/\\]/).pop() || tab.path,
              content: data.content,
              encoding: tab.encoding,
              language: tab.language,
            });
          }).catch(() => null) // File may have been moved/deleted — skip
        );
        const tabIds = (await Promise.all(openPromises)).filter(Boolean);
        // Activate the last-opened tab, or the first one
        if (tabIds.length > 0) {
          store.setActiveTab(tabIds[tabIds.length - 1]!);
        }
      }
    }).catch(() => {});
  }, []);

  // ── Session: auto-save on changes ──
  const tabs = useEditorStore((s) => s.tabs);
  const projectRoot = useSettingsStore((s) => s.projectRoot);

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

    window.addEventListener("open-go-to-line", onOpenGoToLine);
    window.addEventListener("navigate-to-match", onNavigateToMatch);
    window.addEventListener("open-command-palette", () => setCmdPaletteOpen(true));
    return () => {
      window.removeEventListener("open-go-to-line", onOpenGoToLine);
      window.removeEventListener("navigate-to-match", onNavigateToMatch);
      window.removeEventListener("open-command-palette", () => setCmdPaletteOpen(true));
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
      } else if (actionId === "run.openInBrowser") {
        const tab = useEditorStore.getState().tabs.find(
          (t) => t.id === useEditorStore.getState().activeTabId,
        );
        if (tab?.path) {
          ipc.openInBrowser(tab.path).catch(console.error);
        }
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
          {activeTabId ? (
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

      {/* Dialogs */}
      <EncodingDialog />
      <GoToLineDialog open={gotoLineOpen} onClose={() => setGotoLineOpen(false)} />
      <PreferencesDialog open={prefsOpen} onClose={() => setPrefsOpen(false)} />
      <ShortcutMapperDialog open={shortcutMapperOpen} onClose={() => setShortcutMapperOpen(false)} />
      <RunDialog open={runOpen} onClose={() => setRunOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <PluginDialog open={pluginOpen} onClose={() => setPluginOpen(false)} />
      <CompareDialog open={compareOpen} onClose={() => setCompareOpen(false)} />
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
    </div>
  );
}

export default App;
