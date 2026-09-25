import type { ProgramDefinition } from "@/shell/types";
import MinesweeperApp from "./MinesweeperApp";

export const minesweeper: ProgramDefinition = {
  id: "minesweeper",
  title: "Minesweeper",
  icon: "/icons/minesweeper.png",
  defaultPosition: { x: 800, y: 40 },
  defaultSize: { width: 252 },
  component: MinesweeperApp,
};
