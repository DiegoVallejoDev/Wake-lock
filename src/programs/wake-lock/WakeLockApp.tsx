"use client";

import { useWakeLock } from "./useWakeLock";
import styles from "./WakeLockApp.module.css";

export default function WakeLockApp() {
  const { supported, status, active, pressed, busy, toggle } = useWakeLock();

  return (
    <>
      <button
        id="wake-lock-btn"
        className="default"
        aria-pressed={pressed}
        aria-busy={busy}
        disabled={!supported}
        onClick={toggle}
      >
        {pressed ? "Release Wake Lock" : "Enable Wake Lock"}
      </button>
      <div className="status-bar" aria-live="polite">
        <span
          className={`${styles.indicator}${active ? ` ${styles.active}` : ""}`}
          aria-hidden="true"
        />
        <span>Status: {status}</span>
      </div>
    </>
  );
}
