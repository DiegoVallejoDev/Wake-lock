"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PaintApp.module.css";

const COLORS = [
  "#000000", "#808080", "#800000", "#808000", "#008000", "#008080", "#000080",
  "#800080", "#ffffff", "#c0c0c0", "#ff0000", "#ffff00", "#00ff00", "#00ffff",
  "#0000ff", "#ff00ff", "#ffb000", "#b08040", "#80ff80", "#4080ff",
];

const CANVAS_W = 400;
const CANVAS_H = 240;

export default function PaintApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState("#000000");
  const [eraser, setEraser] = useState(false);
  const [size, setSize] = useState(2);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  };

  const stroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.strokeStyle = eraser ? "#ffffff" : color;
    ctx.lineWidth = eraser ? size * 4 : size;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // A dot for a single click.
    ctx.lineTo(x + 0.01, y);
    stroke(e);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current) stroke(e);
  };

  const up = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "drawing.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className={styles.body}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={CANVAS_W}
        height={CANVAS_H}
        aria-label="Drawing canvas"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      />
      <div className={styles.toolbar}>
        <div className={styles.palette} role="radiogroup" aria-label="Colors">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`${styles.swatch} ${!eraser && color === c ? styles.selected : ""}`}
              style={{ background: c }}
              role="radio"
              aria-checked={!eraser && color === c}
              aria-label={`Color ${c}`}
              onClick={() => {
                setColor(c);
                setEraser(false);
              }}
            />
          ))}
        </div>
        <button
          aria-pressed={eraser}
          onClick={() => setEraser((v) => !v)}
          title="Eraser"
        >
          Eraser
        </button>
        <label>
          Size{" "}
          <input
            type="range"
            min={1}
            max={12}
            value={size}
            aria-label="Brush size"
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </label>
        <button onClick={clear}>Clear</button>
        <button className="default" onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}
