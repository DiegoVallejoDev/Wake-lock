import { describe, expect, it } from "vitest";
import { safeEvaluate } from "../src/programs/calculator/safeEvaluate";
import { checkWinner, type Board } from "../src/programs/tic-tac-toe/game";
import { formatTimerTime } from "../src/programs/timer/useTimer";
import { parseMarkdown } from "../src/programs/notepad/markdown";

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
