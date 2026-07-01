export type FileKind = "folder" | "text" | "json" | "markdown" | "image" | "binary";

export type ViewMode = "grid" | "tree";

export type ThemeMode = "light" | "dark";

export type AppType =
  | "files"
  | "editor"
  | "terminal"
  | "browser"
  | "notes"
  | "photos"
  | "calendar"
  | "calculator"
  | "devhub"
  | "taskmanager"
  | "settings"
  | "security";

export type CommandAction =
  | "new-folder"
  | "new-note"
  | "open-notes"
  | "open-browser"
  | "open-browser-home"
  | "open-portfolio"
  | "open-photos"
  | "open-calendar"
  | "open-calculator"
  | "open-devhub"
  | "open-taskmanager"
  | "open-settings"
  | "open-security"
  | "run-security-scan"
  | "toggle-theme"
  | "save-session"
  | "search-web";

export type SearchKind = "app" | "file" | "folder" | "action";

export interface FsNode {
  id: string;
  parentId: string | null;
  name: string;
  kind: FileKind;
  content: string;
  updatedAt: number;
  sourceUrl?: string;
  storagePath?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppWindow {
  id: string;
  app: AppType;
  title: string;
  folderId: string;
  desktopId: string;
  fileId?: string;
  launchUrl?: string;
  z: number;
  minimized: boolean;
  maximized: boolean;
  bounds: WindowBounds;
}

export interface FolderWorkspace {
  folderId: string;
  notes: string;
  viewMode: ViewMode;
}

export interface DesktopWorkspace {
  id: string;
  name: string;
  activeFolderId: string;
  openWindows: AppWindow[];
  activeWindowId: string | null;
}

export interface SystemSettings {
  themeMode: ThemeMode;
  backgroundClass: string;
  reduceMotion: boolean;
  timezone: string;
  locationLabel: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  level: "info" | "warning" | "critical";
  group: "system" | "security" | "activity" | "files";
  actionLabel?: string;
  action?: CommandAction;
  actionPayload?: string;
  createdAt: number;
}

export interface AttentionState {
  id: string;
  targetType: "file" | "window" | "dock";
  targetId: string;
  severity: "info" | "warning" | "critical";
  createdAt: number;
  expiresAt: number;
}

export interface SystemSuggestion {
  id: string;
  message: string;
  actionLabel: string;
  action: CommandAction;
  actionPayload?: string;
  createdAt: number;
}

export interface ClipboardItem {
  id: string;
  text: string;
  createdAt: number;
}

export interface DesktopState {
  nodes: FsNode[];
  workspaces: Record<string, FolderWorkspace>;
  desktops: DesktopWorkspace[];
  activeDesktopId: string;
  pinnedApps: AppType[];
  recentApps: AppType[];
  fileAssociations: Record<Exclude<FileKind, "folder">, AppType>;
  settings: SystemSettings;
  notifications: NotificationItem[];
  attention: AttentionState[];
  suggestions: SystemSuggestion[];
  clipboardHistory: ClipboardItem[];
  safeFileIds: string[];
  windowActivity: Record<string, number>;
  lastOpenedApp: AppType | null;
  dragState: {
    type: "none" | "file" | "app" | "window";
    id?: string;
    snapPreview?: "left" | "right" | "top" | null;
  };
  lastSavedAt: number;
}

export interface SearchItem {
  id: string;
  label: string;
  kind: SearchKind;
  group: "Apps" | "Files" | "Folders" | "Actions";
  app?: AppType;
  fileId?: string;
  folderId?: string;
  action?: CommandAction;
  payload?: string;
}

export interface SearchRequest {
  query: string;
  items: SearchItem[];
}

export interface SearchResult {
  id: string;
  score: number;
}
