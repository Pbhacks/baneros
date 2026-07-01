"use client";

import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import { useWebOSStore } from "@/store/webos-store";
import { WindowFrame } from "@/window/WindowFrame";

const FilesApp = dynamic(() => import("@/apps/FilesApp").then((mod) => mod.FilesApp));
const TextEditorApp = dynamic(() => import("@/apps/TextEditorApp").then((mod) => mod.TextEditorApp));
const TerminalApp = dynamic(() => import("@/apps/TerminalApp").then((mod) => mod.TerminalApp));
const BrowserApp = dynamic(() => import("@/apps/BrowserApp").then((mod) => mod.BrowserApp));
const NotesApp = dynamic(() => import("@/apps/NotesApp").then((mod) => mod.NotesApp));
const PhotosApp = dynamic(() => import("@/apps/PhotosApp").then((mod) => mod.PhotosApp));
const CalendarApp = dynamic(() => import("@/apps/CalendarApp").then((mod) => mod.CalendarApp));
const CalculatorApp = dynamic(() => import("@/apps/CalculatorApp").then((mod) => mod.CalculatorApp));
const DevHubApp = dynamic(() => import("@/apps/DevHubApp").then((mod) => mod.DevHubApp));
const TaskManagerApp = dynamic(() => import("@/apps/TaskManagerApp").then((mod) => mod.TaskManagerApp));
const SettingsApp = dynamic(() => import("@/apps/SettingsApp").then((mod) => mod.SettingsApp));
const SecurityCenterApp = dynamic(() => import("@/apps/SecurityCenterApp").then((mod) => mod.SecurityCenterApp));

export const WindowManager = () => {
  const activeDesktopId = useWebOSStore((store) => store.state.activeDesktopId);
  const desktop = useWebOSStore((store) =>
    store.state.desktops.find((item) => item.id === activeDesktopId),
  );
  const closeWindow = useWebOSStore((store) => store.closeWindow);
  const minimizeWindow = useWebOSStore((store) => store.minimizeWindow);
  const maximizeWindow = useWebOSStore((store) => store.maximizeWindow);
  const focusWindow = useWebOSStore((store) => store.focusWindow);
  const updateWindowBounds = useWebOSStore((store) => store.updateWindowBounds);
  const openAssociatedNode = useWebOSStore((store) => store.openAssociatedNode);
  const snapWindow = useWebOSStore((store) => store.snapWindow);

  if (!desktop) {
    return null;
  }

  return (
    <AnimatePresence>
      {desktop.openWindows.map((window) => (
        <WindowFrame
          key={window.id}
          appWindow={window}
          active={desktop.activeWindowId === window.id}
          onFocus={() => focusWindow(window.id)}
          onClose={() => closeWindow(window.id)}
          onMinimize={() => minimizeWindow(window.id)}
          onMaximize={() => maximizeWindow(window.id)}
          onBoundsChange={(next) => updateWindowBounds(window.id, next)}
          onSnap={(zone) => snapWindow(window.id, zone)}
          onDropFile={(fileId) => openAssociatedNode(fileId, window.app)}
        >
          {window.app === "files" && <FilesApp folderId={window.folderId} />}
          {window.app === "editor" && <TextEditorApp fileId={window.fileId} />}
          {window.app === "terminal" && <TerminalApp folderId={window.folderId} />}
          {window.app === "browser" && <BrowserApp launchUrl={window.launchUrl} />}
          {window.app === "notes" && <NotesApp folderId={window.folderId} fileId={window.fileId} />}
          {window.app === "photos" && <PhotosApp />}
          {window.app === "calendar" && <CalendarApp />}
          {window.app === "calculator" && <CalculatorApp />}
          {window.app === "devhub" && <DevHubApp />}
          {window.app === "taskmanager" && <TaskManagerApp />}
          {window.app === "settings" && <SettingsApp />}
          {window.app === "security" && <SecurityCenterApp />}
        </WindowFrame>
      ))}
    </AnimatePresence>
  );
};
