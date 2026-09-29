import type { ProgramDefinition } from "@/shell/types";
import CharMapApp from "./CharMapApp";

export const charmap: ProgramDefinition = {
  id: "charmap",
  title: "Character Map",
  icon: "/icons/charmap.png",
  defaultPosition: { x: 320, y: 140 },
  defaultSize: { width: 300 },
  component: CharMapApp,
};
