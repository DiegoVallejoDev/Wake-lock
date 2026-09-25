import type { ProgramDefinition } from "@/shell/types";
import CalendarApp from "./CalendarApp";

export const calendar: ProgramDefinition = {
  id: "calendar",
  title: "Calendar",
  icon: "/icons/calendar.png",
  defaultPosition: { x: 920, y: 250 },
  defaultSize: { width: 230 },
  component: CalendarApp,
};
