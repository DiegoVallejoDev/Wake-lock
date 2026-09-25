/**
 * Small dependency-free Markdown renderer for the Notepad preview.
 * Produces HTML meant to be sanitized before it is injected into the DOM.
 */

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function parseMarkdown(text: string): string {
  if (!text) return "";
  const escaped = escapeHtml(text);
  const lines = escaped.split(/\r?\n/);
  const blocks: string[] = [];
  let i = 0;

  function isTableSeparator(s: string): boolean {
    const cells = s.trim().split("|").slice(1, -1);
    return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell.trim()));
  }

  function splitTableCells(s: string): string[] {
    return s
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
  }

  function tableAlign(sep: string): string[] {
    return splitTableCells(sep).map((cell) => {
      const c = cell.trim();
      if (c.startsWith(":") && c.endsWith(":")) return "center";
      if (c.endsWith(":")) return "right";
      return "left";
    });
  }

  function inline(s: string): string {
    return s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/~~(.+?)~~/g, "<del>$1</del>")
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
      );
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "```") {
      i++;
      const code: string[] = [];
      while (i < lines.length && lines[i].trim() !== "```") {
        code.push(lines[i]);
        i++;
      }
      blocks.push("<pre><code>" + code.join("\n") + "</code></pre>");
      i++;
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const n = h[1].length;
      blocks.push(`<h${n}>${inline(h[2])}</h${n}>`);
      i++;
      continue;
    }

    if (/^(---|\*\*\*|___)\s*$/.test(line.trim())) {
      blocks.push("<hr>");
      i++;
      continue;
    }

    if (/^&gt;\s?(.*)$/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^&gt;\s?(.*)$/.test(lines[i])) {
        const m = lines[i].match(/^&gt;\s?(.*)$/);
        quoteLines.push(m![1]);
        i++;
      }
      const content = quoteLines.map(inline).join("<br>");
      blocks.push(`<blockquote><p>${content}</p></blockquote>`);
      continue;
    }

    const trimmed = line.trim();
    if (
      trimmed.startsWith("|") &&
      trimmed.endsWith("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        lines[i].trim().endsWith("|")
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }

      const headerCells = splitTableCells(tableLines[0]);
      const align = tableAlign(tableLines[1]);
      const thead =
        "<thead><tr>" +
        headerCells
          .map(
            (cell, idx) =>
              `<th style="text-align:${align[idx] || "left"}">${inline(cell)}</th>`,
          )
          .join("") +
        "</tr></thead>";

      const tbody: string[] = [];
      for (let r = 2; r < tableLines.length; r++) {
        const cells = splitTableCells(tableLines[r]);
        tbody.push(
          "<tr>" +
            headerCells
              .map(
                (_, idx) =>
                  `<td style="text-align:${align[idx] || "left"}">${inline(cells[idx] || "")}</td>`,
              )
              .join("") +
            "</tr>",
        );
      }

      blocks.push("<table>" + thead + "<tbody>" + tbody.join("") + "</tbody></table>");
      continue;
    }

    if (/^[-*]\s+(.*)$/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+(.*)$/.test(lines[i])) {
        const m = lines[i].match(/^[-*]\s+(.*)$/);
        items.push(inline(m![1]));
        i++;
      }
      blocks.push("<ul>" + items.map((item) => `<li>${item}</li>`).join("") + "</ul>");
      continue;
    }

    if (/^\d+\.\s+(.*)$/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+(.*)$/.test(lines[i])) {
        const m = lines[i].match(/^\d+\.\s+(.*)$/);
        items.push(inline(m![1]));
        i++;
      }
      blocks.push("<ol>" + items.map((item) => `<li>${item}</li>`).join("") + "</ol>");
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    blocks.push("<p>" + inline(line) + "</p>");
    i++;
  }

  return blocks.join("");
}
