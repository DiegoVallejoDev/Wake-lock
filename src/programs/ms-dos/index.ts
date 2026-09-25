import type { ProgramDefinition } from "@/shell/types";
import MsDosApp from "./MsDosApp";

export const msDos: ProgramDefinition = {
  id: "ms-dos",
  title: "MS-DOS Prompt",
  icon: "/icons/utilities-terminal.png",
  defaultPosition: { x: 440, y: 430 },
  defaultSize: { width: 460 },
  component: MsDosApp,
};
