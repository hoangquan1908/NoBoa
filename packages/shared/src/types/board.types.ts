// ================================================================
// BOARD TYPES
// ================================================================
export type ToolMode = "select" | "connect" | "draw" | "erase" | "text";

export interface StrokePoint {
  x: number;
  y: number;
}

export interface StickyItem {
  type: "sticky";
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
  locked: boolean;
  zIndex: number;
}

export interface ImageItem {
  type: "image";
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
  caption: string;
  locked: boolean;
  zIndex: number;
}

export interface TextItem {
  type: "text";
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  locked: boolean;
  zIndex: number;
}

export type BoardItem = StickyItem | ImageItem | TextItem;

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  color: string;
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string;
  width: number;
}

export interface BoardSnapshot {
  items: BoardItem[];
  connections: Connection[];
  strokes: Stroke[];
}

export interface Board {
  id: string;
  name: string;
  snapshot: BoardSnapshot;
  history: BoardSnapshot[];
  historyIndex: number;
  viewport_x?: number;
  viewport_y?: number;
  viewport_zoom?: number;
}
