import type { ProgramDefinition } from "@/shell/types";
import PaintApp from "./PaintApp";

export const paint: ProgramDefinition = {
  id: "paint",
  title: "Paint",
  icon: "/icons/paint.png",
  defaultPosition: { x: 800, y: 250 },
  defaultSize: { width: 420 },
  component: PaintApp,
};
