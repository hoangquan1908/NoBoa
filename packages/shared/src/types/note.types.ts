// ================================================================
// NOTE TYPES
// ================================================================
// NOTE: board.types is imported via type-only to avoid circular deps
import type { Board } from "./board.types";

export type { Board };

export interface Task {
  id: string;
  text: string;
  done: boolean;
  position?: number;
  created_at?: string;
}

export interface Note {
  id: string;
  title: string;
  tasks: Task[];
  boards: Board[];
  activeBoardId: string;
  created_at?: string;
  updated_at?: string;
}
