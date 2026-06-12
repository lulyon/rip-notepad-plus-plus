import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePluginStore } from "../../stores/pluginStore";
import "./PluginDialog.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PluginDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { plugins, loading, error, loadPlugins, startPlugin, stopPlugin } =
    usePluginStore();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadPlugins();
    }
  }, [open, loadPlugins]);

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

  const handleStart = async (name: string) => {
    setStatusMsg(null);
    try {
      await startPlugin(name);
      setStatusMsg(`Plugin '${name}' started`);
    } catch (err) {
      setStatusMsg(`Error: ${err}`);
    }
  };

  const handleStop = async (name: string) => {
    setStatusMsg(null);
    try {
      await stopPlugin(name);
      setStatusMsg(`Plugin '${name}' stopped`);
    } catch (err) {
      setStatusMsg(`Error: ${err}`);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog plugin-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{t("plugin.title")}</h2>

        {error && <div className="plugin-error">{error}</div>}
        {statusMsg && <div className="plugin-status">{statusMsg}</div>}

        {loading ? (
          <div className="plugin-loading">{t("plugin.loading")}</div>
        ) : plugins.length === 0 ? (
          <div className="plugin-empty">{t("plugin.empty")}</div>
        ) : (
          <div className="plugin-list">
            {plugins.map((plugin) => (
              <div key={plugin.name} className="plugin-item">
                <div className="plugin-info">
                  <div className="plugin-name">
                    {plugin.name}
                    <span className="plugin-version">v{plugin.version}</span>
                    {plugin.running && (
                      <span className="plugin-badge plugin-badge-running">
                        {t("plugin.running")}
                      </span>
                    )}
                    {!plugin.enabled && (
                      <span className="plugin-badge plugin-badge-disabled">
                        {t("plugin.disabled")}
                      </span>
                    )}
                  </div>
                  <div className="plugin-description">
                    {plugin.description}
                  </div>
                  <div className="plugin-author">{plugin.author}</div>
                </div>
                <div className="plugin-actions">
                  {plugin.running ? (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleStop(plugin.name)}
                    >
                      {t("plugin.stop")}
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleStart(plugin.name)}
                      disabled={!plugin.enabled}
                    >
                      {t("plugin.start")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="dialog-actions">
          <button className="btn" onClick={onClose}>
            {t("dialog.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
