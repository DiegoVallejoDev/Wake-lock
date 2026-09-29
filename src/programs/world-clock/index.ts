import type { ProgramDefinition } from "@/shell/types";
import WorldClockApp from "./WorldClockApp";

export const worldClock: ProgramDefinition = {
  id: "world-clock",
  title: "World Clock",
  icon: "/icons/worldclock.png",
  defaultPosition: { x: 380, y: 170 },
  defaultSize: { width: 340 },
  component: WorldClockApp,
};
