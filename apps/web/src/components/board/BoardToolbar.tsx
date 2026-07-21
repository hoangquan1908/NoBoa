import {
  Move, Link2, Pen, Eraser, Type,
  StickyNote, Image as ImageIcon, Link2 as LinkIcon,
  Grid, Undo2, Redo2, ZoomOut, ZoomIn,
} from "lucide-react";
import type { ToolMode } from '@note-board-app/shared';
import { DRAW_COLORS, DRAW_WIDTHS, CONN_COLORS } from '@note-board-app/shared';

interface BoardToolbarProps {
  tool: ToolMode;
  onToolChange: (t: ToolMode) => void;
  drawColor: string;
  onDrawColorChange: (c: string) => void;
  drawWidth: number;
  onDrawWidthChange: (w: number) => void;
  connColor: string;
  onConnColorChange: (c: string) => void;
  connectFrom: string | null;
  snapGrid: boolean;
  onSnapGridToggle: () => void;
  scale: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onZoomReset: () => void;
  onAddSticky: () => void;
  onAddImageClick: () => void;
  onAddText: () => void;
  urlOpen: boolean;
  onUrlToggle: () => void;
  urlVal: string;
  onUrlValChange: (v: string) => void;
  onUrlConfirm: () => void;
  onClearStrokes: () => void;
}

export function BoardToolbar({
  tool, onToolChange,
  drawColor, onDrawColorChange,
  drawWidth, onDrawWidthChange,
  connColor, onConnColorChange,
  connectFrom,
  snapGrid, onSnapGridToggle,
  scale, canUndo, canRedo,
  onUndo, onRedo, onZoomOut, onZoomIn, onZoomReset,
  onAddSticky, onAddImageClick, onAddText,
  urlOpen, onUrlToggle, urlVal, onUrlValChange, onUrlConfirm,
  onClearStrokes,
}: BoardToolbarProps) {
  const tools = [
    { t: "select" as ToolMode, icon: <Move size={14} />, label: "Select" },
    { t: "connect" as ToolMode, icon: <Link2 size={14} />, label: "Connect" },
    { t: "draw" as ToolMode, icon: <Pen size={14} />, label: "Draw" },
    { t: "erase" as ToolMode, icon: <Eraser size={14} />, label: "Erase" },
    { t: "text" as ToolMode, icon: <Type size={14} />, label: "Text" },
  ] as const;

  return (
    <div className="flex items-center flex-wrap gap-1 px-3 py-2 border-b border-border bg-card/70 backdrop-blur-sm flex-shrink-0">
      {/* Tool selector */}
      <div className="flex items-center gap-px bg-muted rounded-lg p-0.5">
        {tools.map(({ t, icon, label }) => (
          <button
            key={t}
            title={label}
            onClick={() => onToolChange(t)}
            className={`p-1.5 rounded-md transition-all ${
              tool === t ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {icon}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-border" />

      {/* Add items */}
      <button
        onClick={onAddSticky}
        className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
      >
        <StickyNote size={13} /> Note
      </button>
      <button
        onClick={onAddImageClick}
        className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
      >
        <ImageIcon size={13} /> Image
      </button>
      <button
        onClick={onUrlToggle}
        className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-md transition-all ${
          urlOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <LinkIcon size={13} /> URL
      </button>
      <button
        onClick={onAddText}
        className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
      >
        <Type size={13} /> Text
      </button>

      {urlOpen && (
        <div className="flex items-center gap-1">
          <input
            type="url"
            value={urlVal}
            autoFocus
            onChange={(e) => onUrlValChange(e.target.value)}
            placeholder="https://..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && urlVal) onUrlConfirm();
              if (e.key === "Escape") onUrlToggle();
            }}
            className="text-xs border border-border rounded-md px-2 py-1 w-48 bg-background outline-none focus:border-primary/50"
          />
          <button
            onClick={() => { if (urlVal) onUrlConfirm(); }}
            className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-md"
          >
            OK
          </button>
        </div>
      )}

      <div className="w-px h-5 bg-border" />

      {/* Draw colors */}
      {tool === "draw" && (
        <>
          <div className="flex items-center gap-1">
            {DRAW_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onDrawColorChange(c)}
                style={{
                  width: 16, height: 16, background: c, borderRadius: "50%", flexShrink: 0,
                  border: drawColor === c ? "2.5px solid #2A2318" : "1.5px solid rgba(0,0,0,0.1)",
                }}
                className="hover:scale-110 transition-transform"
              />
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            {DRAW_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => onDrawWidthChange(w)}
                className={`flex items-center justify-center w-6 h-6 rounded transition-all ${
                  drawWidth === w ? "bg-muted" : "hover:bg-muted/60"
                }`}
              >
                <div style={{ width: 14, height: w, background: drawColor, borderRadius: 2 }} />
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-border" />
        </>
      )}

      {/* Connect colors */}
      {tool === "connect" && (
        <>
          <div className="flex items-center gap-1">
            {CONN_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onConnColorChange(c)}
                style={{
                  width: 16, height: 16, background: c, borderRadius: "50%", flexShrink: 0,
                  border: connColor === c ? "2.5px solid #2A2318" : "1.5px solid rgba(0,0,0,0.1)",
                }}
                className="hover:scale-110 transition-transform"
              />
            ))}
          </div>
          {connectFrom && (
            <span className="text-xs text-amber-600 font-medium animate-pulse">
              Select second item...
            </span>
          )}
          <div className="w-px h-5 bg-border" />
        </>
      )}

      <div className="flex-1 min-w-0" />

      <button
        onClick={onSnapGridToggle}
        title="Snap to grid"
        className={`p-1.5 rounded-md transition-all ${
          snapGrid ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Grid size={14} />
      </button>
      <button
        onClick={onClearStrokes}
        title="Clear all strokes"
        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-all"
      >
        <Eraser size={14} />
      </button>

      <div className="w-px h-5 bg-border" />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
      >
        <Undo2 size={14} />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo"
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
      >
        <Redo2 size={14} />
      </button>

      <div className="w-px h-5 bg-border" />

      <button
        onClick={onZoomOut}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-all"
      >
        <ZoomOut size={14} />
      </button>
      <span className="text-xs text-muted-foreground tabular-nums w-9 text-center">
        {Math.round(scale * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-all"
      >
        <ZoomIn size={14} />
      </button>
      <button
        onClick={onZoomReset}
        className="text-xs px-1.5 py-0.5 rounded text-muted-foreground hover:bg-muted transition-all"
      >
        1:1
      </button>
    </div>
  );
}
