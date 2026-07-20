import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Board } from '../types/board.types';

// ================================================================
// SCHEMA
// ================================================================
// Lưu ý: mô hình hiện tại của boardStore là "whole-snapshot history"
// (undo/redo hoán đổi cả snapshot, không phải diff từng item), nên
// đơn vị lưu trữ tự nhiên nhất trong IndexedDB là CẢ BOARD, khoá theo
// board.id — không cần tách board_items/board_links/board_strokes
// thành 3 store riêng ở tầng local như migration Supabase.
// Khi đồng bộ lên Supabase (Giai đoạn 3), boardStore sẽ tự "diff"
// snapshot hiện tại so với bản đã sync gần nhất để tách thành các
// bản ghi item/link/stroke tương ứng.

export interface SyncQueueRecord {
  id: string;
  boardId: string;
  action: 'upsert_board';
  payload: Board;
  synced: boolean;
  createdAt: number;
}

type SyncQueueStoredRecord = SyncQueueRecord & { syncedStr: '0' | '1' };

interface NoBoaDB extends DBSchema {
  boards: {
    key: string; // board.id
    value: Board;
  };
  sync_queue: {
    key: string; // record id
    value: SyncQueueStoredRecord;
    indexes: { 'by-synced': string };
  };
}

const DB_NAME = 'noboa-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<NoBoaDB>> | null = null;

function getDb(): Promise<IDBPDatabase<NoBoaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NoBoaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('boards')) {
          db.createObjectStore('boards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          const q = db.createObjectStore('sync_queue', { keyPath: 'id' });
          q.createIndex('by-synced', 'syncedStr');
        }
      },
    });
  }
  return dbPromise;
}

// ================================================================
// BOARD CRUD (local cache — nguồn sự thật tạm thời trên client)
// ================================================================

export async function getBoard(id: string): Promise<Board | undefined> {
  const db = await getDb();
  return db.get('boards', id);
}

export async function saveBoard(board: Board): Promise<void> {
  const db = await getDb();
  await db.put('boards', board);
}

export async function deleteBoard(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('boards', id);
}

export async function getAllBoards(): Promise<Board[]> {
  const db = await getDb();
  return db.getAll('boards');
}

// ================================================================
// SYNC QUEUE (outbox pattern — chuẩn bị cho Giai đoạn 3)
// ================================================================
// Ghi chú: index 'by-synced' cần giá trị string nên lưu thêm field
// phụ `syncedStr` ('0' | '1') thay vì index thẳng trên boolean.

export async function enqueueSync(boardId: string, payload: Board): Promise<void> {
  const db = await getDb();
  const record: SyncQueueStoredRecord = {
    id: crypto.randomUUID(),
    boardId,
    action: 'upsert_board',
    payload,
    synced: false,
    syncedStr: '0',
    createdAt: Date.now(),
  };
  await db.put('sync_queue', record);
}

export async function getPendingSync(): Promise<SyncQueueRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex('sync_queue', 'by-synced', '0');
}

export async function markSynced(recordId: string): Promise<void> {
  const db = await getDb();
  const rec = await db.get('sync_queue', recordId);
  if (!rec) return;
  await db.put('sync_queue', { ...rec, synced: true, syncedStr: '1' });
}

export async function clearSyncedRecords(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('sync_queue', 'readwrite');
  const done = await tx.store.index('by-synced').getAllKeys('1');
  await Promise.all(done.map((k) => tx.store.delete(k)));
  await tx.done;
}