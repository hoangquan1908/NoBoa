import { BoardSnapshot, StickyItem } from "../../types/board.types";
import { MSX, MSY, ptToPath, clamp, MINIMAP_W, MINIMAP_H } from "../../lib/utils";

interface MinimapProps {
  snapshot: BoardSnapshot;
  pan: { x: number; y: number };
  scale: number;
  containerWidth: number;
  containerHeight: number;
}

export function Minimap({ snapshot, pan, scale, containerWidth, containerHeight }: MinimapProps) {
  const vp = {
    x: clamp((-pan.x / scale) * MSX, 0, MINIMAP_W - 4),
    y: clamp((-pan.y / scale) * MSY, 0, MINIMAP_H - 4),
    w: Math.min((containerWidth / scale) * MSX, MINIMAP_W),
    h: Math.min((containerHeight / scale) * MSY, MINIMAP_H),
  };

  return (
    <div
      className="absolute bottom-3 right-3 z-50 rounded-lg overflow-hidden border border-border/50 shadow-md"
      style={{ background: "rgba(234,228,218,0.85)", backdropFilter: "blur(6px)" }}
    >
      <svg width={MINIMAP_W} height={MINIMAP_H}>
        {snapshot.items.map((item) => {
          const x = item.x * MSX, y = item.y * MSY;
          if (item.type === "sticky")
            return (
              <rect
                key={item.id} x={x} y={y}
                width={(item as StickyItem).w * MSX}
                height={(item as StickyItem).h * MSY}
                fill={(item as StickyItem).color} opacity={0.85} rx={1}
              />
            );
          if (item.type === "image")
            return (
              <rect
                key={item.id} x={x} y={y}
                width={(item as any).w * MSX}
                height={(item as any).h * MSY}
                fill="#94A3B8" opacity={0.6} rx={1}
              />
            );
          return <circle key={item.id} cx={x} cy={y} r={2} fill="#C07A38" />;
        })}
        {snapshot.strokes.map(
          (s) =>
            s.points.length > 1 && (
              <path
                key={s.id}
                d={ptToPath(s.points.map((p) => ({ x: p.x * MSX, y: p.y * MSY })))}
                stroke={s.color} strokeWidth={0.8} fill="none" opacity={0.5}
              />
            )
        )}
        <rect
          x={vp.x} y={vp.y}
          width={Math.min(vp.w, MINIMAP_W - vp.x)}
          height={Math.min(vp.h, MINIMAP_H - vp.y)}
          fill="rgba(58,107,72,0.1)" stroke="#3A6B48" strokeWidth={1} rx={1}
        />
      </svg>
    </div>
  );
}
