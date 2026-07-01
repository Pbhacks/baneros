import type { ComponentType, JSX } from "react";
import { useId } from "react";
import {
  BarChart3,
  Code2,
  FileArchive,
  FileText,
  Folder,
  FolderOpen,
  Globe,
  ImageIcon,
  NotebookTabs,
  PencilLine,
  Settings2,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import { AppType, FileKind } from "@/utils/types";

export interface AppIconProps {
  size?: number;
  className?: string;
}

export interface LaunchpadIconProps {
  size?: number;
  className?: string;
}

type AppIconComponent = (props: AppIconProps) => JSX.Element;

const Tile = ({
  size = 52,
  className = "",
  background,
  children,
}: {
  size?: number;
  className?: string;
  background: string;
  children: JSX.Element | JSX.Element[];
}) => (
  <div
    className={`relative overflow-hidden rounded-[24%] shadow-[0_10px_22px_rgba(0,0,0,0.22)] ${className}`}
    style={{ width: size, height: size, background }}
  >
    <span className="pointer-events-none absolute inset-x-[12%] top-[8%] h-[14%] rounded-full bg-white/45 blur-[1px]" />
    <span className="pointer-events-none absolute inset-x-[18%] bottom-[8%] h-[10%] rounded-full bg-black/10 blur-sm" />
    <div className="relative flex h-full w-full items-center justify-center">{children}</div>
  </div>
);

const tileGlyph = (
  Icon: ComponentType<{ size?: number; className?: string }>,
  foreground: string,
) =>
  function Glyph({ size = 52, className = "" }: AppIconProps) {
    return (
      <div className={className}>
        <Tile size={size} background={foreground}>
          <Icon size={size * 0.42} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]" />
        </Tile>
      </div>
    );
  };

const FilesIcon: AppIconComponent = ({ size = 52, className = "" }) => (
  <div className={className}>
    <Tile size={size} background="linear-gradient(160deg, #a7f3ff 0%, #58b7ff 54%, #1f62e3 100%)">
      <FolderOpen size={size * 0.46} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.22)]" />
    </Tile>
  </div>
);

const BrowserIcon: AppIconComponent = ({ size = 52, className = "" }) => (
  <div className={className}>
    <Tile size={size} background="linear-gradient(165deg, #ebfdff 0%, #8cd3ff 46%, #2584ff 100%)">
      <div className="flex h-[72%] w-[72%] items-center justify-center rounded-full bg-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <Globe size={size * 0.34} className="text-sky-600" />
      </div>
    </Tile>
  </div>
);

const NotesIcon: AppIconComponent = ({ size = 52, className = "" }) => (
  <div className={className}>
    <Tile size={size} background="linear-gradient(165deg, #fff6b5 0%, #ffd75c 100%)">
      <div className="flex h-[74%] w-[72%] flex-col rounded-[18%] bg-[#fff8d8] px-[16%] py-[18%] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
        <span className="mb-[10%] h-[8%] rounded-full bg-orange-300/80" />
        <span className="mb-[8%] h-[6%] rounded-full bg-slate-300/80" />
        <span className="mb-[8%] h-[6%] rounded-full bg-slate-300/80" />
        <span className="h-[6%] w-[72%] rounded-full bg-slate-300/80" />
      </div>
    </Tile>
  </div>
);

const PhotosIcon: AppIconComponent = ({ size = 52, className = "" }) => (
  <div className={className}>
    <Tile size={size} background="linear-gradient(160deg, #ffffff 0%, #eef7ff 100%)">
      <div className="relative h-[70%] w-[70%]">
        {[
          ["top-[2%] left-1/2 -translate-x-1/2", "#ff6f61"],
          ["top-[20%] right-[6%]", "#ffb347"],
          ["bottom-[20%] right-[8%]", "#ffd93d"],
          ["bottom-[2%] left-1/2 -translate-x-1/2", "#46d39a"],
          ["bottom-[20%] left-[8%]", "#4da6ff"],
          ["top-[20%] left-[6%]", "#ba7cff"],
        ].map(([position, color]) => (
          <span
            key={position}
            className={`absolute h-[32%] w-[32%] rounded-full ${position}`}
            style={{ backgroundColor: color }}
          />
        ))}
        <span className="absolute left-1/2 top-1/2 h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.9)]" />
      </div>
    </Tile>
  </div>
);

