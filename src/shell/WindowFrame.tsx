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

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const next = clampPosition(el, ev.clientX - dx, ev.clientY - dy);
      wm.move(program.id, next.x, next.y);
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const style: React.CSSProperties = win.maximized
    ? {}
    : {
        left: win.x,
        top: win.y,
        width: program.defaultSize?.width,
        height: program.defaultSize?.height,
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
          wm.toggleMaximize(program.id, { x: win.x, y: win.y });
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
                wm.toggleMaximize(program.id, { x: win.x, y: win.y })
              }
            />
          )}
          <button aria-label="Close" onClick={() => wm.close(program.id)} />
        </div>
      </div>
      <div className="window-body">
        <ProgramBody status={win.status} isFocused={isFocused} />
      </div>
    </section>
  );
}
