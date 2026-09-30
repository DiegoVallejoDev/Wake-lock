"use client";

import { useEffect, useRef } from "react";
import { useWindowManager } from "./windowManager";
import type { ProgramDefinition } from "./types";
import AppIcon from "./AppIcon";

function taskbarTop(): number {
  return (
    document.querySelector(".taskbar")?.getBoundingClientRect().top ??
    window.innerHeight
  );
}

const RESIZE_MIN_W = 240;
const RESIZE_MIN_H = 160;
const RESIZE_DIRS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
type ResizeDir = (typeof RESIZE_DIRS)[number];

/**
 * Full-viewport overlay shown during a window drag/resize so embedded frames
 * (the IE program's iframe) can't swallow pointer events mid-drag.
 */
function createDragShield(cursor: string): () => void {
  const el = document.createElement("div");
  el.className = "drag-shield";
  el.style.cursor = cursor;
  document.body.appendChild(el);
  return () => el.remove();
}

function clampPosition(el: HTMLElement, x: number, y: number) {
  const maxLeft = Math.max(0, window.innerWidth - el.offsetWidth);
  const maxTop = Math.max(0, taskbarTop() - el.offsetHeight);
  return {
    x: Math.min(Math.max(0, x), maxLeft),
    y: Math.min(Math.max(0, y), maxTop),
  };
}

