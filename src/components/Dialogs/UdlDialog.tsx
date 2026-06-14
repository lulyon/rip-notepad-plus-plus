import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import MonacoEditor from "@monaco-editor/react";
import { useUdlStore, createDefaultUdl } from "../../stores/udlStore";
import type { UdlConfig } from "../../stores/udlStore";
import { compileUdl, registerAllUdls } from "../../lib/udlCompiler";
import "./UdlDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

type UdlTab = "basic" | "keywords" | "syntax" | "preview";

const DEFAULT_SAMPLE = `// This is a sample file
/*
 * Block comment demo
 */

function hello() {
  // Print greeting
  print("Hello, World!");
  var x = 42;
  if (x > 0) {
    return x + 1;
  }
  return -1;
}`;

export function UdlDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const udls = useUdlStore((s) => s.udls);
  const addUdl = useUdlStore((s) => s.addUdl);
  const updateUdl = useUdlStore((s) => s.updateUdl);
  const deleteUdl = useUdlStore((s) => s.deleteUdl);

  const [activeTab, setActiveTab] = useState<UdlTab>("basic");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UdlConfig>(createDefaultUdl());
  const [sampleCode, setSampleCode] = useState(DEFAULT_SAMPLE);
  const [showList, setShowList] = useState(true);

  // Reset form when opening / switching edit target
  useEffect(() => {
    if (open) {
      setShowList(true);
      setEditingId(null);
      setActiveTab("basic");
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleFieldChange = (
    field: keyof UdlConfig,
    value: string | string[] | boolean,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleExtensionsChange = (val: string) => {
    const parts = val
      .split(",")
      .map((s) => s.trim().replace(/^\./, ""))
      .filter(Boolean);
    setForm((prev) => ({ ...prev, extensions: parts }));
  };

  const handleKeywordChange = (index: number, value: string) => {
    const keywords = [...form.keywords];
    keywords[index] = value;
    setForm((prev) => ({ ...prev, keywords }));
  };

  const handleKeywordColorChange = (index: number, color: string) => {
    const colors = [...form.keywordColors];
    colors[index] = color;
    setForm((prev) => ({ ...prev, keywordColors: colors }));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const trimmed: UdlConfig = {
      ...form,
      name: form.name.trim(),
      keywords: form.keywords.map((k) => k.trim()),
    };

    if (editingId) {
      updateUdl(editingId, trimmed);
    } else {
      addUdl({ ...trimmed, id: createDefaultUdl().id });
    }

    // Re-register all UDLs with Monaco so changes take effect immediately
    const updatedUdls = useUdlStore.getState().udls;
    registerAllUdls(updatedUdls);

    setShowList(true);
    setEditingId(null);
  };

  const handleEdit = (udl: UdlConfig) => {
    setForm({ ...udl });
    setEditingId(udl.id);
    setShowList(false);
    setActiveTab("basic");
  };

  const handleNew = () => {
    setForm(createDefaultUdl());
    setEditingId(null);
    setShowList(false);
    setActiveTab("basic");
  };

  const handleDelete = (id: string) => {
    if (confirm(t("udl.confirmDelete") || "Delete this language?")) {
      deleteUdl(id);
    }
  };

  // ── Compile the current form for preview ──
  const previewLanguageId = useMemo(() => {
    if (!form.name.trim()) return "plaintext";
    const compiled = compileUdl(form);
    return compiled.id;
  }, [form]);

  // Register preview language with Monaco
  const handlePreviewMount: Parameters<typeof MonacoEditor>[0]["onMount"] = (
    _editor,
    monaco,
  ) => {
    if (!form.name.trim()) return;
    try {
      const compiled = compileUdl(form);
      const exists = monaco.languages
        .getLanguages()
        .some((l) => l.id === compiled.id);
      if (!exists) {
        monaco.languages.register({ id: compiled.id });
      }
      monaco.languages.setMonarchTokensProvider(compiled.id, compiled.language);
    } catch (err) {
      console.error("UDL compile error:", err);
    }
  };

  if (!open) return null;

  // ── List view (language selector) ──
  if (showList) {
    return (
      <div className="dialog-overlay" onClick={onClose}>
        <div className="dialog udl-dialog" onClick={(e) => e.stopPropagation()}>
          <h2>{t("dialog.udl")}</h2>

          {udls.length === 0 ? (
            <div className="udl-empty">{t("udl.noLanguages")}</div>
          ) : (
            <div className="udl-list">
              {udls.map((udl) => (
                <div key={udl.id} className="udl-list-item">
                  <div>
                    <span className="udl-list-item-name">{udl.name}</span>
                    {udl.extensions.length > 0 && (
                      <span className="udl-list-item-ext">
                        .{udl.extensions.join(", .")}
                      </span>
                    )}
                  </div>
                  <div className="udl-list-item-actions">
                    <button
                      className="udl-edit-btn"
                      onClick={() => handleEdit(udl)}
                    >
                      {t("dialog.edit")}
                    </button>
                    <button
                      className="udl-delete-btn"
                      onClick={() => handleDelete(udl.id)}
                    >
                      {t("udl.delete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="dialog-actions">
            <button className="btn btn-primary" onClick={handleNew}>
              {t("udl.createNew")}
            </button>
            <button className="btn" onClick={onClose}>
              {t("dialog.close")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Editor view ──
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog udl-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>
          {editingId
            ? `${t("menu.language.defineLanguage")} - ${form.name || t("udl.unnamed")}`
            : t("menu.language.defineLanguage")}
        </h2>

        {/* Tab bar */}
        <div className="udl-tabs">
          {(["basic", "keywords", "syntax", "preview"] as UdlTab[]).map(
            (tab) => (
              <button
                key={tab}
                className={`udl-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {t(`udl.${tab}`)}
              </button>
            ),
          )}
        </div>

        <div className="udl-body">
          {/* ── Basic Tab ── */}
          {activeTab === "basic" && (
            <div className="udl-section">
              <div className="udl-row">
                <span className="udl-row-label">{t("udl.name")}</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  placeholder={t("udl.namePlaceholder")}
                />
              </div>
              <div className="udl-row">
                <span className="udl-row-label">{t("udl.extensions")}</span>
                <input
                  type="text"
                  className="udl-ext-input"
                  value={form.extensions.join(", ")}
                  onChange={(e) => handleExtensionsChange(e.target.value)}
                  placeholder="dsl, mylang"
                />
              </div>
              <div className="udl-checkbox-row">
                <input
                  type="checkbox"
                  id="udl-case-sensitive"
                  checked={form.caseSensitive}
                  onChange={(e) =>
                    handleFieldChange("caseSensitive", e.target.checked)
                  }
                />
                <label htmlFor="udl-case-sensitive">
                  {t("udl.caseSensitive")}
                </label>
              </div>
              <div className="udl-checkbox-row">
                <input
                  type="checkbox"
                  id="udl-auto-indent"
                  checked={form.autoIndent}
                  onChange={(e) =>
                    handleFieldChange("autoIndent", e.target.checked)
                  }
                />
                <label htmlFor="udl-auto-indent">
                  {t("udl.autoIndent")}
                </label>
              </div>
            </div>
          )}

          {/* ── Keywords Tab ── */}
          {activeTab === "keywords" && (
            <div className="udl-section">
              {form.keywords.map((group, i) => (
                <div key={i} className="udl-row">
                  <span className="udl-row-label">
                    {t("udl.keywordGroup", { n: i + 1 })}
                  </span>
                  <input
                    type="color"
                    className="udl-color-picker"
                    value={form.keywordColors[i] || "#000000"}
                    onChange={(e) =>
                      handleKeywordColorChange(i, e.target.value)
                    }
                    title={form.keywordColors[i]}
                  />
                  <textarea
                    value={group}
                    onChange={(e) => handleKeywordChange(i, e.target.value)}
                    placeholder="if else while for return"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Syntax Tab ── */}
          {activeTab === "syntax" && (
            <div className="udl-section">
              <div className="udl-row">
                <span className="udl-row-label">{t("udl.lineComment")}</span>
                <input
                  type="text"
                  value={form.lineComment}
                  onChange={(e) =>
                    handleFieldChange("lineComment", e.target.value)
                  }
                  placeholder="//"
                />
              </div>
              <div className="udl-row">
                <span className="udl-row-label">
                  {t("udl.blockCommentStart")}
                </span>
                <input
                  type="text"
                  value={form.blockCommentStart}
                  onChange={(e) =>
                    handleFieldChange("blockCommentStart", e.target.value)
                  }
                  placeholder="/*"
                />
              </div>
              <div className="udl-row">
                <span className="udl-row-label">
                  {t("udl.blockCommentEnd")}
                </span>
                <input
                  type="text"
                  value={form.blockCommentEnd}
                  onChange={(e) =>
                    handleFieldChange("blockCommentEnd", e.target.value)
                  }
                  placeholder="*/"
                />
              </div>
              <div className="udl-row">
                <span className="udl-row-label">{t("udl.operators")}</span>
                <input
                  type="text"
                  value={form.operators}
                  onChange={(e) =>
                    handleFieldChange("operators", e.target.value)
                  }
                  placeholder="+-*/=<>!&|~^%"
                />
              </div>
              <div className="udl-row">
                <span className="udl-row-label">{t("udl.delimiters")}</span>
                <input
                  type="text"
                  value={form.delimiters}
                  onChange={(e) =>
                    handleFieldChange("delimiters", e.target.value)
                  }
                  placeholder="() [] {}"
                />
              </div>
              <div className="udl-row">
                <span className="udl-row-label">{t("udl.stringChars")}</span>
                <input
                  type="text"
                  value={form.stringChars}
                  onChange={(e) =>
                    handleFieldChange("stringChars", e.target.value)
                  }
                  placeholder={`"'`}
                />
              </div>
            </div>
          )}

          {/* ── Preview Tab ── */}
          {activeTab === "preview" && (
            <div className="udl-preview-section">
              <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {t("udl.sampleCode")}
              </label>
              <textarea
                className="udl-preview-textarea"
                value={sampleCode}
                onChange={(e) => setSampleCode(e.target.value)}
              />
              <div className="udl-preview-editor">
                <MonacoEditor
                  height="100%"
                  language={previewLanguageId}
                  value={sampleCode}
                  theme="vs-dark"
                  onMount={handlePreviewMount}
                  options={{
                    minimap: { enabled: false },
                    readOnly: true,
                    fontSize: 12,
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    padding: { top: 4 },
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="udl-actions">
          <button className="btn" onClick={() => setShowList(true)}>
            {t("dialog.cancel")}
          </button>
          {editingId && (
            <button
              className="btn btn-danger"
              onClick={() => {
                handleDelete(editingId);
                setShowList(true);
              }}
            >
              {t("udl.delete")}
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!form.name.trim()}
          >
            {t("udl.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
