"use client";

import { useEffect, useRef, useState } from "react";
import { HOME_URL, OPEN_URL_EVENT, takePendingUrl } from "./launch";
import styles from "./WebBrowserApp.module.css";

function normalize(input: string): string {
  const u = input.trim();
  if (!u) return HOME_URL;
  if (u === HOME_URL || /^[a-z]+:/i.test(u)) return u;
  return `https://${u}`;
}

/**
 * A period-appropriate iframe browser. Other programs (Hacker News) send it
 * URLs via browseTo(); while closed it reads takePendingUrl() on mount.
 * Many sites send X-Frame-Options and refuse to render in a frame — there is
 * no reliable way to detect that cross-origin, so the status bar always
 * offers opening the page in a real tab as a fallback.
 */
export default function WebBrowserApp() {
  const [url, setUrl] = useState(() => takePendingUrl() ?? HOME_URL);
  const [address, setAddress] = useState(url === HOME_URL ? "" : url);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const target = (e as CustomEvent<string>).detail;
      setUrl(target);
      setAddress(target);
    };
    window.addEventListener(OPEN_URL_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_URL_EVENT, onOpen);
  }, []);

  const go = (e?: React.FormEvent) => {
    e?.preventDefault();
    setUrl(normalize(address));
  };

  return (
    <div className={styles.root}>
      <form className={styles.bar} onSubmit={go}>
        <span className={styles.label}>Address</span>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="example.com"
          aria-label="Address"
        />
        <button type="submit">Go</button>
        <button
          type="button"
          aria-label="Reload"
          onClick={() => {
            const f = frameRef.current;
            if (f && url !== HOME_URL) f.src = url; // re-navigate the frame
          }}
        >
          ↻
        </button>
      </form>
      {url === HOME_URL ? (
        <div className={styles.home}>
          <p>Internet Explorer</p>
          <p className={styles.dim}>Type an address and press Go.</p>
        </div>
      ) : (
        <iframe
          ref={frameRef}
          key={url}
          src={url}
          className={styles.frame}
          title="Web page"
          referrerPolicy="no-referrer"
        />
      )}
      <div className={styles.status}>
        <span className={styles.statusUrl}>{url === HOME_URL ? "Done" : url}</span>
        <button
          className={styles.external}
          onClick={() => url !== HOME_URL && window.open(url, "_blank", "noopener,noreferrer")}
          disabled={url === HOME_URL}
        >
          Open in tab
        </button>
      </div>
    </div>
  );
}