export default function WindowFrame({
  program,
}: {
  program: ProgramDefinition;
}) {
  const wm = useWindowManager();
  const win = wm.state.windows[program.id];
  const elRef = useRef<HTMLElement | null>(null);
  const isFocused = wm.state.focused === program.id;
  const maximizable = program.maximizable !== false;
  const resizable = program.resizable !== false;

  useEffect(() => {
    wm.registerWindowEl(program.id, elRef.current);
    return () => wm.registerWindowEl(program.id, null);
  }, [wm, program.id]);

  // Focus the window element when it becomes the focused window, like
  // showWindow/restoreWindowFocus did in the original script.
  useEffect(() => {
    const el = elRef.current;
    if (
      isFocused &&
      win?.status === "open" &&
      el &&
      !el.contains(document.activeElement)
    ) {
      el.focus({ preventScroll: true });
    }
  }, [isFocused, win?.status]);

  // When this window loses DOM focus entirely (closed/minimized and no other
  // window took it), hand focus back to its desktop icon.
  useEffect(() => {
    const el = elRef.current;
    if (!el || isFocused || win?.status === "open") return;
    if (el.contains(document.activeElement)) {
      document
        .querySelector<HTMLElement>(`.desktop-icon[data-window="${program.id}"]`)
        ?.focus();
    }
  }, [isFocused, win?.status, program.id]);

  // Clamp the window into the viewport on first open and on resize.
  const { x, y, status, maximized } = win ?? { x: 0, y: 0, status: "closed", maximized: false };
  useEffect(() => {
    const clamp = () => {
      const el = elRef.current;
      if (!el || status !== "open" || maximized) return;
      if (window.matchMedia("(max-width: 600px)").matches) return;
      const next = clampPosition(el, x, y);
      if (next.x !== x || next.y !== y) wm.move(program.id, next.x, next.y);
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [wm, program.id, x, y, status, maximized]);

  if (!win) return null;

  const onTitlePointerDown = (e: React.PointerEvent) => {
    if (win.maximized) return;
    if (window.matchMedia("(max-width: 600px)").matches) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" || target.closest(".title-bar-controls")) return;
    const el = elRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    wm.focus(program.id);
    const unshield = createDragShield("default");

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const next = clampPosition(el, ev.clientX - dx, ev.clientY - dy);
      wm.move(program.id, next.x, next.y);
    };
    const onUp = () => {
      unshield();
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const onResizePointerDown = (e: React.PointerEvent, dir: ResizeDir) => {
    if (win?.maximized) return;
    if (window.matchMedia("(max-width: 600px)").matches) return;
    const el = elRef.current;
    if (!el || !win) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = el.getBoundingClientRect();
    const start = { x: win.x, y: win.y, w: rect.width, h: rect.height };
    const sx = e.clientX;
    const sy = e.clientY;
    wm.focus(program.id);
    const unshield = createDragShield(`${dir}-resize`);

    const hasW = dir.includes("w");
    const hasE = dir.includes("e");
    const hasN = dir.includes("n");
    const hasS = dir.includes("s");

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      let { x, y } = start;
      let w = start.w;
      let h = start.h;
      if (hasE) w = start.w + dx;
      if (hasS) h = start.h + dy;
      if (hasW) {
        w = start.w - dx;
        x = start.x + dx;
      }
      if (hasN) {
        h = start.h - dy;
        y = start.y + dy;
      }
      // Minimum size; west/north drags anchor the far edge, so slide x/y too.
      if (w < RESIZE_MIN_W) {
        if (hasW) x -= RESIZE_MIN_W - w;
        w = RESIZE_MIN_W;
      }
      if (h < RESIZE_MIN_H) {
        if (hasN) y -= RESIZE_MIN_H - h;
        h = RESIZE_MIN_H;
      }
      // Keep every edge inside the viewport so handles stay grabbable.
      if (x < 0) {
        if (hasW) w += x;
        x = 0;
      }
      if (y < 0) {
        if (hasN) h += y;
        y = 0;
      }
      if (x + w > window.innerWidth) w = window.innerWidth - x;
      if (y + h > taskbarTop()) h = taskbarTop() - y;
      wm.resize(program.id, {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(w),
        height: Math.round(h),
      });
    };
    const onUp = () => {
      unshield();
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const width = win.width ?? program.defaultSize?.width;
  const height = win.height ?? program.defaultSize?.height;

  const style: React.CSSProperties = {
    zIndex: win.z,
    ...(win.maximized
      ? {}
      : { left: win.x, top: win.y, width, height }),
  };

  const ProgramBody = program.component;

  return (
    <section
      ref={elRef}
      className={`window${win.status === "open" ? "" : " hidden"}${win.maximized ? " maximized" : ""}`}
      role="dialog"
      aria-labelledby={`${program.id}-title`}
      style={style}
      tabIndex={-1}
      onMouseDown={() => wm.focus(program.id)}
      onFocus={() => wm.focus(program.id)}
    >
      <div
        className={`title-bar${isFocused ? "" : " inactive"}`}
        onPointerDown={onTitlePointerDown}
        onDoubleClick={(e) => {
          if (!maximizable) return;
          if ((e.target as HTMLElement).closest(".title-bar-controls")) return;
          wm.toggleMaximize(program.id, {
            x: win.x,
            y: win.y,
            width: win.width,
            height: win.height,
          });
        }}
      >
        <div className="title-bar-text" id={`${program.id}-title`}>
          <AppIcon src={program.icon} size={16} />
          <span>{program.title} - Retro Web Inc</span>
        </div>
        <div className="title-bar-controls">
          <button
            aria-label="Minimize"
            onClick={() => wm.minimize(program.id)}
          />
          {maximizable && (
            <button
              aria-label={win.maximized ? "Restore" : "Maximize"}
              onClick={() =>
                wm.toggleMaximize(program.id, {
                  x: win.x,
                  y: win.y,
                  width: win.width,
                  height: win.height,
                })
              }
            />
          )}
          <button aria-label="Close" onClick={() => wm.close(program.id)} />
        </div>
      </div>
      <div className="window-body">
        <ProgramBody status={win.status} isFocused={isFocused} />
      </div>
      {resizable && !win.maximized && (
        <div aria-hidden="true">
          {RESIZE_DIRS.map((dir) => (
            <div
              key={dir}
              className={`resizer resizer-${dir}`}
              onPointerDown={(e) => onResizePointerDown(e, dir)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
