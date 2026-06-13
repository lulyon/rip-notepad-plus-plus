import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEncodingStore } from "../../stores/encodingStore";
import { useEditorStore } from "../../stores/editorStore";
import "./EncodingDialog.css";

export function EncodingDialog() {
  const { t } = useTranslation();
  const encodingDialogOpen = useEncodingStore((s) => s.encodingDialogOpen);
  const closeEncodingDialog = useEncodingStore((s) => s.closeEncodingDialog);
  const encodingGroups = useEncodingStore((s) => s.encodingGroups);
  const loadEncodings = useEncodingStore((s) => s.loadEncodings);
  const convertTabEncoding = useEncodingStore((s) => s.convertTabEncoding);

  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const updateTabContent = useEditorStore((s) => s.updateTabContent);
  const updateTabEncoding = useEditorStore((s) => s.updateTabEncoding);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (encodingDialogOpen) {
      loadEncodings();
    }
  }, [encodingDialogOpen, loadEncodings]);

  // Close on Escape
  useEffect(() => {
    if (!encodingDialogOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeEncodingDialog();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [encodingDialogOpen, closeEncodingDialog]);

  if (!encodingDialogOpen) return null;

  const groups = Object.keys(encodingGroups).sort();
  if (groups.length > 0 && !selectedGroup) {
    // select group containing current encoding
    const current = activeTab?.encoding || "UTF-8";
    for (const [group, encs] of Object.entries(encodingGroups)) {
      if (encs.some((e) => e.name === current)) {
        if (!selectedGroup) setSelectedGroup(group);
      }
    }
  }

  const filteredEncodings = selectedGroup
    ? (encodingGroups[selectedGroup] || []).filter(
        (e) =>
          !searchText ||
          e.label.toLowerCase().includes(searchText.toLowerCase()) ||
          e.name.toLowerCase().includes(searchText.toLowerCase()),
      )
    : [];

  const handleSelect = async (encodingName: string) => {
    if (!activeTab) return;
    const currentEncoding = activeTab.encoding;

    if (currentEncoding !== encodingName) {
      try {
        const convertedContent = await convertTabEncoding(
          activeTab.content,
          currentEncoding,
          encodingName,
        );
        updateTabContent(activeTab.id, convertedContent);
        updateTabEncoding(activeTab.id, encodingName);
      } catch (err) {
        console.error("Encoding conversion failed:", err);
      }
    }

    closeEncodingDialog();
  };

  return (
    <div className="dialog-overlay" onClick={closeEncodingDialog}>
      <div className="dialog encoding-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t("dialog.encoding")}</h2>
        {activeTab && (
          <p className="enc-current">
            {t("encoding.current")}: <strong>{activeTab.encoding}</strong>
          </p>
        )}

        <div className="enc-layout">
          {/* Group list */}
          <div className="enc-groups">
            {groups.map((group) => (
              <button
                key={group}
                className={`enc-group-btn ${group === selectedGroup ? "active" : ""}`}
                onClick={() => setSelectedGroup(group)}
              >
                {group}
              </button>
            ))}
          </div>

          {/* Encoding list */}
          <div className="enc-list-container">
            <input
              type="text"
              className="enc-search"
              placeholder={t("encoding.filter")}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <div className="enc-list">
              {filteredEncodings.map((enc) => (
                <button
                  key={enc.name}
                  className={`enc-item ${activeTab?.encoding === enc.name ? "active" : ""}`}
                  onClick={() => handleSelect(enc.name)}
                >
                  <span className="enc-name">{enc.label}</span>
                  <span className="enc-detail">
                    {enc.name}
                    {enc.has_bom && " +BOM"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="btn" onClick={closeEncodingDialog}>
            {t("dialog.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
