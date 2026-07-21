import type { Board } from '../types/board.types';

export interface SyncQueueRecord {
  id: string;
  boardId: string;
  action: 'upsert_board';
  payload: Board;
  synced: boolean;
  createdAt: number;
}

export type SyncQueueStoredRecord = SyncQueueRecord & { syncedStr: '0' | '1' };

// ================================================================
// BOARD CRUD (local cache)
// ================================================================
export declare function getBoard(id: string): Promise<Board | undefined>;
export declare function saveBoard(board: Board): Promise<void>;
export declare function deleteBoard(id: string): Promise<void>;
export declare function getAllBoards(): Promise<Board[]>;

// ================================================================
// SYNC QUEUE
// ================================================================
export declare function enqueueSync(boardId: string, payload: Board): Promise<void>;
export declare function getPendingSync(): Promise<SyncQueueRecord[]>;
export declare function markSynced(recordId: string): Promise<void>;
export declare function clearSyncedRecords(): Promise<void>;
