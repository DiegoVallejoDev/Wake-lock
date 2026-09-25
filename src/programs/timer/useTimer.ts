"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WindowStatus } from "@/shell/types";

export function formatTimerTime(seconds: number): string {
  const rounded = Math.ceil(seconds);
  const minutes = Math.floor(rounded / 60).toString().padStart(2, "0");
  const remainder = (rounded % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function playAlarm() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    /* ignore */
  }
}

interface MutableTimerState {
  interval: ReturnType<typeof setInterval> | null;
  remaining: number;
  total: number;
  deadline: number;
  wakeLock: WakeLockSentinel | null;
  wakeLockRequest: object | null;
}

/**
 * Countdown timer with its own screen wake lock, independent of the manual
 * Wake Lock program. The countdown is deadline-based so it survives browser
 * suspension; the lock is held only while the timer runs and the page is
 * visible. Closing the window pauses the timer; minimizing keeps it running.
 */
export function useTimer(status: WindowStatus) {
  const m = useRef<MutableTimerState>({
    interval: null,
    remaining: 300,
    total: 300,
    deadline: 0,
    wakeLock: null,
    wakeLockRequest: null,
  });
  const [remaining, setRemaining] = useState(300);
  const [statusText, setStatusText] = useState("Ready");

  const updateRemaining = useCallback(() => {
    if (!m.current.interval) return;
    m.current.remaining = Math.max(0, (m.current.deadline - Date.now()) / 1000);
    setRemaining(m.current.remaining);
  }, []);

  const releaseTimerWakeLock = useCallback(async () => {
    m.current.wakeLockRequest = null;
    const lock = m.current.wakeLock;
    m.current.wakeLock = null;
    try {
      if (lock && !lock.released) await lock.release();
    } catch (err) {
      console.error("Timer wake lock release failed:", err);
    }
  }, []);

  const requestTimerWakeLock = useCallback(async () => {
    if (!m.current.interval || document.visibilityState !== "visible") return;
    if (!("wakeLock" in navigator)) {
      setStatusText("Running... Screen wake lock is unavailable.");
      return;
    }
    if (m.current.wakeLockRequest) return;
    if (m.current.wakeLock && !m.current.wakeLock.released) return;
    const req = {};
    m.current.wakeLockRequest = req;
    try {
      const lock = await navigator.wakeLock.request("screen");
      if (
        m.current.wakeLockRequest !== req ||
        !m.current.interval ||
        document.visibilityState !== "visible"
      ) {
        await lock.release();
        return;
      }
      m.current.wakeLock = lock;
      setStatusText("Running...");
      lock.addEventListener("release", () => {
        if (m.current.wakeLock !== lock) return;
        m.current.wakeLock = null;
        if (m.current.interval)
          setStatusText("Running... Screen wake lock was released.");
      });
    } catch {
      if (m.current.wakeLockRequest === req) {
        setStatusText("Running... Screen wake lock is unavailable.");
      }
    } finally {
      if (m.current.wakeLockRequest === req) m.current.wakeLockRequest = null;
    }
  }, []);

  const pause = useCallback(() => {
    if (m.current.interval) {
      updateRemaining();
      clearInterval(m.current.interval);
      m.current.interval = null;
    }
    m.current.deadline = 0;
    void releaseTimerWakeLock();
    setStatusText(m.current.remaining > 0 ? "Paused" : "Finished");
  }, [updateRemaining, releaseTimerWakeLock]);

  const tick = useCallback(() => {
    if (!m.current.interval) return;
    updateRemaining();
    if (m.current.remaining <= 0) {
      pause();
      setStatusText("Time's up!");
      playAlarm();
    }
  }, [updateRemaining, pause]);

  const start = useCallback(
    (customSeconds?: number) => {
      if (m.current.interval) return;
      if (m.current.remaining <= 0) {
        if (customSeconds && customSeconds > 0) {
          pause();
          m.current.remaining = customSeconds;
          m.current.total = customSeconds;
          setRemaining(customSeconds);
        } else {
          return;
        }
      }
      m.current.deadline = Date.now() + m.current.remaining * 1000;
      m.current.interval = setInterval(tick, 1000);
      setStatusText("Running...");
      void requestTimerWakeLock();
    },
    [tick, pause, requestTimerWakeLock],
  );

  const setTimer = useCallback(
    (seconds: number) => {
      pause();
      m.current.remaining = seconds;
      m.current.total = seconds;
      setRemaining(seconds);
      setStatusText("Ready");
    },
    [pause],
  );

  const reset = useCallback(() => {
    pause();
    m.current.remaining = m.current.total;
    setRemaining(m.current.total);
    setStatusText("Ready");
  }, [pause]);

  // Closing the window pauses; minimizing keeps the countdown running.
  useEffect(() => {
    if (status === "closed") pause();
  }, [status, pause]);

  // Catch up on return; hold the timer lock only while visible.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        tick();
        if (m.current.interval) void requestTimerWakeLock();
      } else {
        void releaseTimerWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [tick, requestTimerWakeLock, releaseTimerWakeLock]);

  // Unmount cleanup.
  useEffect(
    () => () => {
      if (m.current.interval) clearInterval(m.current.interval);
      void releaseTimerWakeLock();
    },
    [releaseTimerWakeLock],
  );

  return { display: formatTimerTime(remaining), statusText, start, pause, reset, setTimer };
}
