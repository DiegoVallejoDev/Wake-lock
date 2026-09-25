"use client";

import { useState } from "react";
import { safeEvaluate } from "./safeEvaluate";
import styles from "./CalculatorApp.module.css";

type Key =
  | { type: "num"; value: string }
  | { type: "op"; value: string; label?: string }
  | { type: "eq" }
  | { type: "clear" };

const KEYS: Key[] = [
  { type: "num", value: "7" },
  { type: "num", value: "8" },
  { type: "num", value: "9" },
  { type: "op", value: "+" },
  { type: "num", value: "4" },
  { type: "num", value: "5" },
  { type: "num", value: "6" },
  { type: "op", value: "-" },
  { type: "num", value: "1" },
  { type: "num", value: "2" },
  { type: "num", value: "3" },
  { type: "op", value: "*", label: "×" },
  { type: "num", value: "0" },
  { type: "num", value: "." },
  { type: "eq" },
  { type: "op", value: "/", label: "÷" },
  { type: "clear" },
];

export default function CalculatorApp() {
  const [display, setDisplay] = useState("");

  const press = (key: Key) => {
    if (key.type === "num") setDisplay((d) => d + key.value);
    if (key.type === "op") setDisplay((d) => `${d} ${key.value} `);
    if (key.type === "eq") {
      try {
        setDisplay(String(Number(safeEvaluate(display))));
      } catch {
        setDisplay("Error");
      }
    }
    if (key.type === "clear") setDisplay("");
  };

  return (
    <>
      <input
        type="text"
        className={styles.display}
        readOnly
        aria-label="Calculator display"
        value={display}
      />
      <div className={styles.grid}>
        {KEYS.map((key, i) => (
          <button
            key={key.type === "clear" ? "clear" : i}
            className={styles.key}
            style={key.type === "clear" ? { gridColumn: "span 4" } : undefined}
            onClick={() => press(key)}
          >
            {key.type === "eq"
              ? "="
              : key.type === "clear"
                ? "C"
                : key.type === "op"
                  ? (key.label ?? key.value)
                  : key.value}
          </button>
        ))}
      </div>
    </>
  );
}
