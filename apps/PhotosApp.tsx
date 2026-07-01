"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Image as ImageIcon, MonitorUp } from "lucide-react";
import { createSignedFileUrl } from "@/lib/supabase";
import { useWebOSStore } from "@/store/webos-store";
import { WALLPAPER_OPTIONS } from "@/utils/constants";

export const PhotosApp = () => {
  const nodes = useWebOSStore((store) => store.state.nodes);
  const currentWallpaper = useWebOSStore((store) => store.state.settings.backgroundClass);
  const applyBackground = useWebOSStore((store) => store.applyBackground);
  const notify = useWebOSStore((store) => store.notify);

  const images = useMemo(() => nodes.filter((node) => node.kind === "image"), [nodes]);
  const [selectedId, setSelectedId] = useState<string | null>(images[0]?.id ?? null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const loadUrls = async () => {
      const entries = await Promise.all(
        images.map(async (image) => {
          if (image.storagePath) {
            try {
              const signedUrl = await createSignedFileUrl(image.storagePath);
              return [image.id, signedUrl] as const;
            } catch {
              return [image.id, image.sourceUrl ?? ""] as const;
            }
          }
          return [image.id, image.sourceUrl ?? ""] as const;
        }),
      );

      if (!cancelled) {
        setResolvedUrls(Object.fromEntries(entries.filter(([, url]) => url)));
      }
    };

    void loadUrls();

    return () => {
      cancelled = true;
    };
  }, [images]);

  const selectedImage = images.find((image) => image.id === selectedId) ?? images[0] ?? null;
  const selectedUrl = selectedImage ? resolvedUrls[selectedImage.id] : null;

  return (
    <div className="ui-glass h-full rounded-b-2xl border-0 p-4 text-[var(--text-primary)]">
      <div className="grid h-full min-h-0 grid-cols-[1.45fr_0.9fr] gap-4">
        <section className="rounded-[28px] border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.32em] text-white/45">Photos</div>
              <h2 className="mt-1 text-2xl font-semibold text-white">Uploaded Gallery</h2>
            </div>
            <div className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/70">
              {images.length} image{images.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="grid min-h-0 h-[calc(100%-4.5rem)] grid-cols-[1.2fr_0.8fr] gap-4">
            <div className="flex min-h-0 items-center justify-center rounded-[28px] border border-white/10 bg-black/25 p-4">
              {selectedUrl ? (
                <img
                  src={selectedUrl}
                  alt={selectedImage?.name ?? "Selected image"}
                  className="max-h-full w-full rounded-[22px] object-contain"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center rounded-[22px] border border-dashed border-white/12 text-center text-white/40">
                  <ImageIcon size={36} />
                  <p className="mt-3 max-w-xs text-sm">
                    Upload images in Files to build your gallery here.
                  </p>
                </div>
              )}
            </div>

            <div className="min-h-0 overflow-auto rounded-[28px] border border-white/10 bg-white/[0.05] p-3">
              <div className="mb-2 text-xs uppercase tracking-[0.28em] text-white/45">Library</div>
              <div className="grid grid-cols-2 gap-3">
                {images.map((image) => {
                  const url = resolvedUrls[image.id];
                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setSelectedId(image.id)}
                      className={`overflow-hidden rounded-[22px] border p-1 ${
                        selectedId === image.id ? "border-cyan-200/55 bg-cyan-300/12" : "border-white/8 bg-black/20"
                      }`}
                    >
                      {url ? (
                        <img src={url} alt={image.name} className="h-24 w-full rounded-[18px] object-cover" />
                      ) : (
                        <div className="flex h-24 items-center justify-center rounded-[18px] bg-black/30 text-white/30">
                          <ImageIcon size={20} />
                        </div>
                      )}
                      <div className="truncate px-2 py-2 text-left text-[11px] text-white/75">{image.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <aside className="min-h-0 overflow-auto rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="text-xs uppercase tracking-[0.32em] text-white/45">Wallpapers</div>
          <div className="mt-3 space-y-3">
            {WALLPAPER_OPTIONS.map((wallpaper) => (
              <button
                key={wallpaper.id}
                type="button"
                onClick={() => {
                  applyBackground(wallpaper.className);
                  notify("Wallpaper Updated", `${wallpaper.label} is now active.`, "info", "system");
                }}
                className={`w-full rounded-[24px] border p-3 text-left ${
                  currentWallpaper === wallpaper.className
                    ? "border-cyan-200/50 bg-cyan-300/12"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <div className={`h-24 rounded-[18px] ${wallpaper.className}`} />
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{wallpaper.label}</div>
                    <div className="mt-1 text-xs text-white/55">{wallpaper.description}</div>
                  </div>
                  <span className="rounded-full bg-white/8 p-2 text-white/75">
                    <MonitorUp size={14} />
                  </span>
                </div>
              </button>
            ))}
          </div>

          {selectedUrl && (
            <button
              type="button"
              onClick={() => window.open(selectedUrl, "_blank", "noopener,noreferrer")}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-white/80"
            >
              <ExternalLink size={14} />
              Open Selected Image
            </button>
          )}
        </aside>
      </div>
    </div>
  );
};
