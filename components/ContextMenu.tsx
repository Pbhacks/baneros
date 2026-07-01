"use client";

import { useWebOSStore } from "@/store/webos-store";

export const ContextMenu = () => {
  const contextMenu = useWebOSStore((store) => store.contextMenu);
  const setContextMenu = useWebOSStore((store) => store.setContextMenu);
  const createNode = useWebOSStore((store) => store.createNode);
  const refreshFolderWorkspace = useWebOSStore((store) => store.refreshFolderWorkspace);
  const openApp = useWebOSStore((store) => store.openApp);

  if (!contextMenu) {
    return null;
  }

  return (
    <div
      style={{ top: contextMenu.y, left: contextMenu.x }}
      className="ui-glass-strong fixed z-[90] min-w-44 rounded-xl border p-1 text-sm shadow-2xl"
      onMouseLeave={() => setContextMenu(null)}
    >
      <button
        type="button"
        onClick={() => {
          createNode("New Folder", "folder");
          setContextMenu(null);
        }}
        className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/15"
      >
        New Folder
      </button>
      <button
        type="button"
        onClick={() => {
          createNode("untitled.md", "markdown");
          setContextMenu(null);
        }}
        className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/15"
      >
        New Markdown File
      </button>
      <button
        type="button"
        onClick={() => {
          refreshFolderWorkspace();
          setContextMenu(null);
        }}
        className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/15"
      >
        Refresh
      </button>
      <button
        type="button"
        onClick={() => {
          openApp("settings");
          setContextMenu(null);
        }}
        className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/15"
      >
        Settings
      </button>
    </div>
  );
};
