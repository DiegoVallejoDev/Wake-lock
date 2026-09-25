import { describe, expect, it } from "vitest";
import {
  createInitialShellState,
  shellReducer,
  type ShellState,
} from "../src/shell/windowManager";

function open(state: ShellState, id: string, x = 0, y = 0): ShellState {
  return shellReducer(state, { type: "OPEN", id, position: { x, y } });
}

describe("window manager reducer", () => {
  it("opens a window, cascades its position, and focuses it", () => {
    let s = createInitialShellState();
    s = open(s, "a", 100, 50);
    expect(s.windows.a.status).toBe("open");
    expect(s.windows.a).toMatchObject({ x: 100, y: 50 });
    expect(s.focused).toBe("a");
    expect(s.order).toEqual(["a"]);

    s = open(s, "b", 100, 50);
    // Second window is offset by one cascade step (24px).
    expect(s.windows.b).toMatchObject({ x: 124, y: 74 });
    expect(s.focused).toBe("b");
    expect(s.order).toEqual(["a", "b"]);
  });

  it("reopening a closed window keeps its position and order entry", () => {
    let s = createInitialShellState();
    s = open(s, "a", 10, 10);
    s = open(s, "b", 10, 10);
    s = shellReducer(s, { type: "CLOSE", id: "a" });
    expect(s.order).toEqual(["b"]);
    expect(s.windows.a.status).toBe("closed");

    s = open(s, "a", 999, 999);
    // Reopened window keeps its original coordinates, not the action position.
    expect(s.windows.a).toMatchObject({ x: 10, y: 10, status: "open" });
    expect(s.order).toEqual(["b", "a"]);
    expect(s.focused).toBe("a");
  });

  it("closing the focused window hands focus to the top visible window", () => {
    let s = createInitialShellState();
    s = open(s, "a");
    s = open(s, "b");
    s = open(s, "c");
    // Bring "a" forward so it is the highest-z after c.
    s = shellReducer(s, { type: "FOCUS", id: "a" });
    expect(s.focused).toBe("a");
    s = shellReducer(s, { type: "CLOSE", id: "a" });
    expect(s.focused).toBe("c");
  });

  it("closing a non-focused window does not move focus", () => {
    let s = createInitialShellState();
    s = open(s, "a");
    s = open(s, "b");
    s = shellReducer(s, { type: "CLOSE", id: "a" });
    expect(s.focused).toBe("b");
  });

  it("minimizing keeps the taskbar entry and refocuses the next window", () => {
    let s = createInitialShellState();
    s = open(s, "a");
    s = open(s, "b");
    s = shellReducer(s, { type: "MINIMIZE", id: "b" });
    expect(s.windows.b.status).toBe("minimized");
    expect(s.order).toEqual(["a", "b"]);
    expect(s.focused).toBe("a");
  });

  it("focus raises z-order so a lower window can overtake a higher one", () => {
    let s = createInitialShellState();
    s = open(s, "a");
    s = open(s, "b");
    expect(s.windows.a.z).toBeLessThan(s.windows.b.z);
    s = shellReducer(s, { type: "FOCUS", id: "a" });
    expect(s.windows.a.z).toBeGreaterThan(s.windows.b.z);
    expect(s.focused).toBe("a");
  });

  it("maximize stores restore geometry; un-maximize restores x/y", () => {
    let s = createInitialShellState();
    s = open(s, "a", 40, 40);
    s = shellReducer(s, { type: "MOVE", id: "a", x: 200, y: 300 });
    s = shellReducer(s, {
      type: "TOGGLE_MAXIMIZE",
      id: "a",
      geometry: { x: 200, y: 300, width: 220, height: 100 },
    });
    expect(s.windows.a.maximized).toBe(true);
    expect(s.windows.a.restore).toEqual({ x: 200, y: 300, width: 220, height: 100 });

    s = shellReducer(s, { type: "TOGGLE_MAXIMIZE", id: "a", geometry: null });
    expect(s.windows.a.maximized).toBe(false);
    expect(s.windows.a).toMatchObject({ x: 200, y: 300 });
    expect(s.windows.a.restore).toBeNull();
  });

  it("toggles the start menu and close-start is a no-op when already closed", () => {
    let s = createInitialShellState();
    s = shellReducer(s, { type: "TOGGLE_START" });
    expect(s.startMenuOpen).toBe(true);
    s = shellReducer(s, { type: "CLOSE_START" });
    expect(s.startMenuOpen).toBe(false);
    const before = s;
    s = shellReducer(s, { type: "CLOSE_START" });
    expect(s).toBe(before);
  });
});
