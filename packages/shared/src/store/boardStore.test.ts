import { describe, it, expect, beforeEach, vi } from 'vitest';

// boardStore ghi xuống IndexedDB (qua lib/indexedDb) mỗi khi state đổi —
// mock lại các hàm này để test chạy được trong môi trường Node (vitest),
// nơi không có IndexedDB thật.
vi.mock('../lib/indexedDb', () => ({
  saveBoard: vi.fn().mockResolvedValue(undefined),
  getBoard: vi.fn().mockResolvedValue(undefined),
  enqueueSync: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../lib/supabaseBoardSync', () => ({
  fetchBoardFromSupabase: vi.fn().mockResolvedValue(null),
}));

import { useBoardStore } from './boardStore';
import type { Board } from '../types/board.types';

function freshBoard(): Board {
  const snap = { items: [], connections: [], strokes: [] };
  return { id: 'board-1', name: 'Test Board', snapshot: snap, history: [snap], historyIndex: 0 };
}

describe('boardStore', () => {
  beforeEach(() => {
    useBoardStore.getState().loadBoard(freshBoard());
  });

  it('addSticky thêm 1 item vào snapshot', () => {
    useBoardStore.getState().addSticky(100, 100);
    const { board } = useBoardStore.getState();
    expect(board?.snapshot.items).toHaveLength(1);
    expect(board?.snapshot.items[0].type).toBe('sticky');
  });

  it('undo hoàn tác lại thao tác thêm item', () => {
    useBoardStore.getState().addSticky(100, 100);
    expect(useBoardStore.getState().board?.snapshot.items).toHaveLength(1);

    useBoardStore.getState().undo();
    expect(useBoardStore.getState().board?.snapshot.items).toHaveLength(0);
  });

  it('redo làm lại thao tác vừa undo', () => {
    useBoardStore.getState().addSticky(100, 100);
    useBoardStore.getState().undo();
    useBoardStore.getState().redo();
    expect(useBoardStore.getState().board?.snapshot.items).toHaveLength(1);
  });

  it('deleteItem xoá đúng item và các dây nối liên quan', () => {
    useBoardStore.getState().addSticky(100, 100);
    const id = useBoardStore.getState().board!.snapshot.items[0].id;

    useBoardStore.getState().addSticky(200, 200);
    const id2 = useBoardStore.getState().board!.snapshot.items[1].id;

    useBoardStore.getState().startConnect(id);
    useBoardStore.getState().finishConnect(id2);
    expect(useBoardStore.getState().board?.snapshot.connections).toHaveLength(1);

    useBoardStore.getState().deleteItem(id);
    const { board } = useBoardStore.getState();
    expect(board?.snapshot.items).toHaveLength(1);
    // Dây nối liên quan tới item đã xoá cũng phải biến mất (cascade ở tầng client).
    expect(board?.snapshot.connections).toHaveLength(0);
  });

  it('undo/redo không crash khi không còn lịch sử', () => {
    expect(() => useBoardStore.getState().undo()).not.toThrow();
    expect(() => useBoardStore.getState().redo()).not.toThrow();
  });
});
