"use client";

import { create } from "zustand";
import {
  ALL_APPS,
  APP_LABELS,
  DEFAULT_STATE,
  DOWNLOADS_FOLDER_ID,
  ROOT_FOLDER_ID,
  createDefaultWorkspace,
  createDesktop,
} from "@/utils/constants";
import { createId } from "@/utils/id";
import {
  AppType,
  AppWindow,
  AttentionState,
  ClipboardItem,
  CommandAction,
  DesktopState,
  DesktopWorkspace,
  FileKind,
  FsNode,
  NotificationItem,
  SearchItem,
  ViewMode,
  WindowBounds,
} from "@/utils/types";
import { loadDesktopState, saveDesktopState } from "@/lib/db";
import { createSignedFileUrl, pullStateFromCloud, pushStateToCloud } from "@/lib/supabase";

const getViewportSize = () => ({
  width: typeof window === "undefined" ? 1280 : window.innerWidth,
  height: typeof window === "undefined" ? 720 : window.innerHeight,
});

const defaultBounds = (): WindowBounds => {
  const viewport = getViewportSize();
  const compact = viewport.width < 768;

  if (compact) {
    return {
      x: 0,
      y: 44,
      width: viewport.width,
      height: viewport.height - 48,
    };
  }

  const width = Math.min(760, Math.max(560, viewport.width - 96));
  const height = Math.min(520, Math.max(360, viewport.height - 148));

  return {
    x: Math.max(16, Math.round((viewport.width - width) / 2 + (Math.random() - 0.5) * 48)),
    y: Math.min(
      Math.max(58, Math.round((viewport.height - height) / 2 + (Math.random() - 0.5) * 40)),
      Math.max(58, viewport.height - 94 - height),
    ),
    width,
    height,
  };
};

const normalizeState = (input: DesktopState): DesktopState => {
  const state: DesktopState = {
    ...DEFAULT_STATE,
    ...input,
    settings: {
      ...DEFAULT_STATE.settings,
      ...input.settings,
    },
    fileAssociations: {
      ...DEFAULT_STATE.fileAssociations,
      ...input.fileAssociations,
    },
    dragState: {
      ...DEFAULT_STATE.dragState,
      ...input.dragState,
    },
  };
  if (!state.desktops.length) {
    state.desktops = [createDesktop("desktop-1", "Desktop 1")];
  }
  return state;
};

const getDesktop = (state: DesktopState, desktopId: string): DesktopWorkspace => {
  return state.desktops.find((item) => item.id === desktopId) ?? state.desktops[0];
};

const updateDesktop = (
  state: DesktopState,
  desktopId: string,
  updater: (desktop: DesktopWorkspace) => DesktopWorkspace,
): DesktopState => ({
  ...state,
  desktops: state.desktops.map((desktop) =>
    desktop.id === desktopId ? updater(desktop) : desktop,
  ),
});

const ensureWorkspace = (state: DesktopState, folderId: string): DesktopState => {
  if (state.workspaces[folderId]) {
    return state;
  }

  return {
    ...state,
    workspaces: {
      ...state.workspaces,
      [folderId]: createDefaultWorkspace(folderId),
    },
  };
};

const fileTitle = (file: FsNode | undefined): string => {
  if (!file) {
    return APP_LABELS.editor;
  }
  return `${APP_LABELS.editor} - ${file.name}`;
};

const getAssociatedApp = (state: DesktopState, node: FsNode): AppType => {
  if (node.kind === "folder") {
    return "files";
  }
  return state.fileAssociations[node.kind];
};

const isKnownExtension = (name: string): boolean => {
  const lower = name.toLowerCase();
  return [
    ".txt",
    ".json",
    ".md",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".avif",
    ".bmp",
    ".ico",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".html",
    ".css",
    ".py",
    ".cpp",
    ".cxx",
    ".cc",
    ".c",
    ".hpp",
    ".h",
    ".java",
    ".kt",
    ".go",
    ".rs",
    ".sh",
    ".bat",
    ".sql",
    ".yaml",
    ".yml",
    ".env",
    ".csv",
    ".log",
  ].some((extension) => lower.endsWith(extension));
};

interface OpenArgs {
  fileId?: string;
  folderId?: string;
  desktopId?: string;
  launchUrl?: string;
}

