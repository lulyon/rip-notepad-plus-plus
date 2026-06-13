import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { version } from "../../../package.json";
import "./AboutDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
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
      <div className="dialog about-dialog" onClick={(e) => e.stopPropagation()}>
        <h1>ripNotepad++</h1>
        <p className="about-version">Version {version}</p>
        <p className="about-desc">
          {t("about.description")}
        </p>
        <p className="about-stack">
          {t("dialog.aboutText")}
        </p>
        <p className="about-copy">{t("about.copyright")}</p>
        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onClose}>
            {t("dialog.ok")}
          </button>
        </div>
      </div>
    </div>
  );
}
