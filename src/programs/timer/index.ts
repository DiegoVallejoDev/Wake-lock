import type { ProgramDefinition } from "@/shell/types";
import TimerApp from "./TimerApp";

export const timer: ProgramDefinition = {
  id: "timer",
  title: "Timer",
  icon: "/icons/clock.png",
  defaultPosition: { x: 464, y: 250 },
  defaultSize: { width: 280 },
  component: TimerApp,
};
