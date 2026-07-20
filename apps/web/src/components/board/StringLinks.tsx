import type { Connection, BoardItem, StickyItem } from '../../types/board.types';
import { itemCenter } from '../../lib/utils';

interface StringLinksProps {
  connections: Connection[];
  items: BoardItem[];
  onDelete: (id: string) => void;
}

/**
 * StringLinks — renders SVG curved arrows between connected board items.
 * Pure presentational component, receives props from BoardCanvas.
 */
export function StringLinks({ connections, items, onDelete }: StringLinksProps) {
  const connPath = (conn: Connection): string | null => {
    const a = items.find((i) => i.id === conn.fromId);
    const b = items.find((i) => i.id === conn.toId);
    if (!a || !b) return null;
    const f = itemCenter(a), t = itemCenter(b);
    const cx = (f.x + t.x) / 2;
    const cy = (f.y + t.y) / 2 - Math.hypot(t.x - f.x, t.y - f.y) * 0.18;
    return `M ${f.x.toFixed(1)} ${f.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${t.x.toFixed(1)} ${t.y.toFixed(1)}`;
  };

  if (connections.length === 0) return null;

  return (
    <>
      <defs>
        {connections.map((c) => (
          <marker
            key={`m-${c.id}`}
            id={`m-${c.id}`}
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={c.color} />
          </marker>
        ))}
      </defs>
      {connections.map((c) => {
        const p = connPath(c);
        if (!p) return null;
        return (
          <g key={c.id}>
            <path
              d={p}
              stroke={c.color}
              strokeWidth={2}
              fill="none"
              markerEnd={`url(#m-${c.id})`}
              strokeLinecap="round"
            />
            {/* Wide invisible hit target for clicking */}
            <path
              d={p}
              stroke="transparent"
              strokeWidth={14}
              fill="none"
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={() => onDelete(c.id)}
            />
          </g>
        );
      })}
    </>
  );
}
