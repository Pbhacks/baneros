"use client";

import { useMemo } from "react";
import { useWebOSStore } from "@/store/webos-store";

interface TextEditorAppProps {
  fileId?: string;
}

export const TextEditorApp = ({ fileId }: TextEditorAppProps) => {
  const nodes = useWebOSStore((store) => store.state.nodes);
  const updateFileContent = useWebOSStore((store) => store.updateFileContent);
  const addClipboardItem = useWebOSStore((store) => store.addClipboardItem);
  const clipboard = useWebOSStore((store) => store.state.clipboardHistory[0]?.text ?? "");

  const file = useMemo(() => nodes.find((node) => node.id === fileId), [nodes, fileId]);

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-300">
        Pick a text, JSON, or markdown file from Files.
      </div>
    );
  }

  if (file.kind === "folder" || file.kind === "image" || file.kind === "binary") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-300">
        This file type is not editable in Text Editor.
      </div>
    );
  }

  return (
    <div className="h-full p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
        <span>{file.name}</span>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded border border-white/20 px-2 py-1"
            onClick={() => addClipboardItem(file.content.slice(0, 240))}
          >
            Copy
          </button>
          <button
            type="button"
            className="rounded border border-white/20 px-2 py-1"
            onClick={() => updateFileContent(file.id, `${file.content}${clipboard}`)}
          >
            Paste
          </button>
        </div>
      </div>
      <textarea
        value={file.content}
        onChange={(event) => updateFileContent(file.id, event.target.value)}
        onCopy={(event) => addClipboardItem(event.currentTarget.value.slice(event.currentTarget.selectionStart, event.currentTarget.selectionEnd))}
        className="h-[calc(100%-1.5rem)] w-full resize-none rounded-xl border border-white/20 bg-slate-950/70 p-3 font-mono text-sm text-slate-100 outline-none"
      />
    </div>
  );
};
