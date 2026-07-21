import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { StickyItem } from '@note-board-app/shared';

interface StickyNoteOverlayProps {
  sticky: StickyItem;
  onClose: () => void;
  onUpdate: (text: string) => void;
}

export function StickyNoteOverlay({ sticky, onClose, onUpdate }: StickyNoteOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    const end = sticky.text.length;
    textareaRef.current?.setSelectionRange(end, end);
  }, [sticky.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-[200]"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          background: sticky.color,
          width: "min(520px, 88vw)",
          height: "min(400px, 72vh)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 text-gray-700 hover:bg-black/30 transition-all z-10"
        >
          <X size={16} />
        </button>

        <textarea
          ref={textareaRef}
          value={sticky.text}
          onChange={(e) => onUpdate(e.target.value)}
          placeholder="Nhập ghi chú..."
          className="flex-1 w-full resize-none bg-transparent text-base outline-none leading-relaxed p-6 pt-10 text-gray-800"
          style={{ fontFamily: "inherit" }}
        />
      </div>
    </div>
  );
}
