import type { ComponentType } from "react";

/**
 * Where a program's window stands in the shell.
 * - "open": visible on the desktop, listed in the taskbar.
 * - "minimized": hidden, still listed in the taskbar.
 * - "closed": hidden, not in the taskbar. The program component stays
 *   mounted so its state survives reopening, like the original DOM.
 */
export type WindowStatus = "open" | "minimized" | "closed";

export interface ProgramProps {
  /** Current window status; programs can react to close/minimize (e.g. pause a timer on close). */
  status: WindowStatus;
  /** Whether this program's window is the focused one. */
  isFocused: boolean;
}

export interface ProgramDefinition {
  /** Stable key used by the taskbar, focus tracking, and persistence ("notepad"). */
  id: string;
  /** Title-bar text, icon label, and Start-menu entry. */
  title: string;
  /** Icon path under /icons (Chicago95 PNG). */
  icon: string;
  /** Initial window dimensions in pixels. Width-only is fine; height defaults to content. */
  defaultSize?: { width?: number; height?: number };
  /** Initial top-left position; a cascade offset is applied per already-open window. */
  defaultPosition?: { x: number; y: number };
  /** Whether the maximize title-bar button and double-click maximize are enabled (default true). */
  maximizable?: boolean;
  /** Whether a desktop icon is shown (default true). */
  desktop?: boolean;
  /** Whether the program appears in the Start menu (default true). */
  startMenu?: boolean;
  /** Window body rendered inside the shared WindowFrame chrome. */
  component: ComponentType<ProgramProps>;
}
