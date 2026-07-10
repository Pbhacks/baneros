"use client";

import { motion, MotionValue, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Download, FolderOpen } from "lucide-react";
import { type DragEvent, type ReactNode, useRef, useState } from "react";
import { APP_LABELS, DOWNLOADS_FOLDER_ID, PROJECTS_FOLDER_ID } from "@/utils/constants";
import { AppType } from "@/utils/types";
import { useWebOSStore } from "@/store/webos-store";
import { APP_ICON_MAP, LaunchpadTriangle } from "@/utils/icons";

const DockIcon = ({
  app,
  mouseX,
  running,
  highlighted,
  bounce,
  reduceMotion,
}: {
  app: AppType;
  mouseX: MotionValue<number>;
  running: boolean;
  highlighted: boolean;
  bounce: boolean;
  reduceMotion: boolean;
}) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const openApp = useWebOSStore((store) => store.openApp);
  const pinApp = useWebOSStore((store) => store.pinApp);
  const unpinApp = useWebOSStore((store) => store.unpinApp);
  const pinnedApps = useWebOSStore((store) => store.state.pinnedApps);

  const distance = useTransform(mouseX, (value) => {
    if (!Number.isFinite(value) || !buttonRef.current) {
      return 240;
    }

    const bounds = buttonRef.current.getBoundingClientRect();
    return value - bounds.left - bounds.width / 2;
  });

  const size = useSpring(useTransform(distance, [-160, 0, 160], [44, 60, 44]), {
    mass: 0.16,
    stiffness: 300,
    damping: 22,
  });
  const lift = useSpring(useTransform(distance, [-160, 0, 160], [0, -9, 0]), {
    mass: 0.12,
    stiffness: 280,
    damping: 21,
  });

  const Icon = APP_ICON_MAP[app];
  const isPinned = pinnedApps.includes(app);

  return (
    <motion.div
      animate={!reduceMotion && bounce ? { y: [0, -12, 0] } : { y: 0 }}
      transition={{ duration: 0.38 }}
      className="group relative flex flex-col items-center"
    >
      <motion.div
        style={{ width: size, height: size, y: lift }}
        whileTap={{ scale: 0.94 }}
        className={`relative flex items-center justify-center ${highlighted ? "rounded-[18px] ring-2 ring-rose-300/80" : ""}`}
      >
        <button
          ref={buttonRef}
          onClick={() => openApp(app)}
          onContextMenu={(event) => {
            event.preventDefault();
            if (isPinned) {
              unpinApp(app);
            } else {
              pinApp(app);
            }
          }}
          draggable
          onDragStart={(event: DragEvent<HTMLButtonElement>) => {
            event.dataTransfer.setData("application/webos-app", app);
          }}
          className="relative h-full w-full rounded-[18px]"
          title={APP_LABELS[app]}
          type="button"
        >
          <span className="flex h-full w-full items-center justify-center">
            <Icon size={46} />
          </span>
          {running && <span className="absolute -bottom-2.5 left-1/2 h-1.5 w-4 -translate-x-1/2 rounded-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.85)]" />}
        </button>
      </motion.div>
      <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-xl bg-black/72 px-2.5 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {APP_LABELS[app]}
      </span>
    </motion.div>
  );
};

const DockShortcut = ({
  label,
  icon,
  onClick,
  bare = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  bare?: boolean;
}) => (
  <div className="group relative flex flex-col items-center">
    <button
      type="button"
      onClick={onClick}
      className={
        bare
          ? "relative flex h-10 w-10 items-center justify-center text-white/92"
          : "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] border border-white/36 bg-gradient-to-b from-white/40 via-white/20 to-white/8 text-white/92 shadow-[0_10px_20px_rgba(0,0,0,0.22)]"
      }
    >
      {!bare && <span className="pointer-events-none absolute inset-x-1.5 top-1.5 h-2.5 rounded-full bg-white/50 blur-[1px]" />}
      {icon}
    </button>
    <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-xl bg-black/72 px-2.5 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
      {label}
    </span>
  </div>
);

