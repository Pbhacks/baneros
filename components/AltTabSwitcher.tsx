"use client";

import { APP_LABELS } from "@/utils/constants";
import { useWebOSStore } from "@/store/webos-store";
import { APP_ICON_MAP } from "@/utils/icons";

export const AltTabSwitcher = () => {
  const open = useWebOSStore((store) => store.altTabOpen);
  const activeDesktopId = useWebOSStore((store) => store.state.activeDesktopId);
  const desktop = useWebOSStore((store) => store.state.desktops.find((item) => item.id === activeDesktopId));

  if (!open || !desktop) {
    return null;
  }

  const ordered = [...desktop.openWindows].sort((a, b) => b.z - a.z);

  return (
    <div className="pointer-events-none fixed inset-0 z-[140] flex items-center justify-center bg-black/30">
      <div className="rounded-2xl border border-white/20 bg-slate-950/85 p-3 text-white shadow-2xl backdrop-blur-xl">
        <div className="mb-2 text-xs font-semibold">App Switcher</div>
        <div className="flex gap-2">
          {ordered.map((win) => {
            const Icon = APP_ICON_MAP[win.app];
            return (
              <div
                key={win.id}
                className={`min-w-28 rounded-xl border px-3 py-2 text-center ${desktop.activeWindowId === win.id ? "border-cyan-300 bg-cyan-300/20" : "border-white/20 bg-white/5"}`}
              >
                <div className="mb-2 flex justify-center">
                  <Icon size={36} />
                </div>
                <div className="text-[10px]">{APP_LABELS[win.app]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
