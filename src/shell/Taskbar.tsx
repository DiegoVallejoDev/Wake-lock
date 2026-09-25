"use client";

import { useWindowManager } from "./windowManager";
import { programs, defaultPosition } from "@/programs";
import AppIcon from "./AppIcon";
import Clock from "./Clock";

export default function Taskbar() {
  const wm = useWindowManager();
  const menuOpen = wm.state.startMenuOpen;

  return (
    <footer className="taskbar">
      <button
        className="start-button"
        id="start-btn"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-pressed={menuOpen}
        aria-controls="start-menu"
        onClick={(e) => {
          e.stopPropagation();
          wm.toggleStart();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel icons need no image optimizer */}
        <img src="/icons/windows.png" alt="" width={16} height={16} />
        Start
      </button>
      <div id="active-windows" role="toolbar" aria-label="Active windows">
        {wm.state.order.map((id) => {
          const program = programs.find((p) => p.id === id);
          const win = wm.state.windows[id];
          if (!program || !win) return null;
          const isActive = wm.state.focused === id;
          return (
            <button
              key={id}
              className={isActive ? "active" : ""}
              data-window={id}
              aria-pressed={isActive}
              title={program.title}
              onClick={() => {
                if (win.status === "open" && isActive) wm.minimize(id);
                else wm.open(id, defaultPosition(program));
              }}
            >
              <AppIcon src={program.icon} size={16} />
              <span>{program.title}</span>
            </button>
          );
        })}
      </div>
      <Clock />
    </footer>
  );
}
