"use client";

import { ReactNode, useRef } from "react";
import { motion } from "framer-motion";
import { Maximize2, Minus, X } from "lucide-react";
import { Rnd, RndDragCallback, RndResizeCallback } from "react-rnd";
import { AppWindow } from "@/utils/types";
import { useWebOSStore } from "@/store/webos-store";

interface WindowFrameProps {
  appWindow: AppWindow;
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onBoundsChange: (next: AppWindow["bounds"]) => void;
  onSnap: (zone: "left" | "right" | "top") => void;
  onDropFile: (fileId: string) => void;
  children: ReactNode;
}

const snap = (value: number): number => {
  const gridSize = 8;
  return Math.round(value / gridSize) * gridSize;
};

const getViewport = () => ({
  width: typeof globalThis.window !== "undefined" ? globalThis.window.innerWidth : 1280,
  height: typeof globalThis.window !== "undefined" ? globalThis.window.innerHeight : 720,
});

const getFullscreenBounds = () => {
  const { width, height } = getViewport();
  const compact = width < 768;
  return {
    x: compact ? 0 : 8,
    y: compact ? 44 : 54,
    width: compact ? width : width - 16,
    height: compact ? height - 48 : height - 64,
  };
};

const keepInsideDesktop = (bounds: AppWindow["bounds"]): AppWindow["bounds"] => {
  const { width, height } = getViewport();
  const compact = width < 768;
  const topInset = compact ? 44 : 54;
  const bottomInset = compact ? 18 : 94;
  const maxWidth = Math.max(320, width - 16);
  const maxHeight = Math.max(260, height - topInset - bottomInset);
  const nextWidth = Math.min(bounds.width, maxWidth);
  const nextHeight = Math.min(bounds.height, maxHeight);

  return {
    width: nextWidth,
    height: nextHeight,
    x: Math.min(Math.max(compact ? 0 : 8, bounds.x), Math.max(0, width - nextWidth - 8)),
    y: Math.min(Math.max(topInset, bounds.y), Math.max(topInset, height - bottomInset - nextHeight)),
  };
};

