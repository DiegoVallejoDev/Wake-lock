export interface GeoResult {
  name: string;
  country: string;
  admin?: string;
  latitude: number;
  longitude: number;
}

export interface Forecast {
  current: {
    tempC: number;
    feelsC: number;
    humidity: number;
    windKmh: number;
    code: number;
  };
  daily: { date: string; maxC: number; minC: number; code: number }[];
}

/** WMO weather-code → short label for the retro status display. */
export function weatherText(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 56 && code <= 57) return "Freezing drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 66 && code <= 67) return "Freezing rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code >= 96 && code <= 99) return "Hail storm";
  return "Unknown";
}

export function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

/** "2026-09-24" → "Thu" */
export function weekdayName(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

interface GeoResponse {
  results?: {
    name: string;
    country?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }[];
}

export async function geocode(name: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Geocoding ${res.status}`);
  const data = (await res.json()) as GeoResponse;
  return (data.results ?? []).map((r) => ({
    name: r.name,
    country: r.country ?? "",
    admin: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

interface ForecastResponse {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export async function fetchForecast(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<Forecast> {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=4&timezone=auto";
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Forecast ${res.status}`);
  const data = (await res.json()) as ForecastResponse;
  if (!data.current || !data.daily) throw new Error("Malformed forecast");
  return {
    current: {
      tempC: data.current.temperature_2m,
      feelsC: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windKmh: data.current.wind_speed_10m,
      code: data.current.weather_code,
    },
    daily: data.daily.time.map((date, i) => ({
      date,
      code: data.daily!.weather_code[i],
      maxC: data.daily!.temperature_2m_max[i],
      minC: data.daily!.temperature_2m_min[i],
    })),
  };
}
