import { useEffect, useRef } from 'react';
import { getPendingSync, markSynced, clearSyncedRecords } from '@note-board-app/shared';
import { syncBoardToSupabase } from '@note-board-app/shared';

const POLL_INTERVAL_MS = 4000;

/**
 * Background sync worker (outbox pattern).
 * Đọc các bản ghi chưa đồng bộ trong sync_queue (IndexedDB) và đẩy
 * lên Supabase. Chạy độc lập với thao tác UI — không chặn thao tác
 * vẽ/kéo-thả nào cả. Gọi 1 lần duy nhất ở App.tsx (mount toàn cục).
 */
export function useSupabaseSync(enabled: boolean) {
  const runningRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    async function flush() {
      if (runningRef.current) return; // tránh chạy chồng nếu lần trước chưa xong
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      runningRef.current = true;
      try {
        const pending = await getPendingSync();
        // Nhiều bản ghi có thể cùng 1 boardId (do debounce theo thời gian,
        // không phải theo board) — chỉ cần đẩy bản MỚI NHẤT của mỗi board,
        // các bản cũ hơn coi như đã lỗi thời.
        const latestByBoard = new Map<string, typeof pending[number]>();
        for (const rec of pending) {
          const cur = latestByBoard.get(rec.boardId);
          if (!cur || rec.createdAt > cur.createdAt) latestByBoard.set(rec.boardId, rec);
        }

        const succeededBoardIds = new Set<string>();
        for (const rec of latestByBoard.values()) {
          try {
            await syncBoardToSupabase(rec.payload);
            succeededBoardIds.add(rec.boardId);
          } catch (err) {
            console.error('[useSupabaseSync] sync failed for board', rec.boardId, err);
            // Không thêm vào succeededBoardIds -> mọi bản ghi của board này
            // (kể cả bản mới nhất) sẽ được giữ lại trong queue để thử lại.
          }
        }

        // Đánh dấu synced cho các bản ghi thuộc board đã đồng bộ thành công
        // (kể cả bản cũ hơn của cùng board, vì bản mới nhất đã bao hàm chúng).
        for (const rec of pending) {
          if (succeededBoardIds.has(rec.boardId)) {
            await markSynced(rec.id).catch(() => {});
          }
        }
        await clearSyncedRecords().catch(() => {});
      } finally {
        runningRef.current = false;
      }
    }

    flush(); // chạy ngay khi mount / khi enabled bật lên
    const interval = setInterval(flush, POLL_INTERVAL_MS);
    window.addEventListener('online', flush);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', flush);
    };
  }, [enabled]);
}
