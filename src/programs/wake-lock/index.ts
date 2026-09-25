import type { ProgramDefinition } from "@/shell/types";
import WakeLockApp from "./WakeLockApp";

export const wakeLock: ProgramDefinition = {
  id: "wake-lock",
  title: "Wake Lock",
  icon: "/icons/utilities-terminal.png",
  defaultPosition: { x: 128, y: 40 },
  defaultSize: { width: 320 },
  component: WakeLockApp,
};
