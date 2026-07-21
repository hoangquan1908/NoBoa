import { useCallback, useRef } from 'react';
import type { BoardItem, ImageItem, StickyItem } from '@note-board-app/shared';
import { useBoardStore } from '@note-board-app/shared';

/**
 * useDrag — manages item drag, marquee-select, and resize gestures.
 *
 * Reads snapshot + selectedIds from boardStore.
 * Calls back into store to commit final positions via pushSnap.
 */
export function useDrag(
  toBoard: (cx: number, cy: number) => { x: number; y: number }
) {
  const store = useBoardStore;

  const draggingRef = useRef<{
    ids: string[];
    bx0: number;
    by0: number;
    initialPos: Record<string, { x: number; y: number }>;
  } | null>(null);

  const selectingRef = useRef<{
    bx0: number; by0: number; bx1: number; by1: number;
  } | null>(null);

  const resizingRef = useRef<{
    id: string; bx0: number; by0: number; w0: number; h0: number;
  } | null>(null);

  // ── onItemMouseDown ─────────────────────────────────────────────
  const handleItemDown = useCallback((e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const { board, tool, selectedIds, connectFrom, connColor, startConnect, finishConnect, pushSnap, setSelectedIds } = store.getState();
    if (!board) return;
    const item = board.snapshot.items.find((i) => i.id === id);
    if (!item || item.locked) return;

    if (tool === 'connect') {
      if (!connectFrom) {
        startConnect(id);
      } else if (connectFrom !== id) {
        finishConnect(id);
      }
      return;
    }

    if (tool === 'select') {
      let fresh = selectedIds;
      if (!selectedIds.has(id)) {
        fresh = new Set([id]);
        setSelectedIds(fresh);
      }
      const bp = toBoard(e.clientX, e.clientY);
      const posMap: Record<string, { x: number; y: number }> = {};
      board.snapshot.items.forEach((i) => { if (fresh.has(i.id)) posMap[i.id] = { x: i.x, y: i.y }; });
      draggingRef.current = { ids: Array.from(fresh), bx0: bp.x, by0: bp.y, initialPos: posMap };
    }
  }, [toBoard]);

  // ── onResizeMouseDown ───────────────────────────────────────────
  const handleResizeDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { board } = store.getState();
    if (!board) return;
    const item = board.snapshot.items.find((i) => i.id === id);
    if (!item || item.type === 'text') return;
    const bp = toBoard(e.clientX, e.clientY);
    resizingRef.current = {
      id,
      bx0: bp.x, by0: bp.y,
      w0: (item as StickyItem | ImageItem).w,
      h0: (item as StickyItem | ImageItem).h,
    };
  }, [toBoard]);

  // ── onBgMouseDown — start marquee selection ──────────────────
  const handleBgDown = useCallback((e: React.MouseEvent) => {
    const { tool } = store.getState();
    if (e.button !== 0 || tool === 'draw' || tool === 'erase') return;
    if (tool === 'select') {
      const bp = toBoard(e.clientX, e.clientY);
      selectingRef.current = { bx0: bp.x, by0: bp.y, bx1: bp.x, by1: bp.y };
      store.getState().setSelectedIds(new Set());
      store.getState().setConnectFrom(null);
    }
  }, [toBoard]);

  // ── onMouseMove ─────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { board, snapGrid, setSelectedIds } = store.getState();
    if (!board) return;

    const drag = draggingRef.current;
    if (drag) {
      const bp = toBoard(e.clientX, e.clientY);
      let dx = bp.x - drag.bx0, dy = bp.y - drag.by0;
      if (snapGrid) { dx = Math.round(dx / 20) * 20; dy = Math.round(dy / 20) * 20; }
      const newItems: BoardItem[] = board.snapshot.items.map((i) => {
        if (drag.ids.includes(i.id)) {
          return { ...i, x: drag.initialPos[i.id].x + dx, y: drag.initialPos[i.id].y + dy };
        }
        return i;
      });
      // Use direct store update for drag (not pushSnap, to avoid history spam)
      useBoardStore.setState((st) => ({
        board: st.board ? { ...st.board, snapshot: { ...st.board.snapshot, items: newItems } } : null,
      }));
      return;
    }

    const sel = selectingRef.current;
    if (sel) {
      const bp = toBoard(e.clientX, e.clientY);
      selectingRef.current = { ...sel, bx1: bp.x, by1: bp.y };
      const minX = Math.min(sel.bx0, bp.x), maxX = Math.max(sel.bx0, bp.x);
      const minY = Math.min(sel.by0, bp.y), maxY = Math.max(sel.by0, bp.y);
      const freshSelected = new Set<string>();
      board.snapshot.items.forEach((i) => {
        const w = (i as StickyItem).w ?? ((i.type === 'text') ? 100 : 200);
        const h = (i as StickyItem).h ?? ((i.type === 'text') ? 40 : 150);
        if (i.x < maxX && i.x + w > minX && i.y < maxY && i.y + h > minY) freshSelected.add(i.id);
      });
      setSelectedIds(freshSelected);
      return;
    }

    const rsz = resizingRef.current;
    if (rsz) {
      const bp = toBoard(e.clientX, e.clientY);
      const nw = Math.max(80, rsz.w0 + bp.x - rsz.bx0);
      const nh = Math.max(60, rsz.h0 + bp.y - rsz.by0);
      useBoardStore.setState((st) => ({
        board: st.board
          ? {
              ...st.board,
              snapshot: {
                ...st.board.snapshot,
                items: st.board.snapshot.items.map((i) =>
                  i.id === rsz.id && i.type !== 'text' ? { ...i, w: nw, h: nh } : i
                ),
              },
            }
          : null,
      }));
    }
  }, [toBoard]);

  // ── onMouseUp ───────────────────────────────────────────────────
  const handleMouseUp = useCallback(() => {
    const { board, pushSnap } = store.getState();

    if (selectingRef.current) {
      selectingRef.current = null;
      return;
    }
    if (draggingRef.current) {
      if (board) pushSnap(board.snapshot); // commit drag to history
      draggingRef.current = null;
      return;
    }
    if (resizingRef.current) {
      if (board) pushSnap(board.snapshot); // commit resize to history
      resizingRef.current = null;
    }
  }, []);

  return {
    draggingRef,
    selectingRef,
    resizingRef,
    handleItemDown,
    handleResizeDown,
    handleBgDown,
    handleMouseMove,
    handleMouseUp,
  };
}
