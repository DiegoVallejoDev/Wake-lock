import type { ProgramDefinition } from "@/shell/types";
import WeatherApp from "./WeatherApp";

export const weather: ProgramDefinition = {
  id: "weather",
  title: "Weather",
  icon: "/icons/weather.png",
  defaultPosition: { x: 260, y: 100 },
  defaultSize: { width: 330 },
  component: WeatherApp,
};
