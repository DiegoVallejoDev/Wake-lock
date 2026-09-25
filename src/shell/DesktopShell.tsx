"use client";

import { useEffect } from "react";
import {
  useWindowManagerState,
  WindowManagerContextProvider,
} from "./windowManager";
import { programs, defaultPosition } from "@/programs";
import Desktop from "./Desktop";
import WindowFrame from "./WindowFrame";
import StartMenu from "./StartMenu";
import Taskbar from "./Taskbar";

function moveDesktopSelection(icon: HTMLElement, key: string) {
  const icons = Array.from(
    document.querySelectorAll<HTMLElement>(".desktop-icon"),
  );
  if (!icons.length) return;
  if (key === "Home" || key === "End") {
    (key === "Home" ? icons[0] : icons[icons.length - 1]).focus();
    return;
  }

  const horizontal = key === "ArrowLeft" || key === "ArrowRight";
  const direction = key === "ArrowRight" || key === "ArrowDown" ? 1 : -1;
  const axis = horizontal ? "left" : "top";
  const crossAxis = horizontal ? "top" : "left";
  const origin = icon.getBoundingClientRect();
  let nearest = icon;
  let distance = Infinity;
  icons.forEach((candidate) => {
    const bounds = candidate.getBoundingClientRect();
    const delta = (bounds[axis] - origin[axis]) * direction;
    if (
      delta > 0 &&
      delta < distance &&
      Math.abs(bounds[crossAxis] - origin[crossAxis]) < 1
    ) {
      nearest = candidate;
      distance = delta;
    }
  });
  nearest.focus();
}

export default function DesktopShell() {
  const wm = useWindowManagerState();

  useEffect(() => {
    const open = (id: string) => {
      const program = programs.find((p) => p.id === id);
      if (program) wm.open(id, defaultPosition(program));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && wm.state.startMenuOpen) {
        e.preventDefault();
        wm.closeStart();
        document.getElementById("start-btn")?.focus();
        return;
      }

      const icon = document.activeElement?.closest<HTMLElement>(".desktop-icon");
      if (icon) {
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(
            e.key,
          )
        ) {
          e.preventDefault();
          moveDesktopSelection(icon, e.key);
          return;
        }
        if (e.key === " ") {
          e.preventDefault();
          wm.selectIcon(icon.getAttribute("data-window"));
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const id = icon.getAttribute("data-window");
          if (id) open(id);
          return;
        }
        if (e.key === "Escape") {
          wm.selectIcon(null);
          document.getElementById("desktop")?.focus();
        }
      }

      if (
        document.activeElement === document.getElementById("start-btn") &&
        (e.key === "ArrowDown" || e.key === "ArrowUp")
      ) {
        e.preventDefault();
        if (!wm.state.startMenuOpen) wm.toggleStart();
        const items = document.querySelectorAll<HTMLElement>("#start-menu li");
        (e.key === "ArrowUp" ? items[items.length - 1] : items[0])?.focus();
        return;
      }

      const item = document.activeElement?.closest<HTMLElement>("#start-menu li");
      if (item) {
        const items = Array.from(
          document.querySelectorAll<HTMLElement>("#start-menu li"),
        );
        const index = items.indexOf(item);
        if (["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const next =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? items.length - 1
                : (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
                  items.length;
          items[next]?.focus();
          return;
        }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const id = item.getAttribute("data-window");
          if (id) {
            open(id);
            wm.closeStart();
          }
          return;
        }
        if (e.key === "Tab") {
          wm.closeStart();
          document.getElementById("start-btn")?.focus();
        } else if (
          e.key.length === 1 &&
          !e.ctrlKey &&
          !e.altKey &&
          !e.metaKey
        ) {
          const ordered = items.slice(index + 1).concat(items.slice(0, index + 1));
          const match = ordered.find((entry) =>
            entry.textContent
              ?.trim()
              .toLowerCase()
              .startsWith(e.key.toLowerCase()),
          );
          if (match) {
            e.preventDefault();
            match.focus();
          }
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      const menu = document.getElementById("start-menu");
      const btn = document.getElementById("start-btn");
      const target = e.target as Node;
      if (btn?.contains(target) || menu?.contains(target)) return;
      wm.closeStart();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClick);
    };
  }, [wm]);

  return (
    <WindowManagerContextProvider value={wm}>
      <Desktop />
      {Object.keys(wm.state.windows).map((id) => {
        const program = programs.find((p) => p.id === id);
        return program ? <WindowFrame key={id} program={program} /> : null;
      })}
      <StartMenu />
      <Taskbar />
    </WindowManagerContextProvider>
  );
}