export const Dock = () => {
  const pinned = useWebOSStore((store) => store.state.pinnedApps);
  const recent = useWebOSStore((store) => store.state.recentApps);
  const activeDesktopId = useWebOSStore((store) => store.state.activeDesktopId);
  const desktop = useWebOSStore((store) =>
    store.state.desktops.find((item) => item.id === activeDesktopId),
  );
  const searchOpen = useWebOSStore((store) => store.searchOpen);
  const pinApp = useWebOSStore((store) => store.pinApp);
  const lastOpenedApp = useWebOSStore((store) => store.state.lastOpenedApp);
  const attention = useWebOSStore((store) => store.state.attention);
  const reduceMotion = useWebOSStore((store) => store.state.settings.reduceMotion);
  const setActiveFolder = useWebOSStore((store) => store.setActiveFolder);
  const openApp = useWebOSStore((store) => store.openApp);
  const toggleSearch = useWebOSStore((store) => store.toggleSearch);
  const [dragActive, setDragActive] = useState(false);
  const [dockHover, setDockHover] = useState(false);

  const runningApps = new Set((desktop?.openWindows ?? []).map((item) => item.app));
  const fullscreenWindowOpen = Boolean(desktop?.openWindows.some((item) => item.maximized && !item.minimized));
  const dockApps: AppType[] = [...new Set([...pinned, ...recent])];
  const mouseX = useMotionValue(Infinity);

  const openFolderShortcut = (folderId: string) => {
    setActiveFolder(folderId);
    openApp("files", { folderId });
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1100] flex h-24 items-end justify-center pointer-events-none"
      onMouseEnter={() => setDockHover(true)}
      onMouseLeave={() => setDockHover(false)}
    >
      {fullscreenWindowOpen && (
        <div className="pointer-events-auto absolute bottom-0 left-1/2 h-6 w-36 -translate-x-1/2 rounded-t-full bg-white/10 backdrop-blur-xl" />
      )}
      <motion.nav
        onMouseLeave={() => mouseX.set(Infinity)}
        onMouseMove={(event) => {
          mouseX.set(event.clientX);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          const app = event.dataTransfer.getData("application/webos-app") as AppType;
          if (app) {
            pinApp(app);
          }
          setDragActive(false);
        }}
        animate={fullscreenWindowOpen && !dockHover ? { y: 78, opacity: 0.78 } : { y: 0, opacity: 1 }}
        whileHover={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.7 }}
        className={`ui-dock dock-scroll-clean pointer-events-auto mb-3 max-w-[calc(100vw-1rem)] overflow-x-auto overflow-y-visible rounded-[24px] border px-3 py-2 ${
          dragActive ? "ring-2 ring-cyan-200/45" : ""
        }`}
      >
        <span className="pointer-events-none absolute inset-x-8 top-2 h-3 rounded-full bg-white/38 blur-md" />
        <div className="relative flex min-w-max items-end gap-2">
          {dockApps.map((app) => (
            <DockIcon
              key={app}
              app={app}
              mouseX={mouseX}
              running={runningApps.has(app)}
              bounce={lastOpenedApp === app}
              reduceMotion={reduceMotion}
              highlighted={attention.some(
                (item) => item.targetType === "dock" && item.targetId === app && item.severity === "critical",
              )}
            />
          ))}

          <div className="mx-1 h-9 w-px rounded-full bg-white/20" />

          <DockShortcut
            label="Launchpad"
            icon={
              <LaunchpadTriangle
                size={22}
                className={`transition-transform duration-500 ease-in-out ${searchOpen ? "rotate-180" : "rotate-0"}`}
              />
            }
            onClick={() => toggleSearch(!searchOpen)}
            bare
          />
          <DockShortcut
            label="Projects"
            icon={<FolderOpen size={18} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" />}
            onClick={() => openFolderShortcut(PROJECTS_FOLDER_ID)}
          />
          <DockShortcut
            label="Downloads"
            icon={<Download size={18} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" />}
            onClick={() => openFolderShortcut(DOWNLOADS_FOLDER_ID)}
          />
        </div>
      </motion.nav>
    </div>
  );
};
