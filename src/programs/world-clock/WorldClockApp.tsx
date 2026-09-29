"use client";

import { useEffect, useState } from "react";
import { CITIES, timeInZone } from "./worldclock";
import styles from "./WorldClockApp.module.css";

/** World clock: one row per city, ticking once a second. */
export default function WorldClockApp() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const local = timeInZone(now, Intl.DateTimeFormat().resolvedOptions().timeZone);

  return (
    <div className={styles.root}>
      <div className={styles.local}>
        <span className={styles.localLabel}>Local time</span>
        <span className={styles.localTime}>{local.time}</span>
      </div>
      <table className={styles.table} aria-label="World clock">
        <thead>
          <tr>
            <th>City</th>
            <th>Time</th>
            <th>Zone</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {CITIES.map((c) => {
            const t = timeInZone(now, c.tz);
            return (
              <tr key={c.tz}>
                <td>{c.label}</td>
                <td className={styles.time}>{t.time}</td>
                <td className={styles.zone}>{t.offset}</td>
                <td>{t.date}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
