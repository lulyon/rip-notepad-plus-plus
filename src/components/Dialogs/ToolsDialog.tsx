import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToolStore, ExternalTool } from "../../stores/toolStore";
import "./ToolsDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

function genId() { return `tool_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

const VARIABLES = [
  "$(FULL_CURRENT_PATH)", "$(CURRENT_DIRECTORY)", "$(FILE_NAME)",
  "$(NAME_PART)", "$(EXT_PART)", "$(CURRENT_WORD)",
  "$(CURRENT_LINE)", "$(CURRENT_COLUMN)", "$(PROJECT_ROOT)", "$(NPP_DIRECTORY)",
];

export function ToolsDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { tools, addTool, updateTool, removeTool } = useToolStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [cwd, setCwd] = useState("");
  const [shortcut, setShortcut] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleAdd = () => {
    if (!name.trim() || !command.trim()) return;
    if (editingId) {
      updateTool(editingId, { name: name.trim(), command: command.trim(), cwd: cwd.trim(), shortcut: shortcut.trim() });
      setEditingId(null);
    } else {
      addTool({ id: genId(), name: name.trim(), command: command.trim(), cwd: cwd.trim(), shortcut: shortcut.trim() });
    }
    setName(""); setCommand(""); setCwd(""); setShortcut("");
  };

  const handleEdit = (tool: ExternalTool) => {
    setEditingId(tool.id); setName(tool.name); setCommand(tool.command); setCwd(tool.cwd); setShortcut(tool.shortcut);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog tools-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t("tools.title")}</h2>

        <div className="tools-list">
          {tools.length === 0 && <p className="tools-empty">{t("tools.empty")}</p>}
          {tools.map((tool) => (
            <div key={tool.id} className="tools-item">
              <div>
                <strong>{tool.name}</strong>
                <span className="tools-cmd">{tool.command}</span>
                {tool.shortcut && <span className="tools-key">{tool.shortcut}</span>}
              </div>
              <div>
                <button className="sbtn" onClick={() => handleEdit(tool)}>{t("tools.edit")}</button>
                <button className="sbtn" onClick={() => removeTool(tool.id)}>{t("tools.remove")}</button>
              </div>
            </div>
          ))}
        </div>

        <div className="tools-form">
          <h3>{editingId ? t("tools.editTool") : t("tools.addTool")}</h3>
          <input className="tools-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("tools.name")} />
          <input className="tools-input" value={command} onChange={(e) => setCommand(e.target.value)} placeholder={t("tools.command")} />
          <input className="tools-input" value={cwd} onChange={(e) => setCwd(e.target.value)} placeholder={t("tools.cwd")} />
          <input className="tools-input" value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder={t("tools.shortcut")} />
          <div className="tools-vars">
            <span className="tools-vars-label">{t("tools.variables")}</span>
            {VARIABLES.map((v) => (
              <button key={v} className="tools-var-btn" onClick={() => setCommand(command + " " + v)}>{v}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleAdd}>
            {editingId ? t("tools.update") : t("tools.add")}
          </button>
          {editingId && <button className="btn" onClick={() => { setEditingId(null); setName(""); setCommand(""); setCwd(""); setShortcut(""); }}>{t("tools.cancel")}</button>}
        </div>

        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onClose}>{t("dialog.close")}</button>
        </div>
      </div>
    </div>
  );
}
