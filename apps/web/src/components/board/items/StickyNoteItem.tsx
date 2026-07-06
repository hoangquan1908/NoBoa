import { useState } from "react";
import { X, Lock, Unlock } from "lucide-react";
import type {
  BoardItem, StickyItem, ImageItem, TextItem, ToolMode,
} from "../../../types/board.types";
import { STICKY_COLORS } from "../../../lib/utils";

interface BoardItemViewProps {
  item: BoardItem;
  selected: boolean;
  editing: boolean;
  tool: ToolMode;
  connectFrom: string | null;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onResizeDown: (e: React.MouseEvent, id: string) => void;
  onDoubleClick: (id: string) => void;
  onExpandSticky: (id: string) => void;
  onBlurEdit: () => void;
  onUpdate: (id: string, upd: Partial<BoardItem>) => void;
  onDelete: (id: string) => void;
  onToggleLock: (id: string) => void;
  onOpenLightbox: (src: string) => void;
}

export function BoardItemView({
  item, selected, editing, tool, connectFrom,
  onMouseDown, onResizeDown, onDoubleClick, onExpandSticky, onBlurEdit,
  onUpdate, onDelete, onToggleLock, onOpenLightbox,
}: BoardItemViewProps) {
  const [showPicker, setShowPicker] = useState(false);

  const isConnectTarget = tool === "connect" && connectFrom && connectFrom !== item.id;
  const selRing = selected
    ? "ring-2 ring-primary ring-offset-1"
    : isConnectTarget
    ? "ring-2 ring-amber-400 cursor-crosshair"
    : "";

  const style: React.CSSProperties = {
    position: "absolute",
    left: item.x,
    top: item.y,
    zIndex: selected ? item.zIndex + 1000 : item.zIndex,
    pointerEvents: "auto",
    cursor: item.locked
      ? "default"
      : tool === "select" || tool === "connect"
      ? "grab"
      : "default",
  };

  // ── STICKY NOTE ──
  if (item.type === "sticky") {
    const sticky = item as StickyItem;
    return (
      <div
        style={{ ...style, width: sticky.w, height: sticky.h, background: sticky.color }}
        className={`rounded shadow-md flex flex-col overflow-visible select-none ${selRing}`}
        onMouseDown={(e) => onMouseDown(e, item.id)}
        onDoubleClick={() => !item.locked && onExpandSticky(item.id)}
      >
        {/* Controls */}
        <div className="absolute top-0 right-0 left-0 flex items-center justify-end gap-0.5 px-1.5 pt-1.5 opacity-0 hover:opacity-100 transition-opacity z-10">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setShowPicker((s) => !s)}
            className="p-0.5 rounded hover:bg-black/10 transition-all"
          >
            <div
              style={{
                width: 10, height: 10, borderRadius: "50%",
                background: sticky.color, border: "1.5px solid rgba(0,0,0,0.3)",
              }}
            />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onToggleLock(item.id)}
            className="p-0.5 rounded hover:bg-black/10 transition-all text-gray-600"
          >
            {item.locked ? <Lock size={9} /> : <Unlock size={9} />}
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onDelete(item.id)}
            className="p-0.5 rounded hover:bg-red-200 transition-all text-gray-600"
          >
            <X size={9} />
          </button>
        </div>

        {/* Color picker */}
        {showPicker && (
          <div
            className="absolute top-7 right-0 z-50 bg-white/95 backdrop-blur rounded-lg shadow-lg p-2 border border-border grid grid-cols-4 gap-1"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {STICKY_COLORS.map((c: string) => (
              <button
                key={c}
                onClick={() => {
                  onUpdate(item.id, { color: c } as any);
                  setShowPicker(false);
                }}
                style={{
                  width: 22, height: 22, background: c, borderRadius: 4,
                  border: sticky.color === c ? "2.5px solid #2A2318" : "1.5px solid rgba(0,0,0,0.1)",
                }}
                className="hover:scale-110 transition-transform"
              />
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-2.5 pt-6 overflow-hidden">
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-gray-800">
            {sticky.text || <span className="text-gray-500/70 italic">Nhấp đúp để chỉnh sửa...</span>}
          </p>
        </div>

        {/* Resize handle */}
        {selected && !item.locked && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
            onMouseDown={(e) => onResizeDown(e, item.id)}
            style={{ background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.25) 50%)" }}
          />
        )}
      </div>
    );
  }

  // ── IMAGE ──
  if (item.type === "image") {
    const img = item as ImageItem;
    return (
      <div
        style={{ ...style, width: img.w, height: img.h }}
        className={`rounded-md overflow-hidden shadow-md bg-slate-200 flex flex-col select-none ${selRing}`}
        onMouseDown={(e) => onMouseDown(e, item.id)}
      >
        <div
          className="flex-1 relative overflow-hidden"
          onDoubleClick={() => onOpenLightbox(img.src)}
        >
          <img
            src={img.src}
            alt={img.caption || "Board image"}
            className="w-full h-full object-cover"
            draggable={false}
          />
          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onToggleLock(item.id)}
              className="p-0.5 rounded bg-white/80 hover:bg-white text-gray-700 shadow-sm transition-all"
            >
              {item.locked ? <Lock size={9} /> : <Unlock size={9} />}
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onDelete(item.id)}
              className="p-0.5 rounded bg-white/80 hover:bg-red-50 text-gray-700 hover:text-red-500 shadow-sm transition-all"
            >
              <X size={9} />
            </button>
          </div>
        </div>
        {img.caption && (
          <div className="px-2 py-1 text-xs text-gray-600 bg-white border-t border-border truncate">
            {img.caption}
          </div>
        )}
        {selected && !item.locked && (
          <div
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-10"
            onMouseDown={(e) => onResizeDown(e, item.id)}
            style={{ background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.3) 50%)" }}
          />
        )}
      </div>
    );
  }

  // ── TEXT ──
  if (item.type === "text") {
    const txt = item as TextItem;
    return (
      <div
        style={{ ...style, fontSize: txt.fontSize, color: txt.color, minWidth: 80 }}
        className={`select-none rounded px-1 ${selRing}`}
        onMouseDown={(e) => onMouseDown(e, item.id)}
        onDoubleClick={() => !item.locked && onDoubleClick(item.id)}
      >
        {editing ? (
          <input
            autoFocus
            value={txt.text}
            onChange={(e) => onUpdate(item.id, { text: e.target.value } as any)}
            onBlur={onBlurEdit}
            onMouseDown={(e) => e.stopPropagation()}
            className="bg-transparent outline-none border-b border-primary/40"
            style={{ fontSize: txt.fontSize, color: txt.color, fontFamily: "inherit", minWidth: 80 }}
          />
        ) : (
          <span className="font-semibold whitespace-nowrap">{txt.text}</span>
        )}
        {selected && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onDelete(item.id)}
            className="absolute -top-5 right-0 p-0.5 rounded bg-white border border-border text-gray-600 hover:text-red-500 shadow-sm"
          >
            <X size={9} />
          </button>
        )}
      </div>
    );
  }

  return null;
}
