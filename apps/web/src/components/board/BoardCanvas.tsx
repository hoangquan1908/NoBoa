import { useRef, useCallback, useEffect, useState } from 'react';
import type { ImageItem, StickyItem } from '../../types/board.types';
import { BOARD_SIZE } from '../../lib/utils';
import { useBoardStore } from '../../store/boardStore';
import { useBoardCanvas } from '../../hooks/useBoardCanvas';
import { useDrag } from '../../hooks/useDrag';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { BoardToolbar } from './BoardToolbar';
import { BoardItemView } from './items/StickyNoteItem';
import { DrawingLayer } from './DrawingLayer';
import { StringLinks } from './StringLinks';
import { Minimap } from './Minimap';
import { Lightbox } from './Lightbox';
import { StickyNoteOverlay } from './StickyNoteOverlay';
import type { Board } from '../../types/board.types';

interface BoardCanvasProps {
  board: Board;
  onUpdate: (b: Board) => void;
}

export function BoardCanvas({ board, onUpdate }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Store ──────────────────────────────────────────────────────
  const store = useBoardStore;
  const {
    loadBoard, loadBoardFromCache, pushSnap,
    tool, setTool,
    drawColor, setDrawColor,
    drawWidth, setDrawWidth,
    connColor, setConnColor,
    snapGrid, setSnapGrid,
    selectedIds, setSelectedIds,
    connectFrom, setConnectFrom,
    editingId, setEditingId,
    curStroke, beginStroke, extendStroke, commitStroke,
    clearStrokes,
    addSticky, addImage, addText,
    updateItem, deleteItem, toggleLock,
    deleteConnection,
    undo, redo,
    pan, scale,
  } = useBoardStore();

  // Local UI-only state (not business logic)
  const [lightbox, setLightbox] = useState<{ srcs: string[]; idx: number } | null>(null);
  const [expandedStickyId, setExpandedStickyId] = useState<string | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlVal, setUrlVal] = useState('');

  // ── Load board into store on mount / id change ─────────────────
  useEffect(() => {
    loadBoard(board);
    // Ưu tiên bản đã lưu trong IndexedDB nếu có (ví dụ thay đổi từ
    // phiên trước chưa kịp đồng bộ lên Supabase) — chạy sau khi state
    // "sạch" đã set, nên nếu cache có dữ liệu mới hơn sẽ ghi đè.
    loadBoardFromCache(board.id);
  }, [board.id]); // eslint-disable-line

  // ── Propagate store changes back to parent (for notesStore) ───
  const boardInStore = useBoardStore((s) => s.board);
  const prevBoardIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!boardInStore) return;
    if (prevBoardIdRef.current !== boardInStore.id) {
      prevBoardIdRef.current = boardInStore.id;
      return; // skip first emit on initial load
    }
    onUpdate(boardInStore);
  }, [boardInStore]); // eslint-disable-line

  // ── Hooks ──────────────────────────────────────────────────────
  const { toBoard, center, zoomBy, resetView, handleWheel, panningRef, spaceHeldRef } =
    useBoardCanvas(containerRef);
  const { draggingRef, selectingRef, handleItemDown, handleResizeDown, handleBgDown, handleMouseMove, handleMouseUp } =
    useDrag(toBoard);
  useUndoRedo();

  // ── Drawing overlay handlers ───────────────────────────────────
  const handleDrawDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    beginStroke(toBoard(e.clientX, e.clientY));
  }, [beginStroke, toBoard]);

  const handleDrawMove = useCallback((e: React.MouseEvent) => {
    extendStroke(toBoard(e.clientX, e.clientY));
  }, [extendStroke, toBoard]);

  const handleDrawUp = useCallback(() => {
    commitStroke();
  }, [commitStroke]);

  // ── Background click (text tool / deselect) ───────────────────
  const handleCanvasBgDown = useCallback((e: React.MouseEvent) => {
    if (tool === 'text') {
      const bp = toBoard(e.clientX, e.clientY);
      const id = addText(bp.x, bp.y);
      setSelectedIds(new Set([id]));
      setTimeout(() => setEditingId(id), 50);
      return;
    }
    handleBgDown(e);
  }, [tool, toBoard, addText, setSelectedIds, setEditingId, handleBgDown]);

  // ── Add image helpers ──────────────────────────────────────────
  const addImageFromSrc = useCallback((src: string) => {
    const c = center();
    addImage(src, c.x, c.y);
  }, [addImage, center]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => { if (ev.target?.result) addImageFromSrc(ev.target.result as string); };
    r.readAsDataURL(f);
    e.target.value = '';
  };

  // ── Clipboard paste ────────────────────────────────────────────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      const file = Array.from(e.clipboardData?.items || [])
        .find((i) => i.type.startsWith('image/'))?.getAsFile();
      if (file) {
        const r = new FileReader();
        r.onload = (ev) => { if (typeof ev.target?.result === 'string') addImageFromSrc(ev.target.result); };
        r.readAsDataURL(file);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  });

  // ── Derived ────────────────────────────────────────────────────
  const snap = boardInStore?.snapshot ?? board.snapshot;
  const imgSrcs = snap.items.filter((i) => i.type === 'image').map((i) => (i as ImageItem).src);
  const expandedSticky = expandedStickyId
    ? (snap.items.find((i) => i.id === expandedStickyId && i.type === 'sticky') as StickyItem | undefined)
    : undefined;
  const cW = containerRef.current?.offsetWidth ?? 800;
  const cH = containerRef.current?.offsetHeight ?? 600;
  const canUndo = (boardInStore?.historyIndex ?? 0) > 0;
  const canRedo = (boardInStore?.historyIndex ?? 0) < (boardInStore?.history.length ?? 1) - 1;
  const isPanning = !!panningRef.current;
  const spaceHeld = spaceHeldRef.current;
  const isDragging = !!draggingRef.current;
  const isSelecting = selectingRef.current;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <BoardToolbar
        tool={tool} onToolChange={setTool}
        drawColor={drawColor} onDrawColorChange={setDrawColor}
        drawWidth={drawWidth} onDrawWidthChange={setDrawWidth}
        connColor={connColor} onConnColorChange={setConnColor}
        connectFrom={connectFrom}
        snapGrid={snapGrid} onSnapGridToggle={() => setSnapGrid(!snapGrid)}
        scale={scale}
        canUndo={canUndo} canRedo={canRedo}
        onUndo={undo} onRedo={redo}
        onZoomOut={() => zoomBy(0.8)}
        onZoomIn={() => zoomBy(1.25)}
        onZoomReset={resetView}
        onAddSticky={() => { const c = center(); addSticky(c.x, c.y); }}
        onAddImageClick={() => fileRef.current?.click()}
        onAddText={() => { const c = center(); const id = addText(c.x, c.y); setSelectedIds(new Set([id])); setTimeout(() => setEditingId(id), 50); }}
        urlOpen={urlOpen} onUrlToggle={() => setUrlOpen((s) => !s)}
        urlVal={urlVal} onUrlValChange={setUrlVal}
        onUrlConfirm={() => { if (urlVal) { addImageFromSrc(urlVal); setUrlVal(''); setUrlOpen(false); } }}
        onClearStrokes={clearStrokes}
      />

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none"
        style={{
          background: '#EAE4DA',
          cursor: isPanning ? 'grabbing'
            : spaceHeld ? 'grab'
            : isDragging ? 'grabbing'
            : tool === 'connect' ? 'crosshair'
            : 'default',
        }}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { if (!isPanning) handleMouseUp(); }}
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

        {/* Background click catcher */}
        <div className="absolute inset-0" style={{ zIndex: 1 }} onMouseDown={handleCanvasBgDown} />

        {/* Transform container */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0,
            width: BOARD_SIZE, height: BOARD_SIZE,
            transform: `translate(${pan.x}px,${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0', zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          {/* Hit layer for empty board space */}
          <div
            className="absolute inset-0"
            style={{ width: BOARD_SIZE, height: BOARD_SIZE, zIndex: 0, pointerEvents: 'auto' }}
            onMouseDown={handleCanvasBgDown}
          />

          {/* Marquee selection rect */}
          {isSelecting && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(isSelecting.bx0, isSelecting.bx1),
                top: Math.min(isSelecting.by0, isSelecting.by1),
                width: Math.abs(isSelecting.bx1 - isSelecting.bx0),
                height: Math.abs(isSelecting.by1 - isSelecting.by0),
                border: '1px dashed #3A82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                zIndex: 9999, pointerEvents: 'none',
              }}
            />
          )}

          {/* SVG layer: connections + strokes */}
          <svg
            style={{
              position: 'absolute', top: 0, left: 0,
              width: BOARD_SIZE, height: BOARD_SIZE,
              pointerEvents: 'none', overflow: 'visible',
            }}
          >
            <StringLinks
              connections={snap.connections}
              items={snap.items}
              onDelete={deleteConnection}
            />
            <DrawingLayer
              strokes={snap.strokes}
              curStroke={curStroke}
              isErasing={tool === 'erase'}
              drawColor={drawColor}
              drawWidth={drawWidth}
              boardSize={BOARD_SIZE}
            />
          </svg>

          {/* Items */}
          {snap.items.map((item) => (
            <BoardItemView
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              editing={editingId === item.id}
              tool={tool}
              connectFrom={connectFrom}
              onMouseDown={handleItemDown}
              onResizeDown={handleResizeDown}
              onDoubleClick={(id) => tool === 'select' && setEditingId(id)}
              onExpandSticky={(id) => setExpandedStickyId(id)}
              onBlurEdit={() => setEditingId(null)}
              onUpdate={updateItem}
              onDelete={deleteItem}
              onToggleLock={toggleLock}
              onOpenLightbox={(src) => {
                const idx = imgSrcs.indexOf(src);
                setLightbox({ srcs: imgSrcs, idx: Math.max(0, idx) });
              }}
            />
          ))}
        </div>

        {/* Draw / Erase overlay */}
        {(tool === 'draw' || tool === 'erase') && (
          <div
            className="absolute inset-0"
            style={{
              zIndex: 100,
              cursor: isPanning ? 'grabbing' : spaceHeld ? 'grab' : tool === 'erase' ? 'cell' : 'crosshair',
            }}
            onMouseDown={handleDrawDown}
            onMouseMove={handleDrawMove}
            onMouseUp={handleDrawUp}
            onMouseLeave={handleDrawUp}
          />
        )}

        {/* Connect hint */}
        {tool === 'connect' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-amber-50/90 border border-amber-200 text-amber-700 text-xs rounded-full shadow-sm z-50 pointer-events-none">
            {connectFrom
              ? 'Nhấp vào item thứ 2 để tạo kết nối · Esc để huỷ'
              : 'Nhấp vào item đầu tiên để bắt đầu nối'}
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

        {/* Sticky expanded editor */}
        {expandedSticky && (
          <StickyNoteOverlay
            sticky={expandedSticky}
            onClose={() => setExpandedStickyId(null)}
            onUpdate={(text) => updateItem(expandedSticky.id, { text } as any)}
          />
        )}
      </div>
    </div>
  );
}
