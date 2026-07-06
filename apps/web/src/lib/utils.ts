import { Board, BoardSnapshot } from "../types/board.types";
import { Note, Task } from "../types/note.types";

// ================================================================
// HELPERS
// ================================================================
export const uid = () => Math.random().toString(36).slice(2, 10);
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const BOARD_SIZE = 5000;
export const MINIMAP_W = 160;
export const MINIMAP_H = 100;
export const MSX = MINIMAP_W / BOARD_SIZE;
export const MSY = MINIMAP_H / BOARD_SIZE;

export const STICKY_COLORS = [
  "#FEF08A", "#BBF7D0", "#FBCFE8", "#FED7AA",
  "#BAE6FD", "#DDD6FE", "#FECACA", "#F1F5F9",
];
export const DRAW_COLORS = [
  "#2A2318", "#EF4444", "#3B82F6", "#22C55E",
  "#F59E0B", "#8B5CF6", "#EC4899",
];
export const CONN_COLORS = [
  "#6B7280", "#EF4444", "#22C55E", "#3B82F6", "#F59E0B", "#8B5CF6",
];
export const DRAW_WIDTHS = [2, 4, 8];

// ================================================================
// FACTORY FUNCTIONS
// ================================================================
export function emptySnap(): BoardSnapshot {
  return { items: [], connections: [], strokes: [] };
}

export function makeBoard(name: string): Board {
  const s = emptySnap();
  return { id: uid(), name, snapshot: s, history: [s], historyIndex: 0 };
}

export function makeNote(title: string): Note {
  const b = makeBoard("Main Board");
  return { id: uid(), title, tasks: [], boards: [b], activeBoardId: b.id };
}

// ================================================================
// GEOMETRY HELPERS
// ================================================================
import type { BoardItem, StickyItem, StrokePoint } from "../types/board.types";

export function itemCenter(item: BoardItem) {
  if (item.type === "text") return { x: item.x + 50, y: item.y + 12 };
  return {
    x: item.x + (item as StickyItem).w / 2,
    y: item.y + (item as StickyItem).h / 2,
  };
}

export function ptToPath(pts: StrokePoint[]) {
  if (pts.length < 2) return "";
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

// ================================================================
// INITIAL DATA
// ================================================================
export function initNotes(): Note[] {
  return [];
}
