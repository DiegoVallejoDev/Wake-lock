import type { ProgramDefinition } from "@/shell/types";
import WebBrowserApp from "./WebBrowserApp";

export const ie: ProgramDefinition = {
  id: "ie",
  title: "Internet Explorer",
  icon: "/icons/ie.png",
  defaultPosition: { x: 240, y: 140 },
  defaultSize: { width: 460 },
  component: WebBrowserApp,
};
