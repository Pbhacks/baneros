"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Copy, FolderPlus, FilePlus2, Upload, Code2, ExternalLink } from "lucide-react";
import { useWebOSStore } from "@/store/webos-store";
import { AppType, FileKind, FsNode } from "@/utils/types";
import { FILE_ICON_MAP } from "@/utils/icons";
import { CODE_TEMPLATES, getCodeTemplate } from "@/utils/code-templates";
import {
  createSignedFileUrl,
  getSignedInUserId,
  MAX_USER_UPLOAD_BYTES,
  signInWithMagicLink,
  supabase,
  uploadUserFile,
} from "@/lib/supabase";

interface FilesAppProps {
  folderId: string;
}

const extToKind = (name: string): FileKind => {
  const lower = name.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i.test(lower)) {
    return "image";
  }
  if (lower.endsWith(".json")) {
    return "json";
  }
  if (lower.endsWith(".md")) {
    return "markdown";
  }
  if (/\.(txt|js|jsx|ts|tsx|html|css|py|sql|yaml|yml|env|csv|log|cpp|cxx|cc|c|hpp|h|java|kt|go|rs|sh|bat)$/i.test(lower)) {
    return "text";
  }
  if (/\.[^.]+$/i.test(lower)) {
    return "binary";
  }
  return "text";
};

const openWithChoices: AppType[] = ["editor", "notes", "browser", "terminal", "security"];

const typeLabel = (node: FsNode): string => {
  if (node.kind === "folder") {
    return "File folder";
  }
  if (node.kind === "json") {
    return "JSON file";
  }
  if (node.kind === "markdown") {
    return "Markdown file";
  }
  if (node.kind === "image") {
    return "Image file";
  }
  if (node.kind === "binary") {
    return "Uploaded file";
  }
  return "Text document";
};

