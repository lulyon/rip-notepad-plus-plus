import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchStore } from "../../stores/searchStore";
import { useEditorRefStore } from "../../stores/editorRefStore";
import "./SearchPanel.css";

export function SearchPanel() {
  const { t } = useTranslation();
  const findText = useSearchStore((s) => s.findText);
  const replaceText = useSearchStore((s) => s.replaceText);
  const isRegex = useSearchStore((s) => s.isRegex);
  const caseSensitive = useSearchStore((s) => s.caseSensitive);
  const wholeWord = useSearchStore((s) => s.wholeWord);
  const wrapSearch = useSearchStore((s) => s.wrapSearch);
  const findPanelOpen = useSearchStore((s) => s.findPanelOpen);
  const replaceMode = useSearchStore((s) => s.replaceMode);
  const matchCount = useSearchStore((s) => s.matchCount);
  const currentMatchIndex = useSearchStore((s) => s.currentMatchIndex);
  const findInFilesRoot = useSearchStore((s) => s.findInFilesRoot);
  const findInFilesFilePattern = useSearchStore((s) => s.findInFilesFilePattern);
  const findInFilesResults = useSearchStore((s) => s.findInFilesResults);
  const findInFilesSearching = useSearchStore((s) => s.findInFilesSearching);

  const setFindText = useSearchStore((s) => s.setFindText);
  const setReplaceText = useSearchStore((s) => s.setReplaceText);
  const setOptions = useSearchStore((s) => s.setOptions);
  const toggleFindPanel = useSearchStore((s) => s.toggleFindPanel);
  const toggleReplacePanel = useSearchStore((s) => s.toggleReplacePanel);
  const closePanel = useSearchStore((s) => s.closePanel);
  const setFindInFilesRoot = useSearchStore((s) => s.setFindInFilesRoot);
  const setFindInFilesFilePattern = useSearchStore((s) => s.setFindInFilesFilePattern);
  const find = useSearchStore((s) => s.find);
  const findNext = useSearchStore((s) => s.findNext);
  const findPrev = useSearchStore((s) => s.findPrev);
  const replaceOne = useSearchStore((s) => s.replaceOne);
  const replaceAll = useSearchStore((s) => s.replaceAll);
  const markAll = useSearchStore((s) => s.markAll);
  const findInFiles = useSearchStore((s) => s.findInFiles);
  const clearFindInFilesResults = useSearchStore((s) => s.clearFindInFilesResults);
  const navigateToMatch = useSearchStore((s) => s.navigateToMatch);

  const editorRef = useEditorRefStore((s) => s.editorRef);

  const findInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"find" | "findInFiles">("find");

  // Focus find input when panel opens
  useEffect(() => {
    if (findPanelOpen) {
      setTimeout(() => findInputRef.current?.focus(), 50);
      // Select all text in input for quick re-typing
      findInputRef.current?.select();
    }
  }, [findPanelOpen]);

  // Listen for Ctrl+F / Ctrl+H custom events
  useEffect(() => {
    function onToggleFind() {
      toggleFindPanel();
    }
    function onToggleReplace() {
      toggleReplacePanel();
    }
    window.addEventListener("toggle-find-panel", onToggleFind);
    window.addEventListener("toggle-replace-panel", onToggleReplace);
    return () => {
      window.removeEventListener("toggle-find-panel", onToggleFind);
      window.removeEventListener("toggle-replace-panel", onToggleReplace);
    };
  }, [toggleFindPanel, toggleReplacePanel]);

  // F3 = Find Next
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!findPanelOpen) return;
      if (e.key === "Escape") {
        closePanel();
        if (editorRef) editorRef.focus();
      }
      if (e.key === "F3") {
        e.preventDefault();
        if (e.shiftKey) {
          if (editorRef) findPrev(editorRef);
        } else {
          if (editorRef) findNext(editorRef);
        }
      }
      if (e.key === "Enter" && document.activeElement === findInputRef.current) {
        e.preventDefault();
        if (editorRef) findNext(editorRef);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [findPanelOpen, editorRef, findNext, findPrev, closePanel]);

  const [incremental, setIncremental] = useState(false);
  const [inSelection, setInSelection] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<{ line: number; before: string; after: string }[]>([]);
  const [regexDropdown, setRegexDropdown] = useState(false);

  const REGEX_TEMPLATES = [
    { name: "Email", pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}" },
    { name: "URL", pattern: "https?://[\\w.-]+(:\\d+)?(/[\\w./%-]*)?" },
    { name: "Integer", pattern: "-?\\d+" },
    { name: "Decimal", pattern: "-?\\d+\\.\\d+" },
    { name: "Date (YYYY-MM-DD)", pattern: "\\d{4}-\\d{2}-\\d{2}" },
    { name: "Hex Color", pattern: "#[0-9a-fA-F]{3,8}" },
    { name: "Identifier", pattern: "[a-zA-Z_$][\\w$]{0,30}" },
    { name: "Mobile (CN)", pattern: "1[3-9]\\d{9}" },
    { name: "IP Address", pattern: "(?:\\d{1,3}\\.){3}\\d{1,3}" },
    { name: "Time (HH:MM:SS)", pattern: "\\d{2}:\\d{2}(:\\d{2})?" },
    { name: "Markdown Link", pattern: "\\[([^\\]]+)\\]\\(([^)]+)\\)" },
  ];

  const handleFind = useCallback(() => {
    if (editorRef) find(editorRef);
  }, [editorRef, find]);

  // Incremental search: re-find on every keystroke
  const handleFindInputChange = useCallback((val: string) => {
    setFindText(val);
    if (incremental && val && editorRef) {
      const state = useSearchStore.getState();
      state.find(editorRef);
    }
  }, [incremental, setFindText, editorRef]);

  // Replace preview: collect all matches before replacing
  const handleReplacePreview = useCallback(() => {
    if (!editorRef) return;
    const model = editorRef.getModel();
    if (!model || !findText) return;

    const matches = model.findMatches(
      findText, true, isRegex, caseSensitive, wholeWord ? " " : null, false
    );
    const items = matches.map((m) => {
      const line = m.range.startLineNumber;
      const lineText = model.getLineContent(line);
      const before = lineText.substring(Math.max(0, m.range.startColumn - 1 - 20), Math.min(lineText.length, m.range.endColumn - 1 + 20));
      const after = replaceText
        ? lineText.substring(0, m.range.startColumn - 1) + replaceText + lineText.substring(m.range.endColumn - 1)
        : lineText;
      return { line, before: before.trim(), after: after.substring(0, 100).trim() };
    });
    setPreviewItems(items);
    setPreviewOpen(true);
  }, [editorRef, findText, isRegex, caseSensitive, wholeWord, replaceText]);

  const handleReplaceAllConfirm = useCallback(() => {
    if (editorRef) replaceAll(editorRef);
    setPreviewOpen(false);
  }, [editorRef, replaceAll]);

  const handleFindNext = useCallback(() => {
    if (editorRef) findNext(editorRef);
  }, [editorRef, findNext]);

  const handleFindPrev = useCallback(() => {
    if (editorRef) findPrev(editorRef);
  }, [editorRef, findPrev]);

  const handleReplaceOne = useCallback(() => {
    if (editorRef) replaceOne(editorRef);
  }, [editorRef, replaceOne]);

  const handleReplaceAll = useCallback(() => {
    if (editorRef) replaceAll(editorRef);
  }, [editorRef, replaceAll]);

  const handleMarkAll = useCallback(() => {
    if (editorRef) markAll(editorRef);
  }, [editorRef, markAll]);

  const handleFindInFiles = useCallback(() => {
    findInFiles();
  }, [findInFiles]);

  if (!findPanelOpen) return null;

  return (
    <div className="search-panel">
      {/* Tab bar */}
      <div className="search-tabs">
        <button
          className={`search-tab ${activeTab === "find" ? "active" : ""}`}
          onClick={() => setActiveTab("find")}
        >
          {t("search.findReplace")}
        </button>
        <button
          className={`search-tab ${activeTab === "findInFiles" ? "active" : ""}`}
          onClick={() => setActiveTab("findInFiles")}
        >
          {t("search.inFiles")}
        </button>
        <button className="search-close" onClick={closePanel}>
          ×
        </button>
      </div>

      {activeTab === "find" && (
        <div className="search-body">
          {/* Find input */}
          <div className="search-row">
            <label>{t("search.findLabel")}:</label>
            <input
              ref={findInputRef}
              type="text"
              className="search-input"
              value={findText}
              onChange={(e) => handleFindInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFindNext();
              }}
              placeholder={t("search.findPlaceholder")}
            />
            <div className="search-regex-dropdown" style={{ position: "relative" }}>
              <button className="sbtn" onClick={() => setRegexDropdown(!regexDropdown)} title="Regex templates"
                style={{ padding: "4px 6px", fontSize: "12px" }}>📋</button>
              {regexDropdown && (
                <div className="search-regex-menu">
                  {REGEX_TEMPLATES.map((t) => (
                    <div key={t.name} className="search-regex-item" onClick={() => {
                      handleFindInputChange(t.pattern);
                      setOptions({ isRegex: true });
                      setRegexDropdown(false);
                      findInputRef.current?.focus();
                    }}>{t.name}</div>
                  ))}
                </div>
              )}
            </div>
            <span className="search-stats">
              {matchCount > 0 &&
                t("search.matchStats", { current: currentMatchIndex + 1, count: matchCount })}
            </span>
          </div>

          {/* Replace input (only in replace mode) */}
          {replaceMode && (
            <div className="search-row">
              <label>{t("search.replaceLabel")}:</label>
              <input
                type="text"
                className="search-input"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder={t("search.replacePlaceholder")}
              />
            </div>
          )}

          {/* Options */}
          <div className="search-options">
            <label className="search-option">
              <input
                type="checkbox"
                checked={isRegex}
                onChange={() => setOptions({ isRegex: !isRegex })}
              />
              {t("search.regex")}
            </label>
            <label className="search-option">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={() => setOptions({ caseSensitive: !caseSensitive })}
              />
              {t("search.matchCase")}
            </label>
            <label className="search-option">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={() => setOptions({ wholeWord: !wholeWord })}
              />
              {t("search.wholeWord")}
            </label>
            <label className="search-option">
              <input
                type="checkbox"
                checked={wrapSearch}
                onChange={() => setOptions({ wrapSearch: !wrapSearch })}
              />
              {t("search.wrap")}
            </label>
            <label className="search-option">
              <input type="checkbox" checked={incremental} onChange={() => setIncremental(!incremental)} />
              {t("search.incremental")}
            </label>
            <label className="search-option">
              <input type="checkbox" checked={inSelection} onChange={() => setInSelection(!inSelection)} />
              {t("search.inSelection")}
            </label>
          </div>

          {/* Action buttons */}
          <div className="search-actions">
            <button className="sbtn sbtn-primary" onClick={handleFind}>
              {t("search.findLabel")}
            </button>
            <button className="sbtn" onClick={handleFindNext}>
              {t("search.findNextBtn")}
            </button>
            <button className="sbtn" onClick={handleFindPrev}>
              {t("search.findPrevBtn")}
            </button>
            {replaceMode && (
              <>
                <button className="sbtn" onClick={handleReplaceOne}>
                  {t("search.replaceBtn")}
                </button>
                <button className="sbtn" onClick={handleReplacePreview}>
                  {t("search.preview")}
                </button>
                <button className="sbtn" onClick={handleReplaceAll}>
                  {t("search.replaceAllBtn")}
                </button>
              </>
            )}
            <button className="sbtn" onClick={handleMarkAll}>
              {t("search.markAllBtn")}
            </button>
            {!replaceMode && (
              <button
                className="sbtn"
                onClick={() => toggleReplacePanel()}
              >
                {t("search.replaceMode")}
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === "findInFiles" && (
        <div className="search-body">
          <div className="search-row">
            <label>{t("search.findLabel")}:</label>
            <input
              type="text"
              className="search-input"
              value={findText}
              onChange={(e) => handleFindInputChange(e.target.value)}
              placeholder={t("search.findInFilesPlaceholder")}
            />
          </div>
          <div className="search-row">
            <label>{t("search.directory")}:</label>
            <input
              type="text"
              className="search-input"
              value={findInFilesRoot}
              onChange={(e) => setFindInFilesRoot(e.target.value)}
              placeholder={t("search.directoryPlaceholder")}
            />
          </div>
          <div className="search-row">
            <label>{t("search.filePattern")}:</label>
            <input
              type="text"
              className="search-input"
              value={findInFilesFilePattern}
              onChange={(e) => setFindInFilesFilePattern(e.target.value)}
              placeholder={t("search.filePatternPlaceholder")}
            />
          </div>

          <div className="search-actions">
            <button
              className="sbtn sbtn-primary"
              onClick={handleFindInFiles}
              disabled={findInFilesSearching}
            >
              {findInFilesSearching ? t("search.searching") : t("search.searchBtn")}
            </button>
            <button
              className="sbtn"
              onClick={clearFindInFilesResults}
              disabled={findInFilesResults.length === 0}
            >
              {t("search.clear")}
            </button>
          </div>

          {/* Results */}
          {findInFilesResults.length > 0 && (
            <div className="find-in-files-results">
              <div className="results-header">
                {t("search.resultsCount", { count: findInFilesResults.length })}
              </div>
              <div className="results-list">
                {findInFilesResults.map((match, i) => (
                  <div
                    key={i}
                    className="result-item"
                    onClick={() => navigateToMatch(match)}
                  >
                    <span className="result-file">
                      {match.path.split(/[/\\]/).pop()}
                    </span>
                    <span className="result-line">:{match.line_number}</span>
                    <span className="result-content">
                      {match.line_content.trim()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Replace Preview Dialog */}
      {previewOpen && (
        <div className="search-preview-overlay" onClick={() => setPreviewOpen(false)}>
          <div className="search-preview-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{t("search.previewTitle", { count: previewItems.length })}</h3>
            <div className="search-preview-list">
              {previewItems.map((item, i) => (
                <div key={i} className="search-preview-item">
                  <span className="search-preview-line">Ln {item.line}</span>
                  <span className="search-preview-before">− {item.before}</span>
                  <span className="search-preview-after">+ {item.after}</span>
                </div>
              ))}
            </div>
            <div className="search-preview-actions">
              <button className="sbtn sbtn-primary" onClick={handleReplaceAllConfirm}>{t("search.replaceAll")}</button>
              <button className="sbtn" onClick={() => setPreviewOpen(false)}>{t("search.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
