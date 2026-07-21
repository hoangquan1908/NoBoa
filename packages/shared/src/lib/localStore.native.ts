import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Board } from '../types/board.types';
import type { SyncQueueRecord, SyncQueueStoredRecord } from './localStore';

const BOARDS_PREFIX = '@boards:';
const SYNC_QUEUE_PREFIX = '@sync_queue:';

// ================================================================
// BOARD CRUD (local cache)
// ================================================================
export async function getBoard(id: string): Promise<Board | undefined> {
  const data = await AsyncStorage.getItem(BOARDS_PREFIX + id);
  return data ? JSON.parse(data) : undefined;
}

export async function saveBoard(board: Board): Promise<void> {
  await AsyncStorage.setItem(BOARDS_PREFIX + board.id, JSON.stringify(board));
}

export async function deleteBoard(id: string): Promise<void> {
  await AsyncStorage.removeItem(BOARDS_PREFIX + id);
}

export async function getAllBoards(): Promise<Board[]> {
  const keys = await AsyncStorage.getAllKeys();
  const boardKeys = keys.filter((k: string) => k.startsWith(BOARDS_PREFIX));
  const raw = await AsyncStorage.multiGet(boardKeys);
  return raw.map(([_, v]: [string, string | null]) => v ? JSON.parse(v) : null).filter(Boolean) as Board[];
}

// ================================================================
// SYNC QUEUE
// ================================================================
export async function enqueueSync(boardId: string, payload: Board): Promise<void> {
  const id = crypto.randomUUID();
  const record: SyncQueueStoredRecord = {
    id,
    boardId,
    action: 'upsert_board',
    payload,
    synced: false,
    syncedStr: '0',
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(SYNC_QUEUE_PREFIX + id, JSON.stringify(record));
}

export async function getPendingSync(): Promise<SyncQueueRecord[]> {
  const keys = await AsyncStorage.getAllKeys();
  const queueKeys = keys.filter((k: string) => k.startsWith(SYNC_QUEUE_PREFIX));
  const raw = await AsyncStorage.multiGet(queueKeys);
  
  const records = raw.map(([_, v]: [string, string | null]) => v ? JSON.parse(v) as SyncQueueStoredRecord : null).filter(Boolean) as SyncQueueStoredRecord[];
  return records.filter((r: SyncQueueStoredRecord) => r.syncedStr === '0');
}

export async function markSynced(recordId: string): Promise<void> {
  const data = await AsyncStorage.getItem(SYNC_QUEUE_PREFIX + recordId);
  if (!data) return;
  const rec = JSON.parse(data) as SyncQueueStoredRecord;
  rec.synced = true;
  rec.syncedStr = '1';
  await AsyncStorage.setItem(SYNC_QUEUE_PREFIX + recordId, JSON.stringify(rec));
}

export async function clearSyncedRecords(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const queueKeys = keys.filter((k: string) => k.startsWith(SYNC_QUEUE_PREFIX));
  const raw = await AsyncStorage.multiGet(queueKeys);
  
  const toDelete = raw
    .map(([k, v]: [string, string | null]) => ({ key: k, data: v ? JSON.parse(v) as SyncQueueStoredRecord : null }))
    .filter((item: { key: string; data: SyncQueueStoredRecord | null }) => item.data && item.data.syncedStr === '1')
    .map((item: { key: string; data: SyncQueueStoredRecord | null }) => item.key);

  if (toDelete.length > 0) {
    await AsyncStorage.multiRemove(toDelete);
  }
}
