"use client";

import { useState } from "react";
import styles from "./CalendarApp.module.css";
import { MONTHS, WEEKDAYS, monthGrid } from "./calendar";

export default function CalendarApp() {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const shift = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const weeks = monthGrid(view.year, view.month);
  const isToday = (day: number) =>
    day === now.getDate() && view.month === now.getMonth() && view.year === now.getFullYear();

  return (
    <div className={styles.body}>
      <div className={styles.header}>
        <button aria-label="Previous month" onClick={() => shift(-1)}>
          ◀
        </button>
        <div className={styles.title} aria-live="polite">
          {MONTHS[view.month]} {view.year}
        </div>
        <button aria-label="Next month" onClick={() => shift(1)}>
          ▶
        </button>
      </div>
      <div className={styles.grid} role="grid" aria-label={`${MONTHS[view.month]} ${view.year}`}>
        {WEEKDAYS.map((d) => (
          <div key={d} className={`${styles.day} ${styles.weekday}`} role="columnheader">
            {d}
          </div>
        ))}
        {weeks.flat().map((day, i) => (
          <div
            key={i}
            className={`${styles.day} ${isToday(day) ? styles.today : ""}`}
            role="gridcell"
            aria-label={day ? `${MONTHS[view.month]} ${day}` : undefined}
            aria-current={isToday(day) ? "date" : undefined}
          >
            {day || ""}
          </div>
        ))}
      </div>
    </div>
  );
}
