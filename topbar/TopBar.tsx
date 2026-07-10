"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BatteryFull,
  Bell,
  ChevronDown,
  CircleDot,
  Command,
  Plus,
  SlidersHorizontal,
  Wifi,
} from "lucide-react";
import { APP_LABELS } from "@/utils/constants";
import { LaunchpadTriangle } from "@/utils/icons";
import { checkSupabaseConnection, getSignedInUserId, signInWithMagicLink, supabase } from "@/lib/supabase";
import { useWebOSStore } from "@/store/webos-store";

const PORTFOLIO_URL = "https://pbhacks.lovable.app";
const BROWSER_HOME_URL = "webos://shani-os";

const formatMenuClock = (date: Date, timezone: string): string => {
  try {
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    });
  } catch {
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
};

type MenuKey = "file" | "edit" | "view" | "go" | "window" | "help";

export const TopBar = () => {
  const [time, setTime] = useState(() => new Date());
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<MenuKey | null>(null);
  const [cloudLabel, setCloudLabel] = useState("Cloud: local");
  const menuRootRef = useRef<HTMLDivElement | null>(null);
  const activeDesktopId = useWebOSStore((store) => store.state.activeDesktopId);
  const desktops = useWebOSStore((store) => store.state.desktops);
  const settings = useWebOSStore((store) => store.state.settings);
  const searchOpen = useWebOSStore((store) => store.searchOpen);
  const nodes = useWebOSStore((store) => store.state.nodes);
  const addDesktop = useWebOSStore((store) => store.addDesktop);
  const openApp = useWebOSStore((store) => store.openApp);
  const switchDesktop = useWebOSStore((store) => store.switchDesktop);
  const closeDesktop = useWebOSStore((store) => store.closeDesktop);
  const switchAppWindow = useWebOSStore((store) => store.switchAppWindow);
  const setAltTabOpen = useWebOSStore((store) => store.setAltTabOpen);
  const toggleSearch = useWebOSStore((store) => store.toggleSearch);
  const createNode = useWebOSStore((store) => store.createNode);
  const setReduceMotion = useWebOSStore((store) => store.setReduceMotion);
  const applyTheme = useWebOSStore((store) => store.applyTheme);
  const executeAction = useWebOSStore((store) => store.executeAction);
  const setActiveFolder = useWebOSStore((store) => store.setActiveFolder);
  const updateClockContext = useWebOSStore((store) => store.updateClockContext);
  const notify = useWebOSStore((store) => store.notify);
  const toggleNotificationCenter = useWebOSStore((store) => store.toggleNotificationCenter);
  const notificationCount = useWebOSStore((store) => store.state.notifications.length);

  const activeDesktop = useMemo(
    () => desktops.find((item) => item.id === activeDesktopId),
    [desktops, activeDesktopId],
  );
  const activeFolderId = activeDesktop?.activeFolderId ?? "root";

  const activeWindow = useMemo(
    () => {
      const current = activeDesktop?.openWindows.find((item) => item.id === activeDesktop.activeWindowId && !item.minimized);
      if (current) {
        return current;
      }
      return activeDesktop?.openWindows.filter((item) => !item.minimized).sort((a, b) => b.z - a.z)[0] ?? null;
    },
    [activeDesktop],
  );
  const activeAppLabel = activeWindow ? APP_LABELS[activeWindow.app] : "Finder";
  const activeFolderName = useMemo(
    () => nodes.find((node) => node.id === activeFolderId)?.name ?? "Workspace",
    [nodes, activeFolderId],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    updateClockContext(browserTimezone, "Local");

    return () => {
      return undefined;
    };
  }, [updateClockContext]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!menuRootRef.current?.contains(event.target as Node)) {
        setMenu(null);
      }
    };
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  useEffect(() => {
    getSignedInUserId().then(setUserId);
    checkSupabaseConnection()
      .then((status) => {
        if (!status.configured) {
          setCloudLabel("Cloud: off");
          return;
        }
        setCloudLabel(status.connected ? "Cloud: online" : "Cloud: issue");
      })
      .catch(() => setCloudLabel("Cloud: issue"));

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

  const requestSignIn = async (): Promise<void> => {
    const email = prompt("Sign in email");
    if (!email) {
      return;
    }

    setBusy(true);
    try {
      await signInWithMagicLink(email);
      alert("Magic link sent. Open your email and return to this tab.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-in failed";
      alert(message);
    } finally {
      setBusy(false);
    }
  };

  const projectsFolder = useMemo(
    () => nodes.find((node) => node.kind === "folder" && node.name.toLowerCase() === "projects"),
    [nodes],
  );
  const downloadsFolder = useMemo(
    () => nodes.find((node) => node.kind === "folder" && node.name.toLowerCase() === "downloads"),
    [nodes],
  );

  const runMenuAction = (fn: () => void): void => {
    fn();
    setMenu(null);
  };

  const menuItems: Record<MenuKey, Array<{ label: string; action: () => void }>> = {
    file: [
      { label: "New Folder", action: () => createNode("New Folder", "folder") },
      { label: "New Text File", action: () => createNode("untitled.txt", "text") },
      { label: "Quick Note", action: () => executeAction("new-note") },
      { label: "Save Session", action: () => executeAction("save-session") },
    ],
    edit: [
      { label: settings.reduceMotion ? "Enable Motion" : "Reduce Motion", action: () => setReduceMotion(!settings.reduceMotion) },
      { label: "Open Notifications", action: () => toggleNotificationCenter(true) },
      { label: "Refresh Workspace", action: () => notify("Workspace", "State refreshed.", "info", "system") },
    ],
    view: [
      {
        label: settings.themeMode === "dark" ? "Switch to Light" : "Switch to Dark",
        action: () => applyTheme(settings.themeMode === "dark" ? "light" : "dark"),
      },
      { label: "Toggle Notification Center", action: () => toggleNotificationCenter() },
      { label: "Open Settings", action: () => executeAction("open-settings") },
    ],
    go: [
      { label: "Open Browser Home", action: () => openApp("browser", { launchUrl: BROWSER_HOME_URL }) },
      { label: "Open Portfolio", action: () => openApp("browser", { launchUrl: PORTFOLIO_URL }) },
      {
        label: "Projects",
        action: () => {
          if (projectsFolder) {
            setActiveFolder(projectsFolder.id);
            openApp("files", { folderId: projectsFolder.id });
          }
        },
      },
      {
        label: "Downloads",
        action: () => {
          if (downloadsFolder) {
            setActiveFolder(downloadsFolder.id);
            openApp("files", { folderId: downloadsFolder.id });
          }
        },
      },
      { label: "Open Files", action: () => openApp("files") },
    ],
    window: [
      { label: "Cycle Window", action: () => switchAppWindow() },
      { label: "Mission Control", action: () => setAltTabOpen(true) },
      { label: "Task Manager", action: () => executeAction("open-taskmanager") },
      { label: "Security Center", action: () => executeAction("open-security") },
    ],
    help: [
      { label: "Run Security Scan", action: () => executeAction("run-security-scan") },
      { label: "Check Cloud Status", action: () => executeAction("open-settings") },
      { label: "Open Settings", action: () => executeAction("open-settings") },
    ],
  };

  const cloudStatus = useMemo(() => {
    if (cloudLabel.includes("online")) {
      return {
        badge: "Sync Ready",
        tone: "bg-emerald-400/18 text-emerald-100 ring-1 ring-emerald-300/25",
      };
    }
    if (cloudLabel.includes("issue")) {
      return {
        badge: "Sync Issue",
        tone: "bg-amber-400/18 text-amber-100 ring-1 ring-amber-300/25",
      };
    }
    return {
      badge: "Local Only",
      tone: "bg-white/10 text-white/75 ring-1 ring-white/12",
    };
  }, [cloudLabel]);

  const renderMenu = (key: MenuKey) => {
    if (menu !== key) {
      return null;
    }
    return (
      <div className="ui-menubar absolute left-0 top-9 z-[1400] min-w-52 rounded-2xl border p-1.5 shadow-2xl">
        {menuItems[key].map((item) => (
          <button
            key={item.label}
            type="button"
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[11px] text-white/90 hover:bg-white/14"
            onClick={() => runMenuAction(item.action)}
          >
            <span>{item.label}</span>
            <ChevronDown size={11} className="rotate-[-90deg] text-white/45" />
          </button>
        ))}
      </div>
    );
  };

  return (
    <header
      ref={menuRootRef}
      className="ui-menubar pointer-events-auto fixed left-1 right-1 top-1 z-[1200] flex h-10 items-center justify-between rounded-2xl border px-2 text-[12px] sm:left-2 sm:right-2 sm:top-2 sm:px-2.5"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => openApp("files")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/16 bg-white/14 text-white/95"
          aria-label="Open Finder"
        >
          <Command size={15} />
        </button>

        <div className="flex min-w-0 items-center gap-1 rounded-full bg-black/15 px-2.5 py-1 text-[11px] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] sm:px-3">
          <span className="max-w-24 truncate font-semibold text-white/95 sm:max-w-none">{activeAppLabel}</span>
          <span className="hidden max-w-40 truncate text-white/60 lg:inline">{activeFolderName}</span>
        </div>

        <div className="hidden items-center gap-0.5 md:flex">
          {(["file", "edit", "view", "go", "window", "help"] as const).map((key) => (
            <div key={key} className="relative">
              <button
                type="button"
                className={`rounded-xl px-2.5 py-1 text-[11px] capitalize ${
                  menu === key ? "bg-white/18 font-semibold text-white" : "text-white/82 hover:bg-white/10"
                }`}
                onClick={() => setMenu((prev) => (prev === key ? null : key))}
              >
                {key}
              </button>
              {renderMenu(key)}
            </div>
          ))}
        </div>

        <div className="hidden items-center gap-1 xl:flex">
          {desktops.map((desktop, index) => (
            <button
              key={desktop.id}
              type="button"
              onClick={() => switchDesktop(desktop.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                closeDesktop(desktop.id);
              }}
              className={`rounded-full px-2.5 py-1 text-[10px] ${
                desktop.id === activeDesktopId
                  ? "bg-cyan-300/24 text-cyan-50 ring-1 ring-cyan-200/30"
                  : "bg-white/10 text-white/68 hover:bg-white/14"
              }`}
              title={desktop.name}
            >
              {index + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={addDesktop}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/74 hover:bg-white/16"
            aria-label="Add desktop"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 whitespace-nowrap text-[11px]">
        <button
          type="button"
          onClick={() => toggleSearch(!searchOpen)}
          className="hidden h-7 w-7 items-center justify-center text-white/80 sm:flex"
          aria-label="Open app search"
        >
          <LaunchpadTriangle
            size={16}
            className={`transition-transform duration-500 ease-in-out ${searchOpen ? "rotate-180" : "rotate-0"}`}
          />
        </button>

        <button
          type="button"
          onClick={() => executeAction("open-settings")}
          className="hidden h-7 w-7 items-center justify-center rounded-xl bg-white/10 text-white/80 hover:bg-white/14 sm:flex"
          aria-label="Open settings"
        >
          <SlidersHorizontal size={13} />
        </button>

        <button
          type="button"
          onClick={() => toggleNotificationCenter()}
          className="relative flex h-7 min-w-7 items-center justify-center rounded-xl bg-white/10 px-2 text-white/84 hover:bg-white/14"
          aria-label="Notifications"
        >
          <Bell size={13} />
          {notificationCount > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1 text-[9px] text-white">
              {notificationCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={requestSignIn}
          disabled={busy}
          className="hidden rounded-full bg-white/12 px-3 py-1 font-medium text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] hover:bg-white/16 disabled:opacity-60 sm:inline-flex"
        >
          {userId ? "Signed In" : "Sign In"}
        </button>

        <span className={`hidden rounded-full px-2.5 py-1 md:inline-flex ${cloudStatus.tone}`}>
          {cloudStatus.badge}
        </span>

        <div className="hidden items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-white/70 lg:flex">
          <Wifi size={12} />
          <span className="max-w-28 truncate">{settings.locationLabel}</span>
        </div>

        <div className="hidden items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-white/70 sm:flex">
          <CircleDot size={12} className={settings.themeMode === "dark" ? "text-sky-200" : "text-amber-200"} />
          <BatteryFull size={13} />
        </div>

        <span className="rounded-full bg-black/16 px-2.5 py-1 font-semibold tracking-[0.01em] text-white/92 sm:px-3">
          {formatMenuClock(time, settings.timezone)}
        </span>
      </div>
    </header>
  );
};
