import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useEditorRefStore } from "../../stores/editorRefStore";
import { ipc } from "../../lib/ipc";
import "./RunDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

// NppExec/NP++ compatible variable substitution
const VARIABLES: { key: string; label: string; description: string }[] = [
  { key: "FULL_CURRENT_PATH", label: "完整路径", description: "当前文件完整路径" },
  { key: "CURRENT_DIRECTORY", label: "当前目录", description: "当前文件所在目录" },
  { key: "FILE_NAME", label: "文件名", description: "含扩展名的文件名" },
  { key: "NAME_PART", label: "主文件名", description: "不含扩展名的文件名" },
  { key: "EXT_PART", label: "扩展名", description: "文件扩展名" },
  { key: "CURRENT_WORD", label: "当前词", description: "光标所在位置的单词" },
  { key: "CURRENT_LINE", label: "行号", description: "当前光标行号" },
  { key: "CURRENT_COLUMN", label: "列号", description: "当前光标列号" },
  { key: "PROJECT_ROOT", label: "项目根目录", description: "当前打开的项目文件夹" },
  { key: "NPP_DIRECTORY", label: "NPP目录", description: "应用目录" },
];

export function RunDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [showVars, setShowVars] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeTab = useEditorStore((s) =>
    s.tabs.find((tab) => tab.id === s.activeTabId),
  );
  const editorRef = useEditorRefStore((s) => s.editorRef);
  const projectRoot = useSettingsStore((s) => s.projectRoot);

  useEffect(() => {
    if (open) {
      if (activeTab?.language === "html") {
        setCommand(activeTab.path ? `open $(FULL_CURRENT_PATH)` : "");
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, activeTab]);

  // Resolve variable references like $(VAR_NAME) or ${VAR_NAME}
  const resolveVariables = useCallback(
    (cmd: string): string => {
      if (!activeTab) return cmd;

      const getWordAtCursor = (): string => {
        if (!editorRef) return "";
        const pos = editorRef.getPosition();
        if (!pos) return "";
        const model = editorRef.getModel();
        if (!model) return "";
        const line = model.getLineContent(pos.lineNumber);
        const col = pos.column - 1;
        let start = col;
        let end = col;
        while (start > 0 && /\w/.test(line[start - 1])) start--;
        while (end < line.length && /\w/.test(line[end])) end++;
        return line.substring(start, end);
      };

      const vars: Record<string, string> = {
        FULL_CURRENT_PATH: activeTab.path || "",
        CURRENT_DIRECTORY: activeTab.path
          ? activeTab.path.split(/[/\\]/).slice(0, -1).join("/") || "."
          : ".",
        FILE_NAME: activeTab.name,
        NAME_PART: activeTab.name.includes(".")
          ? activeTab.name.substring(0, activeTab.name.lastIndexOf("."))
          : activeTab.name,
        EXT_PART: activeTab.name.includes(".")
          ? activeTab.name.substring(activeTab.name.lastIndexOf(".") + 1)
          : "",
        CURRENT_WORD: getWordAtCursor(),
        CURRENT_LINE: String(activeTab.cursorLine),
        CURRENT_COLUMN: String(activeTab.cursorColumn),
        PROJECT_ROOT: projectRoot || "",
        NPP_DIRECTORY: ".",
      };

      return cmd.replace(/\$[({]([^)}]+)[)}]/g, (_, name) => {
        return vars[name.trim()] || `$(${name})`;
      });
    },
    [activeTab, editorRef, projectRoot],
  );

  // Parse error output for file:line:col patterns
  const renderOutput = useCallback((text: string) => {
    if (!text) return null;
    // Match common compiler error patterns: path:line:col or path(line,col)
    const parts = text.split(
      /(\S+\.\w{1,5}:\d+:\d+(?::\s*(?:error|warning|note))?|\S+\.\w{1,5}\(\d+,\d+\))/g,
    );
    return parts.map((part, i) => {
      const match = part.match(/^(\S+\.\w{1,5}):(\d+):(\d+)(?::\s*(error|warning|note))?/);
      if (match) {
        const [_, file, line, _col, severity] = match;
        const cls = severity === "error" ? "run-error" : severity === "warning" ? "run-warning" : "run-link";
        return (
          <span
            key={i}
            className={cls}
            onClick={async () => {
              try {
                const data = await ipc.readFile(file);
                const store = useEditorStore.getState();
                store.openTab({
                  path: file,
                  name: file.split(/[/\\]/).pop() || file,
                  content: data.content,
                  encoding: data.encoding,
                  language: "",
                });
                setTimeout(() => {
                  const ed = useEditorRefStore.getState().editorRef;
                  if (ed) {
                    ed.revealLineInCenter(Number(line));
                    ed.setPosition({ lineNumber: Number(line), column: 1 });
                  }
                }, 500);
              } catch { /* file not found */ }
            }}
            title={`Click to open ${file} at line ${line}`}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }, []);

  const executeCommand = async () => {
    const cmd = resolveVariables(command.trim());
    if (!cmd) return;

    setOutput((p) => p + `> ${cmd}\n`);
    setRunning(true);

    try {
      const cwd = activeTab?.path
        ? activeTab.path.split(/[/\\]/).slice(0, -1).join("/") || undefined
        : undefined;
      const result = await ipc.runCommand(cmd, cwd);
      setOutput((p) => p + `${result.stdout}${result.stderr ? `\n${result.stderr}` : ""}`);
      if (result.exit_code !== 0) {
        setOutput((p) => p + `\n[exit code: ${result.exit_code}]\n`);
      }
    } catch (err) {
      setOutput((p) => p + `Error: ${err}\n`);
    } finally {
      setRunning(false);
    }
  };

  const insertVariable = (key: string) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const text = `$(${key})`;
    const newVal = command.substring(0, start) + text + command.substring(end);
    setCommand(newVal);
    setShowVars(false);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + text.length, start + text.length);
    }, 50);
  };

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog run-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t("dialog.runCommand")}</h2>

        {/* Variable shortcuts */}
        <div className="run-vars-toggle">
          <button className="btn btn-small" onClick={() => setShowVars(!showVars)}>
            {showVars ? "▲" : "▼"} {t("run.variables")}
          </button>
        </div>
        {showVars && (
          <div className="run-vars-grid">
            {VARIABLES.map((v) => (
              <button
                key={v.key}
                className="run-var-btn"
                onClick={() => insertVariable(v.key)}
                title={v.description}
              >
                <span className="run-var-key">$( {v.key} )</span>
                <span className="run-var-desc">{v.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="run-row">
          <input
            ref={inputRef}
            type="text"
            className="run-input"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={running}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && !running) {
                await executeCommand();
              }
            }}
            placeholder={t("dialog.runPlaceholder")}
          />
          <button
            className="btn run-btn"
            onClick={executeCommand}
            disabled={running || !command.trim()}
          >
            {running ? t("dialog.running") : t("dialog.run")}
          </button>
        </div>

        {output && (
          <pre className="run-output">{renderOutput(output)}</pre>
        )}

        <div className="dialog-actions">
          {output && (
            <button className="btn" onClick={() => setOutput("")}>
              {t("run.clear")}
            </button>
          )}
          <button className="btn" onClick={onClose}>
            {t("dialog.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
