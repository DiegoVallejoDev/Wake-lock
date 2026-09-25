import type { ProgramDefinition } from "@/shell/types";
import CalculatorApp from "./CalculatorApp";

export const calculator: ProgramDefinition = {
  id: "calculator",
  title: "Calculator",
  icon: "/icons/accessories-calculator.png",
  defaultPosition: { x: 464, y: 40 },
  defaultSize: { width: 220 },
  component: CalculatorApp,
};
