export interface MineCell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

export const ROWS = 9;
export const COLS = 9;
export const MINES = 10;

function neighbors(index: number, rows: number, cols: number): number[] {
  const r = Math.floor(index / cols);
  const c = index % cols;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
    }
  }
  return out;
}

/** First-click-safe board: `safeIndex` and its neighbors never contain mines. */
export function createBoard(
  rows: number,
  cols: number,
  mines: number,
  safeIndex: number,
  rand: () => number = Math.random,
): MineCell[] {
  const board: MineCell[] = Array.from({ length: rows * cols }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
  }));
  const excluded = new Set([safeIndex, ...neighbors(safeIndex, rows, cols)]);
  const candidates: number[] = [];
  for (let i = 0; i < board.length; i++) if (!excluded.has(i)) candidates.push(i);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (const idx of candidates.slice(0, mines)) board[idx].mine = true;
  for (let i = 0; i < board.length; i++) {
    board[i].adjacent = neighbors(i, rows, cols).filter((n) => board[n].mine).length;
  }
  return board;
}

export function reveal(board: MineCell[], cols: number, index: number): MineCell[] {
  const next = board.map((c) => ({ ...c }));
  const rows = Math.floor(next.length / cols);
  const queue = [index];
  while (queue.length) {
    const i = queue.pop()!;
    const cell = next[i];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adjacent === 0 && !cell.mine) queue.push(...neighbors(i, rows, cols));
  }
  return next;
}

export function toggleFlag(board: MineCell[], index: number): MineCell[] {
  const next = board.map((c) => ({ ...c }));
  const cell = next[index];
  if (!cell.revealed) cell.flagged = !cell.flagged;
  return next;
}

/** All non-mine cells revealed. */
export function isWin(board: MineCell[]): boolean {
  return board.every((c) => c.revealed || c.mine);
}
