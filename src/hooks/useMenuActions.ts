import { useEffect, useCallback } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useSearchStore } from "../stores/searchStore";
import { useEncodingStore } from "../stores/encodingStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useEditorRefStore } from "../stores/editorRefStore";
import { ipc } from "../lib/ipc";
import { detectLanguage } from "../lib/constants";
import { useMacroStore } from "../stores/macroStore";
import { open, save } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function useMenuActions() {
  const editorRef = useEditorRefStore((s) => s.editorRef);

  const handleMenuAction = useCallback(
    async (actionId: string) => {
      const editorState = useEditorStore.getState();
      const tab = editorState.tabs.find((t) => t.id === editorState.activeTabId);
      const searchState = useSearchStore.getState();
      const settingsStore = useSettingsStore.getState();

      switch (actionId) {
        // ── File ──
        case "file.new":
          useEditorStore.getState().newTab();
          break;
        case "file.open": {
          const result = await open({ title: "Open File", multiple: true });
          const files: string[] = result ? (Array.isArray(result) ? result : [result]) : [];
          for (const path of files) {
            try {
              const data = await ipc.readFile(path);
              const name = path.split(/[/\\]/).pop() || path;
              const ext = path.split(".").pop() || "";
              useEditorStore.getState().openTab({
                path, name, content: data.content,
                encoding: data.encoding, language: detectLanguage(ext),
              });
            } catch (err) { console.error("Open failed:", err); }
          }
          break;
        }
        case "file.openFolder": {
          try {
            const dir = await open({
              title: "Open Folder",
              directory: true,
              multiple: false,
            });
            if (dir && typeof dir === "string") {
              useSettingsStore.getState().updateSetting("projectRoot", dir);
              // Auto-open sidebar
              if (!useSettingsStore.getState().showSidebar) {
                useSettingsStore.getState().updateSetting("showSidebar", true);
              }
              const tabs = useEditorStore.getState().tabs;
              const sessionTabs = tabs
                .filter((t) => t.path)
                .map((t) => ({ path: t.path!, encoding: t.encoding, language: t.language }));
              ipc.saveSession({
                open_tabs: sessionTabs,
                active_tab_id: useEditorStore.getState().activeTabId,
                project_root: dir,
                window_width: null,
                window_height: null,
              }).catch(() => {});
            }
          } catch (err) {
            console.error("openFolder failed:", err);
          }
          break;
        }
        case "file.save":
          if (tab?.path) {
            await ipc.writeFile(tab.path, tab.content, tab.encoding);
            useEditorStore.getState().markTabSaved(tab.id, tab.path);
          } else if (tab) {
            const filePath = await save({ title: "Save As", defaultPath: tab.name });
            if (filePath) {
              await ipc.writeFile(filePath, tab.content, tab.encoding);
              useEditorStore.getState().markTabSaved(tab.id, filePath);
            }
          }
          break;
        case "file.saveAll": {
          const allTabs = useEditorStore.getState().tabs;
          for (const t of allTabs) {
            if (t.path) {
              try {
                await ipc.writeFile(t.path, t.content, t.encoding);
                useEditorStore.getState().markTabSaved(t.id, t.path);
              } catch (err) { console.error("Save all failed for", t.path, err); }
            }
          }
          break;
        }
        case "file.saveAs":
          if (tab) {
            const filePath = await save({ title: "Save As", defaultPath: tab.path || tab.name });
            if (filePath) {
              await ipc.writeFile(filePath, tab.content, tab.encoding);
              useEditorStore.getState().markTabSaved(tab.id, filePath);
            }
          }
          break;
        case "file.close":
          if (editorState.activeTabId)
            useEditorStore.getState().closeTab(editorState.activeTabId);
          break;
        case "file.closeAll":
          useEditorStore.getState().closeAllTabs();
          break;
        case "file.closeOthers":
          if (editorState.activeTabId)
            useEditorStore.getState().closeOtherTabs(editorState.activeTabId);
          break;
        case "file.reload":
          if (tab?.path) {
            try {
              const data = await ipc.readFile(tab.path, tab.encoding);
              useEditorStore.getState().reloadTab(tab.id, data.content, data.encoding);
            } catch (err) { console.error("Reload failed:", err); }
          }
          break;
        case "file.print": {
          const tab = useEditorStore.getState().tabs.find(
            (t) => t.id === useEditorStore.getState().activeTabId,
          );
          if (!tab) break;
          const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${tab.name}</title><style>
body{font-family:monospace;font-size:12px;line-height:1.5;padding:20px;color:#000;background:#fff}
pre{white-space:pre-wrap;word-wrap:break-word}@media print{body{margin:0}}
</style></head><body><pre>${escapeHtml(tab.content)}</pre></body></html>`;
          // Write temp HTML file and open in browser
          const tempPath = tab.path
            ? tab.path.replace(/\.[^/.]+$/, ".print.html")
            : `${tab.name}.print.html`;
          try {
            await ipc.writeFile(tempPath, html, "UTF-8");
            await ipc.openInBrowser(`file://${tempPath}`);
          } catch (err) {
            console.error("Print failed:", err);
          }
          break;
        }
        case "file.exit": {
          // Save session before closing
          const tabs = useEditorStore.getState().tabs;
          const sessionTabs = tabs
            .filter((t) => t.path)
            .map((t) => ({ path: t.path!, encoding: t.encoding, language: t.language }));
          try {
            await ipc.saveSession({
              open_tabs: sessionTabs,
              active_tab_id: useEditorStore.getState().activeTabId,
              project_root: useSettingsStore.getState().projectRoot,
              window_width: null,
              window_height: null,
            });
          } catch (_) { /* best effort */ }
          await getCurrentWindow().close();
          break;
        }

        // ── Edit ──
        case "edit.undo":
          editorRef?.trigger("keyboard", "undo", null);
          break;
        case "edit.redo":
          editorRef?.trigger("keyboard", "redo", null);
          break;
        case "edit.cut":
          editorRef?.trigger("keyboard", "editor.action.clipboardCutAction", null);
          break;
        case "edit.copy":
          editorRef?.trigger("keyboard", "editor.action.clipboardCopyAction", null);
          break;
        case "edit.paste":
          editorRef?.trigger("keyboard", "editor.action.clipboardPasteAction", null);
          break;
        case "edit.delete":
          editorRef?.trigger("keyboard", "deleteRight", null);
          break;
        case "edit.selectAll":
          editorRef?.trigger("keyboard", "editor.action.selectAll", null);
          break;
        case "edit.duplicateLine":
          editorRef?.trigger("keyboard", "editor.action.copyLinesDownAction", null);
          break;
        case "edit.deleteLine":
          editorRef?.trigger("keyboard", "editor.action.deleteLines", null);
          break;
        case "edit.trimTrailing":
          editorRef?.trigger("keyboard", "editor.action.trimTrailingWhitespace", null);
          break;
        case "edit.toUpper":
          editorRef?.trigger("keyboard", "editor.action.transformToUppercase", null);
          break;
        case "edit.toLower":
          editorRef?.trigger("keyboard", "editor.action.transformToLowercase", null);
          break;
        case "edit.removeEmptyLines": {
          const model = editorRef?.getModel();
          if (!model) break;
          const lines = model.getLinesContent();
          const nonEmpty: number[] = [];
          lines.forEach((line, i) => {
            if (line.trim() !== "") nonEmpty.push(i + 1);
          });
          if (nonEmpty.length < lines.length) {
            const newContent = nonEmpty.map((i) => lines[i - 1]).join(model.getEOL());
            const fullRange = model.getFullModelRange();
            editorRef?.executeEdits("remove-empty-lines", [
              { range: fullRange, text: newContent },
            ]);
          }
          break;
        }
        case "edit.moveLineUp":
          editorRef?.trigger("keyboard", "editor.action.moveLinesUpAction", null);
          break;
        case "edit.moveLineDown":
          editorRef?.trigger("keyboard", "editor.action.moveLinesDownAction", null);
          break;
        case "edit.copyFilePath":
          if (tab?.path) navigator.clipboard.writeText(tab.path);
          break;
        case "edit.copyFileName":
          if (tab?.path) navigator.clipboard.writeText(tab.path.split(/[/\\]/).pop() || "");
          break;
        case "edit.copyDirPath":
          if (tab?.path) navigator.clipboard.writeText(tab.path.split(/[/\\]/).slice(0, -1).join("/") || tab.path);
          break;
        case "edit.insertDateTime": {
          const now = new Date();
          const text = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
          editorRef?.trigger("keyboard", "type", { text });
          break;
        }
        case "edit.formatXml": {
          const model = editorRef?.getModel();
          if (!model) break;
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(model.getValue(), "text/xml");
            const errNode = doc.querySelector("parsererror");
            if (errNode) {
              window.alert(`XML Error: ${errNode.textContent}`);
            } else {
              const serializer = new XMLSerializer();
              let formatted = serializer.serializeToString(doc);
              // Add newlines for readability
              formatted = formatted
                .replace(/></g, ">\n<")
                .replace(/(<[^/][^>]*>[^\n<])(<\/)/g, "$1\n$2");
              const fullRange = model.getFullModelRange();
              editorRef?.executeEdits("format-xml", [{ range: fullRange, text: formatted }]);
            }
          } catch (e) {
            window.alert(`XML Parse Error: ${e}`);
          }
          break;
        }
        case "edit.validateXml": {
          const model = editorRef?.getModel();
          if (!model) break;
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(model.getValue(), "text/xml");
            const errNode = doc.querySelector("parsererror");
            if (errNode) {
              window.alert(`❌ XML Invalid:\n${errNode.textContent}`);
            } else {
              window.alert("✅ XML is valid.");
            }
          } catch (e) {
            window.alert(`XML Parse Error: ${e}`);
          }
          break;
        }
        case "edit.sortAscending": {
          const model = editorRef?.getModel();
          if (!model) break;
          const lines = model.getLinesContent();
          const sorted = [...lines].sort((a, b) => a.localeCompare(b));
          const fullRange = model.getFullModelRange();
          editorRef?.executeEdits("sort", [{ range: fullRange, text: sorted.join(model.getEOL()) }]);
          break;
        }
        case "edit.sortDescending": {
          const model = editorRef?.getModel();
          if (!model) break;
          const lines = model.getLinesContent();
          const sorted = [...lines].sort((a, b) => b.localeCompare(a));
          const fullRange = model.getFullModelRange();
          editorRef?.executeEdits("sort", [{ range: fullRange, text: sorted.join(model.getEOL()) }]);
          break;
        }
        case "edit.removeDupLines": {
          const model = editorRef?.getModel();
          if (!model) break;
          const lines = model.getLinesContent();
          const seen = new Set<string>();
          const unique = lines.filter((line) => {
            const key = line.trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          const fullRange = model.getFullModelRange();
          editorRef?.executeEdits("dedup", [{ range: fullRange, text: unique.join(model.getEOL()) }]);
          break;
        }
        case "edit.columnMode":
          editorRef?.trigger("keyboard", "editor.action.toggleColumnSelection", null);
          break;

        // ── Search ──
        case "search.find":
          window.dispatchEvent(new CustomEvent("toggle-find-panel"));
          break;
        case "search.replace":
          window.dispatchEvent(new CustomEvent("toggle-replace-panel"));
          break;
        case "search.findNext":
          if (editorRef) searchState.findNext(editorRef);
          break;
        case "search.findPrev":
          if (editorRef) searchState.findPrev(editorRef);
          break;
        case "search.goTo":
          window.dispatchEvent(new CustomEvent("open-go-to-line"));
          break;
        case "search.findInFiles": {
          const root = tab?.path
            ? tab.path.split(/[/\\]/).slice(0, -1).join("/") || "."
            : ".";
          useSearchStore.getState().setFindInFilesRoot(root);
          useSearchStore.getState().toggleFindPanel();
          break;
        }
        case "search.markAll":
          if (editorRef) searchState.markAll(editorRef);
          break;

        // ── View ──
        case "view.wordWrap":
          useSettingsStore.getState().updateSetting(
            "wordWrap",
            settingsStore.wordWrap === "on" ? "off" : "on",
          );
          break;
        case "view.showWhitespace":
          useSettingsStore.getState().updateSetting(
            "renderWhitespace",
            settingsStore.renderWhitespace === "all" ? "selection" : "all",
          );
          break;
        case "view.showIndentGuides":
          useSettingsStore.getState().updateSetting(
            "showIndentGuides", !settingsStore.showIndentGuides);
          break;
        case "view.showLineNumbers":
          useSettingsStore.getState().updateSetting(
            "lineNumbers",
            settingsStore.lineNumbers === "on" ? "off" : "on",
          );
          break;
        case "view.showMinimap":
          useSettingsStore.getState().updateSetting("showMinimap", !settingsStore.showMinimap);
          break;
        case "view.foldAll":
          editorRef?.trigger("keyboard", "editor.foldAll", null);
          break;
        case "view.unfoldAll":
          editorRef?.trigger("keyboard", "editor.unfoldAll", null);
          break;
        case "view.zoomIn":
          useSettingsStore.getState().updateSetting("fontSize", settingsStore.fontSize + 1);
          break;
        case "view.zoomOut":
          useSettingsStore.getState().updateSetting(
            "fontSize", Math.max(6, settingsStore.fontSize - 1));
          break;
        case "view.zoomReset":
          useSettingsStore.getState().updateSetting("fontSize", 13);
          break;
        case "view.fullScreen": {
          const w = getCurrentWindow();
          const isFull = await w.isFullscreen();
          await w.setFullscreen(!isFull);
          useSettingsStore.getState().updateSetting("fullScreen", !isFull);
          break;
        }
        case "view.alwaysOnTop": {
          const win = getCurrentWindow();
          const isOnTop = await win.isAlwaysOnTop();
          await win.setAlwaysOnTop(!isOnTop);
          useSettingsStore.getState().updateSetting("alwaysOnTop", !isOnTop);
          break;
        }
        case "view.toggleSidebar":
          useSettingsStore.getState().toggleSetting("showSidebar");
          break;
        case "view.splitNone":
          useSettingsStore.getState().updateSetting("splitView", "none");
          break;
        case "view.splitHorizontal":
          useSettingsStore.getState().updateSetting("splitView", "horizontal");
          break;
        case "view.splitVertical":
          useSettingsStore.getState().updateSetting("splitView", "vertical");
          break;

        // ── Encoding ──
        case "encoding.openDialog":
          useEncodingStore.getState().openEncodingDialog();
          break;
        case "encoding.encodeUtf8":
          if (tab) {
            try {
              useEditorStore.getState().updateTabEncoding(tab.id, "UTF-8");
            } catch (err) { console.error("Encoding change failed:", err); }
          }
          break;
        case "encoding.encodeUtf8Bom":
          if (tab) {
            try {
              useEditorStore.getState().updateTabEncoding(tab.id, "UTF-8-BOM");
            } catch (err) { console.error("Encoding change failed:", err); }
          }
          break;
        case "encoding.convertUtf8":
          if (tab && tab.encoding !== "UTF-8") {
            try {
              const converted = await useEncodingStore.getState().convertTabEncoding(
                tab.content, tab.encoding, "UTF-8");
              useEditorStore.getState().updateTabContent(tab.id, converted);
              useEditorStore.getState().updateTabEncoding(tab.id, "UTF-8");
            } catch (err) { console.error("Encoding conversion failed:", err); }
          }
          break;
        case "encoding.convertUtf8Bom":
          if (tab && tab.encoding !== "UTF-8-BOM") {
            try {
              const converted = await useEncodingStore.getState().convertTabEncoding(
                tab.content, tab.encoding, "UTF-8");
              useEditorStore.getState().updateTabContent(tab.id, converted);
              useEditorStore.getState().updateTabEncoding(tab.id, "UTF-8-BOM");
            } catch (err) { console.error("Encoding conversion failed:", err); }
          }
          break;
        case "encoding.convertAnsi":
          if (tab && tab.encoding !== "windows-1252") {
            try {
              const converted = await useEncodingStore.getState().convertTabEncoding(
                tab.content, tab.encoding, "windows-1252");
              useEditorStore.getState().updateTabContent(tab.id, converted);
              useEditorStore.getState().updateTabEncoding(tab.id, "windows-1252");
            } catch (err) { console.error("Encoding conversion failed:", err); }
          }
          break;
        case "encoding.convertUtf16LE":
          if (tab && tab.encoding !== "UTF-16LE") {
            try {
              const converted = await useEncodingStore.getState().convertTabEncoding(
                tab.content, tab.encoding, "UTF-16LE");
              useEditorStore.getState().updateTabContent(tab.id, converted);
              useEditorStore.getState().updateTabEncoding(tab.id, "UTF-16LE");
            } catch (err) { console.error("Encoding conversion failed:", err); }
          }
          break;
        case "encoding.convertUtf16BE":
          if (tab && tab.encoding !== "UTF-16BE") {
            try {
              const converted = await useEncodingStore.getState().convertTabEncoding(
                tab.content, tab.encoding, "UTF-16BE");
              useEditorStore.getState().updateTabContent(tab.id, converted);
              useEditorStore.getState().updateTabEncoding(tab.id, "UTF-16BE");
            } catch (err) { console.error("Encoding conversion failed:", err); }
          }
          break;

        // ── Language ──
        case "lang.plaintext": case "lang.javascript": case "lang.typescript":
        case "lang.json": case "lang.html": case "lang.css":
        case "lang.python": case "lang.rust": case "lang.go":
        case "lang.java": case "lang.c": case "lang.cpp":
        case "lang.xml": case "lang.yaml": case "lang.markdown":
        case "lang.sql": case "lang.shell": {
          const langId = actionId.replace("lang.", "");
          if (editorState.activeTabId) {
            useEditorStore.getState().updateTabLanguage(editorState.activeTabId, langId);
          }
          break;
        }

        // ── Macro ──
        case "macro.startRecord":
          useMacroStore.getState().startRecording();
          break;
        case "macro.stopRecord":
          useMacroStore.getState().stopRecording();
          break;
        case "macro.playback": {
          const macro = useMacroStore.getState().savedMacros[0];
          if (macro) {
            useMacroStore.getState().setPlaybackMacro(macro.name);
            useMacroStore.getState().setIsPlaying(true);
          }
          break;
        }
        case "macro.save":
          if (useMacroStore.getState().recordedActions.length > 0) {
            useMacroStore.getState().saveMacro(
              `macro-${Math.random().toString(36).slice(2, 8)}`,
            );
          }
          break;

        // ── Window ──
        case "window.nextTab": {
          const tabs2 = useEditorStore.getState().tabs;
          const idx = tabs2.findIndex((t) => t.id === editorState.activeTabId);
          const next = (idx + 1) % tabs2.length;
          if (tabs2[next]) useEditorStore.getState().setActiveTab(tabs2[next].id);
          break;
        }
        case "window.prevTab": {
          const tabs2 = useEditorStore.getState().tabs;
          const idx = tabs2.findIndex((t) => t.id === editorState.activeTabId);
          const prev = (idx - 1 + tabs2.length) % tabs2.length;
          if (tabs2[prev]) useEditorStore.getState().setActiveTab(tabs2[prev].id);
          break;
        }
        case "window.close":
          if (editorState.activeTabId)
            useEditorStore.getState().closeTab(editorState.activeTabId);
          break;
        case "window.closeAll":
          useEditorStore.getState().closeAllTabs();
          break;
      }
    },
    [editorRef],
  );

  // Single event listener for all menu actions
  useEffect(() => {
    function handler(e: Event) {
      handleMenuAction((e as CustomEvent).detail);
    }
    window.addEventListener("menu-action", handler);
    return () => window.removeEventListener("menu-action", handler);
  }, [handleMenuAction]);
}