const CalendarIcon: AppIconComponent = ({ size = 52, className = "" }) => (
  <div className={className}>
    <Tile size={size} background="linear-gradient(165deg, #ffffff 0%, #f4f7fb 100%)">
      <div className="flex h-[74%] w-[72%] flex-col overflow-hidden rounded-[20%] shadow-[0_1px_0_rgba(255,255,255,0.9)]">
        <div className="bg-red-500 py-[10%] text-center text-[18%] font-semibold uppercase tracking-[0.22em] text-white">
          Apr
        </div>
        <div className="flex flex-1 items-center justify-center bg-white text-[40%] font-semibold text-slate-800">24</div>
      </div>
    </Tile>
  </div>
);

const CalculatorIcon: AppIconComponent = ({ size = 52, className = "" }) => (
  <div className={className}>
    <Tile size={size} background="linear-gradient(165deg, #7b8591 0%, #2c3640 100%)">
      <div className="grid h-[74%] w-[70%] grid-cols-3 gap-[8%] rounded-[18%] bg-black/28 p-[10%]">
        <span className="col-span-3 rounded-full bg-white/80" />
        <span className="rounded-full bg-white/18" />
        <span className="rounded-full bg-white/18" />
        <span className="rounded-full bg-orange-400" />
        <span className="rounded-full bg-white/18" />
        <span className="rounded-full bg-white/18" />
        <span className="rounded-full bg-white/18" />
      </div>
    </Tile>
  </div>
);

const EditorIcon = tileGlyph(PencilLine, "linear-gradient(165deg, #ffd8a7 0%, #ff9f50 100%)");
const TerminalIcon = tileGlyph(TerminalSquare, "linear-gradient(165deg, #5d6674 0%, #151a21 100%)");
const DevHubIcon = tileGlyph(Code2, "linear-gradient(165deg, #d1b8ff 0%, #8b5cf6 56%, #4522a5 100%)");
const TaskManagerIcon = tileGlyph(BarChart3, "linear-gradient(165deg, #bcf5ff 0%, #4cc2f1 48%, #2f8c59 100%)");
const SettingsIcon = tileGlyph(Settings2, "linear-gradient(165deg, #f6f8fb 0%, #b0b8c4 100%)");
const SecurityIcon = tileGlyph(ShieldCheck, "linear-gradient(165deg, #ffd1db 0%, #ff5f8a 50%, #a71946 100%)");

export const APP_ICON_MAP: Record<AppType, AppIconComponent> = {
  files: FilesIcon,
  editor: EditorIcon,
  terminal: TerminalIcon,
  browser: BrowserIcon,
  notes: NotesIcon,
  photos: PhotosIcon,
  calendar: CalendarIcon,
  calculator: CalculatorIcon,
  devhub: DevHubIcon,
  taskmanager: TaskManagerIcon,
  settings: SettingsIcon,
  security: SecurityIcon,
};

export const FILE_ICON_MAP: Record<FileKind, typeof Folder> = {
  folder: Folder,
  text: FileText,
  json: Code2,
  markdown: NotebookTabs,
  image: ImageIcon,
  binary: FileArchive,
};

export const LaunchpadTriangle = ({ size = 18, className = "" }: LaunchpadIconProps) => (
  <LaunchpadTriangleInner size={size} className={className} />
);

const LaunchpadTriangleInner = ({ size = 18, className = "" }: LaunchpadIconProps) => {
  const uid = useId().replace(/:/g, "");
  const strokeId = `${uid}-launchpad-stroke`;
  const fillId = `${uid}-launchpad-fill`;
  const path = "M50 10 L85 76 Q88 87 76 87 H24 Q12 87 15 76 Z";

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <span className="launchpad-triangle-halo absolute inset-[-34%] rounded-full" />
      <span className="launchpad-triangle-wave absolute inset-[6%]" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id={strokeId} x1="15%" y1="10%" x2="86%" y2="88%">
            <stop offset="0%" stopColor="#59ff8d" />
            <stop offset="36%" stopColor="#f8ff73" />
            <stop offset="68%" stopColor="#ff8a2a" />
            <stop offset="100%" stopColor="#ff2ed1" />
          </linearGradient>
          <radialGradient id={fillId} cx="50%" cy="28%" r="72%">
            <stop offset="0%" stopColor="rgba(90,255,140,0.32)" />
            <stop offset="48%" stopColor="rgba(255,158,48,0.14)" />
            <stop offset="100%" stopColor="rgba(255,40,196,0.04)" />
          </radialGradient>
        </defs>
        <path d={path} fill={`url(#${fillId})`} className="launchpad-triangle-fill" />
        <path d={path} fill="none" stroke={`url(#${strokeId})`} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" className="launchpad-triangle-outer" />
        <path d={path} fill="none" stroke={`url(#${strokeId})`} strokeWidth="5.3" strokeLinecap="round" strokeLinejoin="round" className="launchpad-triangle-stroke" />
        <path d={path} fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="launchpad-triangle-inner" />
      </svg>
    </div>
  );
};
