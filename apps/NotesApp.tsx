"use client";

import { useWebOSStore } from "@/store/webos-store";

interface NotesAppProps {
  folderId: string;
  fileId?: string;
}

export const NotesApp = ({ folderId, fileId }: NotesAppProps) => {
  const notes = useWebOSStore((store) => store.state.workspaces[folderId]?.notes ?? "");
  const updateWorkspaceNotes = useWebOSStore((store) => store.updateWorkspaceNotes);
  const updateFileContent = useWebOSStore((store) => store.updateFileContent);
  const file = useWebOSStore((store) =>
    fileId ? store.state.nodes.find((node) => node.id === fileId) : undefined,
  );
  const addClipboardItem = useWebOSStore((store) => store.addClipboardItem);
  const clipboard = useWebOSStore((store) => store.state.clipboardHistory[0]?.text ?? "");

  if (file && (file.kind === "image" || file.kind === "binary")) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-amber-950">
        This uploaded file cannot be edited in Notes.
      </div>
    );
  }

  const value = file ? file.content : notes;
  const onChange = (text: string): void => {
    if (file) {
      updateFileContent(file.id, text);
      return;
    }
    updateWorkspaceNotes(folderId, text);
  };

  return (
    <div className="h-full p-3">
      <div className="mb-2 flex justify-end gap-1 text-xs text-amber-950">
        <button
          type="button"
          className="rounded border border-amber-900/20 bg-amber-100 px-2 py-1"
          onClick={() => addClipboardItem(value.slice(0, 240))}
        >
          Copy
        </button>
        <button
          type="button"
          className="rounded border border-amber-900/20 bg-amber-100 px-2 py-1"
          onClick={() => onChange(`${value}${clipboard}`)}
        >
          Paste
        </button>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onCopy={(event) => addClipboardItem(event.currentTarget.value.slice(event.currentTarget.selectionStart, event.currentTarget.selectionEnd))}
        className="h-[calc(100%-2rem)] w-full resize-none rounded-xl border border-amber-200/30 bg-amber-50/90 p-3 text-sm text-amber-950 outline-none"
        placeholder={file ? "Markdown note..." : "Workspace notes are saved per folder..."}
      />
    </div>
  );
};
