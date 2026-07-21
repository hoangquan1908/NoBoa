import { useCallback, useEffect, useRef } from 'react';
import { clamp } from '@note-board-app/shared';
import { useBoardStore } from '@note-board-app/shared';

/**
 * useBoardCanvas — manages pan/zoom viewport for BoardCanvas.
 *
 * Pure DOM interaction (wheel, middle-mouse, space+drag).
 * Syncs pan/scale up to boardStore so other consumers can read them.
 */
export function useBoardCanvas(containerRef: React.RefObject<HTMLDivElement>) {
  const setPan = useBoardStore((s) => s.setPan);
  const setScale = useBoardStore((s) => s.setScale);
  const editingId = useBoardStore((s) => s.editingId);
  const expandedStickyIdRef = useRef<string | null>(null);

  const panRef = useRef({ x: 40, y: 40 });
  const scaleRef = useRef(1);
  const panningRef = useRef<{ sx: number; sy: number; px0: number; py0: number } | null>(null);
  const spaceHeldRef = useRef(false);

  // Internal setters that keep refs + store in sync
  const _setPan = useCallback((p: { x: number; y: number }) => {
    panRef.current = p;
    setPan(p);
  }, [setPan]);

  const _setScale = useCallback((s: number) => {
    scaleRef.current = s;
    setScale(s);
  }, [setScale]);

  // Convert client coords → board coords
  const toBoard = useCallback((cx: number, cy: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: (cx - rect.left - panRef.current.x) / scaleRef.current,
      y: (cy - rect.top - panRef.current.y) / scaleRef.current,
    };
  }, [containerRef]);

  // Center of viewport in board coords
  const center = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect() ?? { width: 800, height: 600 };
    return {
      x: (rect.width / 2 - panRef.current.x) / scaleRef.current,
      y: (rect.height / 2 - panRef.current.y) / scaleRef.current,
    };
  }, [containerRef]);

  const startPanAt = useCallback((clientX: number, clientY: number) => {
    panningRef.current = { sx: clientX, sy: clientY, px0: panRef.current.x, py0: panRef.current.y };
  }, []);

  const zoomBy = useCallback((f: number, pivotX?: number, pivotY?: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = pivotX ?? rect.width / 2;
    const my = pivotY ?? rect.height / 2;
    const s = scaleRef.current;
    const ns = clamp(s * f, 0.15, 4);
    const np = {
      x: mx - (mx - panRef.current.x) * (ns / s),
      y: my - (my - panRef.current.y) * (ns / s),
    };
    _setPan(np);
    _setScale(ns);
  }, [containerRef, _setPan, _setScale]);

  const resetView = useCallback(() => {
    _setPan({ x: 40, y: 40 });
    _setScale(1);
  }, [_setPan, _setScale]);

  // Wheel handler (zoom + scroll)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const rect = containerRef.current!.getBoundingClientRect();
      zoomBy(e.deltaY < 0 ? 1.1 : 0.9, e.clientX - rect.left, e.clientY - rect.top);
      return;
    }
    const p = panRef.current;
    _setPan({
      x: p.x - (e.shiftKey ? e.deltaY : e.deltaX),
      y: p.y - (e.shiftKey ? 0 : e.deltaY),
    });
  }, [containerRef, zoomBy, _setPan]);

  // Middle-mouse / Space+drag panning (capture phase)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 1 && !(e.button === 0 && spaceHeldRef.current)) return;
      e.preventDefault();
      e.stopPropagation();
      startPanAt(e.clientX, e.clientY);
    };
    el.addEventListener('mousedown', onMouseDown, true);
    return () => el.removeEventListener('mousedown', onMouseDown, true);
  }, [containerRef, startPanAt]);

  // Global mousemove/up for active panning
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const p = panningRef.current;
      if (!p) return;
      _setPan({ x: p.px0 + e.clientX - p.sx, y: p.py0 + e.clientY - p.sy });
    };
    const onUp = () => { panningRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [_setPan]);

  // Space key for pan mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const el = document.activeElement;
      const isTyping = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement)?.isContentEditable;
      if (isTyping || editingId) return;
      e.preventDefault();
      spaceHeldRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      spaceHeldRef.current = false;
      panningRef.current = null;
    };
    const onBlur = () => { spaceHeldRef.current = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [editingId]);

  return {
    toBoard,
    center,
    startPanAt,
    zoomBy,
    resetView,
    handleWheel,
    panningRef,
    spaceHeldRef,
  };
}
