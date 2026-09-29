"use client";

import { useRef, useState } from "react";
import type { Forecast, GeoResult } from "./weather";
import { cToF, fetchForecast, geocode, weatherText, weekdayName } from "./weather";
import styles from "./WeatherApp.module.css";

/** Weather via open-meteo (free, no API key, CORS-open). */
export default function WeatherApp() {
  const [query, setQuery] = useState("");
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [fc, setFc] = useState<Forecast | null>(null);
  const [units, setUnits] = useState<"C" | "F">("C");
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const runRef = useRef(0);

  const temp = (c: number) => (units === "C" ? `${Math.round(c)}°C` : `${cToF(c)}°F`);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const run = ++runRef.current;
    setState("loading");
    try {
      const places = await geocode(q);
      if (!places.length) throw new Error(`No match for "${q}"`);
      const place = places[0];
      const forecast = await fetchForecast(place.latitude, place.longitude);
      if (run !== runRef.current) return;
      setGeo(place);
      setFc(forecast);
      setState("ready");
    } catch (err) {
      if (run !== runRef.current) return;
      setError(err instanceof Error ? err.message : "Lookup failed");
      setState("error");
    }
  };

  return (
    <div className={styles.root}>
      <form className={styles.search} onSubmit={search}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="City name..."
          aria-label="City name"
        />
        <button type="submit" disabled={state === "loading"}>
          {state === "loading" ? "..." : "Search"}
        </button>
        <button
          type="button"
          aria-pressed={units === "F"}
          onClick={() => setUnits(units === "C" ? "F" : "C")}
        >
          °{units}
        </button>
      </form>

      {state === "error" && <div className={styles.notice}>{error}</div>}
      {state === "idle" && <div className={styles.notice}>Search a city for its forecast.</div>}

      {fc && geo && (
        <>
          <div className={styles.now}>
            <div className={styles.place}>
              {geo.name}
              {geo.country ? `, ${geo.country}` : ""}
            </div>
            <div className={styles.big}>{temp(fc.current.tempC)}</div>
            <div className={styles.desc}>{weatherText(fc.current.code)}</div>
            <div className={styles.details}>
              Feels {temp(fc.current.feelsC)} · Humidity {fc.current.humidity}% · Wind{" "}
              {Math.round(fc.current.windKmh)} km/h
            </div>
          </div>
          <div className={styles.days}>
            {fc.daily.map((d) => (
              <div key={d.date} className={styles.day}>
                <div className={styles.dow}>{weekdayName(d.date)}</div>
                <div className={styles.dtext}>{weatherText(d.code)}</div>
                <div className={styles.dtemp}>
                  {temp(d.maxC)} <span className={styles.min}>/ {temp(d.minC)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <div className={styles.credit}>data: open-meteo.com</div>
    </div>
  );
}
