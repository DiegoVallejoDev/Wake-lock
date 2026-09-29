export interface Story {
  id: number;
  title: string;
  /** External link, or the HN item page for self-posts (Ask HN, jobs). */
  url: string;
  points: number;
  author: string;
  comments: number;
  ageText: string;
}

interface AlgoliaHit {
  objectID?: string;
  title?: string;
  url?: string | null;
  points?: number | null;
  author?: string;
  num_comments?: number | null;
  created_at_i?: number;
}

const FEED = "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30";
const ITEM = "https://news.ycombinator.com/item?id=";

/** Compact relative age like "45s", "12m", "3h", "6d" (clamped at 0). */
export function formatAge(unixSec: number, nowMs: number): string {
  const s = Math.max(0, Math.floor((nowMs - unixSec * 1000) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function mapStory(hit: AlgoliaHit, nowMs: number): Story | null {
  if (!hit.objectID || !hit.title) return null;
  const id = Number(hit.objectID);
  return {
    id,
    title: hit.title,
    url: hit.url ?? `${ITEM}${hit.objectID}`,
    points: hit.points ?? 0,
    author: hit.author ?? "?",
    comments: hit.num_comments ?? 0,
    ageText: hit.created_at_i ? formatAge(hit.created_at_i, nowMs) : "?",
  };
}

export async function fetchTopStories(signal?: AbortSignal): Promise<Story[]> {
  const res = await fetch(FEED, { signal });
  if (!res.ok) throw new Error(`HN API ${res.status}`);
  const data = (await res.json()) as { hits?: AlgoliaHit[] };
  const now = Date.now();
  return (data.hits ?? [])
    .map((h) => mapStory(h, now))
    .filter((s): s is Story => s !== null);
}
