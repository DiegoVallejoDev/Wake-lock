"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { WindowStatus } from "./types";

export interface WindowState {
  status: WindowStatus;
  z: number;
  x: number;
  y: number;
  /** Explicit size set by resizing; absent means "use the manifest's defaultSize". */
  width?: number;
  height?: number;
  maximized: boolean;
  restore: { x: number; y: number; width?: number; height?: number } | null;
}

export interface ShellState {
  /** Every window ever opened; entries persist so program state survives close/reopen. */
  windows: Record<string, WindowState>;
  /** Taskbar order: ids whose status is not "closed", in last-opened order. */
  order: string[];
  focused: string | null;
  zCounter: number;
  startMenuOpen: boolean;
  selectedIcon: string | null;
}

export type ShellAction =
  | { type: "OPEN"; id: string; position: { x: number; y: number } }
  | { type: "CLOSE"; id: string }
  | { type: "MINIMIZE"; id: string }
  | { type: "FOCUS"; id: string | null }
  | { type: "TOGGLE_MAXIMIZE"; id: string; geometry: { x: number; y: number; width?: number; height?: number } | null }
  | { type: "MOVE"; id: string; x: number; y: number }
  | { type: "RESIZE"; id: string; x: number; y: number; width: number; height: number }
  | { type: "DESKTOP_TOGGLE" }
  | { type: "TOGGLE_START" }
  | { type: "CLOSE_START" }
  | { type: "SELECT_ICON"; id: string | null };

const CASCADE = 24;
/** Wrap the cascade so late windows don't march off the screen edge. */
const CASCADE_WRAP = 6;

function topVisibleWindow(windows: Record<string, WindowState>, order: string[]): string | null {
  let best: string | null = null;
  let bestZ = -1;
  for (const id of order) {
    const win = windows[id];
    if (win && win.status === "open" && win.z > bestZ) {
      best = id;
      bestZ = win.z;
    }
  }
  return best;
}

export function createInitialShellState(): ShellState {
  return {
    windows: {},
    order: [],
    focused: null,
    zCounter: 10,
    startMenuOpen: false,
    selectedIcon: null,
  };
}

export function shellReducer(state: ShellState, action: ShellAction): ShellState {
  switch (action.type) {
    case "OPEN": {
      const existing = state.windows[action.id];
      const z = state.zCounter + 1;
      const offset = (state.order.length % CASCADE_WRAP) * CASCADE;
      const win: WindowState = existing
        ? { ...existing, status: "open", z }
        : {
            status: "open",
            z,
            x: action.position.x + offset,
            y: action.position.y + offset,
            maximized: false,
            restore: null,
          };
      return {
        ...state,
        windows: { ...state.windows, [action.id]: win },
        order: [...state.order.filter((id) => id !== action.id), action.id],
        focused: action.id,
        zCounter: z,
      };
    }
    case "CLOSE": {
      const win = state.windows[action.id];
      if (!win) return state;
      const windows = { ...state.windows, [action.id]: { ...win, status: "closed" as const } };
      const order = state.order.filter((id) => id !== action.id);
      const focused = state.focused === action.id ? topVisibleWindow(windows, order) : state.focused;
      return { ...state, windows, order, focused };
    }
    case "MINIMIZE": {
      const win = state.windows[action.id];
      if (!win) return state;
      const windows = { ...state.windows, [action.id]: { ...win, status: "minimized" as const } };
      const focused = state.focused === action.id ? topVisibleWindow(windows, state.order) : state.focused;
      return { ...state, windows, focused };
    }
    case "FOCUS": {
      if (action.id === state.focused) return state;
      if (!action.id) return { ...state, focused: null };
      const win = state.windows[action.id];
      const z = state.zCounter + 1;
      const windows = win ? { ...state.windows, [action.id]: { ...win, z } } : state.windows;
      return { ...state, windows, focused: action.id, zCounter: z };
    }
    case "TOGGLE_MAXIMIZE": {
      const win = state.windows[action.id];
      if (!win) return state;
      const nextMax = !win.maximized;
      const updated: WindowState = nextMax
        ? { ...win, maximized: true, restore: action.geometry }
        : {
            ...win,
            maximized: false,
            x: win.restore?.x ?? win.x,
            y: win.restore?.y ?? win.y,
            width: win.restore?.width ?? win.width,
            height: win.restore?.height ?? win.height,
            restore: null,
          };
      const z = state.zCounter + 1;
      updated.z = z;
      return {
        ...state,
        windows: { ...state.windows, [action.id]: updated },
        focused: action.id,
        zCounter: z,
      };
    }
    case "MOVE": {
      const win = state.windows[action.id];
      if (!win) return state;
      return {
        ...state,
        windows: { ...state.windows, [action.id]: { ...win, x: action.x, y: action.y } },
      };
    }
    case "RESIZE": {
      const win = state.windows[action.id];
      if (!win) return state;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: {
            ...win,
            x: action.x,
            y: action.y,
            width: action.width,
            height: action.height,
          },
        },
      };
    }
    case "DESKTOP_TOGGLE": {
      const windows = { ...state.windows };
      const anyOpen = state.order.some((id) => windows[id]?.status === "open");
      if (anyOpen) {
        for (const id of state.order) {
          const win = windows[id];
          if (win && win.status === "open") {
            windows[id] = { ...win, status: "minimized" };
          }
        }
        return { ...state, windows, focused: null };
      }
      const anyMinimized = state.order.some(
        (id) => windows[id]?.status === "minimized",
      );
      if (!anyMinimized) return state;
      for (const id of state.order) {
        const win = windows[id];
        if (win && win.status === "minimized") {
          windows[id] = { ...win, status: "open" };
        }
      }
      return { ...state, windows, focused: topVisibleWindow(windows, state.order) };
    }
    case "TOGGLE_START":
      return { ...state, startMenuOpen: !state.startMenuOpen };
    case "CLOSE_START":
      return state.startMenuOpen ? { ...state, startMenuOpen: false } : state;
    case "SELECT_ICON":
      return { ...state, selectedIcon: action.id };
    default:
      return state;
  }
}

