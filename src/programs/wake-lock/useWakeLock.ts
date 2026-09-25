"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface MutableWakeState {
  lock: WakeLockSentinel | null;
  wanted: boolean;
  request: object | null;
}

/**
 * Manual screen wake lock. Mirrors the original semantics: a delayed request
 * is abandoned if it is no longer needed, a hidden page suspends (but keeps)
 * the user's intent, and returning re-acquires the lock.
 */
export function useWakeLock() {
  const m = useRef<MutableWakeState>({ lock: null, wanted: false, request: null });
  const [supported] = useState(
    () => typeof navigator !== "undefined" && "wakeLock" in navigator,
  );
  const [status, setStatus] = useState("Wake Lock is not active");
  const [active, setActive] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [busy, setBusy] = useState(false);

  // A held sentinel disappeared (system release or our own release). While
  // hidden the user's intent survives and re-acquires on return; while visible
  // the loss is reported and the intent is cleared so the UI stays honest.
  const handleLost = useCallback((lock: WakeLockSentinel) => {
    if (m.current.lock !== lock) return;
    m.current.lock = null;
    setActive(false);
    if (document.visibilityState !== "visible" && m.current.wanted) {
      setStatus("Wake Lock is suspended");
      setPressed(true);
    } else {
      m.current.wanted = false;
      setStatus("Wake Lock was released");
      setPressed(false);
    }
  }, []);

  const request = useCallback(async () => {
    if (!("wakeLock" in navigator)) {
      setStatus("Wake Lock API not supported");
      return;
    }
    if (document.visibilityState !== "visible" || m.current.request) return;
    if (m.current.lock && !m.current.lock.released) return;

    const req = {};
    m.current.request = req;
    m.current.wanted = true;
    setStatus("Requesting Wake Lock...");
    setPressed(true);
    setBusy(true);
    try {
      const lock = await navigator.wakeLock.request("screen");
      if (
        m.current.request !== req ||
        !m.current.wanted ||
        document.visibilityState !== "visible"
      ) {
        await lock.release();
        return;
      }
      m.current.lock = lock;
      m.current.request = null;
      setStatus("Wake Lock is active");
      setActive(true);
      setPressed(true);
      setBusy(false);

      lock.addEventListener("release", () => handleLost(lock));
    } catch (err) {
      if (m.current.request === req) {
        m.current.wanted = false;
        setStatus(`Error - ${err instanceof Error ? err.message : String(err)}`);
        setActive(false);
      }
    } finally {
      if (m.current.request === req) {
        m.current.request = null;
        setPressed(m.current.wanted);
        setBusy(false);
      }
    }
  }, [handleLost]);

  const release = useCallback(async (keepWanted = false) => {
    m.current.request = null;
    const lock = m.current.lock;
    m.current.lock = null;
    if (!keepWanted) m.current.wanted = false;
    setActive(false);
    setPressed(m.current.wanted);
    setBusy(false);
    setStatus(
      m.current.wanted ? "Wake Lock is suspended" : "Wake Lock is not active",
    );
    try {
      if (lock && !lock.released) await lock.release();
    } catch (err) {
      console.error("Wake lock release failed:", err);
    }
  }, []);

  const toggle = useCallback(() => {
    if (m.current.wanted) void release();
    else void request();
  }, [request, release]);

  // Suspends while hidden (keeping intent), re-acquires on return.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (m.current.wanted) void request();
      } else if (m.current.wanted) {
        void release(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [request, release]);

  // Periodically reconcile the UI with the actual sentinel state so a release
  // that happens without a matching event can never leave the UI stale.
  useEffect(() => {
    const id = setInterval(() => {
      const lock = m.current.lock;
      if (lock && lock.released) handleLost(lock);
    }, 2000);
    return () => clearInterval(id);
  }, [handleLost]);

  return { supported, status, active, pressed, busy, toggle };
}
