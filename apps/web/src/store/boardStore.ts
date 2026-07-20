import { create } from 'zustand';
import type {
  Board, BoardItem, BoardSnapshot,
  Connection, ImageItem, StickyItem, StrokePoint, Stroke, TextItem, ToolMode,
} from '../types/board.types';
import {
  uid, clamp, DRAW_COLORS, DRAW_WIDTHS, CONN_COLORS,
  emptySnap, itemCenter,
} from '../lib/utils';

// ================================================================
// TYPES
// ================================================================
export interface BoardState {
  // Data
  board: Board | null;

  // Viewport (managed by useBoardCanvas hook, mirrored here for reads)
  pan: { x: number; y: number };
  scale: number;

  // Tool state
  tool: ToolMode;
  drawColor: string;
  drawWidth: number;
  connColor: string;
  snapGrid: boolean;

  // Interaction state
  selectedIds: Set<string>;
  connectFrom: string | null;
  editingId: string | null;

  // Drawing
  curStroke: StrokePoint[] | null;

  // Actions — board lifecycle
  loadBoard: (board: Board) => void;
  resetBoard: () => void;

  // Actions — history
  pushSnap: (snap: BoardSnapshot) => void;
  undo: () => void;
  redo: () => void;

  // Actions — items
  addSticky: (cx: number, cy: number) => void;
  addImage: (src: string, cx: number, cy: number) => void;
  addText: (cx: number, cy: number) => string; // returns id for editing
  updateItem: (id: string, upd: Partial<BoardItem>) => void;
  deleteItem: (id: string) => void;
  toggleLock: (id: string) => void;
  deleteSelected: () => void;

  // Actions — connections
  startConnect: (fromId: string) => void;
  finishConnect: (toId: string) => void;
  deleteConnection: (id: string) => void;

  // Actions — drawing
  beginStroke: (pt: StrokePoint) => void;
  extendStroke: (pt: StrokePoint) => void;
  commitStroke: () => void;
  eraseAt: (pts: StrokePoint[]) => void;
  clearStrokes: () => void;

  // Actions — tool + selection
  setTool: (t: ToolMode) => void;
  setSelectedIds: (ids: Set<string>) => void;
  setEditingId: (id: string | null) => void;
  setConnectFrom: (id: string | null) => void;

  // Actions — viewport sync from hook
  setPan: (pan: { x: number; y: number }) => void;
  setScale: (scale: number) => void;

  // Actions — draw style
  setDrawColor: (c: string) => void;
  setDrawWidth: (w: number) => void;
  setConnColor: (c: string) => void;
  setSnapGrid: (v: boolean) => void;
}

// ================================================================
// HELPERS (pure, no DOM)
// ================================================================
function applyHistory(board: Board, snap: BoardSnapshot): Board {
  const hist = board.history.slice(0, board.historyIndex + 1);
  hist.push(snap);
  return { ...board, snapshot: snap, history: hist, historyIndex: hist.length - 1 };
}

function makeItemAt<T extends BoardItem>(base: T, cx: number, cy: number): T {
  return { ...base, x: cx - ('w' in base ? (base as unknown as StickyItem).w / 2 : 50), y: cy - ('h' in base ? (base as unknown as StickyItem).h / 2 : 10) };
}

