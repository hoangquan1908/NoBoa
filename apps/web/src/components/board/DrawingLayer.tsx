import type { Stroke, StrokePoint } from '../../types/board.types';
import { ptToPath } from '../../lib/utils';

interface DrawingLayerProps {
  /** Committed strokes from board snapshot */
  strokes: Stroke[];
  /** Live stroke being drawn right now (not yet committed) */
  curStroke: StrokePoint[] | null;
  /** Whether the current tool is erase (changes preview style) */
  isErasing: boolean;
  /** Color for live preview */
  drawColor: string;
  /** Width for live preview */
  drawWidth: number;
  /** BOARD_SIZE for SVG dimensions */
  boardSize: number;
}

/**
 * DrawingLayer — renders all committed strokes plus the live preview stroke.
 * Pure SVG presentational component, no state.
 */
export function DrawingLayer({
  strokes,
  curStroke,
  isErasing,
  drawColor,
  drawWidth,
  boardSize,
}: DrawingLayerProps) {
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: boardSize,
        height: boardSize,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {strokes.map((s) => (
        <path
          key={s.id}
          d={ptToPath(s.points)}
          stroke={s.color}
          strokeWidth={s.width}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {curStroke && curStroke.length > 1 && (
        <path
          d={ptToPath(curStroke)}
          stroke={isErasing ? 'rgba(150,120,90,0.45)' : drawColor}
          strokeWidth={isErasing ? 22 : drawWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={isErasing ? '5 3' : undefined}
        />
      )}
    </svg>
  );
}
