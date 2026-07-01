"use client";

import { useEffect, useMemo, useState } from "react";
import { useWebOSStore } from "@/store/webos-store";

export const NotificationToasts = () => {
  const notifications = useWebOSStore((store) => store.state.notifications);
  const suggestions = useWebOSStore((store) => store.state.suggestions);
  const executeAction = useWebOSStore((store) => store.executeAction);
  const applySuggestion = useWebOSStore((store) => store.applySuggestion);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(timer);
  }, []);

  const toasts = useMemo(
    () => notifications.filter((item) => now - item.createdAt <= 3000).slice(0, 3),
    [notifications, now],
  );

  return (
    <div className="fixed bottom-24 right-4 z-[130] space-y-2">
      {toasts.map((toast) => (
        <article key={toast.id} className={`pointer-events-auto w-72 rounded-xl border p-3 shadow-2xl backdrop-blur-xl ${toast.level === "critical" ? "border-rose-400/70 bg-rose-900/65 text-white" : toast.level === "warning" ? "border-amber-300/70 bg-amber-900/55 text-white" : "ui-glass-strong"}`}>
          <div className="text-xs font-semibold">{toast.title}</div>
          <div className="ui-muted text-xs">{toast.message}</div>
          {toast.action && toast.actionLabel && (
            <button
              type="button"
              className="mt-1 rounded border border-[var(--panel-border)] px-2 py-0.5 text-[11px]"
              onClick={() => executeAction(toast.action!, toast.actionPayload)}
            >
              {toast.actionLabel}
            </button>
          )}
        </article>
      ))}
      {suggestions
        .filter((suggestion) => now - suggestion.createdAt <= 3000)
        .slice(0, 1)
        .map((suggestion) => (
        <article key={suggestion.id} className="ui-glass-strong pointer-events-auto w-72 rounded-xl border p-3 shadow-2xl backdrop-blur-xl">
          <div className="text-xs font-semibold">Suggestion</div>
          <div className="ui-muted text-xs">{suggestion.message}</div>
          <button
            type="button"
            className="mt-1 rounded border border-cyan-300/60 px-2 py-0.5 text-[11px]"
            onClick={() => applySuggestion(suggestion.id)}
          >
            {suggestion.actionLabel}
          </button>
        </article>
      ))}
    </div>
  );
};
