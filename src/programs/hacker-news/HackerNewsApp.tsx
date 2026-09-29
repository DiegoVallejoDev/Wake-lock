"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Story } from "./hn";
import { fetchTopStories } from "./hn";
import styles from "./HackerNewsApp.module.css";

/** Live Hacker News front page via the public Algolia mirror (CORS-open). */
export default function HackerNewsApp() {
  const [stories, setStories] = useState<Story[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState("loading");
    try {
      setStories(await fetchTopStories(ctrl.signal));
      setState("ready");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <button onClick={() => void load()} disabled={state === "loading"}>
          {state === "loading" ? "Loading..." : "Refresh"}
        </button>
        <span className={styles.brand}>Hacker News</span>
      </div>
      <div className={styles.list} role="list" aria-label="Top stories">
        {state === "error" && (
          <div className={styles.notice}>
            Couldn&apos;t reach Hacker News.{" "}
            <button className={styles.retry} onClick={() => void load()}>
              Retry
            </button>
          </div>
        )}
        {state === "loading" && <div className={styles.notice}>Loading front page...</div>}
        {state === "ready" &&
          stories.map((s, i) => (
            <button
              key={s.id}
              className={styles.row}
              role="listitem"
              title={s.url}
              onClick={() => window.open(s.url, "_blank", "noopener,noreferrer")}
            >
              <span className={styles.rank}>{i + 1}.</span>
              <span className={styles.main}>
                <span className={styles.title}>{s.title}</span>
                <span className={styles.meta}>
                  {s.points} pts · {s.author} · {s.comments} comments · {s.ageText}
                </span>
              </span>
            </button>
          ))}
      </div>
      <div className={styles.status}>
        {state === "ready" ? `${stories.length} stories` : " "}
      </div>
    </div>
  );
}
