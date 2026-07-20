import { supabase } from './supabaseClient';
import type {
  Board, BoardItem, BoardSnapshot, Connection, ImageItem, StickyItem, Stroke, TextItem,
} from '../types/board.types';

// ================================================================
// MAPPING: local types (snapshot) <-> Supabase rows
// ================================================================
// Chiến lược đơn giản: mỗi lần sync 1 board, XOÁ toàn bộ row cũ của
// board đó trong board_items/board_links/board_strokes rồi INSERT lại
// từ snapshot hiện tại ("replace-all"). Vì đây là app cá nhân, board
// không quá lớn, cách này đơn giản/an toàn hơn nhiều so với diff từng
// item — đánh đổi là tốn băng thông hơn 1 chút, chấp nhận được.

interface BoardItemRow {
  id: string;
  board_id: string;
  type: 'photo' | 'sticky_note' | 'text_box';
  content: string | null;
  image_url: string | null;
  pos_x: number;
  pos_y: number;
  rotation: number;
  color: string | null;
  z_index: number;
  locked: boolean;
  extra: Record<string, unknown>;
}

function itemToRow(item: BoardItem, boardId: string): BoardItemRow {
  const base = {
    id: item.id,
    board_id: boardId,
    pos_x: item.x,
    pos_y: item.y,
    rotation: 0,
    z_index: item.zIndex,
    locked: item.locked,
  };
  switch (item.type) {
    case 'sticky':
      return { ...base, type: 'sticky_note', content: item.text, image_url: null, color: item.color, extra: { w: item.w, h: item.h } };
    case 'image':
      return { ...base, type: 'photo', content: null, image_url: item.src, color: null, extra: { w: item.w, h: item.h, caption: item.caption } };
    case 'text':
      return { ...base, type: 'text_box', content: item.text, image_url: null, color: item.color, extra: { fontSize: item.fontSize } };
  }
}

function rowToItem(row: BoardItemRow): BoardItem {
  const common = { id: row.id, x: row.pos_x, y: row.pos_y, locked: row.locked, zIndex: row.z_index };
  const extra = row.extra ?? {};
  switch (row.type) {
    case 'sticky_note':
      return {
        ...common, type: 'sticky',
        text: row.content ?? '', color: row.color ?? '#FEF08A',
        w: (extra.w as number) ?? 210, h: (extra.h as number) ?? 160,
      } as StickyItem;
    case 'photo':
      return {
        ...common, type: 'image',
        src: row.image_url ?? '', caption: (extra.caption as string) ?? '',
        w: (extra.w as number) ?? 250, h: (extra.h as number) ?? 180,
      } as ImageItem;
    case 'text_box':
      return {
        ...common, type: 'text',
        text: row.content ?? '', color: row.color ?? '#2A2318',
        fontSize: (extra.fontSize as number) ?? 16,
      } as TextItem;
  }
}

// ================================================================
// UPLOAD (local -> Supabase)
// ================================================================

export async function syncBoardToSupabase(board: Board): Promise<void> {
  // 1. Upsert board metadata (name, viewport)
  const { error: boardErr } = await supabase.from('boards').upsert({
    id: board.id,
    name: board.name,
    viewport_x: board.viewport_x ?? 0,
    viewport_y: board.viewport_y ?? 0,
    viewport_zoom: board.viewport_zoom ?? 1,
  });
  if (boardErr) throw boardErr;

  const s = board.snapshot;

  // 2. Replace-all cho items / links / strokes
  await replaceAll('board_items', board.id, s.items.map((i) => itemToRow(i, board.id)));
  await replaceAll('board_links', board.id, s.connections.map((c) => ({
    id: c.id, board_id: board.id, item_a_id: c.fromId, item_b_id: c.toId, color: c.color,
  })));
  await replaceAll('board_strokes', board.id, s.strokes.map((st) => ({
    id: st.id, board_id: board.id, points: st.points, color: st.color, width: st.width,
  })));
}

async function replaceAll<T extends { id: string }>(
  table: 'board_items' | 'board_links' | 'board_strokes',
  boardId: string,
  rows: T[]
) {
  const { error: delErr } = await supabase.from(table).delete().eq('board_id', boardId);
  if (delErr) throw delErr;
  if (rows.length === 0) return;
  const { error: insErr } = await supabase.from(table).insert(rows as unknown as Record<string, unknown>[]);
  if (insErr) throw insErr;
}

// ================================================================
// QUẢN LÝ DANH SÁCH BOARD CỦA 1 NOTE (id ổn định qua các lần fetch)
// ================================================================

export interface BoardStub {
  id: string;
  name: string;
}

/**
 * Lấy danh sách board (chỉ id + name, KHÔNG kèm nội dung snapshot —
 * nội dung sẽ được BoardCanvas tự hydrate qua loadBoardFromCache khi
 * board đó thực sự được mở). Nếu note chưa có board nào (note mới),
 * tự tạo 1 board mặc định và trả về.
 */
export async function listBoardsForNote(noteId: string): Promise<BoardStub[]> {
  const { data, error } = await supabase
    .from('boards').select('id, name').eq('note_id', noteId).order('created_at');
  if (error) throw error;
  if (data && data.length > 0) return data;

  const created = await createBoardRemote(noteId, 'Main Board');
  return [created];
}

export async function createBoardRemote(noteId: string, name: string): Promise<BoardStub> {
  const { data, error } = await supabase
    .from('boards').insert({ note_id: noteId, name }).select('id, name').single();
  if (error) throw error;
  return data;
}

export async function renameBoardRemote(boardId: string, name: string): Promise<void> {
  const { error } = await supabase.from('boards').update({ name }).eq('id', boardId);
  if (error) throw error;
}

export async function deleteBoardRemote(boardId: string): Promise<void> {
  // ON DELETE CASCADE trong migration đã tự xoá board_items/links/strokes liên quan.
  const { error } = await supabase.from('boards').delete().eq('id', boardId);
  if (error) throw error;
}


export async function fetchBoardFromSupabase(boardId: string, boardName: string): Promise<Board | null> {
  const { data: boardRow, error: boardErr } = await supabase
    .from('boards').select('*').eq('id', boardId).maybeSingle();
  if (boardErr) throw boardErr;
  if (!boardRow) return null;

  const [{ data: itemRows, error: itemsErr }, { data: linkRows, error: linksErr }, { data: strokeRows, error: strokesErr }] =
    await Promise.all([
      supabase.from('board_items').select('*').eq('board_id', boardId),
      supabase.from('board_links').select('*').eq('board_id', boardId),
      supabase.from('board_strokes').select('*').eq('board_id', boardId),
    ]);
  if (itemsErr) throw itemsErr;
  if (linksErr) throw linksErr;
  if (strokesErr) throw strokesErr;

  const snapshot: BoardSnapshot = {
    items: (itemRows ?? []).map((r) => rowToItem(r as BoardItemRow)),
    connections: (linkRows ?? []).map((r) => ({
      id: r.id, fromId: r.item_a_id, toId: r.item_b_id, color: r.color,
    }) as Connection),
    strokes: (strokeRows ?? []).map((r) => ({
      id: r.id, points: r.points, color: r.color, width: r.width,
    }) as Stroke),
  };

  return {
    id: boardRow.id,
    name: boardRow.name ?? boardName,
    snapshot,
    history: [snapshot],
    historyIndex: 0,
    viewport_x: boardRow.viewport_x,
    viewport_y: boardRow.viewport_y,
    viewport_zoom: boardRow.viewport_zoom,
  };
}