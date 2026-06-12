import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchStore } from "../../stores/searchStore";
import { useEditorRefStore } from "../../stores/editorRefStore";
import "./SearchPanel.css";

export function SearchPanel() {
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

  const handleFind = useCallback(() => {
    if (editorRef) find(editorRef);
  }, [editorRef, find]);

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
          Find / Replace
        </button>
        <button
          className={`search-tab ${activeTab === "findInFiles" ? "active" : ""}`}
          onClick={() => setActiveTab("findInFiles")}
        >
          Find in Files
        </button>
        <button className="search-close" onClick={closePanel}>
          ×
        </button>
      </div>

      {activeTab === "find" && (
        <div className="search-body">
          {/* Find input */}
          <div className="search-row">
            <label>Find:</label>
            <input
              ref={findInputRef}
              type="text"
              className="search-input"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFindNext();
              }}
              placeholder="Search text or regex..."
            />
            <span className="search-stats">
              {matchCount > 0 &&
                `${currentMatchIndex + 1} of ${matchCount}`}
            </span>
          </div>

          {/* Replace input (only in replace mode) */}
          {replaceMode && (
            <div className="search-row">
              <label>Replace:</label>
              <input
                type="text"
                className="search-input"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replacement text..."
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
              Regex
            </label>
            <label className="search-option">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={() => setOptions({ caseSensitive: !caseSensitive })}
              />
              Match case
            </label>
            <label className="search-option">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={() => setOptions({ wholeWord: !wholeWord })}
              />
              Whole word
            </label>
            <label className="search-option">
              <input
                type="checkbox"
                checked={wrapSearch}
                onChange={() => setOptions({ wrapSearch: !wrapSearch })}
              />
              Wrap
            </label>
          </div>

          {/* Action buttons */}
          <div className="search-actions">
            <button className="sbtn sbtn-primary" onClick={handleFind}>
              Find
            </button>
            <button className="sbtn" onClick={handleFindNext}>
              Find Next
            </button>
            <button className="sbtn" onClick={handleFindPrev}>
              Find Prev
            </button>
            {replaceMode && (
              <>
                <button className="sbtn" onClick={handleReplaceOne}>
                  Replace
                </button>
                <button className="sbtn" onClick={handleReplaceAll}>
                  Replace All
                </button>
              </>
            )}
            <button className="sbtn" onClick={handleMarkAll}>
              Mark All
            </button>
            {!replaceMode && (
              <button
                className="sbtn"
                onClick={() => toggleReplacePanel()}
              >
                Replace Mode
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === "findInFiles" && (
        <div className="search-body">
          <div className="search-row">
            <label>Find:</label>
            <input
              type="text"
              className="search-input"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Text or regex to find..."
            />
          </div>
          <div className="search-row">
            <label>Directory:</label>
            <input
              type="text"
              className="search-input"
              value={findInFilesRoot}
              onChange={(e) => setFindInFilesRoot(e.target.value)}
              placeholder="/path/to/search"
            />
          </div>
          <div className="search-row">
            <label>File pattern:</label>
            <input
              type="text"
              className="search-input"
              value={findInFilesFilePattern}
              onChange={(e) => setFindInFilesFilePattern(e.target.value)}
              placeholder="*.ts,*.rs,*.json"
            />
          </div>

          <div className="search-actions">
            <button
              className="sbtn sbtn-primary"
              onClick={handleFindInFiles}
              disabled={findInFilesSearching}
            >
              {findInFilesSearching ? "Searching..." : "Search"}
            </button>
            <button
              className="sbtn"
              onClick={clearFindInFilesResults}
              disabled={findInFilesResults.length === 0}
            >
              Clear
            </button>
          </div>

          {/* Results */}
          {findInFilesResults.length > 0 && (
            <div className="find-in-files-results">
              <div className="results-header">
                {findInFilesResults.length} results found
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
    </div>
  );
}
