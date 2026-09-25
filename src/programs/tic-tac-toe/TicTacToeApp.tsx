"use client";

import { useState } from "react";
import { checkWinner, type Board } from "./game";
import styles from "./TicTacToeApp.module.css";

export default function TicTacToeApp() {
  const [board, setBoard] = useState<Board>(Array(9).fill(""));
  const [current, setCurrent] = useState<"X" | "O">("X");
  const [winner, setWinner] = useState<"X" | "O" | "draw" | null>(null);

  const statusText = winner
    ? winner === "draw"
      ? "It's a draw!"
      : `${winner} wins!`
    : `${current}'s turn`;

  const play = (index: number) => {
    if (board[index] || winner) return;
    const next = [...board];
    next[index] = current;
    const w = checkWinner(next);
    setBoard(next);
    if (w) {
      setWinner(w);
    } else if (next.every((cell) => cell !== "")) {
      setWinner("draw");
    } else {
      setCurrent(current === "X" ? "O" : "X");
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(""));
    setCurrent("X");
    setWinner(null);
  };

  return (
    <>
      <p className={styles.status} aria-live="polite">
        {statusText}
      </p>
      <div className={styles.board} role="group" aria-label="Tic-Tac-Toe board">
        {board.map((cell, index) => (
          <button
            key={index}
            type="button"
            disabled={!!cell || !!winner}
            aria-label={`Cell ${index + 1}${cell ? `, ${cell}` : ""}`}
            onClick={() => play(index)}
          >
            {cell}
          </button>
        ))}
      </div>
      <button onClick={resetGame}>New Game</button>
    </>
  );
}
