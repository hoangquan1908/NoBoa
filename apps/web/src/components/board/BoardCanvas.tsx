import { useState, useRef, useCallback, useEffect } from "react";
import type { Board, BoardItem, BoardSnapshot, Connection, ImageItem, StickyItem, StrokePoint, TextItem, ToolMode } from "../../types/board.types";
import {
  uid, clamp, BOARD_SIZE,
  itemCenter, ptToPath, DRAW_COLORS, DRAW_WIDTHS, CONN_COLORS,
} from "../../lib/utils";
import { BoardToolbar } from "./BoardToolbar";
import { BoardItemView } from "./items/StickyNoteItem";
import { Minimap } from "./Minimap";
import { Lightbox } from "./Lightbox";
import { StickyNoteOverlay } from "./StickyNoteOverlay";

interface BoardCanvasProps {
  board: Board;
  onUpdate: (b: Board) => void;
}

export function BoardCanvas({ board, onUpdate }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef(board); boardRef.current = board;
  const snapRef = useRef(board.snapshot); snapRef.current = board.snapshot;
  const panRef = useRef({ x: 40, y: 40 });
  const scaleRef = useRef(1);

  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [scale, setScale] = useState(1);
  const [tool, setTool] = useState<ToolMode>("select");
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [drawWidth, setDrawWidth] = useState(DRAW_WIDTHS[0]);
  const [connColor, setConnColor] = useState(CONN_COLORS[0]);
  const [snapGrid, setSnapGrid] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ srcs: string[]; idx: number } | null>(null);
  const [expandedStickyId, setExpandedStickyId] = useState<string | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlVal, setUrlVal] = useState("");
  const [dragging, setDragging] = useState<{ ids: string[]; bx0: number; by0: number; initialPos: Record<string, {x: number, y: number}> } | null>(null);
  const [panning, setPanning] = useState<{ sx: number; sy: number; px0: number; py0: number } | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const spaceHeldRef = useRef(false);
  const [selecting, setSelecting] = useState<{ bx0: number; by0: number; bx1: number; by1: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; bx0: number; by0: number; w0: number; h0: number } | null>(null);
  const [curStroke, setCurStroke] = useState<StrokePoint[] | null>(null);
  const isDrawing = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const draggingRef = useRef(dragging); draggingRef.current = dragging;
  const panningRef = useRef(panning); panningRef.current = panning;
  const selectingRef = useRef(selecting); selectingRef.current = selecting;
  const resizingRef = useRef(resizing); resizingRef.current = resizing;
  const expandedStickyIdRef = useRef(expandedStickyId); expandedStickyIdRef.current = expandedStickyId;
  const lightboxRef = useRef(lightbox); lightboxRef.current = lightbox;

  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  useEffect(() => {
    setPan({ x: 40, y: 40 }); setScale(1);
    setSelectedIds(new Set()); setConnectFrom(null); setCurStroke(null); setEditingId(null); setExpandedStickyId(null);
    isDrawing.current = false;
  }, [board.id]);

  const toBoard = useCallback((cx: number, cy: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: (cx - rect.left - panRef.current.x) / scaleRef.current,
      y: (cy - rect.top - panRef.current.y) / scaleRef.current,
    };
  }, []);

  const pushSnap = useCallback((snap: BoardSnapshot) => {
    const b = boardRef.current;
    const hist = b.history.slice(0, b.historyIndex + 1);
    hist.push(snap);
    onUpdate({ ...b, snapshot: snap, history: hist, historyIndex: hist.length - 1 });
  }, [onUpdate]);

  const undo = useCallback(() => {
    const b = boardRef.current;
    if (b.historyIndex <= 0) return;
    const idx = b.historyIndex - 1;
    onUpdate({ ...b, snapshot: b.history[idx], historyIndex: idx });
  }, [onUpdate]);

  const redo = useCallback(() => {
    const b = boardRef.current;
    if (b.historyIndex >= b.history.length - 1) return;
    const idx = b.historyIndex + 1;
    onUpdate({ ...b, snapshot: b.history[idx], historyIndex: idx });
  }, [onUpdate]);

  const zoomBy = (f: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.width / 2, cy = rect.height / 2;
    setScale((s) => {
      const ns = clamp(s * f, 0.15, 4);
      setPan((p) => ({ x: cx - (cx - p.x) * (ns / s), y: cy - (cy - p.y) * (ns / s) }));
      return ns;
    });
  };

  const startPanAt = useCallback((clientX: number, clientY: number) => {
    setPanning({ sx: clientX, sy: clientY, px0: panRef.current.x, py0: panRef.current.y });
  }, []);

  // Capture middle-mouse / Space+drag before child layers (items, draw overlay, etc.)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMouseDown = (e: MouseEvent) => {
      if (expandedStickyIdRef.current || lightboxRef.current) return;
      if (e.button !== 1 && !(e.button === 0 && spaceHeldRef.current)) return;
      e.preventDefault();
      e.stopPropagation();
      startPanAt(e.clientX, e.clientY);
    };
    el.addEventListener("mousedown", onMouseDown, true);
    return () => el.removeEventListener("mousedown", onMouseDown, true);
  }, [startPanAt]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const rect = containerRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const f = e.deltaY < 0 ? 1.1 : 0.9;
      setScale((s) => {
        const ns = clamp(s * f, 0.15, 4);
        setPan((p) => ({ x: mx - (mx - p.x) * (ns / s), y: my - (my - p.y) * (ns / s) }));
        return ns;
      });
      return;
    }
    setPan((p) => ({
      x: p.x - (e.shiftKey ? e.deltaY : e.deltaX),
      y: p.y - (e.shiftKey ? 0 : e.deltaY),
    }));
  }, []);

  const handleBgDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || tool === "draw" || tool === "erase") return;
    if (tool === "text") {
      const bp = toBoard(e.clientX, e.clientY);
      const s = snapRef.current;
      const item: TextItem = {
        type: "text", id: uid(), x: bp.x - 40, y: bp.y - 10,
        text: "Văn bản", fontSize: 16, color: "#2A2318", locked: false,
        zIndex: s.items.length + 1,
      };
      const newId = item.id;
      pushSnap({ ...s, items: [...s.items, item] });
      setSelectedIds(new Set([newId]));
      setTimeout(() => setEditingId(newId), 50);
      return;
    }
    setSelectedIds(new Set());
    setConnectFrom(null);
    if (tool === "select") {
      const bp = toBoard(e.clientX, e.clientY);
      setSelecting({ bx0: bp.x, by0: bp.y, bx1: bp.x, by1: bp.y });
    }
  }, [tool, toBoard, pushSnap]);

  useEffect(() => {
    if (!panning) return;
    const onMove = (e: MouseEvent) => {
      setPan({ x: panning.px0 + e.clientX - panning.sx, y: panning.py0 + e.clientY - panning.sy });
    };
    const onUp = () => setPanning(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [panning]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (panningRef.current) return;
    const drag = draggingRef.current;
    if (drag) {
      const bp = toBoard(e.clientX, e.clientY);
      let dx = bp.x - drag.bx0, dy = bp.y - drag.by0;
      if (snapGrid) { dx = Math.round(dx / 20) * 20; dy = Math.round(dy / 20) * 20; }
      const b = boardRef.current;
      const newItems = snapRef.current.items.map((i) => {
        if (drag.ids.includes(i.id)) {
          return { ...i, x: drag.initialPos[i.id].x + dx, y: drag.initialPos[i.id].y + dy };
        }
        return i;
      });
      onUpdate({ ...b, snapshot: { ...snapRef.current, items: newItems } });
      return;
    }
    const sel = selectingRef.current;
    if (sel) {
      const bp = toBoard(e.clientX, e.clientY);
      setSelecting({ ...sel, bx1: bp.x, by1: bp.y });
      const minX = Math.min(sel.bx0, bp.x), maxX = Math.max(sel.bx0, bp.x);
      const minY = Math.min(sel.by0, bp.y), maxY = Math.max(sel.by0, bp.y);
      const freshlySelected = new Set<string>();
      snapRef.current.items.forEach(i => {
        const w = (i as any).w || ((i as any).type === "text" ? 100 : 200);
        const h = (i as any).h || ((i as any).type === "text" ? 40 : 150);
        if (i.x < maxX && i.x + w > minX && i.y < maxY && i.y + h > minY) freshlySelected.add(i.id);
      });
      setSelectedIds(freshlySelected);
      return;
    }
    const rsz = resizingRef.current;
    if (rsz) {
      const bp = toBoard(e.clientX, e.clientY);
      const nw = Math.max(80, rsz.w0 + bp.x - rsz.bx0), nh = Math.max(60, rsz.h0 + bp.y - rsz.by0);
      const b = boardRef.current;
      const newItems = snapRef.current.items.map((i) =>
        i.id === rsz.id && i.type !== "text" ? { ...i, w: nw, h: nh } : i
      );
      onUpdate({ ...b, snapshot: { ...snapRef.current, items: newItems } });
    }
  }, [toBoard, onUpdate, snapGrid]);

  const handleMouseUp = useCallback(() => {
    if (panningRef.current) return;
    if (selectingRef.current) { setSelecting(null); return; }
    if (draggingRef.current) { pushSnap(snapRef.current); setDragging(null); return; }
    if (resizingRef.current) { pushSnap(snapRef.current); setResizing(null); }
  }, [pushSnap]);

  const handleDrawDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    isDrawing.current = true;
    setCurStroke([toBoard(e.clientX, e.clientY)]);
  }, [toBoard]);

  const handleDrawMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing.current) return;
    setCurStroke((s) => s ? [...s, toBoard(e.clientX, e.clientY)] : [toBoard(e.clientX, e.clientY)]);
  }, [toBoard]);

  const handleDrawUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    setCurStroke((prev) => {
      if (prev && prev.length > 1) {
        const s = snapRef.current;
        if (tool === "draw") {
          pushSnap({ ...s, strokes: [...s.strokes, { id: uid(), points: prev, color: drawColor, width: drawWidth }] });
        } else {
          const eps = prev;
          const newStrokes = s.strokes.filter((st) =>
            !st.points.some((sp) => eps.some((ep) => Math.hypot(sp.x - ep.x, sp.y - ep.y) < 20))
          );
          pushSnap({ ...s, strokes: newStrokes });
        }
      }
      return null;
    });
  }, [tool, drawColor, drawWidth, pushSnap]);

  const handleItemDown = useCallback((e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const item = snapRef.current.items.find((i) => i.id === id);
    if (!item || item.locked) return;
    if (tool === "connect") {
      if (!connectFrom) { setConnectFrom(id); }
      else if (connectFrom !== id) {
        pushSnap({
          ...snapRef.current,
          connections: [...snapRef.current.connections, { id: uid(), fromId: connectFrom, toId: id, color: connColor }],
        });
        setConnectFrom(null);
      }
      return;
    }
    if (tool === "select") {
      let fresh = selectedIds;
      if (!selectedIds.has(id)) {
        fresh = new Set([id]);
        setSelectedIds(fresh);
      }
      const bp = toBoard(e.clientX, e.clientY);
      const posMap: Record<string, {x:number, y:number}> = {};
      snapRef.current.items.forEach(i => { if (fresh.has(i.id)) posMap[i.id] = {x:i.x, y:i.y}; });
      setDragging({ ids: Array.from(fresh), bx0: bp.x, by0: bp.y, initialPos: posMap });
    }
  }, [tool, connectFrom, connColor, pushSnap, toBoard]);

  const handleResizeDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = snapRef.current.items.find((i) => i.id === id);
    if (!item || item.type === "text") return;
    const bp = toBoard(e.clientX, e.clientY);
    setResizing({ id, bx0: bp.x, by0: bp.y, w0: (item as StickyItem | ImageItem).w, h0: (item as StickyItem | ImageItem).h });
  }, [toBoard]);

  const isTypingTarget = () => {
    const el = document.activeElement;
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement)?.isContentEditable;
  };

  // Keyboard shortcuts + Space-to-pan modifier
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !editingId && !expandedStickyId && !isTypingTarget()) {
        e.preventDefault();
        if (!spaceHeldRef.current) {
          spaceHeldRef.current = true;
          setSpaceHeld(true);
        }
        return;
      }
      if (editingId || expandedStickyId) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); return; }
      if (e.key === "Escape") { setConnectFrom(null); setSelectedIds(new Set()); }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.size > 0) {
        const s = snapRef.current;
        pushSnap({
          ...s,
          items: s.items.filter((i) => !selectedIds.has(i.id)),
          connections: s.connections.filter((c) => !selectedIds.has(c.fromId) && !selectedIds.has(c.toId)),
        });
        setSelectedIds(new Set());
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeldRef.current = false;
        setSpaceHeld(false);
        if (panningRef.current) setPanning(null);
      }
    };
    const onBlur = () => {
      spaceHeldRef.current = false;
      setSpaceHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [editingId, expandedStickyId, selectedIds, undo, redo, pushSnap]);

  // Center helper
  const center = () => {
    const rect = containerRef.current?.getBoundingClientRect() ?? { width: 800, height: 600 };
    return {
      x: (rect.width / 2 - panRef.current.x) / scaleRef.current,
      y: (rect.height / 2 - panRef.current.y) / scaleRef.current,
    };
  };

  const addSticky = () => {
    const { x, y } = center(); const s = snapRef.current;
    pushSnap({
      ...s, items: [...s.items, {
        type: "sticky", id: uid(), x: x - 105, y: y - 80,
        w: 210, h: 160, text: "Ghi chú mới", color: "#FEF08A",
        locked: false, zIndex: s.items.length + 1,
      } as StickyItem],
    });
  };

  const addImageFromSrc = (src: string) => {
    const { x, y } = center(); const s = snapRef.current;
    pushSnap({
      ...s, items: [...s.items, {
        type: "image", id: uid(), x: x - 125, y: y - 85,
        w: 250, h: 180, src, caption: "", locked: false, zIndex: s.items.length + 1,
      } as ImageItem],
    });
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;
      const file = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith("image/"))?.getAsFile();
      if (file) {
        const r = new FileReader();
        r.onload = (ev) => { if (typeof ev.target?.result === "string") addImageFromSrc(ev.target.result); };
        r.readAsDataURL(file);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  });

  const addText = () => {
    const { x, y } = center(); const s = snapRef.current; const id = uid();
    pushSnap({
      ...s, items: [...s.items, {
        type: "text", id, x: x - 50, y: y - 10,
        text: "Văn bản tự do", fontSize: 16, color: "#2A2318",
        locked: false, zIndex: s.items.length + 1,
      } as TextItem],
    });
    setSelectedIds(new Set([id]));
    setTimeout(() => setEditingId(id), 50);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => { if (ev.target?.result) addImageFromSrc(ev.target.result as string); };
    r.readAsDataURL(f);
    e.target.value = "";
  };

  const updateItem = (id: string, upd: Partial<BoardItem>) => {
    const s = snapRef.current;
    pushSnap({ ...s, items: s.items.map((i) => i.id === id ? { ...i, ...upd } as BoardItem : i) });
  };

  const deleteItem = (id: string) => {
    const s = snapRef.current;
    pushSnap({
      ...s,
      items: s.items.filter((i) => i.id !== id),
      connections: s.connections.filter((c) => c.fromId !== id && c.toId !== id),
    });
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const toggleLock = (id: string) => {
    const item = snapRef.current.items.find((i) => i.id === id);
    if (item) updateItem(id, { locked: !item.locked } as any);
  };

  const setToolSafe = (t: ToolMode) => {
    setTool(t); setConnectFrom(null); setCurStroke(null); isDrawing.current = false;
  };

  const snap = board.snapshot;
  const imgSrcs = snap.items.filter((i) => i.type === "image").map((i) => (i as ImageItem).src);
  const expandedSticky = expandedStickyId
    ? (snap.items.find((i) => i.id === expandedStickyId && i.type === "sticky") as StickyItem | undefined)
    : undefined;

  const connPath = (conn: Connection) => {
    const a = snap.items.find((i) => i.id === conn.fromId);
    const b_ = snap.items.find((i) => i.id === conn.toId);
    if (!a || !b_) return null;
    const f = itemCenter(a), t = itemCenter(b_);
    const cx = (f.x + t.x) / 2, cy = (f.y + t.y) / 2 - Math.hypot(t.x - f.x, t.y - f.y) * 0.18;
    return `M ${f.x.toFixed(1)} ${f.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${t.x.toFixed(1)} ${t.y.toFixed(1)}`;
  };

  const cW = containerRef.current?.offsetWidth ?? 800;
  const cH = containerRef.current?.offsetHeight ?? 600;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <BoardToolbar
        tool={tool} onToolChange={setToolSafe}
        drawColor={drawColor} onDrawColorChange={setDrawColor}
        drawWidth={drawWidth} onDrawWidthChange={setDrawWidth}
        connColor={connColor} onConnColorChange={setConnColor}
        connectFrom={connectFrom}
        snapGrid={snapGrid} onSnapGridToggle={() => setSnapGrid((s) => !s)}
        scale={scale}
        canUndo={board.historyIndex > 0}
        canRedo={board.historyIndex < board.history.length - 1}
        onUndo={undo} onRedo={redo}
        onZoomOut={() => zoomBy(0.8)}
        onZoomIn={() => zoomBy(1.25)}
        onZoomReset={() => { setScale(1); setPan({ x: 40, y: 40 }); }}
        onAddSticky={addSticky}
        onAddImageClick={() => fileRef.current?.click()}
        onAddText={addText}
        urlOpen={urlOpen} onUrlToggle={() => setUrlOpen((s) => !s)}
        urlVal={urlVal} onUrlValChange={setUrlVal}
        onUrlConfirm={() => { if (urlVal) { addImageFromSrc(urlVal); setUrlVal(""); setUrlOpen(false); } }}
        onClearStrokes={() => pushSnap({ ...snapRef.current, strokes: [] })}
      />

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none"
        style={{
          background: "#EAE4DA",
          cursor: panning ? "grabbing"
            : spaceHeld ? "grab"
            : dragging ? "grabbing"
            : tool === "connect" ? "crosshair"
            : "default",
        }}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { if (!panningRef.current) handleMouseUp(); }}
        onAuxClick={(e) => { if (e.button === 1) e.preventDefault(); }}
      >
        {/* Dot grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            <pattern
              id={`dg-${board.id}`}
              x={pan.x % (20 * scale)} y={pan.y % (20 * scale)}
              width={20 * scale} height={20 * scale}
              patternUnits="userSpaceOnUse"
            >
              <circle cx={1} cy={1} r={0.9} fill="rgba(80,55,30,0.18)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#dg-${board.id})`} />
        </svg>

        {/* Background click */}
        <div className="absolute inset-0" style={{ zIndex: 1 }} onMouseDown={handleBgDown} />

        {/* Transform container */}
        <div
          style={{
            position: "absolute", top: 0, left: 0,
            width: BOARD_SIZE, height: BOARD_SIZE,
            transform: `translate(${pan.x}px,${pan.y}px) scale(${scale})`,
            transformOrigin: "0 0", zIndex: 2,
            pointerEvents: "none",
          }}
        >
          {/* Hit layer: catches clicks on empty board space between items */}
          <div
            className="absolute inset-0"
            style={{ width: BOARD_SIZE, height: BOARD_SIZE, zIndex: 0, pointerEvents: "auto" }}
            onMouseDown={handleBgDown}
          />

          {selecting && (
            <div
              style={{
                position: "absolute",
                left: Math.min(selecting.bx0, selecting.bx1),
                top: Math.min(selecting.by0, selecting.by1),
                width: Math.abs(selecting.bx1 - selecting.bx0),
                height: Math.abs(selecting.by1 - selecting.by0),
                border: "1px dashed #3A82F6",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                zIndex: 9999, pointerEvents: "none"
              }}
            />
          )}

          {/* SVG: connections + strokes */}
          <svg style={{ position: "absolute", top: 0, left: 0, width: BOARD_SIZE, height: BOARD_SIZE, pointerEvents: "none", overflow: "visible" }}>
            <defs>
              {snap.connections.map((c) => (
                <marker key={`m-${c.id}`} id={`m-${c.id}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={c.color} />
                </marker>
              ))}
            </defs>
            {snap.connections.map((c) => {
              const p = connPath(c); if (!p) return null;
              return (
                <g key={c.id}>
                  <path d={p} stroke={c.color} strokeWidth={2} fill="none" markerEnd={`url(#m-${c.id})`} strokeLinecap="round" />
                  <path d={p} stroke="transparent" strokeWidth={14} fill="none"
                    style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    onClick={() => {
                      const s = snapRef.current;
                      pushSnap({ ...s, connections: s.connections.filter((cn) => cn.id !== c.id) });
                    }}
                  />
                </g>
              );
            })}
            {snap.strokes.map((s) => (
              <path key={s.id} d={ptToPath(s.points)} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {curStroke && curStroke.length > 1 && (
              <path
                d={ptToPath(curStroke)}
                stroke={tool === "erase" ? "rgba(150,120,90,0.45)" : drawColor}
                strokeWidth={tool === "erase" ? 22 : drawWidth}
                fill="none" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={tool === "erase" ? "5 3" : undefined}
              />
            )}
          </svg>

          {/* Items */}
          {snap.items.map((item) => (
            <BoardItemView
              key={item.id} item={item}
              selected={selectedIds.has(item.id)} editing={editingId === item.id}
              tool={tool} connectFrom={connectFrom}
              onMouseDown={handleItemDown} onResizeDown={handleResizeDown}
              onDoubleClick={(id) => tool === "select" && setEditingId(id)}
              onExpandSticky={(id) => setExpandedStickyId(id)}
              onBlurEdit={() => setEditingId(null)}
              onUpdate={updateItem} onDelete={deleteItem} onToggleLock={toggleLock}
              onOpenLightbox={(src) => {
                const idx = imgSrcs.indexOf(src);
                setLightbox({ srcs: imgSrcs, idx: Math.max(0, idx) });
              }}
            />
          ))}
        </div>

        {/* Draw / Erase overlay */}
        {(tool === "draw" || tool === "erase") && (
          <div
            className="absolute inset-0"
            style={{
              zIndex: 100,
              cursor: panning ? "grabbing" : spaceHeld ? "grab" : tool === "erase" ? "cell" : "crosshair",
            }}
            onMouseDown={handleDrawDown}
            onMouseMove={handleDrawMove}
            onMouseUp={handleDrawUp}
            onMouseLeave={handleDrawUp}
          />
        )}

        {/* Connect hint */}
        {tool === "connect" && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-amber-50/90 border border-amber-200 text-amber-700 text-xs rounded-full shadow-sm z-50 pointer-events-none">
            {connectFrom
              ? "Nhấp vào item thứ 2 để tạo kết nối · Esc để huỷ"
              : "Nhấp vào item đầu tiên để bắt đầu nối"}
          </div>
        )}

        {/* Minimap */}
        <Minimap snapshot={snap} pan={pan} scale={scale} containerWidth={cW} containerHeight={cH} />

        {/* Lightbox */}
        {lightbox && (
          <Lightbox
            srcs={lightbox.srcs}
            idx={lightbox.idx}
            onClose={() => setLightbox(null)}
            onPrev={() => setLightbox((l) => l ? { ...l, idx: (l.idx - 1 + l.srcs.length) % l.srcs.length } : null)}
            onNext={() => setLightbox((l) => l ? { ...l, idx: (l.idx + 1) % l.srcs.length } : null)}
          />
        )}

        {/* Sticky note expanded editor */}
        {expandedSticky && (
          <StickyNoteOverlay
            sticky={expandedSticky}
            onClose={() => setExpandedStickyId(null)}
            onUpdate={(text) => updateItem(expandedSticky.id, { text } as Partial<BoardItem>)}
          />
        )}
      </div>
    </div>
  );
}
