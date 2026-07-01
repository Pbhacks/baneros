import { AppType, DesktopState, DesktopWorkspace, FolderWorkspace, FsNode } from "@/utils/types";

export interface WallpaperOption {
  id: string;
  className: string;
  label: string;
  description: string;
}

export const ROOT_FOLDER_ID = "root";
export const PROJECTS_FOLDER_ID = "folder-projects";
export const DOWNLOADS_FOLDER_ID = "folder-downloads";
export const DESKTOP_1_ID = "desktop-1";

const now = Date.now();

export const APP_LABELS: Record<AppType, string> = {
  files: "Files",
  editor: "Text Editor",
  terminal: "Terminal",
  browser: "Browser",
  notes: "Notes",
  photos: "Photos",
  calendar: "Calendar",
  calculator: "Calculator",
  devhub: "Code Studio",
  taskmanager: "Task Manager",
  settings: "Settings",
  security: "Security Center",
};

export const ALL_APPS: AppType[] = [
  "files",
  "browser",
  "photos",
  "notes",
  "calendar",
  "calculator",
  "editor",
  "terminal",
  "devhub",
  "taskmanager",
  "settings",
  "security",
];

export const APP_DESCRIPTIONS: Record<AppType, string> = {
  files: "Browse folders, uploads, and starter files.",
  editor: "Edit text, JSON, and code files.",
  terminal: "Run workspace commands and template shortcuts.",
  browser: "Open the built-in web reader and pinned media view.",
  notes: "Write markdown notes for the current workspace.",
  photos: "Review uploaded images and switch wallpapers.",
  calendar: "Check the month view and manage quick reminders.",
  calculator: "Use a compact desktop calculator.",
  devhub: "Spin up React, Python, C++, and Java starters fast.",
  taskmanager: "Inspect open windows and recent activity.",
  settings: "Adjust themes, wallpapers, and cloud status.",
  security: "Review scans and security suggestions.",
};

export const APP_GROUPS: Record<AppType, "Work" | "Media" | "Developer" | "System"> = {
  files: "Work",
  editor: "Developer",
  terminal: "Developer",
  browser: "Media",
  notes: "Work",
  photos: "Media",
  calendar: "Work",
  calculator: "Work",
  devhub: "Developer",
  taskmanager: "System",
  settings: "System",
  security: "System",
};

export const WALLPAPER_OPTIONS: WallpaperOption[] = [
  {
    id: "default",
    className: "bg-webos",
    label: "Ocean Glass",
    description: "Deep teal and amber desktop glow.",
  },
  {
    id: "sunset",
    className: "bg-webos-sunset",
    label: "Sunset Wave",
    description: "Warm dusk gradient with coral highlights.",
  },
  {
    id: "mint",
    className: "bg-webos-mint",
    label: "Mint Field",
    description: "Cool mint palette for a calmer workspace.",
  },
  {
    id: "designer",
    className: "bg-webos-designer",
    label: "Studio Print",
    description: "Poster-style wallpaper already bundled locally.",
  },
  {
    id: "aurora",
    className: "bg-webos-aurora",
    label: "Aurora Grid",
    description: "Northern lights over a soft neon grid.",
  },
  {
    id: "canyon",
    className: "bg-webos-canyon",
    label: "Canyon Glow",
    description: "Desert-inspired horizon with warm shadows.",
  },
  {
    id: "paper",
    className: "bg-webos-paper",
    label: "Paper Studio",
    description: "Bright editorial backdrop with subtle texture.",
  },
  {
    id: "lagoon",
    className: "bg-webos-lagoon",
    label: "Lagoon Bloom",
    description: "Tropical cyan gradients with layered depth.",
  },
];

const rootNode: FsNode = {
  id: ROOT_FOLDER_ID,
  parentId: null,
  name: "Workspace",
  kind: "folder",
  content: "",
  updatedAt: now,
};

const starterFolder: FsNode = {
  id: PROJECTS_FOLDER_ID,
  parentId: ROOT_FOLDER_ID,
  name: "Projects",
  kind: "folder",
  content: "",
  updatedAt: now,
};

const downloadsFolder: FsNode = {
  id: DOWNLOADS_FOLDER_ID,
  parentId: ROOT_FOLDER_ID,
  name: "Downloads",
  kind: "folder",
  content: "",
  updatedAt: now,
};

const starterMarkdown: FsNode = {
  id: "file-readme",
  parentId: PROJECTS_FOLDER_ID,
  name: "Readme.md",
  kind: "markdown",
  content: "# Shani OS\n\nThis folder restores apps and layout per workspace.",
  updatedAt: now,
};

const starterJson: FsNode = {
  id: "file-config",
  parentId: PROJECTS_FOLDER_ID,
  name: "settings.json",
  kind: "json",
  content: '{\n  "theme": "glass",\n  "autosave": true\n}',
  updatedAt: now,
};

export const DEFAULT_PINNED_APPS: AppType[] = [
  "files",
  "browser",
  "photos",
  "notes",
  "calendar",
  "calculator",
  "editor",
  "terminal",
  "devhub",
  "taskmanager",
  "settings",
  "security",
];

export const createDefaultWorkspace = (folderId: string): FolderWorkspace => ({
  folderId,
  notes: "",
  viewMode: "grid",
});

export const createDesktop = (id: string, name: string): DesktopWorkspace => ({
  id,
  name,
  activeFolderId: PROJECTS_FOLDER_ID,
  openWindows: [],
  activeWindowId: null,
});

export const DEFAULT_STATE: DesktopState = {
  nodes: [rootNode, starterFolder, downloadsFolder, starterMarkdown, starterJson],
  workspaces: {
    [ROOT_FOLDER_ID]: createDefaultWorkspace(ROOT_FOLDER_ID),
    [PROJECTS_FOLDER_ID]: createDefaultWorkspace(PROJECTS_FOLDER_ID),
    [DOWNLOADS_FOLDER_ID]: createDefaultWorkspace(DOWNLOADS_FOLDER_ID),
  },
  desktops: [createDesktop(DESKTOP_1_ID, "Desktop 1")],
  activeDesktopId: DESKTOP_1_ID,
  pinnedApps: DEFAULT_PINNED_APPS,
  recentApps: [],
  fileAssociations: {
    text: "editor",
    markdown: "notes",
    json: "editor",
    image: "browser",
    binary: "browser",
  },
  settings: {
    themeMode: "dark",
    backgroundClass: "bg-webos",
    reduceMotion: false,
    timezone: "UTC",
    locationLabel: "Unknown",
  },
  notifications: [],
  attention: [],
  suggestions: [],
  clipboardHistory: [],
  safeFileIds: [],
  windowActivity: {},
  lastOpenedApp: null,
  dragState: {
    type: "none",
    snapPreview: null,
  },
  lastSavedAt: now,
};
