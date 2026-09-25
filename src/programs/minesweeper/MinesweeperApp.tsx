"use client";

import { useEffect, useState } from "react";
import styles from "./MinesweeperApp.module.css";
import { COLS, MINES, ROWS, createBoard, isWin, reveal, toggleFlag, type MineCell } from "./game";

type Phase = "new" | "playing" | "won" | "lost";

export default function MinesweeperApp() {
  const [board, setBoard] = useState<MineCell[] | null>(null);
  const [phase, setPhase] = useState<Phase>("new");
  const [elapsed, setElapsed] = useState(0);

  const flags = board?.filter((c) => c.flagged).length ?? 0;
  const minesLeft = MINES - flags;

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const reset = () => {
    setBoard(null);
    setPhase("new");
    setElapsed(0);
  };

  const onReveal = (index: number) => {
    if (phase === "won" || phase === "lost") return;
    const current = board ?? createBoard(ROWS, COLS, MINES, index);
    const cell = current[index];
    if (cell.flagged) return;
    const next = reveal(current, COLS, index);
    if (cell.mine) {
      for (const c of next) if (c.mine) c.revealed = true;
      setPhase("lost");
    } else if (isWin(next)) {
      setPhase("won");
    } else {
      setPhase("playing");
    }
    setBoard(next);
  };

  const onFlag = (index: number) => {
    if (!board || phase === "won" || phase === "lost") return;
    setBoard(toggleFlag(board, index));
  };

  const face = phase === "won" ? "B-)" : phase === "lost" ? "X-(" : phase === "playing" ? ":-O" : ":-)";

  return (
    <div>
      <div className={styles.header}>
        <output className={styles.counter} aria-label="Mines left">
          {String(Math.max(0, minesLeft)).padStart(3, "0")}
        </output>
        <button aria-label="New game" title="New game" onClick={reset}>
          {face}
        </button>
        <output className={styles.counter} aria-label="Elapsed seconds">
          {String(Math.min(999, elapsed)).padStart(3, "0")}
        </output>
      </div>
      <div
        className={styles.board}
        role="grid"
        aria-label="Minesweeper board"
        onContextMenu={(e) => e.preventDefault()}
      >
        {(board ?? Array.from({ length: ROWS * COLS }, () => null)).map((cell, i) => (
          <button
            key={i}
            role="gridcell"
            className={`${styles.cell} ${cell?.revealed ? styles.revealed : ""} ${
              cell?.revealed && cell.mine ? styles.mine : ""
            } ${cell?.revealed && cell.adjacent ? styles[`n${cell.adjacent}`] : ""}`}
            aria-label={
              cell?.revealed
                ? cell.mine
                  ? "Mine"
                  : cell.adjacent
                    ? `${cell.adjacent} adjacent mines`
                    : "Empty"
                : cell?.flagged
                  ? "Flagged"
                  : `Cell ${i + 1}`
            }
            disabled={cell?.revealed}
            onClick={() => onReveal(i)}
            onContextMenu={(e) => {
              e.preventDefault();
              onFlag(i);
            }}
          >
            {cell?.revealed
              ? cell.mine
                ? "*"
                : cell.adjacent || ""
              : cell?.flagged
                ? "F"
                : ""}
          </button>
        ))}
      </div>
      <div className={styles.status} role="status" aria-live="polite">
        {phase === "won" ? "You win!" : phase === "lost" ? "Boom." : ""}
      </div>
    </div>
  );
}
