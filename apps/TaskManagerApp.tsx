"use client";

import { useEffect, useMemo, useState } from "react";
import { APP_LABELS } from "@/utils/constants";
import { useWebOSStore } from "@/store/webos-store";

const hashUsage = (value: string, activity: number, memoryBase: number): { cpu: number; memory: number } => {
  const hash = Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    cpu: Math.min(95, 8 + (hash % 26) + Math.floor(activity / 2)),
    memory: 40 + (hash % 180) + memoryBase,
  };
};

export const TaskManagerApp = () => {
  const running = useWebOSStore((store) => store.runningWindows());
  const closeWindow = useWebOSStore((store) => store.closeWindow);
  const windowActivity = useWebOSStore((store) => store.state.windowActivity);
  const files = useWebOSStore((store) => store.state.nodes);
  const markAttention = useWebOSStore((store) => store.markAttention);
  const [tick, setTick] = useState(0);
  const [sortBy, setSortBy] = useState<"usage" | "name">("usage");

  useEffect(() => {
    const timer = window.setInterval(() => setTick((current) => current + 1), 1400);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(() => {
    const withUsage = running.map((item) => {
      const activity = (windowActivity[item.id] ?? 0) + (tick % 5);
      const file = item.fileId ? files.find((node) => node.id === item.fileId) : undefined;
      const memoryBase = file ? Math.ceil(file.content.length / 120) : 18;
      const usage = hashUsage(item.id, activity, memoryBase);
      return { ...item, activity, usage };
    });

    const sorted = [...withUsage].sort((a, b) => {
      if (sortBy === "name") {
        return APP_LABELS[a.app].localeCompare(APP_LABELS[b.app]);
      }
      return b.usage.cpu + b.usage.memory / 10 - (a.usage.cpu + a.usage.memory / 10);
    });

    return sorted;
  }, [files, running, sortBy, tick, windowActivity]);

  useEffect(() => {
    rows.forEach((row) => {
      if (row.usage.cpu > 70 || row.usage.memory > 360) {
        markAttention("window", row.id, "warning");
      }
    });
  }, [markAttention, rows]);

  return (
    <div className="h-full overflow-auto p-3 text-white">
      <div className="mb-3 text-sm font-semibold">Running Apps</div>
      <div className="mb-2 flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setSortBy("usage")}
          className={`rounded px-2 py-1 ${sortBy === "usage" ? "bg-white/25" : "bg-white/10"}`}
        >
          Sort by usage
        </button>
        <button
          type="button"
          onClick={() => setSortBy("name")}
          className={`rounded px-2 py-1 ${sortBy === "name" ? "bg-white/25" : "bg-white/10"}`}
        >
          Sort by name
        </button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-white/60">
            <th className="pb-2">App</th>
            <th className="pb-2">Activity</th>
            <th className="pb-2">CPU %</th>
            <th className="pb-2">Memory MB</th>
            <th className="pb-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={`border-t ${row.usage.cpu > 70 || row.usage.memory > 360 ? "border-amber-300/40 bg-amber-300/10" : "border-white/10"}`}>
              <td className="py-2">{APP_LABELS[row.app]}</td>
              <td className="py-2">{row.activity}</td>
              <td className="py-2">{row.usage.cpu}</td>
              <td className="py-2">{row.usage.memory}</td>
              <td className="py-2">
                <button
                  type="button"
                  className="rounded bg-rose-500 px-2 py-1 text-[11px] font-semibold"
                  onClick={() => closeWindow(row.id)}
                >
                  Force Close
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="py-2 text-white/70" colSpan={5}>
                No running windows on this desktop.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
