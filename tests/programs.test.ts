import { describe, expect, it } from "vitest";
import { safeEvaluate } from "../src/programs/calculator/safeEvaluate";
import { checkWinner, type Board } from "../src/programs/tic-tac-toe/game";
import { formatTimerTime } from "../src/programs/timer/useTimer";
import { parseMarkdown } from "../src/programs/notepad/markdown";
import { createBoard, isWin, reveal, toggleFlag } from "../src/programs/minesweeper/game";
import { monthGrid } from "../src/programs/calendar/calendar";

describe("safeEvaluate", () => {
  it("evaluates arithmetic with the four operators and parentheses", () => {
    expect(safeEvaluate("2+3*4")).toBe(14);
    expect(safeEvaluate("(2+3)*4")).toBe(20);
    expect(safeEvaluate("10 / 4")).toBe(2.5);
    expect(safeEvaluate("7.5 - 0.5")).toBe(7);
  });

  it("rejects anything that is not a numeric expression", () => {
    expect(() => safeEvaluate("alert(1)")).toThrow("Invalid input");
    expect(() => safeEvaluate("2; process.exit()")).toThrow("Invalid input");
    expect(() => safeEvaluate("")).toThrow("Invalid input");
    expect(() => safeEvaluate("2 + a")).toThrow("Invalid input");
  });
});

describe("checkWinner", () => {
  const board = (cells: string): Board =>
    cells.split("").map((c) => (c === " " ? "" : c)) as Board;

  it("detects row, column, and diagonal wins", () => {
    expect(checkWinner(board("XXX" + "O O" + "   "))).toBe("X");
    expect(checkWinner(board("XOX" + "XOX" + "O X"))).toBe("X");
    expect(checkWinner(board("O  " + " O " + "  O"))).toBe("O");
    expect(checkWinner(board("  O" + " O " + "O  "))).toBe("O");
  });

  it("returns null for empty, in-progress, and drawn boards", () => {
    expect(checkWinner(board("         "))).toBeNull();
    expect(checkWinner(board("X O" + "   " + "   "))).toBeNull();
    expect(checkWinner(board("XOX" + "OXO" + "OXO"))).toBeNull();
  });
});

describe("formatTimerTime", () => {
  it("formats seconds as mm:ss with rounding up", () => {
    expect(formatTimerTime(0)).toBe("00:00");
    expect(formatTimerTime(59)).toBe("00:59");
    expect(formatTimerTime(60)).toBe("01:00");
    expect(formatTimerTime(300)).toBe("05:00");
    expect(formatTimerTime(59.2)).toBe("01:00");
    expect(formatTimerTime(3599)).toBe("59:59");
  });
});

describe("parseMarkdown", () => {
  it("renders headings, emphasis, and inline code", () => {
    const html = parseMarkdown("# Title\n\n**bold** *italic* `code`");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<code>code</code>");
  });

  it("escapes raw HTML so scripts cannot inject", () => {
    const html = parseMarkdown('<script>alert("x")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders lists, blockquotes, and fenced code", () => {
    const html = parseMarkdown("- a\n- b\n\n> quote\n\n```\nlet x = 1;\n```");
    expect(html).toContain("<ul><li>a</li><li>b</li></ul>");
    expect(html).toContain("<blockquote><p>quote</p></blockquote>");
    expect(html).toContain("<pre><code>let x = 1;</code></pre>");
  });

  it("renders ordered lists, links, and horizontal rules", () => {
    const html = parseMarkdown("1. one\n2. two\n\n[site](https://example.com)\n\n---");
    expect(html).toContain("<ol><li>one</li><li>two</li></ol>");
    expect(html).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">site</a>');
    expect(html).toContain("<hr>");
  });

  it("renders tables with alignment from the separator row", () => {
    const html = parseMarkdown("| L | R |\n|:---|---:|\n| a | b |");
    expect(html).toContain("<table>");
    expect(html).toContain('<th style="text-align:left">L</th>');
    expect(html).toContain('<td style="text-align:right">b</td>');
  });
});

describe("minesweeper", () => {
  const rand = () => 0.5; // deterministic shuffle

  it("places the requested number of mines and protects the first click", () => {
    const board = createBoard(9, 9, 10, 40, rand);
    expect(board.filter((c) => c.mine)).toHaveLength(10);
    // The safe cell and all 8 neighbors are mine-free.
    const safeZone = [30, 31, 32, 39, 40, 41, 48, 49, 50];
    for (const i of safeZone) expect(board[i].mine).toBe(false);
    expect(board).toHaveLength(81);
  });

  it("computes adjacency counts next to mines", () => {
    // 1x3 board with a safe corner: the mine can only sit at index 2.
    const board = createBoard(1, 3, 1, 0, rand);
    expect(board[2].mine).toBe(true);
    expect(board[0].adjacent).toBe(0);
    expect(board[1].adjacent).toBe(1);
  });

  it("reveals a zero-adjacent region by flood fill", () => {
    const board = createBoard(9, 9, 10, 40, rand);
    const next = reveal(board, 9, 40);
    const revealed = next.filter((c) => c.revealed);
    expect(revealed.length).toBeGreaterThan(8);
    // No revealed cell shows a mine (first click is protected and fill stops at numbers).
    expect(revealed.every((c) => !c.mine)).toBe(true);
  });

  it("flags unrevealed cells and ignores revealed ones", () => {
    let board = createBoard(9, 9, 10, 40, rand);
    board = toggleFlag(board, 0);
    expect(board[0].flagged).toBe(true);
    board[0].revealed = true;
    const next = toggleFlag(board, 0);
    expect(next[0].flagged).toBe(true); // revealed cells can't toggle
  });

  it("detects a win when every non-mine cell is revealed", () => {
    const board = createBoard(3, 3, 1, 4, rand).map((c) => ({
      ...c,
      revealed: !c.mine,
    }));
    expect(isWin(board)).toBe(true);
    board[0].revealed = false;
    // Cell 0 may be a mine — force a real non-mine cell hidden for a false result.
    const nonMine = board.findIndex((c) => !c.mine);
    board[nonMine].revealed = false;
    expect(isWin(board)).toBe(false);
  });
});

describe("monthGrid", () => {
  it("produces full 7-day weeks padded with zeros", () => {
    const weeks = monthGrid(2026, 8); // September 2026 starts on Tuesday
    for (const w of weeks) expect(w).toHaveLength(7);
    expect(weeks[0].slice(0, 2)).toEqual([0, 0]);
    expect(weeks[0][2]).toBe(1);
    expect(weeks.flat().filter((d) => d > 0)).toHaveLength(30);
  });

  it("handles month lengths and leap years", () => {
    expect(monthGrid(2024, 1).flat().filter(Boolean)).toHaveLength(29); // Feb 2024 leap
    expect(monthGrid(2026, 1).flat().filter(Boolean)).toHaveLength(28); // Feb 2026
    expect(monthGrid(2026, 0).flat().filter(Boolean)).toHaveLength(31); // Jan 2026
    // A month starting on Sunday has no leading padding.
    expect(monthGrid(2026, 2)[0][0]).toBe(1); // March 2026 starts Sunday
  });
});
