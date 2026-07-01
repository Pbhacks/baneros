"use client";

import { useEffect, useMemo, useState } from "react";
import { AppType } from "@/utils/types";
import { useWebOSStore } from "@/store/webos-store";
import { checkSupabaseConnection, MAX_USER_UPLOAD_BYTES, type SupabaseHealth } from "@/lib/supabase";
import { WALLPAPER_OPTIONS } from "@/utils/constants";

export const SettingsApp = () => {
  const settings = useWebOSStore((store) => store.state.settings);
  const nodes = useWebOSStore((store) => store.state.nodes);
  const associations = useWebOSStore((store) => store.state.fileAssociations);
  const applyTheme = useWebOSStore((store) => store.applyTheme);
  const applyBackground = useWebOSStore((store) => store.applyBackground);
  const setReduceMotion = useWebOSStore((store) => store.setReduceMotion);
  const setFileAssociation = useWebOSStore((store) => store.setFileAssociation);
  const updateClockContext = useWebOSStore((store) => store.updateClockContext);
  const [cloudHealth, setCloudHealth] = useState<SupabaseHealth | null>(null);
  const [checkingCloud, setCheckingCloud] = useState(false);

  const storageUsage = useMemo(() => {
    const raw = JSON.stringify(nodes).length;
    return `${(raw / 1024).toFixed(1)} KB`;
  }, [nodes]);

  const refreshCloudHealth = async (): Promise<void> => {
    setCheckingCloud(true);
    try {
      setCloudHealth(await checkSupabaseConnection());
    } finally {
      setCheckingCloud(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshCloudHealth();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="h-full overflow-auto p-4 text-sm text-[var(--text-primary)]">
      <div className="mb-4 text-base font-semibold">System Settings</div>

      <section className="ui-glass mb-4 rounded-xl border p-3">
        <h3 className="mb-2 text-sm font-semibold">Appearance</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`rounded px-2 py-1 ${settings.themeMode === "dark" ? "bg-white/20" : "bg-white/10"}`}
            onClick={() => applyTheme("dark")}
          >
            Dark
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1 ${settings.themeMode === "light" ? "bg-white/20" : "bg-white/10"}`}
            onClick={() => applyTheme("light")}
          >
            Light
          </button>
          <label className="ml-3 flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={settings.reduceMotion}
              onChange={(event) => setReduceMotion(event.target.checked)}
            />
            Reduce motion
          </label>
        </div>
      </section>

      <section className="ui-glass mb-4 rounded-xl border p-3">
        <h3 className="mb-2 text-sm font-semibold">Background</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {WALLPAPER_OPTIONS.map((wallpaper) => (
            <button
              key={wallpaper.id}
              type="button"
              onClick={() => applyBackground(wallpaper.className)}
              className={`rounded-2xl border p-2 text-left ${settings.backgroundClass === wallpaper.className ? "border-cyan-300/70 bg-cyan-400/10" : "border-white/15 bg-white/5"}`}
            >
              <div className={`h-20 rounded-xl border border-white/10 ${wallpaper.className}`} />
              <div className="mt-2 text-sm font-medium">{wallpaper.label}</div>
              <div className="mt-1 text-[11px] ui-muted">{wallpaper.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="ui-glass mb-4 rounded-xl border p-3">
        <h3 className="mb-2 text-sm font-semibold">File Associations</h3>
        {(["text", "json", "markdown", "image", "binary"] as const).map((kind) => (
          <div key={kind} className="mb-2 flex items-center justify-between">
            <span>.{kind === "text" ? "txt" : kind}</span>
            <select
              className="rounded border border-[var(--panel-border)] bg-[var(--panel-strong)] px-2 py-1"
              value={associations[kind]}
              onChange={(event) => setFileAssociation(kind, event.target.value as AppType)}
            >
              <option value="editor">Text Editor</option>
              <option value="notes">Notes</option>
              <option value="browser">Browser</option>
              <option value="terminal">Terminal</option>
              <option value="security">Security Center</option>
            </select>
          </div>
        ))}
      </section>

      <section className="ui-glass mb-4 rounded-xl border p-3">
        <h3 className="mb-2 text-sm font-semibold">Clock & Location</h3>
        <div className="ui-muted text-xs">Timezone: {settings.timezone}</div>
        <div className="ui-muted text-xs">Location: {settings.locationLabel}</div>
        <button
          type="button"
          className="mt-2 rounded border border-[var(--panel-border)] bg-white/10 px-2 py-1 text-xs"
          onClick={() => {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            updateClockContext(tz, "Local");
          }}
        >
          Re-detect Timezone
        </button>
      </section>

      <section className="ui-glass mb-4 rounded-xl border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Cloud & Supabase</h3>
          <button
            type="button"
            className="rounded border border-[var(--panel-border)] bg-white/10 px-2 py-1 text-xs disabled:opacity-60"
            onClick={() => void refreshCloudHealth()}
            disabled={checkingCloud}
          >
            {checkingCloud ? "Checking..." : "Check Connection"}
          </button>
        </div>
        <div className="mb-1 flex items-center gap-2 text-xs">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              cloudHealth?.connected ? "bg-emerald-400" : cloudHealth?.configured ? "bg-amber-400" : "bg-rose-400"
            }`}
          />
          <span>
            {cloudHealth?.connected
              ? "Supabase connected"
              : cloudHealth?.configured
                ? "Supabase configured but unreachable"
                : "Supabase not configured"}
          </span>
        </div>
        <div className="ui-muted text-xs">
          Project: {cloudHealth?.projectHost ?? "Unavailable"}
        </div>
        <div className="ui-muted text-xs">
          Session: {cloudHealth?.signedIn ? "Signed in" : "Signed out"}
        </div>
        <div className="ui-muted text-xs">
          Upload quota: {(MAX_USER_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB per signed-in user
        </div>
        <div className="mt-2 rounded-lg border border-[var(--panel-border)] bg-white/5 px-2 py-2 text-xs ui-muted">
          {cloudHealth?.message ?? "Cloud health has not been checked yet."}
        </div>
      </section>

      <section className="ui-glass rounded-xl border p-3">
        <h3 className="mb-2 text-sm font-semibold">Storage</h3>
        <div className="ui-muted text-xs">IndexedDB usage estimate: {storageUsage}</div>
        <div className="mt-2 ui-muted text-xs">Tip: upload text/code files in Files, then open them in the editor or terminal.</div>
      </section>
    </div>
  );
};
