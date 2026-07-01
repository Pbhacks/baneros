"use client";

import { useEffect } from "react";
import { AltTabSwitcher } from "@/components/AltTabSwitcher";
import { ContextMenu } from "@/components/ContextMenu";
import { NotificationCenter } from "@/components/NotificationCenter";
import { NotificationToasts } from "@/components/NotificationToasts";
import { Spotlight } from "@/components/Spotlight";
import { Dock } from "@/dock/Dock";
import { registerServiceWorker } from "@/lib/sw-register";
import { useWebOSStore } from "@/store/webos-store";
import { TopBar } from "@/topbar/TopBar";
import { WindowManager } from "@/window/WindowManager";

let introNoteShown = false;

export const DesktopShell = () => {
  const ready = useWebOSStore((store) => store.ready);
  const hydrate = useWebOSStore((store) => store.hydrate);
  const setContextMenu = useWebOSStore((store) => store.setContextMenu);
  const toggleSearch = useWebOSStore((store) => store.toggleSearch);
  const addDesktop = useWebOSStore((store) => store.addDesktop);
  const switchAppWindow = useWebOSStore((store) => store.switchAppWindow);
  const setAltTabOpen = useWebOSStore((store) => store.setAltTabOpen);
  const closeWindow = useWebOSStore((store) => store.closeWindow);
  const snapActiveWindow = useWebOSStore((store) => store.snapActiveWindow);
  const createNode = useWebOSStore((store) => store.createNode);
  const activeDesktopId = useWebOSStore((store) => store.state.activeDesktopId);
  const desktop = useWebOSStore((store) =>
    store.state.desktops.find((item) => item.id === activeDesktopId),
  );
  const backgroundClass = useWebOSStore((store) => store.state.settings.backgroundClass);
    const showAtmosphereOverlay = backgroundClass !== "bg-webos-designer";

  const themeMode = useWebOSStore((store) => store.state.settings.themeMode);
  const reduceMotion = useWebOSStore((store) => store.state.settings.reduceMotion);
  const dragState = useWebOSStore((store) => store.state.dragState);
  const criticalAttention = useWebOSStore((store) =>
    store.state.attention.some((item) => item.severity === "critical"),
  );
  const executeAction = useWebOSStore((store) => store.executeAction);

  useEffect(() => {
    hydrate().then(() => {
      if (!introNoteShown) {
        introNoteShown = true;
        useWebOSStore.getState().notify(
          "Welcome to Shani OS",
          "Use the top bar for system tools, the dock for apps, and the browser tabs for your about page, Wikipedia, George Michael, and your portfolio.",
          "info",
          "system",
        );
      }
    });
    registerServiceWorker();
  }, [hydrate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.code === "Space") {
        event.preventDefault();
        toggleSearch(true);
      }

      if ((event.altKey || event.metaKey) && event.key.toLowerCase() === "tab") {
        event.preventDefault();
        setAltTabOpen(true);
        switchAppWindow();
      }

      if (event.metaKey && event.key.toLowerCase() === "w") {
        const activeWindowId = desktop?.activeWindowId;
        if (activeWindowId) {
          event.preventDefault();
          closeWindow(activeWindowId);
        }
      }

      if (event.metaKey && event.shiftKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        createNode("New Folder", "folder");
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        addDesktop();
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "ArrowLeft") {
        event.preventDefault();
        snapActiveWindow("left");
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "ArrowRight") {
        event.preventDefault();
        snapActiveWindow("right");
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "ArrowUp") {
        event.preventDefault();
        snapActiveWindow("up");
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        executeAction("save-session");
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        executeAction("toggle-theme");
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        executeAction("open-taskmanager");
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        executeAction("run-security-scan");
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt" || event.key === "Meta") {
        setAltTabOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [addDesktop, closeWindow, createNode, desktop?.activeWindowId, executeAction, setAltTabOpen, snapActiveWindow, switchAppWindow, toggleSearch]);

  if (!ready) {
    return (
      <main className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Loading Shani OS...
      </main>
    );
  }

  return (
    <main
      data-theme={themeMode}
      onContextMenu={(event) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY });
      }}
      onClick={() => setContextMenu(null)}
      className={`relative h-screen w-screen overflow-hidden ${backgroundClass} ${criticalAttention ? "ring-2 ring-inset ring-rose-400/75" : ""} ${reduceMotion ? "reduce-motion" : ""}`}
    >
      {showAtmosphereOverlay && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(61,255,220,0.10),transparent_35%),radial-gradient(circle_at_50%_85%,rgba(255,170,80,0.14),transparent_40%)]" />
      )}
      <TopBar />
      <WindowManager />
      {dragState.type === "window" && dragState.snapPreview && (
        <div
          className={`pointer-events-none absolute top-8 z-[58] rounded-xl border-2 border-cyan-300/70 bg-cyan-300/12 ${dragState.snapPreview === "left" ? "left-2 h-[calc(100%-6.5rem)] w-[calc(50%-0.5rem)]" : ""} ${dragState.snapPreview === "right" ? "right-2 h-[calc(100%-6.5rem)] w-[calc(50%-0.5rem)]" : ""} ${dragState.snapPreview === "top" ? "left-2 right-2 h-[calc(100%-6.5rem)]" : ""}`}
        />
      )}
      <Dock />
      <ContextMenu />
      <Spotlight />
      <NotificationCenter />
      <NotificationToasts />
      <AltTabSwitcher />
    </main>
  );
};
