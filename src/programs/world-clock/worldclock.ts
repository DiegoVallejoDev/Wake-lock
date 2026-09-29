export interface ZoneCity {
  label: string;
  tz: string;
}

export const CITIES: ZoneCity[] = [
  { label: "Los Angeles", tz: "America/Los_Angeles" },
  { label: "New York", tz: "America/New_York" },
  { label: "São Paulo", tz: "America/Sao_Paulo" },
  { label: "London", tz: "Europe/London" },
  { label: "Berlin", tz: "Europe/Berlin" },
  { label: "Tokyo", tz: "Asia/Tokyo" },
  { label: "Sydney", tz: "Australia/Sydney" },
  { label: "UTC", tz: "UTC" },
];

export interface CityTime {
  time: string;
  date: string;
  /** e.g. "GMT+2", "GMT-5", "GMT" */
  offset: string;
}

/** Format `now` in `tz` as { time, date, offset } using Intl APIs. */
export function timeInZone(now: Date, tz: string): CityTime {
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: tz,
  }).format(now);
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: tz,
  }).format(now);
  const part = new Intl.DateTimeFormat("en-US", {
    timeZoneName: "shortOffset",
    timeZone: tz,
  })
    .formatToParts(now)
    .find((p) => p.type === "timeZoneName");
  const offset = part?.value ?? "GMT";
  return { time, date, offset: offset === "GMT+0" || offset === "GMT-0" ? "GMT" : offset };
}
