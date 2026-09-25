import type { ProgramDefinition } from "@/shell/types";
import TicTacToeApp from "./TicTacToeApp";

export const ticTacToe: ProgramDefinition = {
  id: "tic-tac-toe",
  title: "Tic-Tac-Toe",
  icon: "/icons/applications-games.png",
  defaultPosition: { x: 680, y: 40 },
  defaultSize: { width: 220 },
  component: TicTacToeApp,
};