export const FilesApp = ({ folderId }: FilesAppProps) => {
  const nodes = useWebOSStore((store) => store.state.nodes);
  const createNode = useWebOSStore((store) => store.createNode);
  const moveNode = useWebOSStore((store) => store.moveNode);
  const setActiveFolder = useWebOSStore((store) => store.setActiveFolder);
  const openAssociatedNode = useWebOSStore((store) => store.openAssociatedNode);
  const notify = useWebOSStore((store) => store.notify);
  const attention = useWebOSStore((store) => store.state.attention);
  const dragState = useWebOSStore((store) => store.state.dragState);
  const setDragState = useWebOSStore((store) => store.setDragState);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const currentFolder = nodes.find((node) => node.id === folderId);
  const children = useMemo(() => nodes.filter((node) => node.parentId === folderId), [nodes, folderId]);
  const roots = useMemo(() => nodes.filter((node) => node.parentId === "root" && node.kind === "folder"), [nodes]);

  const selected = children.find((node) => node.id === selectedId);

  const preview = selected?.kind === "json"
    ? (() => {
        try {
          return JSON.stringify(JSON.parse(selected.content || "{}"), null, 2);
        } catch {
          return selected.content;
        }
      })()
    : selected?.content ?? "";

  useEffect(() => {
    getSignedInUserId().then(setUserId);

    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!selected?.storagePath) {
      return;
    }

    createSignedFileUrl(selected.storagePath)
      .then((signedUrl) => {
        if (!cancelled) {
          setPreviewUrl(signedUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.storagePath]);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    if (!userId) {
      const email = prompt("Sign in email to enable file uploads");
      event.target.value = "";
      if (!email) {
        return;
      }

      try {
        await signInWithMagicLink(email);
        notify("Magic Link Sent", "Open your email, sign in, then upload again.", "info", "system");
      } catch (error) {
        notify(
          "Sign In Failed",
          error instanceof Error ? error.message : "Could not start sign in.",
          "warning",
          "system",
        );
      }
      return;
    }

    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of files) {
        if (file.size > MAX_USER_UPLOAD_BYTES) {
          notify("Upload Rejected", `${file.name} is larger than the 3 MB user limit.`, "warning", "files");
          continue;
        }

        try {
          const uploadedFile = await uploadUserFile(file);
          const kind = extToKind(file.name);
          const content = kind === "image" || kind === "binary" ? "" : await file.text();
          createNode(file.name, kind, folderId, content, {
            sourceUrl: uploadedFile.signedUrl,
            storagePath: uploadedFile.storagePath,
            mimeType: uploadedFile.mimeType,
            sizeBytes: uploadedFile.sizeBytes,
          });
          uploaded.push(file.name);
        } catch (error) {
          notify(
            "Upload Failed",
            error instanceof Error ? `${file.name}: ${error.message}` : `Could not upload ${file.name}`,
            "warning",
            "files",
          );
        }
      }
    } finally {
      setUploading(false);
    }

    if (uploaded.length) {
      notify("Files Uploaded", `${uploaded.length} cloud file(s) added to this folder.`, "info", "files");
    }
    event.target.value = "";
  };

  const createStarterCode = (): void => {
    const choice = prompt(
      `Starter template (${CODE_TEMPLATES.map((template) => template.id).join(", ")})`,
      "react",
    );

    if (!choice) {
      return;
    }

    const template = getCodeTemplate(choice.trim().toLowerCase());
    if (!template) {
      notify("Unknown Template", "Choose a valid starter template id.", "warning", "files");
      return;
    }

    createNode(template.filename, extToKind(template.filename), folderId, template.content);
    notify("Starter Created", `${template.filename} added to this folder.`, "info", "files");
  };

  const openUploadedFile = async (node: FsNode): Promise<void> => {
    if (!node.storagePath) {
      return;
    }

    try {
      const signedUrl = await createSignedFileUrl(node.storagePath);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify(
        "Open Failed",
        error instanceof Error ? error.message : `Could not open ${node.name}`,
        "warning",
        "files",
      );
    }
  };

  return (
    <div className="ui-glass h-full overflow-hidden rounded-b-2xl border-0 text-[var(--text-primary)]">
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        accept="*/*"
        className="hidden"
        onChange={(event) => void handleFileUpload(event)}
      />
      <div className="flex h-full">
        <aside className="ui-glass w-44 border-r border-[var(--panel-border)] p-2 text-xs">
          <div className="mb-2 font-semibold">Quick Access</div>
          <div className="space-y-1">
            {roots.map((root) => {
              const Icon = FILE_ICON_MAP.folder;
              return (
                <button
                  key={root.id}
                  type="button"
                  onClick={() => setActiveFolder(root.id)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left ${root.id === folderId ? "bg-cyan-400/20" : "hover:bg-white/10"}`}
                >
                  <Icon size={14} />
                  <span className="truncate">{root.name}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="ui-glass flex items-center justify-between border-b border-[var(--panel-border)] px-3 py-2 text-xs">
            <div className="font-semibold">{currentFolder?.name ?? "Explorer"}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const name = prompt("File name", "untitled.txt");
                  if (!name) {
                    return;
                  }
                  createNode(name, extToKind(name), folderId);
                }}
                className="rounded border border-[var(--panel-border)] bg-white/10 px-2 py-1"
              >
                <span className="inline-flex items-center gap-1"><FilePlus2 size={12} /> New File</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = prompt("Folder name", "New Folder");
                  if (!name) {
                    return;
                  }
                  createNode(name, "folder", folderId);
                }}
                className="rounded border border-[var(--panel-border)] bg-white/10 px-2 py-1"
              >
                <span className="inline-flex items-center gap-1"><FolderPlus size={12} /> New Folder</span>
              </button>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={uploading}
                className="rounded border border-[var(--panel-border)] bg-white/10 px-2 py-1 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-1"><Upload size={12} /> {uploading ? "Uploading..." : "Upload"}</span>
              </button>
              <button
                type="button"
                onClick={createStarterCode}
                className="rounded border border-[var(--panel-border)] bg-white/10 px-2 py-1"
              >
                <span className="inline-flex items-center gap-1"><Code2 size={12} /> Starter Code</span>
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[1.7fr_1fr]">
            <div className="overflow-auto border-r border-[var(--panel-border)]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[var(--panel)] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Modified</th>
                    <th className="px-3 py-2 text-left">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {children.map((node) => {
                    const Icon = FILE_ICON_MAP[node.kind];
                    const attn = attention.find((item) => item.targetType === "file" && item.targetId === node.id);
                    return (
                      <tr
                        key={node.id}
                        className={`border-t border-[var(--panel-border)] ${selectedId === node.id ? "bg-cyan-300/12" : "hover:bg-white/10"} ${dragState.type === "file" && node.kind === "folder" ? "ring-1 ring-cyan-300/50" : ""} ${attn?.severity === "warning" ? "bg-amber-300/10" : ""} ${attn?.severity === "critical" ? "bg-rose-500/15" : ""}`}
                        draggable
                        onDragStart={(event) => {
                          setDraggedId(node.id);
                          setDragState({ type: "file", id: node.id, snapPreview: null });
                          event.dataTransfer.setData("application/webos-file-id", node.id);
                        }}
                        onDragEnd={() => setDragState({ type: "none", snapPreview: null })}
                        onDragOver={(event) => {
                          if (node.kind === "folder") {
                            event.preventDefault();
                          }
                        }}
                        onDrop={() => {
                          if (draggedId && node.kind === "folder" && draggedId !== node.id) {
                            moveNode(draggedId, node.id);
                          }
                          setDraggedId(null);
                          setDragState({ type: "none", snapPreview: null });
                        }}
                        onClick={() => {
                          setPreviewUrl(null);
                          setSelectedId(node.id);
                        }}
                        onDoubleClick={() => {
                          if (node.kind === "image" || node.kind === "binary") {
                            void openUploadedFile(node);
                            return;
                          }
                          openAssociatedNode(node.id);
                        }}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Icon size={14} />
                            <span className="truncate">{node.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[var(--text-muted)]">{typeLabel(node)}</td>
                        <td className="px-3 py-2 text-[var(--text-muted)]">{new Date(node.updatedAt).toLocaleDateString()}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="rounded border border-[var(--panel-border)] px-2 py-0.5"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (node.kind === "folder") {
                                setActiveFolder(node.id);
                                return;
                              }
                              if (node.kind === "image" || node.kind === "binary") {
                                void openUploadedFile(node);
                                return;
                              }
                              const next = prompt(`Open with (${openWithChoices.join(", ")})`, "editor") as AppType | null;
                              if (next && openWithChoices.includes(next)) {
                                openAssociatedNode(node.id, next);
                              } else {
                                openAssociatedNode(node.id);
                              }
                            }}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <aside className="ui-glass min-w-0 overflow-auto p-3 text-xs">
              <div className="mb-2 flex items-center justify-between uppercase tracking-wide text-[var(--text-muted)]">
                <span>Preview</span>
                {selected && selected.kind !== "folder" && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-[var(--panel-border)] px-2 py-0.5"
                    onClick={() => navigator.clipboard.writeText(selected.content)}
                  >
                    <Copy size={12} /> Copy
                  </button>
                )}
              </div>
              {!selected && <div className="ui-muted">Select a file to preview.</div>}
              {selected?.kind === "folder" && <div className="ui-muted">Folder preview unavailable.</div>}
              {selected?.kind === "image" && previewUrl && (
                <div className="space-y-2">
                  <img src={previewUrl} alt={selected.name} className="max-h-72 w-full rounded-xl border border-[var(--panel-border)] object-contain bg-black/30" />
                  <div className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-2 text-[11px] ui-muted">
                    <span>{selected.mimeType ?? "image"} . {selected.sizeBytes ? `${(selected.sizeBytes / 1024).toFixed(1)} KB` : "Unknown size"}</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded border border-[var(--panel-border)] px-2 py-1"
                      onClick={() => void openUploadedFile(selected)}
                    >
                      <ExternalLink size={12} /> Open
                    </button>
                  </div>
                </div>
              )}
              {selected?.kind === "binary" && (
                <div className="rounded-xl border border-[var(--panel-border)] bg-white/5 p-3 text-[11px] ui-muted">
                  <div>Name: {selected.name}</div>
                  <div className="mt-1">Type: {selected.mimeType ?? "binary file"}</div>
                  <div className="mt-1">Size: {selected.sizeBytes ? `${(selected.sizeBytes / 1024).toFixed(1)} KB` : "Unknown"}</div>
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-1 rounded border border-[var(--panel-border)] px-2 py-1"
                    onClick={() => void openUploadedFile(selected)}
                  >
                    <ExternalLink size={12} /> Download / Open
                  </button>
                </div>
              )}
              {selected && selected.kind !== "folder" && (
                selected.kind === "image" || selected.kind === "binary" ? null : (
                  <pre className="ui-glass max-h-full overflow-auto rounded-xl border p-3 whitespace-pre-wrap break-words font-mono">{preview || "(empty)"}</pre>
                )
              )}
              <div className="mt-4 rounded-xl border border-[var(--panel-border)] bg-white/5 p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Coding Shortcuts</div>
                <div className="flex flex-wrap gap-2">
                  {CODE_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="rounded-full border border-[var(--panel-border)] px-2 py-1 text-[11px]"
                      onClick={() => {
                        createNode(template.filename, extToKind(template.filename), folderId, template.content);
                        notify("Starter Created", `${template.filename} added to this folder.`, "info", "files");
                      }}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-[var(--panel-border)] bg-white/5 p-3 text-[11px] ui-muted">
                Signed-in uploads go to Supabase storage.
                <br />
                Max storage per user: {(MAX_USER_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB.
                <br />
                Images and other binary files open in a signed download link.
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
};
