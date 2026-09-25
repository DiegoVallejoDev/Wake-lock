import type { ProgramDefinition } from "@/shell/types";
import TodoApp from "./TodoApp";

export const todo: ProgramDefinition = {
  id: "todo",
  title: "Todo List",
  icon: "/icons/checkbox.png",
  defaultPosition: { x: 680, y: 250 },
  defaultSize: { width: 300 },
  component: TodoApp,
};
