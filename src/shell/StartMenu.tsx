"use client";

import { useEffect } from "react";
import { useWindowManager } from "./windowManager";
import { programs, defaultPosition } from "@/programs";
import AppIcon from "./AppIcon";

export default function StartMenu() {
  const wm = useWindowManager();
  const open = wm.state.startMenuOpen;
  const menuPrograms = programs.filter((p) => p.startMenu !== false);

  useEffect(() => {
    if (open) {
      document.querySelector<HTMLElement>("#start-menu li")?.focus();
    }
  }, [open]);

  return (
    <nav
      className={`start-menu${open ? " visible" : ""}`}
      id="start-menu"
      aria-labelledby="start-btn"
    >
      <div className="start-menu-brand" aria-hidden="true">
        <strong>Retro Web</strong>
        <span>98</span>
      </div>
      <ul role="menu" aria-labelledby="start-btn">
        {menuPrograms.map((program) => (
          <li
            key={program.id}
            role="menuitem"
            tabIndex={-1}
            data-window={program.id}
            onMouseEnter={(e) => e.currentTarget.focus({ preventScroll: true })}
            onClick={() => {
              wm.open(program.id, defaultPosition(program));
              wm.closeStart();
            }}
          >
            <AppIcon src={program.icon} size={32} />
            {program.title}
          </li>
        ))}
      </ul>
    </nav>
  );
}
