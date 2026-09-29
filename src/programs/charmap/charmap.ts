export interface CharGroup {
  name: string;
  chars: string[];
}

/** A Windows-95-charmap-style palette: glyphs worth pasting into documents. */
export const CHARMAP_GROUPS: CharGroup[] = [
  {
    name: "Common",
    chars: [
      "©", "®", "™", "§", "¶", "°", "·", "…", "—", "–", "«", "»",
      "“", "”", "‘", "’", "¡", "¿", "†", "‡", "‰", "‹", "›", "€",
    ],
  },
  {
    name: "Math",
    chars: [
      "±", "×", "÷", "≠", "≈", "≤", "≥", "∞", "∑", "∏", "√", "∫",
      "∆", "∇", "∂", "π", "µ", "Ω", "α", "β", "γ", "δ", "λ", "θ",
    ],
  },
  {
    name: "Currency",
    chars: ["$", "€", "£", "¥", "¢", "₿", "₽", "₹", "₩", "₪", "฿", "ƒ"],
  },
  {
    name: "Arrows",
    chars: [
      "←", "→", "↑", "↓", "↔", "↕", "↖", "↗", "↘", "↙",
      "⇐", "⇒", "⇑", "⇓", "⇔", "↵", "↩", "↪", "⇄", "⇅",
    ],
  },
  {
    name: "Boxes & Blocks",
    chars: [
      "─", "│", "┌", "┐", "└", "┘", "├", "┤", "┬", "┴", "┼",
      "═", "║", "╔", "╗", "╚", "╝", "╠", "╣", "╦", "╩", "╬",
      "█", "▓", "▒", "░", "■", "□", "▪", "▫", "◘", "◙", "▄", "▀",
    ],
  },
  {
    name: "Misc",
    chars: [
      "★", "☆", "☐", "☑", "☒", "☎", "☀", "☁", "☂", "☃", "☕", "☘",
      "☺", "☻", "☹", "♠", "♣", "♥", "♦", "♪", "♫", "♩", "♬", "⚠",
      "⚑", "⚐", "✂", "✈", "✉", "✓", "✗", "✚", "☯", "☮", "⚽", "⏰",
    ],
  },
];

/** "A" → "U+0041"; takes the first code point (astral-safe). */
export function codePointLabel(char: string): string {
  const cp = char.codePointAt(0);
  if (cp === undefined) return "";
  return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}
