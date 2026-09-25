"use client";

import { useWindowManager } from "./windowManager";
import { programs, defaultPosition } from "@/programs";

export default function Desktop() {
  const wm = useWindowManager();
  const selected = wm.state.selectedIcon;
  const desktopPrograms = programs.filter((p) => p.desktop !== false);

  const open = (id: string) => {
    const program = programs.find((p) => p.id === id);
    if (program) wm.open(id, defaultPosition(program));
  };

  return (
    <main
      id="desktop"
      aria-label="Desktop"
      tabIndex={-1}
      onFocus={(e) => {
        wm.focus(null);
        const icon = (e.target as HTMLElement).closest(".desktop-icon");
        if (icon) wm.selectIcon(icon.getAttribute("data-window"));
      }}
      onClick={(e) => {
        const icon = (e.target as HTMLElement).closest<HTMLElement>(".desktop-icon");
        const id = icon?.getAttribute("data-window") ?? null;
        wm.selectIcon(id);
        if (!icon) {
          (e.currentTarget as HTMLElement).focus();
          return;
        }
        const activates =
          e.detail === 0 ||
          (e.nativeEvent as PointerEvent).pointerType === "touch" ||
          (e.nativeEvent as PointerEvent).pointerType === "pen" ||
          window.matchMedia("(hover: none)").matches;
        if (activates && id) open(id);
      }}
      onDoubleClick={(e) => {
        const icon = (e.target as HTMLElement).closest<HTMLElement>(".desktop-icon");
        const id = icon?.getAttribute("data-window");
        if (id) open(id);
      }}
    >
      {desktopPrograms.map((program, index) => (
        <button
          key={program.id}
          className={`desktop-icon${selected === program.id ? " selected" : ""}`}
          data-window={program.id}
          aria-label={`Open ${program.title}`}
          aria-pressed={selected === program.id}
          tabIndex={selected === program.id || (!selected && index === 0) ? 0 : -1}
          title={program.title}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- pixel icons need no image optimizer */}
          <img src={program.icon} alt="" width={32} height={32} draggable={false} />
          <span>{program.title}</span>
        </button>
      ))}
    </main>
  );
}
