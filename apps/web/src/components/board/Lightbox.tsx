import { X, ArrowLeft, ArrowRight } from "lucide-react";

interface LightboxProps {
  srcs: string[];
  idx: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function Lightbox({ srcs, idx, onClose, onPrev, onNext }: LightboxProps) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-[200]"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={srcs[idx]}
          alt="Xem ảnh phóng to"
          className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
        />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
        >
          <X size={16} />
        </button>
        {srcs.length > 1 && (
          <>
            <button
              onClick={onPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={onNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all"
            >
              <ArrowRight size={18} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-xs">
              {idx + 1} / {srcs.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
