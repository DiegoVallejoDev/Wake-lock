"use client";

import { useEffect, useState } from "react";

function format() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  return {
    text: `${h}:${m}`,
    iso: now.toISOString(),
    title: now.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}

export default function Clock() {
  const [now, setNow] = useState(() => ({ text: "00:00", iso: "", title: "" }));

  useEffect(() => {
    queueMicrotask(() => setNow(format()));
    const interval = setInterval(() => setNow(format()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <time className="taskbar-clock" id="clock" dateTime={now.iso} title={now.title}>
      {now.text}
    </time>
  );
}