export interface WindowManager {
  state: ShellState;
  open: (id: string, position: { x: number; y: number }) => void;
  close: (id: string) => void;
  minimize: (id: string) => void;
  toggleMaximize: (id: string, geometry: WindowState["restore"]) => void;
  focus: (id: string | null) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, geometry: { x: number; y: number; width: number; height: number }) => void;
  /** "Show desktop": minimizes every open window, or restores them all when none are open. */
  toggleDesktop: () => void;
  toggleStart: () => void;
  closeStart: () => void;
  selectIcon: (id: string | null) => void;
  registerWindowEl: (id: string, el: HTMLElement | null) => void;
  getWindowEl: (id: string) => HTMLElement | null;
}

const WindowManagerContext = createContext<WindowManager | null>(null);

export function useWindowManager(): WindowManager {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error("useWindowManager must be used inside WindowManagerProvider");
  return ctx;
}

export const WindowManagerContextProvider = WindowManagerContext.Provider;

export function useWindowManagerState() {
  const elsRef = useRef(new Map<string, HTMLElement>());
  const [state, dispatch] = useReducer(shellReducer, undefined, createInitialShellState);

  const registerWindowEl = useCallback((id: string, el: HTMLElement | null) => {
    if (el) elsRef.current.set(id, el);
    else elsRef.current.delete(id);
  }, []);

  const getWindowEl = useCallback((id: string) => elsRef.current.get(id) ?? null, []);

  const manager = useMemo<WindowManager>(
    () => ({
      state,
      open: (id, position) => dispatch({ type: "OPEN", id, position }),
      close: (id) => dispatch({ type: "CLOSE", id }),
      minimize: (id) => dispatch({ type: "MINIMIZE", id }),
      toggleMaximize: (id, geometry) => dispatch({ type: "TOGGLE_MAXIMIZE", id, geometry }),
      focus: (id) => dispatch({ type: "FOCUS", id }),
      move: (id, x, y) => dispatch({ type: "MOVE", id, x, y }),
      resize: (id, geometry) => dispatch({ type: "RESIZE", id, ...geometry }),
      toggleDesktop: () => dispatch({ type: "DESKTOP_TOGGLE" }),
      toggleStart: () => dispatch({ type: "TOGGLE_START" }),
      closeStart: () => dispatch({ type: "CLOSE_START" }),
      selectIcon: (id) => dispatch({ type: "SELECT_ICON", id }),
      registerWindowEl,
      getWindowEl,
    }),
    [state, registerWindowEl, getWindowEl],
  );

  return manager;
}
