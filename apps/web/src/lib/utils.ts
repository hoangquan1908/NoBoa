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
  const n1 = makeNote("Web Project Plan");
  n1.tasks = [
    { id: uid(), text: "Design homepage wireframe", done: true },
    { id: uid(), text: "Write user auth API", done: true },
    { id: uid(), text: "Integrate Stripe payment", done: false },
    { id: uid(), text: "Test on mobile devices", done: false },
    { id: uid(), text: "Deploy to production server", done: false },
  ] as Task[];
  const sa = uid(), sb = uid(), ic = uid();
  n1.boards[0].snapshot = {
    items: [
      {
        type: "sticky", id: sa, x: 80, y: 60, w: 210, h: 150,
        text: "Prioritize checkout feature\nbefore Q2!",
        color: "#FEF08A", locked: false, zIndex: 1,
      },
      {
        type: "sticky", id: sb, x: 360, y: 80, w: 200, h: 120,
        text: "Review design with UX team before coding",
        color: "#BBF7D0", locked: false, zIndex: 2,
      },
      {
        type: "image", id: ic, x: 100, y: 270, w: 250, h: 170,
        src: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=280&fit=crop&auto=format",
        caption: "Architecture diagram", locked: false, zIndex: 3,
      },
      {
        type: "text", id: uid(), x: 380, y: 240,
        text: "Deadline: 30/06", fontSize: 15, color: "#C07A38",
        locked: false, zIndex: 4,
      },
    ] as any,
    connections: [{ id: uid(), fromId: sa, toId: sb, color: "#6B7280" }],
    strokes: [],
  };
  n1.boards[0].history = [n1.boards[0].snapshot];

  const n2 = makeNote("Personal Blog Ideas");
  n2.tasks = [
    { id: uid(), text: "Choose a suitable domain", done: true },
    { id: uid(), text: "Write first post about React hooks", done: false },
    { id: uid(), text: "Set up Google Analytics", done: false },
    { id: uid(), text: "Design banner for blog", done: false },
  ] as Task[];
  const b2 = makeBoard("Page Layout");
  n2.boards.push(b2);

  const n3 = makeNote("End of Month Shopping");
  n3.tasks = [
    { id: uid(), text: "Buy groceries for the week", done: false },
    { id: uid(), text: "Fix bedroom broken AC", done: true },
    { id: uid(), text: "Buy birthday gift for friend", done: false },
  ] as Task[];

  return [n1, n2, n3];
}
