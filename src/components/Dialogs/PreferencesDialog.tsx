import { useState, useEffect } from "react";
import { useSettingsStore } from "../../stores/settingsStore";
import "./PreferencesDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

type PrefTab = "general" | "editing" | "newdoc";

export function PreferencesDialog({ open, onClose }: Props) {
  const settings = useSettingsStore();
  const [activeTab, setActiveTab] = useState<PrefTab>("general");

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog prefs-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Preferences</h2>

        {/* Tab bar */}
        <div className="prefs-tabs">
          {(["general", "editing", "newdoc"] as PrefTab[]).map((tab) => (
            <button
              key={tab}
              className={`prefs-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "general" ? "General" : tab === "editing" ? "Editing" : "New Document"}
            </button>
          ))}
        </div>

        <div className="prefs-body">
          {/* ── General ── */}
          {activeTab === "general" && (
            <div className="prefs-section">
              <label className="prefs-row">
                <span>Theme:</span>
                <select
                  value={settings.theme}
                  onChange={(e) => settings.updateSetting("theme", e.target.value as "vs-dark" | "vs" | "hc-black")}
                >
                  <option value="vs-dark">Dark (VS Dark)</option>
                  <option value="vs">Light (VS)</option>
                  <option value="hc-black">High Contrast</option>
                </select>
              </label>

              <label className="prefs-row">
                <span>Font size:</span>
                <input
                  type="number"
                  min={8}
                  max={72}
                  value={settings.fontSize}
                  onChange={(e) =>
                    settings.updateSetting("fontSize", Number(e.target.value))
                  }
                />
              </label>

              <label className="prefs-row">
                <span>Font family:</span>
                <input
                  type="text"
                  value={settings.fontFamily}
                  onChange={(e) =>
                    settings.updateSetting("fontFamily", e.target.value)
                  }
                />
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.showStatusBar}
                  onChange={() => settings.toggleSetting("showStatusBar")}
                />
                <span>Show status bar</span>
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.showMenuBar}
                  onChange={() => settings.toggleSetting("showMenuBar")}
                />
                <span>Show menu bar (Alt to toggle)</span>
              </label>
            </div>
          )}

          {/* ── Editing ── */}
          {activeTab === "editing" && (
            <div className="prefs-section">
              <label className="prefs-row">
                <span>Tab size:</span>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={settings.tabSize}
                  onChange={(e) =>
                    settings.updateSetting("tabSize", Number(e.target.value))
                  }
                />
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.insertSpaces}
                  onChange={() => settings.toggleSetting("insertSpaces")}
                />
                <span>Insert spaces instead of tabs</span>
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.wordWrap === "on"}
                  onChange={() =>
                    settings.updateSetting(
                      "wordWrap",
                      settings.wordWrap === "on" ? "off" : "on",
                    )
                  }
                />
                <span>Word wrap</span>
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.lineNumbers === "on"}
                  onChange={() =>
                    settings.updateSetting(
                      "lineNumbers",
                      settings.lineNumbers === "on" ? "off" : "on",
                    )
                  }
                />
                <span>Show line numbers</span>
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.showMinimap}
                  onChange={() => settings.toggleSetting("showMinimap")}
                />
                <span>Show minimap</span>
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.showIndentGuides}
                  onChange={() => settings.toggleSetting("showIndentGuides")}
                />
                <span>Show indent guides</span>
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.bracketPairColorization}
                  onChange={() =>
                    settings.toggleSetting("bracketPairColorization")
                  }
                />
                <span>Bracket pair colorization</span>
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.smoothScrolling}
                  onChange={() => settings.toggleSetting("smoothScrolling")}
                />
                <span>Smooth scrolling</span>
              </label>

              <label className="prefs-row">
                <span>Whitespace:</span>
                <select
                  value={settings.renderWhitespace}
                  onChange={(e) =>
                    settings.updateSetting("renderWhitespace", e.target.value as "selection" | "none" | "all")
                  }
                >
                  <option value="none">None</option>
                  <option value="selection">Selection</option>
                  <option value="all">All</option>
                </select>
              </label>
            </div>
          )}

          {/* ── New Document ── */}
          {activeTab === "newdoc" && (
            <div className="prefs-section">
              <label className="prefs-row">
                <span>Default encoding:</span>
                <select
                  value={settings.defaultEncoding}
                  onChange={(e) =>
                    settings.updateSetting("defaultEncoding", e.target.value)
                  }
                >
                  <option value="UTF-8">UTF-8</option>
                  <option value="UTF-16LE">UTF-16 LE</option>
                  <option value="UTF-16BE">UTF-16 BE</option>
                  <option value="GBK">GBK</option>
                  <option value="Shift_JIS">Shift-JIS</option>
                </select>
              </label>

              <label className="prefs-row">
                <span>Default language:</span>
                <select
                  value={settings.defaultLanguage}
                  onChange={(e) =>
                    settings.updateSetting("defaultLanguage", e.target.value)
                  }
                >
                  <option value="plaintext">Plain Text</option>
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="rust">Rust</option>
                </select>
              </label>

              <label className="prefs-row">
                <span>EOL:</span>
                <select
                  value={settings.defaultEol}
                  onChange={(e) =>
                    settings.updateSetting("defaultEol", e.target.value as "LF" | "CRLF" | "CR")
                  }
                >
                  <option value="LF">LF (Unix/macOS)</option>
                  <option value="CRLF">CRLF (Windows)</option>
                  <option value="CR">CR (Classic Mac)</option>
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
