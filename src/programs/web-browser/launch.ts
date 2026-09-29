/** Cross-program bridge for "open this URL in the browser window". */

export const OPEN_URL_EVENT = "retro-web:open-url";
export const HOME_URL = "about:blank";

let pendingUrl: string | null = null;

/**
 * Queue `url` for a not-yet-opened browser window and notify an already-open
 * one. Callers follow with `wm.open("ie", …)` — whichever path lands first wins.
 */
export function browseTo(url: string) {
  pendingUrl = url;
  window.dispatchEvent(new CustomEvent<string>(OPEN_URL_EVENT, { detail: url }));
}

/** URL queued while the browser window was closed, if any. */
export function takePendingUrl(): string | null {
  const u = pendingUrl;
  pendingUrl = null;
  return u;
}
