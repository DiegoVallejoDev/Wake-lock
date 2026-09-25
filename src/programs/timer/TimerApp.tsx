"use client";

import { useRef } from "react";
import { useTimer } from "./useTimer";
import type { ProgramProps } from "@/shell/types";
import styles from "./TimerApp.module.css";

const PRESETS = [
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "25m", seconds: 1500 },
];

export default function TimerApp({ status }: ProgramProps) {
  const { display, statusText, start, pause, reset, setTimer } =
    useTimer(status);
  const minRef = useRef<HTMLInputElement>(null);
  const secRef = useRef<HTMLInputElement>(null);

  const readInput = () => {
    const minutes = parseInt(minRef.current?.value ?? "", 10) || 0;
    const seconds = parseInt(secRef.current?.value ?? "", 10) || 0;
    return (
      Math.min(999, Math.max(0, minutes)) * 60 +
      Math.min(59, Math.max(0, seconds))
    );
  };

  return (
    <>
      <div className={styles.display}>{display}</div>
      <div className={styles.controls}>
        {PRESETS.map((p) => (
          <button key={p.seconds} onClick={() => setTimer(p.seconds)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className={`field-row ${styles.custom}`}>
        <label htmlFor="timer-min">Min</label>
        <input
          type="number"
          id="timer-min"
          min={0}
          max={999}
          defaultValue={0}
          ref={minRef}
          style={{ width: 50 }}
        />
        <label htmlFor="timer-sec">Sec</label>
        <input
          type="number"
          id="timer-sec"
          min={0}
          max={59}
          defaultValue={0}
          ref={secRef}
          style={{ width: 50 }}
        />
        <button
          onClick={() => {
            const total = readInput();
            if (total > 0) setTimer(total);
          }}
        >
          Set
        </button>
      </div>
      <div className={styles.controls}>
        <button onClick={() => start(readInput() || undefined)}>Start</button>
        <button onClick={pause}>Pause</button>
        <button onClick={reset}>Reset</button>
      </div>
      <p className={styles.status} aria-live="polite">
        {statusText}
      </p>
    </>
  );
}
