import type { ProgramDefinition } from "@/shell/types";
import DoomApp from "./DoomApp";

export const doom: ProgramDefinition = {
  id: "doom",
  title: "DOOM",
  icon: "/icons/doom.png",
  defaultPosition: { x: 120, y: 60 },
  defaultSize: { width: 420 },
  component: DoomApp,
};
