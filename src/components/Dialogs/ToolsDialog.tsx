import { useState } from "react";
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
  const { tools, addTool, updateTool, removeTool } = useToolStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [cwd, setCwd] = useState("");
  const [shortcut, setShortcut] = useState("");

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

  const handleEdit = (t: ExternalTool) => {
    setEditingId(t.id); setName(t.name); setCommand(t.command); setCwd(t.cwd); setShortcut(t.shortcut);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog tools-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>External Tools</h2>

        <div className="tools-list">
          {tools.length === 0 && <p className="tools-empty">No tools configured. Add one below.</p>}
          {tools.map((t) => (
            <div key={t.id} className="tools-item">
              <div>
                <strong>{t.name}</strong>
                <span className="tools-cmd">{t.command}</span>
                {t.shortcut && <span className="tools-key">{t.shortcut}</span>}
              </div>
              <div>
                <button className="sbtn" onClick={() => handleEdit(t)}>Edit</button>
                <button className="sbtn" onClick={() => removeTool(t.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        <div className="tools-form">
          <h3>{editingId ? "Edit Tool" : "Add Tool"}</h3>
          <input className="tools-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tool name" />
          <input className="tools-input" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Command (e.g. npm run build)" />
          <input className="tools-input" value={cwd} onChange={(e) => setCwd(e.target.value)} placeholder="Working dir (empty = project root)" />
          <input className="tools-input" value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder="Shortcut (e.g. Ctrl+Shift+1)" />
          <div className="tools-vars">
            <span className="tools-vars-label">Variables:</span>
            {VARIABLES.map((v) => (
              <button key={v} className="tools-var-btn" onClick={() => setCommand(command + " " + v)}>{v}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleAdd}>
            {editingId ? "Update" : "Add"}
          </button>
          {editingId && <button className="btn" onClick={() => { setEditingId(null); setName(""); setCommand(""); setCwd(""); setShortcut(""); }}>Cancel</button>}
        </div>

        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
