"use client";

import { useWebOSStore } from "@/store/webos-store";

export const SecurityCenterApp = () => {
  const files = useWebOSStore((store) => store.state.nodes);
  const scanFiles = useWebOSStore((store) => store.scanFiles);
  const markFileSafe = useWebOSStore((store) => store.markFileSafe);
  const deleteNode = useWebOSStore((store) => store.deleteNode);
  const markAttention = useWebOSStore((store) => store.markAttention);

  const report = scanFiles();

  return (
    <div className="h-full overflow-auto p-4 text-white">
      <div className="mb-3 text-sm font-semibold">Security Center</div>
      <div className="space-y-2">
        {report.map((item) => {
          const file = files.find((node) => node.id === item.id);
          if (!file) {
            return null;
          }
          const tone = item.status === "risk" ? "border-rose-400/60" : item.status === "warning" ? "border-amber-300/60" : "border-emerald-400/40";
          return (
            <article key={item.id} className={`rounded-xl border bg-white/5 p-3 ${tone}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">{file.name}</div>
                  <div className="text-xs text-white/70">{item.reason}</div>
                </div>
                <div className="text-[11px] uppercase">{item.status}</div>
              </div>
              {(item.status === "risk" || item.status === "warning") && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="rounded bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-black"
                    onClick={() => {
                      markFileSafe(item.id);
                      markAttention("file", item.id, "info");
                    }}
                  >
                    Mark Safe
                  </button>
                  <button
                    type="button"
                    className="rounded bg-rose-500 px-2 py-1 text-[11px] font-semibold"
                    onClick={() => deleteNode(item.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
