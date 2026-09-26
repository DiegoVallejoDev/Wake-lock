"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProgramProps } from "@/shell/types";
import { createDoomLoop } from "./doomMusic";
import styles from "./DoomApp.module.css";

const MENU = ["New Game", "Options", "Load Game", "Quit"];

/**
 * Fake DOOM: draws a title screen homage on a canvas and loops an original
 * synth track. Audio starts on mount when the browser allows it, otherwise
 * the first click inside the window unlocks it. Closing or minimizing the
 * window pauses the loop; reopening resumes it if sound was on.
 */
export default function DoomApp({ status }: ProgramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const loopRef = useRef<ReturnType<typeof createDoomLoop> | null>(null);
  const wantedRef = useRef(true);
  const [sound, setSound] = useState<"on" | "off" | "blocked">("off");
  const [cursor, setCursor] = useState(0);

  // Title art: dark backdrop, fiery gradient logo, shareware subtitle.
  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const { width: w, height: h } = canvas;

    g.fillStyle = "#0a0503";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * w;
      const y = h * 0.55 + Math.random() * h * 0.45;
      const r = 1 + Math.random() * 3;
      g.fillStyle = `rgba(${180 + Math.random() * 75},${40 + Math.random() * 60},10,${0.15 + Math.random() * 0.5})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    const grad = g.createLinearGradient(0, h * 0.12, 0, h * 0.55);
    grad.addColorStop(0, "#ffe9a0");
    grad.addColorStop(0.45, "#ff9d1e");
    grad.addColorStop(1, "#a11000");
    g.font = "bold 74px 'Pixelated MS Sans Serif', Impact, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    g.shadowColor = "rgba(255,60,0,0.8)";
    g.shadowBlur = 22;
    g.fillStyle = grad;
    g.fillText("DOOM", w / 2, h * 0.5);
    g.shadowBlur = 0;
    g.strokeStyle = "#3a0500";
    g.lineWidth = 2;
    g.strokeText("DOOM", w / 2, h * 0.5);

    g.font = "13px 'Pixelated MS Sans Serif', sans-serif";
    g.fillStyle = "#8a7f77";
    g.fillText("- FAKE SHAREWARE EDITION -", w / 2, h * 0.62);
  }, []);

  const startSound = useCallback(async () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      loopRef.current = createDoomLoop(ctxRef.current);
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    if (ctx.state !== "running") {
      setSound("blocked");
      return;
    }
    loopRef.current?.start();
    setSound("on");
  }, []);

  const stopSound = useCallback(() => {
    loopRef.current?.stop();
    setSound("off");
  }, []);

  // Pause when the window is closed/minimized (the component stays mounted);
  // resume on reopen while sound is still wanted.
  useEffect(() => {
    if (status === "open") {
      if (wantedRef.current && !loopRef.current?.playing) void startSound();
    } else {
      loopRef.current?.stop();
    }
  }, [status, startSound]);

  // Try to start right away; the desktop icon's double-click usually counts
  // as the required gesture. If the context stays suspended, any pointer or
  // key inside the window retries once.
  useEffect(() => {
    void startSound();
    return () => {
      loopRef.current?.stop();
      void ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      loopRef.current = null;
    };
  }, [startSound]);

  const unlock = useCallback(() => {
    if (sound === "blocked") void startSound();
  }, [sound, startSound]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c + (e.key === "ArrowDown" ? 1 : MENU.length - 1)) % MENU.length);
    }
  };

  return (
    <div className={styles.root} onPointerDown={unlock} onKeyDown={onMenuKey}>
      <div className={styles.screen}>
        <canvas ref={canvasRef} width={384} height={200} className={styles.art} />
        <div className={styles.menu} role="listbox" aria-label="DOOM menu">
          {MENU.map((item, i) => (
            <button
              key={item}
              role="option"
              aria-selected={cursor === i}
              className={`${styles.menuItem}${cursor === i ? ` ${styles.selected}` : ""}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => setCursor(i)}
            >
              <span className={styles.skull} aria-hidden="true">
                {cursor === i ? "»" : ""}
              </span>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="status-bar">
        <button
          className={styles.soundBtn}
          aria-pressed={sound === "on"}
          onClick={(e) => {
            e.stopPropagation();
            if (sound === "on") {
              wantedRef.current = false;
              stopSound();
            } else {
              wantedRef.current = true;
              void startSound();
            }
          }}
        >
          {sound === "on" ? "Sound: ON" : "Sound: OFF"}
        </button>
        <span className={styles.nowPlaying}>
          {sound === "on"
            ? "At Fake Gates"
            : sound === "blocked"
              ? "Click for sound"
              : "Music stopped"}
        </span>
      </div>
    </div>
  );
}
