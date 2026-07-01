"use client";

import { Bell, X } from "lucide-react";
import { useWebOSStore } from "@/store/webos-store";

export const NotificationCenter = () => {
  const open = useWebOSStore((store) => store.notificationCenterOpen);
  const notifications = useWebOSStore((store) => store.state.notifications);
  const dismissNotification = useWebOSStore((store) => store.dismissNotification);
  const clearNotifications = useWebOSStore((store) => store.clearNotifications);
  const executeAction = useWebOSStore((store) => store.executeAction);

  const grouped = {
    critical: notifications.filter((item) => item.level === "critical"),
    warning: notifications.filter((item) => item.level === "warning"),
    info: notifications.filter((item) => item.level === "info"),
  };

  if (!open) {
    return null;
  }

  return (
    <aside className="ui-glass-strong pointer-events-auto fixed right-4 top-12 z-[120] w-80 rounded-2xl border p-3 shadow-2xl">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bell size={14} />
          Notifications
        </div>
        <button type="button" className="ui-muted text-xs hover:opacity-100" onClick={clearNotifications}>
          Clear
        </button>
      </div>
      <div className="max-h-96 space-y-2 overflow-auto">
        {(["critical", "warning", "info"] as const).map((severity) => (
          <div key={severity}>
            <div className="ui-muted mb-1 text-[11px] uppercase">{severity}</div>
            {grouped[severity].map((item) => (
          <article key={item.id} className={`mb-2 rounded-xl border p-2 ${item.level === "critical" ? "border-rose-400/60 bg-rose-500/12" : item.level === "warning" ? "border-amber-300/50 bg-amber-400/10" : "border-[var(--panel-border)] bg-[var(--panel)]"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold">{item.title}</div>
                <div className="ui-muted text-xs">{item.message}</div>
                {item.action && item.actionLabel && (
                  <button
                    type="button"
                    className="mt-1 rounded border border-[var(--panel-border)] px-2 py-0.5 text-[11px]"
                    onClick={() => executeAction(item.action!, item.actionPayload)}
                  >
                    {item.actionLabel}
                  </button>
                )}
              </div>
              <button type="button" onClick={() => dismissNotification(item.id)}>
                <X size={12} />
              </button>
            </div>
          </article>
            ))}
          </div>
        ))}
        {notifications.length === 0 && <div className="ui-muted text-xs">No notifications</div>}
      </div>
    </aside>
  );
};
