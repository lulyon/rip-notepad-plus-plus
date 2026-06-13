import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../stores/settingsStore";
import "./PreferencesDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

type PrefTab = "general" | "editing" | "newdoc";

export function PreferencesDialog({ open, onClose }: Props) {
  const { i18n, t } = useTranslation();
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
        <h2>{t("dialog.preferences")}</h2>

        {/* Tab bar */}
        <div className="prefs-tabs">
          {(["general", "editing", "newdoc"] as PrefTab[]).map((tab) => (
            <button
              key={tab}
              className={`prefs-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "general" ? t("preferences.general") : tab === "editing" ? t("preferences.editing") : t("preferences.newDoc")}
            </button>
          ))}
        </div>

        <div className="prefs-body">
          {/* ── General ── */}
          {activeTab === "general" && (
            <div className="prefs-section">
              <label className="prefs-row">
                <span>{t("preferences.theme")}:</span>
                <select
                  value={settings.theme}
                  onChange={(e) => settings.updateSetting("theme", e.target.value as "vs-dark" | "vs" | "hc-black")}
                >
                  <option value="vs-dark">{t("preferences.themeDark")}</option>
                  <option value="vs">{t("preferences.themeLight")}</option>
                  <option value="hc-black">{t("preferences.themeHighContrast")}</option>
                </select>
              </label>

              <label className="prefs-row">
                <span>{t("preferences.fontSize")}:</span>
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
                <span>{t("preferences.fontFamily")}:</span>
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
                <span>{t("preferences.showStatusBar")}</span>
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.showMenuBar}
                  onChange={() => settings.toggleSetting("showMenuBar")}
                />
                <span>{t("preferences.showMenuBar")}</span>
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={() => settings.toggleSetting("autoSave")}
                />
                <span>{t("preferences.autoSave")}</span>
              </label>

              <label className="prefs-row">
                <span>Language / 语言:</span>
                <select
                  value={i18n.language}
                  onChange={(e) => {
                    const lang = e.target.value;
                    i18n.changeLanguage(lang);
                    localStorage.setItem("ripnotepadpp-lang", lang);
                  }}
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>
          )}

          {/* ── Editing ── */}
          {activeTab === "editing" && (
            <div className="prefs-section">
              <label className="prefs-row">
                <span>{t("preferences.tabSize")}:</span>
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
                <span>{t("preferences.insertSpaces")}</span>
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
                <span>{t("preferences.wordWrap")}</span>
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
                <span>{t("preferences.showLineNumbers")}</span>
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.showMinimap}
                  onChange={() => settings.toggleSetting("showMinimap")}
                />
                <span>{t("preferences.showMinimap")}</span>
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.showIndentGuides}
                  onChange={() => settings.toggleSetting("showIndentGuides")}
                />
                <span>{t("preferences.showIndentGuides")}</span>
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.bracketPairColorization}
                  onChange={() =>
                    settings.toggleSetting("bracketPairColorization")
                  }
                />
                <span>{t("preferences.bracketColorization")}</span>
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.smoothScrolling}
                  onChange={() => settings.toggleSetting("smoothScrolling")}
                />
                <span>{t("preferences.smoothScrolling")}</span>
              </label>

              <label className="prefs-row">
                <input
                  type="checkbox"
                  checked={settings.scrollBeyondLastLine}
                  onChange={() => settings.toggleSetting("scrollBeyondLastLine")}
                />
                <span>{t("preferences.scrollBeyondLastLine")}</span>
              </label>

              <label className="prefs-row">
                <span>{t("preferences.renderWhitespace")}:</span>
                <select
                  value={settings.renderWhitespace}
                  onChange={(e) =>
                    settings.updateSetting("renderWhitespace", e.target.value as "selection" | "none" | "all")
                  }
                >
                  <option value="none">{t("preferences.whitespaceNone")}</option>
                  <option value="selection">{t("preferences.whitespaceSelection")}</option>
                  <option value="all">{t("preferences.whitespaceAll")}</option>
                </select>
              </label>
            </div>
          )}

          {/* ── New Document ── */}
          {activeTab === "newdoc" && (
            <div className="prefs-section">
              <label className="prefs-row">
                <span>{t("preferences.defaultEncoding")}:</span>
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
                <span>{t("preferences.defaultLanguage")}:</span>
                <select
                  value={settings.defaultLanguage}
                  onChange={(e) =>
                    settings.updateSetting("defaultLanguage", e.target.value)
                  }
                >
                  <option value="plaintext">{t("menu.language.plaintext")}</option>
                  <option value="javascript">{t("menu.language.javascript")}</option>
                  <option value="typescript">{t("menu.language.typescript")}</option>
                  <option value="python">{t("menu.language.python")}</option>
                  <option value="rust">{t("menu.language.rust")}</option>
                </select>
              </label>

              <label className="prefs-row">
                <span>{t("preferences.eol")}:</span>
                <select
                  value={settings.defaultEol}
                  onChange={(e) =>
                    settings.updateSetting("defaultEol", e.target.value as "LF" | "CRLF" | "CR")
                  }
                >
                  <option value="LF">{t("preferences.eolLf")}</option>
                  <option value="CRLF">{t("preferences.eolCrlf")}</option>
                  <option value="CR">{t("preferences.eolCr")}</option>
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onClose}>
            {t("dialog.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
