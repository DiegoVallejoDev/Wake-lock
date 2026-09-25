import type { ProgramDefinition } from "@/shell/types";
import NotepadApp from "./NotepadApp";

export const notepad: ProgramDefinition = {
  id: "notepad",
  title: "Notepad",
  icon: "/icons/accessories-text-editor.png",
  defaultPosition: { x: 128, y: 250 },
  defaultSize: { width: 360 },
  component: NotepadApp,
};
