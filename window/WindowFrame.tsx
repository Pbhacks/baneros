"use client";

import { ReactNode, useRef } from "react";
import { motion } from "framer-motion";
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

  const viewportWidth = typeof globalThis.window !== "undefined" ? globalThis.window.innerWidth : 1280;
  const viewportHeight = typeof globalThis.window !== "undefined" ? globalThis.window.innerHeight : 720;

  const bounds = appWindow.maximized
    ? { x: 12, y: 36, width: viewportWidth - 24, height: viewportHeight - 104 }
    : appWindow.bounds;

  const onDragStop: RndDragCallback = (_, data) => {
    const viewportWidth = typeof globalThis.window !== "undefined" ? globalThis.window.innerWidth : 1280;
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

    if (data.y < 18) {
      setDragState({ type: "window", id: appWindow.id, snapPreview: null });
      onSnap("top");
      return;
    }

    setDragState({ type: "none", snapPreview: null });
    lastSnapPreview.current = null;

    onBoundsChange({
      ...appWindow.bounds,
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
        const viewportWidth = typeof globalThis.window !== "undefined" ? globalThis.window.innerWidth : 1280;
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
        if (data.y < 32) {
          lastSnapPreview.current = "top";
          setDragState({ type: "window", id: appWindow.id, snapPreview: "top" });
          return;
        }
        lastSnapPreview.current = null;
        setDragState({ type: "window", id: appWindow.id, snapPreview: null });
      }}
      onDrag={(_, data) => {
        const viewportWidth = typeof globalThis.window !== "undefined" ? globalThis.window.innerWidth : 1280;
        let nextPreview: "left" | "right" | "top" | null = null;
        if (data.x < 40) {
          nextPreview = "left";
        } else if (data.x + appWindow.bounds.width > viewportWidth - 40) {
          nextPreview = "right";
        } else if (data.y < 32) {
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
      disableDragging={appWindow.maximized}
      enableResizing={!appWindow.maximized}
      minWidth={360}
      minHeight={220}
      style={{ zIndex: appWindow.z + 120 }}
      className={`overflow-hidden rounded-2xl border ${active ? "border-cyan-300/80 shadow-[0_16px_40px_rgba(50,200,255,0.35)]" : "border-white/20 shadow-[0_8px_18px_rgba(0,0,0,0.45)]"} ${!reduceMotion && attn?.severity === "warning" ? "animate-pulse border-amber-300/80" : ""} ${!reduceMotion && attn?.severity === "critical" ? "animate-pulse border-rose-400/90" : ""} ${!active && activity > 2 ? "ring-1 ring-white/20" : ""}`}
      dragHandleClassName="window-drag-handle"
    >
      <motion.section
        layout
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={reduceMotion ? { opacity: 0.8 } : { opacity: 0, scale: 0.95 }}
        className={`ui-glass-strong flex h-full flex-col ${active ? "" : "opacity-95"}`}
      >
        <header className="window-drag-handle flex h-10 items-center justify-between border-b border-[var(--panel-border)] px-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-3 w-3 rounded-full bg-rose-500"
              aria-label="Close"
            />
            <button
              type="button"
              onClick={onMinimize}
              className="h-3 w-3 rounded-full bg-amber-400"
              aria-label="Minimize"
            />
            <button
              type="button"
              onClick={onMaximize}
              className="h-3 w-3 rounded-full bg-emerald-500"
              aria-label="Maximize"
            />
          </div>
          <div className="text-xs font-medium text-white/90">{appWindow.title}</div>
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