interface WebOSStore {
  ready: boolean;
  state: DesktopState;
  searchOpen: boolean;
  altTabOpen: boolean;
  notificationCenterOpen: boolean;
  contextMenu: { x: number; y: number } | null;
  setContextMenu: (value: { x: number; y: number } | null) => void;
  toggleSearch: (open?: boolean) => void;
  setAltTabOpen: (open: boolean) => void;
  toggleNotificationCenter: (open?: boolean) => void;
  hydrate: () => Promise<void>;
  saveNow: () => Promise<void>;
  syncCloud: (userId: string) => Promise<void>;
  pullCloud: (userId: string) => Promise<void>;
  setActiveFolder: (folderId: string) => void;
  setViewMode: (mode: ViewMode) => void;
  createNode: (
    name: string,
    kind: FileKind,
    parentId?: string,
    content?: string,
    metadata?: Partial<Pick<FsNode, "sourceUrl" | "storagePath" | "mimeType" | "sizeBytes">>,
  ) => void;
  renameNode: (id: string, nextName: string) => void;
  deleteNode: (id: string) => void;
  moveNode: (id: string, parentId: string) => void;
  updateFileContent: (id: string, content: string) => void;
  openAssociatedNode: (nodeId: string, openWith?: AppType) => void;
  openApp: (app: AppType, args?: OpenArgs) => void;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  updateWindowBounds: (windowId: string, bounds: WindowBounds) => void;
  snapWindow: (windowId: string, zone: "left" | "right" | "top") => void;
  switchAppWindow: () => void;
  snapActiveWindow: (direction: "left" | "right" | "up") => void;
  updateWorkspaceNotes: (folderId: string, notes: string) => void;
  refreshFolderWorkspace: () => void;
  getSearchItems: (query?: string) => SearchItem[];
  executeAction: (action: CommandAction, payload?: string) => void;
  addDesktop: () => void;
  switchDesktop: (desktopId: string) => void;
  closeDesktop: (desktopId: string) => void;
  pinApp: (app: AppType) => void;
  unpinApp: (app: AppType) => void;
  notify: (
    title: string,
    message: string,
    level?: NotificationItem["level"],
    group?: NotificationItem["group"],
    actionLabel?: string,
    action?: CommandAction,
    actionPayload?: string,
  ) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  addClipboardItem: (text: string) => void;
  applyTheme: (mode: DesktopState["settings"]["themeMode"]) => void;
  applyBackground: (backgroundClass: string) => void;
  setReduceMotion: (reduceMotion: boolean) => void;
  updateClockContext: (timezone: string, locationLabel: string) => void;
  setFileAssociation: (kind: Exclude<FileKind, "folder">, app: AppType) => void;
  runningWindows: () => AppWindow[];
  markAttention: (targetType: AttentionState["targetType"], targetId: string, severity: AttentionState["severity"]) => void;
  clearAttention: (id: string) => void;
  setDragState: (drag: DesktopState["dragState"]) => void;
  markFileSafe: (id: string) => void;
  scanFiles: () => { id: string; status: "safe" | "warning" | "risk"; reason: string }[];
  bumpBrowserSearch: () => void;
  applySuggestion: (id: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let createdFilesBurst = 0;
let browserSearchBurst = 0;

const queuePersist = (state: DesktopState): void => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(() => {
    saveDesktopState({ ...state, lastSavedAt: Date.now() }).catch(() => undefined);
  }, 220);
};

const pushRecent = (state: DesktopState, app: AppType): DesktopState => ({
  ...state,
  recentApps: [app, ...state.recentApps.filter((item) => item !== app)].slice(0, 5),
});

const pushNotification = (
  state: DesktopState,
  notification: Omit<NotificationItem, "id" | "createdAt">,
): DesktopState => ({
  ...state,
  notifications: [
    {
      id: createId("note"),
      createdAt: Date.now(),
      ...notification,
    },
    ...state.notifications,
  ].slice(0, 120),
});

const pushAttention = (
  state: DesktopState,
  targetType: AttentionState["targetType"],
  targetId: string,
  severity: AttentionState["severity"],
): DesktopState => {
  const life = severity === "critical" ? 15000 : 6000;
  return {
    ...state,
    attention: [
      {
        id: createId("attn"),
        targetType,
        targetId,
        severity,
        createdAt: Date.now(),
        expiresAt: Date.now() + life,
      },
      ...state.attention,
    ],
  };
};

export const useWebOSStore = create<WebOSStore>((set, get) => ({
  ready: false,
  state: DEFAULT_STATE,
  searchOpen: false,
  altTabOpen: false,
  notificationCenterOpen: false,
  contextMenu: null,
  setContextMenu: (value) => set({ contextMenu: value }),
  toggleSearch: (open) =>
    set((current) => ({
      searchOpen: typeof open === "boolean" ? open : !current.searchOpen,
    })),
  setAltTabOpen: (open) => set({ altTabOpen: open }),
  toggleNotificationCenter: (open) =>
    set((current) => ({
      notificationCenterOpen:
        typeof open === "boolean" ? open : !current.notificationCenterOpen,
    })),
  hydrate: async () => {
    try {
      const local = await loadDesktopState();
      const restored = normalizeState(local ?? DEFAULT_STATE);
      const now = Date.now();
      const introTitle = "Welcome to Shani OS";
      const next = {
        ...restored,
        attention: restored.attention.filter((item) => item.expiresAt > now),
        notifications: local
          ? [
              {
                id: createId("note"),
                title: "Recovery",
                message: "Previous session restored successfully.",
                level: "info" as const,
                group: "system" as const,
                createdAt: now,
              },
              ...restored.notifications.filter((notification) => notification.title !== introTitle),
            ].slice(0, 120)
          : restored.notifications,
      };
      set({ state: next, ready: true });
    } catch {
      set({
        state: {
          ...DEFAULT_STATE,
          notifications: [
            {
              id: createId("note"),
              title: "Safe Boot",
              message: "Stored browser data could not be loaded, so WebOS started fresh.",
              level: "warning",
              group: "system",
              createdAt: Date.now(),
            },
          ],
        },
        ready: true,
      });
    }
  },
  saveNow: async () => {
    const { state } = get();
    await saveDesktopState({ ...state, lastSavedAt: Date.now() });
  },
  syncCloud: async (userId) => {
    const { state } = get();
    await pushStateToCloud(userId, state);
  },
  pullCloud: async (userId) => {
    const cloud = await pullStateFromCloud(userId);
    if (!cloud) {
      return;
    }

    const next = normalizeState(cloud);
    set({ state: next });
    queuePersist(next);
  },
  setActiveFolder: (folderId) => {
    set((current) => {
      const prepared = ensureWorkspace(current.state, folderId);
      const next = updateDesktop(prepared, prepared.activeDesktopId, (desktop) => ({
        ...desktop,
        activeFolderId: folderId,
      }));
      queuePersist(next);
      return { state: next };
    });
  },
  setViewMode: (mode) => {
    set((current) => {
      const desktop = getDesktop(current.state, current.state.activeDesktopId);
      const folderId = desktop.activeFolderId;
      const workspace = current.state.workspaces[folderId] ?? createDefaultWorkspace(folderId);
      const next: DesktopState = {
        ...current.state,
        workspaces: {
          ...current.state.workspaces,
          [folderId]: { ...workspace, viewMode: mode },
        },
      };
      queuePersist(next);
      return { state: next };
    });
  },
  createNode: (name, kind, parentId, content, metadata) => {
    const cleanName = name.trim();
    if (!cleanName) {
      return;
    }

    set((current) => {
      const desktop = getDesktop(current.state, current.state.activeDesktopId);
      const node: FsNode = {
        id: createId(kind),
        parentId: parentId ?? desktop.activeFolderId,
        name: cleanName,
        kind,
        content: content ?? "",
        updatedAt: Date.now(),
        ...metadata,
      };

      let next: DesktopState = {
        ...current.state,
        nodes: [...current.state.nodes, node],
        workspaces:
          kind === "folder"
            ? {
                ...current.state.workspaces,
                [node.id]: createDefaultWorkspace(node.id),
              }
            : current.state.workspaces,
      };

      next = pushNotification(next, {
        title: "File Created",
        message: cleanName,
        level: "info",
        group: "files",
      });

      next = pushAttention(next, "file", node.id, "info");
      createdFilesBurst += 1;

      if (createdFilesBurst >= 4) {
        next = {
          ...next,
          suggestions: [
            {
              id: createId("sug"),
              message: "You created many files. Group them in a folder?",
              actionLabel: "New Folder",
              action: "new-folder" as const,
              createdAt: Date.now(),
            },
            ...next.suggestions,
          ].slice(0, 20),
        };
        createdFilesBurst = 0;
      }

      if (kind !== "folder" && !isKnownExtension(cleanName)) {
        next = pushNotification(next, {
          title: "Suspicious File",
          message: `${cleanName} has an unknown type`,
          level: "warning",
          group: "security",
        });
        next = pushAttention(next, "file", node.id, "warning");
      }

      queuePersist(next);
      return { state: next };
    });
  },
  renameNode: (id, nextName) => {
    const cleanName = nextName.trim();
    if (!cleanName) {
      return;
    }

    set((current) => {
      const next = {
        ...current.state,
        nodes: current.state.nodes.map((node) =>
          node.id === id ? { ...node, name: cleanName, updatedAt: Date.now() } : node,
        ),
      };
      queuePersist(next);
      return { state: next };
    });
  },
  deleteNode: (id) => {
    if (id === ROOT_FOLDER_ID) {
      return;
    }

    set((current) => {
      const toDelete = new Set<string>([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const node of current.state.nodes) {
          if (node.parentId && toDelete.has(node.parentId) && !toDelete.has(node.id)) {
            toDelete.add(node.id);
            changed = true;
          }
        }
      }

      const next = {
        ...current.state,
        nodes: current.state.nodes.filter((node) => !toDelete.has(node.id)),
        workspaces: Object.fromEntries(
          Object.entries(current.state.workspaces).filter(([key]) => !toDelete.has(key)),
        ),
        desktops: current.state.desktops.map((desktop) => ({
          ...desktop,
          activeFolderId: toDelete.has(desktop.activeFolderId)
            ? ROOT_FOLDER_ID
            : desktop.activeFolderId,
          openWindows: desktop.openWindows.filter(
            (win) => !toDelete.has(win.fileId ?? "") && !toDelete.has(win.folderId),
          ),
        })),
        safeFileIds: current.state.safeFileIds.filter((safeId) => !toDelete.has(safeId)),
      };
      queuePersist(next);
      return { state: next };
    });
  },
  moveNode: (id, parentId) => {
    set((current) => {
      const parent = current.state.nodes.find((node) => node.id === parentId);
      if (!parent || parent.kind !== "folder" || parentId === id) {
        return current;
      }

      const next = {
        ...current.state,
        nodes: current.state.nodes.map((node) =>
          node.id === id ? { ...node, parentId, updatedAt: Date.now() } : node,
        ),
      };
      queuePersist(next);
      return { state: next };
    });
  },
  updateFileContent: (id, content) => {
    set((current) => {
      const next = {
        ...current.state,
        nodes: current.state.nodes.map((node) =>
          node.id === id ? { ...node, content, updatedAt: Date.now() } : node,
        ),
      };
      queuePersist(next);
      return { state: next };
    });
  },
  openAssociatedNode: (nodeId, openWith) => {
    const { state, openApp, setActiveFolder } = get();
    const node = state.nodes.find((item) => item.id === nodeId);
    if (!node) {
      return;
    }

    if (node.kind === "folder") {
      setActiveFolder(node.id);
      openApp("files", { folderId: node.id });
      return;
    }

    if ((node.kind === "image" || node.kind === "binary") && node.storagePath) {
      void createSignedFileUrl(node.storagePath)
        .then((signedUrl) => {
          if (typeof window !== "undefined") {
            window.open(signedUrl, "_blank", "noopener,noreferrer");
          }
        })
        .catch(() => {
          get().notify("Open Failed", `Could not open ${node.name}`, "warning", "files");
        });
      return;
    }

    const targetApp = openWith ?? getAssociatedApp(state, node);
    openApp(targetApp, { fileId: node.id, folderId: node.parentId ?? ROOT_FOLDER_ID });
  },
  openApp: (app, args) => {
    set((current) => {
      const desktopId = args?.desktopId ?? current.state.activeDesktopId;
      const desktop = getDesktop(current.state, desktopId);
      const folderId = args?.folderId ?? desktop.activeFolderId;
      const prepared = ensureWorkspace(current.state, folderId);
      const nextDesktop = getDesktop(prepared, desktopId);
      const topZ =
        nextDesktop.openWindows.reduce((max, item) => (item.z > max ? item.z : max), 0) + 1;
      const file = args?.fileId
        ? prepared.nodes.find((node) => node.id === args.fileId)
        : undefined;

      const win: AppWindow = {
        id: createId("win"),
        app,
        title: app === "editor" || app === "notes" ? fileTitle(file) : APP_LABELS[app],
        folderId,
        desktopId,
        fileId: args?.fileId,
        launchUrl: args?.launchUrl,
        z: topZ,
        minimized: false,
        maximized: getViewportSize().width < 768,
        bounds: defaultBounds(),
      };

      let next = updateDesktop(prepared, desktopId, (desk) => ({
        ...desk,
        activeFolderId: folderId,
        openWindows: [...desk.openWindows, win],
        activeWindowId: win.id,
      }));

      next = pushRecent(next, app);
      next = {
        ...next,
        lastOpenedApp: app,
        windowActivity: {
          ...next.windowActivity,
          [win.id]: (next.windowActivity[win.id] ?? 0) + 1,
        },
      };

      next = pushNotification(next, {
        title: "App Opened",
        message: APP_LABELS[app],
        level: "info",
        group: "activity",
      });
      next = pushAttention(next, "dock", app, "info");

      queuePersist(next);
      return { state: next };
    });
  },
  closeWindow: (windowId) => {
    set((current) => {
      const desktop = getDesktop(current.state, current.state.activeDesktopId);
      const windows = desktop.openWindows.filter((win) => win.id !== windowId);
      const next = updateDesktop(current.state, desktop.id, (desk) => ({
        ...desk,
        openWindows: windows,
        activeWindowId: windows[windows.length - 1]?.id ?? null,
      }));
      queuePersist(next);
      return { state: next };
    });
  },
  minimizeWindow: (windowId) => {
    set((current) => {
      const desktop = getDesktop(current.state, current.state.activeDesktopId);
      const target = desktop.openWindows.find((win) => win.id === windowId);
      const willMinimize = target ? !target.minimized : true;
      const nextWindows = desktop.openWindows.map((win) =>
        win.id === windowId ? { ...win, minimized: willMinimize } : win,
      );
      const visibleWindows = nextWindows.filter((win) => !win.minimized);
      const nextActiveId = willMinimize
        ? visibleWindows.sort((a, b) => b.z - a.z)[0]?.id ?? null
        : windowId;
      const next = updateDesktop(current.state, desktop.id, (desk) => ({
        ...desk,
        openWindows: nextWindows,
        activeWindowId: nextActiveId,
      }));
      queuePersist(next);
      return { state: next };
    });
  },
  maximizeWindow: (windowId) => {
    set((current) => {
      const desktop = getDesktop(current.state, current.state.activeDesktopId);
      const topZ = desktop.openWindows.reduce((max, item) => (item.z > max ? item.z : max), 0);
      const next = updateDesktop(current.state, desktop.id, (desk) => ({
        ...desk,
        activeWindowId: windowId,
        openWindows: desk.openWindows.map((win) =>
          win.id === windowId ? { ...win, maximized: !win.maximized, minimized: false, z: topZ + 1 } : win,
        ),
      }));
      queuePersist(next);
      return { state: next };
    });
  },
  focusWindow: (windowId) => {
    set((current) => {
      const desktop = getDesktop(current.state, current.state.activeDesktopId);
      const topZ = desktop.openWindows.reduce((max, item) => (item.z > max ? item.z : max), 0);
      let next = updateDesktop(current.state, desktop.id, (desk) => ({
        ...desk,
        activeWindowId: windowId,
        openWindows: desk.openWindows.map((win) =>
          win.id === windowId ? { ...win, z: topZ + 1, minimized: false } : win,
        ),
      }));
      next = {
        ...next,
        windowActivity: {
          ...next.windowActivity,
          [windowId]: (next.windowActivity[windowId] ?? 0) + 1,
        },
      };
      queuePersist(next);
      return { state: next };
    });
  },
  updateWindowBounds: (windowId, bounds) => {
    set((current) => {
      const desktop = getDesktop(current.state, current.state.activeDesktopId);
      const next = updateDesktop(current.state, desktop.id, (desk) => ({
        ...desk,
        openWindows: desk.openWindows.map((win) =>
          win.id === windowId ? { ...win, bounds } : win,
        ),
      }));
      queuePersist(next);
      return { state: next };
    });
  },
  snapWindow: (windowId, zone) => {
    const { width: viewportWidth, height: viewportHeight } = getViewportSize();
    const bounds: Record<"left" | "right" | "top", WindowBounds> = {
      left: { x: 8, y: 54, width: (viewportWidth - 20) / 2, height: viewportHeight - 148 },
      right: {
        x: viewportWidth / 2 + 2,
        y: 54,
        width: (viewportWidth - 20) / 2,
        height: viewportHeight - 148,
      },
      top: { x: 8, y: 54, width: viewportWidth - 16, height: viewportHeight - 64 },
    };
    set((current) => {
      const desktop = getDesktop(current.state, current.state.activeDesktopId);
      const topZ = desktop.openWindows.reduce((max, item) => (item.z > max ? item.z : max), 0);
      const next = updateDesktop(current.state, desktop.id, (desk) => ({
        ...desk,
        activeWindowId: windowId,
        openWindows: desk.openWindows.map((win) =>
          win.id === windowId
            ? {
                ...win,
                bounds: bounds[zone],
                maximized: zone === "top",
                minimized: false,
                z: topZ + 1,
              }
            : win,
        ),
      }));
      queuePersist(next);
      return { state: { ...next, dragState: { type: "none", snapPreview: null } } };
    });
  },
  switchAppWindow: () => {
    const { state, focusWindow } = get();
    const desktop = getDesktop(state, state.activeDesktopId);
    if (desktop.openWindows.length < 2) {
      return;
    }

    const sorted = [...desktop.openWindows].sort((a, b) => b.z - a.z);
    const currentIndex = sorted.findIndex((win) => win.id === desktop.activeWindowId);
    const next = sorted[(currentIndex + 1) % sorted.length];
    if (next) {
      focusWindow(next.id);
    }
  },
  snapActiveWindow: (direction) => {
    const { state, snapWindow } = get();
    const desktop = getDesktop(state, state.activeDesktopId);
    if (!desktop.activeWindowId) {
      return;
    }

    if (direction === "left") {
      snapWindow(desktop.activeWindowId, "left");
      return;
    }

    if (direction === "right") {
      snapWindow(desktop.activeWindowId, "right");
      return;
    }

    snapWindow(desktop.activeWindowId, "top");
  },
  updateWorkspaceNotes: (folderId, notes) => {
    set((current) => {
      const prepared = ensureWorkspace(current.state, folderId);
      const workspace = prepared.workspaces[folderId] ?? createDefaultWorkspace(folderId);
      const next = {
        ...prepared,
        workspaces: {
          ...prepared.workspaces,
          [folderId]: {
            ...workspace,
            notes,
          },
        },
      };
      queuePersist(next);
      return { state: next };
    });
  },
  refreshFolderWorkspace: () => {
    set((current) => ({ state: { ...current.state } }));
  },
  getSearchItems: (query) => {
    const { state } = get();
    const desktop = getDesktop(state, state.activeDesktopId);

    const appItems: SearchItem[] = [...new Set([...ALL_APPS, ...state.pinnedApps, ...state.recentApps])].map(
      (app) => ({
        id: `app-${app}`,
        label: APP_LABELS[app],
        kind: "app",
        group: "Apps",
        app,
        folderId: desktop.activeFolderId,
      }),
    );

    const nodeItems: SearchItem[] = state.nodes
      .filter((node) => node.id !== ROOT_FOLDER_ID)
      .map((node) => ({
        id: `node-${node.id}`,
        label: node.name,
        kind: node.kind === "folder" ? "folder" : "file",
        group: node.kind === "folder" ? "Folders" : "Files",
        fileId: node.kind === "folder" ? undefined : node.id,
        folderId: node.kind === "folder" ? node.id : node.parentId ?? ROOT_FOLDER_ID,
      }));

    const q = (query ?? "").trim().toLowerCase();
    const actionItems: SearchItem[] = [];

    if (!q) {
      actionItems.push(
        {
          id: "action-new-note",
          label: "Create Quick Note",
          kind: "action",
          group: "Actions",
          action: "new-note",
        },
        {
          id: "action-open-taskmanager",
          label: "Open Task Manager",
          kind: "action",
          group: "Actions",
          action: "open-taskmanager",
        },
        {
          id: "action-run-security-scan",
          label: "Run Security Scan",
          kind: "action",
          group: "Actions",
          action: "run-security-scan",
        },
        {
          id: "action-toggle-theme",
          label: "Toggle Theme",
          kind: "action",
          group: "Actions",
          action: "toggle-theme",
        },
      );
    }

    if (q.startsWith("new folder")) {
      actionItems.push({
        id: "action-new-folder",
        label: "Create New Folder",
        kind: "action",
        group: "Actions",
        action: "new-folder",
      });
    }

    if (q.includes("open notes")) {
      actionItems.push({
        id: "action-open-notes",
        label: "Open Notes",
        kind: "action",
        group: "Actions",
        action: "open-notes",
      });
    }

    if (q.includes("open browser")) {
      actionItems.push({
        id: "action-open-browser",
        label: "Open Browser",
        kind: "action",
        group: "Actions",
        action: "open-browser",
      });
    }

    if (q.includes("browser home") || q.includes("home page")) {
      actionItems.push({
        id: "action-open-browser-home",
        label: "Open Browser Home",
        kind: "action",
        group: "Actions",
        action: "open-browser-home",
      });
    }

    if (q.includes("portfolio") || q.includes("pbhacks")) {
      actionItems.push({
        id: "action-open-portfolio",
        label: "Open Portfolio",
        kind: "action",
        group: "Actions",
        action: "open-portfolio",
      });
    }

    if (q.includes("photos")) {
      actionItems.push({
        id: "action-open-photos",
        label: "Open Photos",
        kind: "action",
        group: "Actions",
        action: "open-photos",
      });
    }

    if (q.includes("calendar")) {
      actionItems.push({
        id: "action-open-calendar",
        label: "Open Calendar",
        kind: "action",
        group: "Actions",
        action: "open-calendar",
      });
    }

    if (q.includes("calculator") || q.includes("calc")) {
      actionItems.push({
        id: "action-open-calculator",
        label: "Open Calculator",
        kind: "action",
        group: "Actions",
        action: "open-calculator",
      });
    }

    if (q.includes("code") || q.includes("dev hub") || q.includes("studio")) {
      actionItems.push({
        id: "action-open-devhub",
        label: "Open Code Studio",
        kind: "action",
        group: "Actions",
        action: "open-devhub",
      });
    }

    if (q.includes("task manager") || q.includes("taskmanager")) {
      actionItems.push({
        id: "action-open-taskmanager",
        label: "Open Task Manager",
        kind: "action",
        group: "Actions",
        action: "open-taskmanager",
      });
    }

    if (q.includes("settings")) {
      actionItems.push({
        id: "action-open-settings",
        label: "Open Settings",
        kind: "action",
        group: "Actions",
        action: "open-settings",
      });
    }

    if (q.includes("security")) {
      actionItems.push({
        id: "action-open-security",
        label: "Open Security Center",
        kind: "action",
        group: "Actions",
        action: "open-security",
      });
      actionItems.push({
        id: "action-run-security-scan",
        label: "Run Security Scan",
        kind: "action",
        group: "Actions",
        action: "run-security-scan",
      });
    }

    if (q.includes("theme") || q.includes("dark") || q.includes("light")) {
      actionItems.push({
        id: "action-toggle-theme",
        label: "Toggle Theme",
        kind: "action",
        group: "Actions",
        action: "toggle-theme",
      });
    }

    if (q.includes("note")) {
      actionItems.push({
        id: "action-new-note",
        label: "Create Quick Note",
        kind: "action",
        group: "Actions",
        action: "new-note",
      });
    }

    if (q.includes("save") && q.includes("session")) {
      actionItems.push({
        id: "action-save-session",
        label: "Save Session Now",
        kind: "action",
        group: "Actions",
        action: "save-session",
      });
    }

    const searchPrefix = "search ";
    if (q.startsWith(searchPrefix)) {
      const payload = q.slice(searchPrefix.length);
      if (payload) {
        actionItems.push({
          id: `action-search-${payload}`,
          label: `Search Web: ${payload}`,
          kind: "action",
          group: "Actions",
          action: "search-web",
          payload,
        });
      }
    }

    return [...actionItems, ...appItems, ...nodeItems];
  },
  executeAction: (action, payload) => {
    const { createNode, openApp, markAttention, saveNow, scanFiles, applyTheme, state } = get();

    switch (action) {
      case "new-folder":
        createNode("New Folder", "folder");
        break;
      case "open-notes":
        openApp("notes");
        break;
      case "open-browser":
        openApp("browser");
        break;
      case "open-browser-home":
        openApp("browser", { launchUrl: "webos://shani-os" });
        break;
      case "open-portfolio":
        openApp("browser", { launchUrl: "https://pbhacks.lovable.app" });
        break;
      case "open-photos":
        openApp("photos");
        break;
      case "open-calendar":
        openApp("calendar");
        break;
      case "open-calculator":
        openApp("calculator");
        break;
      case "open-devhub":
        openApp("devhub");
        break;
      case "open-taskmanager":
        openApp("taskmanager");
        break;
      case "open-settings":
        openApp("settings");
        break;
      case "open-security":
        openApp("security");
        break;
      case "new-note":
        createNode(`quick-note-${new Date().toISOString().slice(0, 16).replace("T", "-")}.md`, "markdown");
        openApp("notes");
        break;
      case "run-security-scan": {
        const findings = scanFiles();
        const risks = findings.filter((item) => item.status === "risk").length;
        const warnings = findings.filter((item) => item.status === "warning").length;
        openApp("security");
        get().notify(
          "Security Scan Completed",
          `Risks: ${risks}, Warnings: ${warnings}, Checked: ${findings.length}`,
          risks > 0 ? "critical" : warnings > 0 ? "warning" : "info",
          "security",
        );
        break;
      }
      case "toggle-theme":
        applyTheme(state.settings.themeMode === "dark" ? "light" : "dark");
        break;
      case "save-session":
        saveNow().then(() => {
          get().notify("Session Saved", "Workspace state saved to local storage.", "info", "system");
        }).catch(() => {
          get().notify("Save Failed", "Could not save workspace state.", "warning", "system");
        });
        break;
      case "search-web":
        if (payload) {
          const url = `https://www.google.com/search?q=${encodeURIComponent(payload)}`;
          openApp("browser", { launchUrl: url });
          browserSearchBurst += 1;
          if (browserSearchBurst >= 4) {
            get().notify(
              "Workspace Suggestion",
              "You performed multiple searches. Save this as a workspace?",
              "info",
              "activity",
              "Open Settings",
              "open-settings",
            );
            markAttention("dock", "settings", "info");
            browserSearchBurst = 0;
          }
        }
        break;
      default:
        break;
    }
  },
  addDesktop: () => {
    set((current) => {
      const id = createId("desktop");
      const next = {
        ...current.state,
        desktops: [
          ...current.state.desktops,
          createDesktop(id, `Desktop ${current.state.desktops.length + 1}`),
        ],
        activeDesktopId: id,
      };
      queuePersist(next);
      return { state: next };
    });
  },
  switchDesktop: (desktopId) => {
    set((current) => {
      if (!current.state.desktops.some((item) => item.id === desktopId)) {
        return current;
      }
      const next = { ...current.state, activeDesktopId: desktopId };
      queuePersist(next);
      return { state: next };
    });
  },
  closeDesktop: (desktopId) => {
    set((current) => {
      if (current.state.desktops.length <= 1) {
        return current;
      }

      const desktops = current.state.desktops.filter((item) => item.id !== desktopId);
      const next = {
        ...current.state,
        desktops,
        activeDesktopId:
          current.state.activeDesktopId === desktopId
            ? desktops[0].id
            : current.state.activeDesktopId,
      };
      queuePersist(next);
      return { state: next };
    });
  },
  pinApp: (app) => {
    set((current) => {
      if (current.state.pinnedApps.includes(app)) {
        return current;
      }
      const next = { ...current.state, pinnedApps: [...current.state.pinnedApps, app] };
      queuePersist(next);
      return { state: next };
    });
  },
  unpinApp: (app) => {
    set((current) => {
      const next = {
        ...current.state,
        pinnedApps: current.state.pinnedApps.filter((item) => item !== app),
      };
      queuePersist(next);
      return { state: next };
    });
  },
  notify: (title, message, level = "info", group = "system", actionLabel, action, actionPayload) => {
    set((current) => ({
      state: pushNotification(current.state, {
        title,
        message,
        level,
        group,
        actionLabel,
        action,
        actionPayload,
      }),
    }));
  },
  dismissNotification: (id) => {
    set((current) => ({
      state: {
        ...current.state,
        notifications: current.state.notifications.filter((item) => item.id !== id),
      },
    }));
  },
  clearNotifications: () => {
    set((current) => ({
      state: {
        ...current.state,
        notifications: current.state.notifications.filter((item) => item.level === "critical"),
      },
    }));
  },
  addClipboardItem: (text) => {
    const value = text.trim();
    if (!value) {
      return;
    }

    const item: ClipboardItem = {
      id: createId("clip"),
      text: value,
      createdAt: Date.now(),
    };

    set((current) => {
      const next = {
        ...current.state,
        clipboardHistory: [item, ...current.state.clipboardHistory].slice(0, 5),
      };
      queuePersist(next);
      return { state: next };
    });
  },
  applyTheme: (mode) => {
    set((current) => {
      const next = {
        ...current.state,
        settings: { ...current.state.settings, themeMode: mode },
      };
      queuePersist(next);
      return { state: next };
    });
  },
  applyBackground: (backgroundClass) => {
    set((current) => {
      const next = {
        ...current.state,
        settings: { ...current.state.settings, backgroundClass },
      };
      queuePersist(next);
      return { state: next };
    });
  },
  setReduceMotion: (reduceMotion) => {
    set((current) => {
      const next = {
        ...current.state,
        settings: { ...current.state.settings, reduceMotion },
      };
      queuePersist(next);
      return { state: next };
    });
  },
  updateClockContext: (timezone, locationLabel) => {
    set((current) => {
      const next = {
        ...current.state,
        settings: { ...current.state.settings, timezone, locationLabel },
      };
      queuePersist(next);
      return { state: next };
    });
  },
  setFileAssociation: (kind, app) => {
    set((current) => {
      const next = {
        ...current.state,
        fileAssociations: { ...current.state.fileAssociations, [kind]: app },
      };
      queuePersist(next);
      return { state: next };
    });
  },
  runningWindows: () => {
    const { state } = get();
    return getDesktop(state, state.activeDesktopId).openWindows;
  },
  markAttention: (targetType, targetId, severity) => {
    set((current) => ({ state: pushAttention(current.state, targetType, targetId, severity) }));
  },
  clearAttention: (id) => {
    set((current) => ({
      state: {
        ...current.state,
        attention: current.state.attention.filter((item) => item.id !== id),
      },
    }));
  },
  setDragState: (drag) => {
    set((current) => ({ state: { ...current.state, dragState: drag } }));
  },
  markFileSafe: (id) => {
    set((current) => {
      if (current.state.safeFileIds.includes(id)) {
        return current;
      }
      const next = {
        ...current.state,
        safeFileIds: [...current.state.safeFileIds, id],
      };
      queuePersist(next);
      return { state: next };
    });
  },
  scanFiles: () => {
    const { state } = get();
    return state.nodes
      .filter((node) => node.kind !== "folder")
      .map((node) => {
        if (state.safeFileIds.includes(node.id)) {
          return { id: node.id, status: "safe" as const, reason: "User trusted" };
        }

        if (!isKnownExtension(node.name)) {
          return { id: node.id, status: "risk" as const, reason: "Unknown extension" };
        }

        if (node.content.length > 10000) {
          return { id: node.id, status: "warning" as const, reason: "Large payload" };
        }

        return { id: node.id, status: "safe" as const, reason: "Known type" };
      });
  },
  bumpBrowserSearch: () => {
    browserSearchBurst += 1;
    if (browserSearchBurst < 4) {
      return;
    }

    set((current) => ({
      state: {
        ...current.state,
        suggestions: [
          {
            id: createId("sug"),
            message: "You made multiple searches. Save workspace settings?",
            actionLabel: "Open Settings",
            action: "open-settings" as const,
            createdAt: Date.now(),
          },
          ...current.state.suggestions,
        ].slice(0, 20),
      },
    }));
    browserSearchBurst = 0;
  },
  applySuggestion: (id) => {
    const suggestion = get().state.suggestions.find((item) => item.id === id);
    if (!suggestion) {
      return;
    }

    get().executeAction(suggestion.action, suggestion.actionPayload);
    set((current) => ({
      state: {
        ...current.state,
        suggestions: current.state.suggestions.filter((item) => item.id !== id),
      },
    }));
  },
}));

export const createDownloadFile = (
  state: DesktopState,
  filename: string,
  content: string,
): DesktopState => {
  const node: FsNode = {
    id: createId("file"),
    parentId: DOWNLOADS_FOLDER_ID,
    name: filename,
    kind: filename.endsWith(".json")
      ? "json"
      : filename.endsWith(".md")
        ? "markdown"
        : "text",
    content,
    updatedAt: Date.now(),
  };

  return {
    ...state,
    nodes: [...state.nodes, node],
  };
};