// ================================================================
// STORE
// ================================================================
export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,
  pan: { x: 40, y: 40 },
  scale: 1,
  tool: 'select',
  drawColor: DRAW_COLORS[0],
  drawWidth: DRAW_WIDTHS[0],
  connColor: CONN_COLORS[0],
  snapGrid: false,
  selectedIds: new Set(),
  connectFrom: null,
  editingId: null,
  curStroke: null,

  // ── Board lifecycle ───────────────────────────────────────────
  loadBoard: (board) => {
    set({
      board,
      pan: { x: 40, y: 40 },
      scale: 1,
      selectedIds: new Set(),
      connectFrom: null,
      editingId: null,
      curStroke: null,
      tool: 'select',
    });
  },

  resetBoard: () => set({ board: null }),

  // ── History ───────────────────────────────────────────────────
  pushSnap: (snap) => {
    const b = get().board;
    if (!b) return;
    set({ board: applyHistory(b, snap) });
  },

  undo: () => {
    const b = get().board;
    if (!b || b.historyIndex <= 0) return;
    const idx = b.historyIndex - 1;
    set({ board: { ...b, snapshot: b.history[idx], historyIndex: idx } });
  },

  redo: () => {
    const b = get().board;
    if (!b || b.historyIndex >= b.history.length - 1) return;
    const idx = b.historyIndex + 1;
    set({ board: { ...b, snapshot: b.history[idx], historyIndex: idx } });
  },

  // ── Items ─────────────────────────────────────────────────────
  addSticky: (cx, cy) => {
    const b = get().board;
    if (!b) return;
    const s = b.snapshot;
    const item: StickyItem = {
      type: 'sticky', id: uid(), x: cx - 105, y: cy - 80,
      w: 210, h: 160, text: 'Ghi chú mới', color: '#FEF08A',
      locked: false, zIndex: s.items.length + 1,
    };
    get().pushSnap({ ...s, items: [...s.items, item] });
  },

  addImage: (src, cx, cy) => {
    const b = get().board;
    if (!b) return;
    const s = b.snapshot;
    const item: ImageItem = {
      type: 'image', id: uid(), x: cx - 125, y: cy - 85,
      w: 250, h: 180, src, caption: '', locked: false, zIndex: s.items.length + 1,
    };
    get().pushSnap({ ...s, items: [...s.items, item] });
  },

  addText: (cx, cy) => {
    const b = get().board;
    if (!b) return '';
    const s = b.snapshot;
    const id = uid();
    const item: TextItem = {
      type: 'text', id, x: cx - 50, y: cy - 10,
      text: 'Văn bản tự do', fontSize: 16, color: '#2A2318',
      locked: false, zIndex: s.items.length + 1,
    };
    get().pushSnap({ ...s, items: [...s.items, item] });
    return id;
  },

  updateItem: (id, upd) => {
    const b = get().board;
    if (!b) return;
    const s = b.snapshot;
    get().pushSnap({
      ...s,
      items: s.items.map((i) => i.id === id ? { ...i, ...upd } as BoardItem : i),
    });
  },

  deleteItem: (id) => {
    const b = get().board;
    if (!b) return;
    const s = b.snapshot;
    get().pushSnap({
      ...s,
      items: s.items.filter((i) => i.id !== id),
      connections: s.connections.filter((c) => c.fromId !== id && c.toId !== id),
    });
    set((st) => {
      const next = new Set(st.selectedIds);
      next.delete(id);
      return { selectedIds: next };
    });
  },

  toggleLock: (id) => {
    const b = get().board;
    if (!b) return;
    const item = b.snapshot.items.find((i) => i.id === id);
    if (item) get().updateItem(id, { locked: !item.locked } as Partial<BoardItem>);
  },

  deleteSelected: () => {
    const b = get().board;
    const { selectedIds } = get();
    if (!b || selectedIds.size === 0) return;
    const s = b.snapshot;
    get().pushSnap({
      ...s,
      items: s.items.filter((i) => !selectedIds.has(i.id)),
      connections: s.connections.filter(
        (c) => !selectedIds.has(c.fromId) && !selectedIds.has(c.toId)
      ),
    });
    set({ selectedIds: new Set() });
  },

  // ── Connections ───────────────────────────────────────────────
  startConnect: (fromId) => set({ connectFrom: fromId }),

  finishConnect: (toId) => {
    const b = get().board;
    const { connectFrom, connColor } = get();
    if (!b || !connectFrom || connectFrom === toId) return;
    const s = b.snapshot;
    get().pushSnap({
      ...s,
      connections: [
        ...s.connections,
        { id: uid(), fromId: connectFrom, toId, color: connColor } as Connection,
      ],
    });
    set({ connectFrom: null });
  },

  deleteConnection: (id) => {
    const b = get().board;
    if (!b) return;
    const s = b.snapshot;
    get().pushSnap({
      ...s,
      connections: s.connections.filter((c) => c.id !== id),
    });
  },

  // ── Drawing ───────────────────────────────────────────────────
  beginStroke: (pt) => set({ curStroke: [pt] }),

  extendStroke: (pt) => {
    const { curStroke } = get();
    if (!curStroke) return;
    set({ curStroke: [...curStroke, pt] });
  },

  commitStroke: () => {
    const { curStroke, board, tool, drawColor, drawWidth } = get();
    if (!board || !curStroke || curStroke.length < 2) {
      set({ curStroke: null });
      return;
    }
    const s = board.snapshot;
    if (tool === 'draw') {
      const stroke: Stroke = { id: uid(), points: curStroke, color: drawColor, width: drawWidth };
      get().pushSnap({ ...s, strokes: [...s.strokes, stroke] });
    } else if (tool === 'erase') {
      const eps = curStroke;
      const newStrokes = s.strokes.filter((st) =>
        !st.points.some((sp) => eps.some((ep) => Math.hypot(sp.x - ep.x, sp.y - ep.y) < 20))
      );
      get().pushSnap({ ...s, strokes: newStrokes });
    }
    set({ curStroke: null });
  },

  eraseAt: (pts) => {
    const b = get().board;
    if (!b) return;
    const s = b.snapshot;
    const newStrokes = s.strokes.filter((st) =>
      !st.points.some((sp) => pts.some((ep) => Math.hypot(sp.x - ep.x, sp.y - ep.y) < 20))
    );
    get().pushSnap({ ...s, strokes: newStrokes });
  },

  clearStrokes: () => {
    const b = get().board;
    if (!b) return;
    get().pushSnap({ ...b.snapshot, strokes: [] });
  },

  // ── Tool + Selection ─────────────────────────────────────────
  setTool: (t) => set({ tool: t, connectFrom: null, curStroke: null }),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  setEditingId: (id) => set({ editingId: id }),
  setConnectFrom: (id) => set({ connectFrom: id }),

  // ── Viewport sync ─────────────────────────────────────────────
  setPan: (pan) => set({ pan }),
  setScale: (scale) => set({ scale }),

  // ── Draw style ────────────────────────────────────────────────
  setDrawColor: (c) => set({ drawColor: c }),
  setDrawWidth: (w) => set({ drawWidth: w }),
  setConnColor: (c) => set({ connColor: c }),
  setSnapGrid: (v) => set({ snapGrid: v }),
}));
