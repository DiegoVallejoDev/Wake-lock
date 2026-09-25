import type { ProgramDefinition } from "@/shell/types";
import { wakeLock } from "./wake-lock";
import { calculator } from "./calculator";
import { notepad } from "./notepad";
import { timer } from "./timer";
import { ticTacToe } from "./tic-tac-toe";
import { todo } from "./todo";
import { minesweeper } from "./minesweeper";
import { paint } from "./paint";
import { msDos } from "./ms-dos";
import { calendar } from "./calendar";
import { doom } from "./doom";

/**
 * The program registry: the shell builds desktop icons, the Start menu, and
 * windows from this list alone. To add a program, create its folder with an
 * index.ts manifest and register it here.
 */
export const programs: ProgramDefinition[] = [
  wakeLock,
  calculator,
  notepad,
  timer,
  ticTacToe,
  todo,
  minesweeper,
  paint,
  msDos,
  calendar,
  doom,
];

export function defaultPosition(program: ProgramDefinition) {
  return program.defaultPosition ?? { x: 40, y: 40 };
}