export const WindowFrame = ({
  appWindow,
  active,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onBoundsChange,
  onSnap,
  onDropFile,
  children,
}: WindowFrameProps) => {
  const attention = useWebOSStore((store) => store.state.attention);
  const setDragState = useWebOSStore((store) => store.setDragState);
  const reduceMotion = useWebOSStore((store) => store.state.settings.reduceMotion);
  const activity = useWebOSStore((store) => store.state.windowActivity[appWindow.id] ?? 0);
  const lastSnapPreview = useRef<"left" | "right" | "top" | null>(null);

  if (appWindow.minimized) {
    return null;
  }

  const attn = attention.find(
    (item) => item.targetType === "window" && item.targetId === appWindow.id,
  );

  const { width: viewportWidth } = getViewport();
  const isCompact = viewportWidth < 768;
  const fullscreen = appWindow.maximized || isCompact;

  const bounds = fullscreen
    ? getFullscreenBounds()
    : keepInsideDesktop(appWindow.bounds);

  const onDragStop: RndDragCallback = (_, data) => {
    const { width: viewportWidth } = getViewport();
    if (data.x < 14) {
      setDragState({ type: "window", id: appWindow.id, snapPreview: null });
      onSnap("left");
      return;
    }

    if (data.x + appWindow.bounds.width > viewportWidth - 14) {
      setDragState({ type: "window", id: appWindow.id, snapPreview: null });
      onSnap("right");
      return;
    }

    if (data.y < 42) {
      setDragState({ type: "window", id: appWindow.id, snapPreview: null });
      onSnap("top");
      return;
    }

    setDragState({ type: "none", snapPreview: null });
    lastSnapPreview.current = null;

    onBoundsChange({
      ...bounds,
      x: snap(data.x),
      y: snap(data.y),
    });
  };

  const onResizeStop: RndResizeCallback = (_, __, ref, ___, position) => {
    onBoundsChange({
      width: snap(ref.offsetWidth),
      height: snap(ref.offsetHeight),
      x: snap(position.x),
      y: snap(position.y),
    });
  };

  return (
    <Rnd
      size={{ width: bounds.width, height: bounds.height }}
      position={{ x: bounds.x, y: bounds.y }}
      onDragStart={(_, data) => {
        onFocus();
        const { width: viewportWidth } = getViewport();
        if (data.x < 40) {
          lastSnapPreview.current = "left";
          setDragState({ type: "window", id: appWindow.id, snapPreview: "left" });
          return;
        }
        if (data.x + appWindow.bounds.width > viewportWidth - 40) {
          lastSnapPreview.current = "right";
          setDragState({ type: "window", id: appWindow.id, snapPreview: "right" });
          return;
        }
        if (data.y < 52) {
          lastSnapPreview.current = "top";
          setDragState({ type: "window", id: appWindow.id, snapPreview: "top" });
          return;
        }
        lastSnapPreview.current = null;
        setDragState({ type: "window", id: appWindow.id, snapPreview: null });
      }}
      onDrag={(_, data) => {
        const { width: viewportWidth } = getViewport();
        let nextPreview: "left" | "right" | "top" | null = null;
        if (data.x < 40) {
          nextPreview = "left";
        } else if (data.x + appWindow.bounds.width > viewportWidth - 40) {
          nextPreview = "right";
        } else if (data.y < 52) {
          nextPreview = "top";
        }
        if (lastSnapPreview.current !== nextPreview) {
          lastSnapPreview.current = nextPreview;
          setDragState({ type: "window", id: appWindow.id, snapPreview: nextPreview });
        }
      }}
      onMouseDown={onFocus}
      onDragStop={onDragStop}
      onResizeStop={onResizeStop}
      bounds="window"
      dragGrid={[2, 2]}
      resizeGrid={[2, 2]}
      disableDragging={fullscreen}
      enableResizing={!fullscreen}
      minWidth={isCompact ? viewportWidth : 360}
      minHeight={isCompact ? bounds.height : 240}
      style={{ zIndex: appWindow.z + 120 }}
      className={`overflow-hidden border will-change-transform ${fullscreen ? "rounded-none md:rounded-[18px]" : "rounded-2xl"} ${active ? "border-cyan-200/70 shadow-[0_18px_42px_rgba(18,180,235,0.28)]" : "border-white/18 shadow-[0_8px_18px_rgba(0,0,0,0.38)]"} ${!reduceMotion && attn?.severity === "warning" ? "animate-pulse border-amber-300/80" : ""} ${!reduceMotion && attn?.severity === "critical" ? "animate-pulse border-rose-400/90" : ""} ${!active && activity > 2 ? "ring-1 ring-white/20" : ""}`}
      dragHandleClassName="window-drag-handle"
    >
      <motion.section
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={reduceMotion ? { opacity: 0.8 } : { opacity: 0, scale: 0.95 }}
        className={`ui-glass-strong flex h-full flex-col ${active ? "" : "opacity-95"}`}
      >
        <header className="window-drag-handle flex h-10 shrink-0 touch-none select-none items-center justify-between border-b border-[var(--panel-border)] px-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="group flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-rose-950 shadow-[0_0_10px_rgba(244,63,94,0.38)]"
              aria-label="Close"
              title="Close"
            >
              <X size={9} className="opacity-0 transition-opacity group-hover:opacity-80" />
            </button>
            <button
              type="button"
              onClick={onMinimize}
              className="group flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-[0_0_10px_rgba(251,191,36,0.34)]"
              aria-label="Minimize"
              title="Minimize"
            >
              <Minus size={9} className="opacity-0 transition-opacity group-hover:opacity-80" />
            </button>
            <button
              type="button"
              onClick={onMaximize}
              className="group flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-emerald-950 shadow-[0_0_10px_rgba(16,185,129,0.34)]"
              aria-label="Maximize"
              title={appWindow.maximized ? "Exit full screen" : "Full screen"}
            >
              <Maximize2 size={8} className="opacity-0 transition-opacity group-hover:opacity-80" />
            </button>
          </div>
          <div className="min-w-0 truncate px-3 text-xs font-semibold text-white/90">{appWindow.title}</div>
          <div className={`h-2 w-2 rounded-full ${active ? "bg-emerald-400" : "bg-white/20"}`} />
        </header>
        <div
          className="h-full overflow-hidden"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const fileId = event.dataTransfer.getData("application/webos-file-id");
            if (fileId) {
              onDropFile(fileId);
            }
          }}
        >
          {children}
        </div>
      </motion.section>
    </Rnd>
  );
};
