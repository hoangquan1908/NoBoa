import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import type { Note, Task } from '../types/note.types';
import { makeBoard, makeBoardStub } from '../lib/utils';

// uuid fallback
function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

// ================================================================
// TYPES
// ================================================================
interface NotesState {
  notes: Note[];
  activeId: string | null;
  loading: boolean;
  saving: boolean;

  // Actions
  fetchNotes: () => Promise<void>;
  addNote: () => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  renameNote: (id: string, title: string) => Promise<void>;
  setActiveId: (id: string | null) => void;
  updateNote: (updated: Note) => void;

  // Task actions (optimistic update + sync)
  addTask: (noteId: string, text: string) => Promise<void>;
  toggleTask: (noteId: string, taskId: string) => Promise<void>;
  deleteTask: (noteId: string, taskId: string) => Promise<void>;
  editTask: (noteId: string, taskId: string, text: string) => Promise<void>;
}

// ================================================================
// HELPER
// ================================================================
import { listBoardsForNote, createBoardRemote } from '../lib/supabaseBoardSync';

async function rowToNote(row: { id: string; title: string; created_at: string; updated_at: string }): Promise<Note> {
  const boardStubs = await listBoardsForNote(row.id);
  const boards = boardStubs.map((b) => makeBoardStub(b.id, b.name));
  return {
    id: row.id,
    title: row.title,
    tasks: [],
    boards,
    activeBoardId: boards[0].id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function hasSession() {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

// ================================================================
// STORE
// ================================================================
export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      activeId: null,
      loading: false,
      saving: false,

      fetchNotes: async () => {
        if (!(await hasSession())) {
          // Local mode: Zustand persist has already loaded state from local storage.
          return;
        }

        set({ loading: true });
        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('*')
          .order('created_at', { ascending: true });

        if (notesError) {
          console.error('[notesStore] fetchNotes error:', notesError.message);
          set({ loading: false });
          return;
        }

        if (!notesData || notesData.length === 0) {
          set({ notes: [], activeId: null, loading: false });
          return;
        }

        const noteIds = notesData.map((n) => n.id);
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .in('note_id', noteIds)
          .order('position', { ascending: true });

        // Lấy board (id + name) đã tồn tại cho TẤT CẢ note trong 1 lần
        // query, thay vì tạo board mới ngẫu nhiên mỗi lần fetch — giữ id
        // ổn định để IndexedDB/Supabase board data khớp lại được.
        const { data: boardsData, error: boardsErr } = await supabase
          .from('boards')
          .select('id, name, note_id')
          .in('note_id', noteIds)
          .order('created_at', { ascending: true });
        if (boardsErr) console.error('[notesStore] fetch boards error:', boardsErr.message);

        const notes: Note[] = await Promise.all(notesData.map(async (row) => {
          const tasks: Task[] = (tasksData ?? [])
            .filter((t) => t.note_id === row.id)
            .map((t) => ({
              id: t.id,
              text: t.content,
              done: t.is_done,
              position: t.position,
              created_at: t.created_at,
            }));

          let noteBoards = (boardsData ?? [])
            .filter((b) => b.note_id === row.id)
            .map((b) => makeBoardStub(b.id, b.name));

          // Note chưa có board nào (trường hợp hiếm, ví dụ note tạo trước
          // khi tính năng board tồn tại) -> tạo 1 board mặc định trên Supabase.
          if (noteBoards.length === 0) {
            const stub = await createBoardRemote(row.id, 'Main Board');
            noteBoards = [makeBoardStub(stub.id, stub.name)];
          }

          return {
            id: row.id,
            title: row.title,
            tasks,
            boards: noteBoards,
            activeBoardId: noteBoards[0].id,
            created_at: row.created_at,
            updated_at: row.updated_at,
          };
        }));

        // Merge logic: in a real app, maybe upload local notes to Supabase if they exist.
        // For now, Supabase overwrites local state on login.
        set({ notes, activeId: notes[0]?.id ?? null, loading: false });
      },

      addNote: async () => {
        const _hasSession = await hasSession();

        if (!_hasSession) {
          const defaultBoard = makeBoard('Main Board');
          const note: Note = {
            id: generateId(),
            title: 'New Note',
            tasks: [],
            boards: [defaultBoard],
            activeBoardId: defaultBoard.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          set((s) => ({ notes: [...s.notes, note], activeId: note.id }));
          return;
        }

        set({ saving: true });
        const { data, error } = await supabase
          .from('notes')
          .insert({ title: 'New Note' })
          .select()
          .single();

        if (error || !data) {
          console.error('[notesStore] addNote error:', error?.message);
          set({ saving: false });
          return;
        }

        const note = await rowToNote(data);
        set((s) => ({
          notes: [...s.notes, note],
          activeId: note.id,
          saving: false,
        }));
      },

      deleteNote: async (id) => {
        set((s) => {
          const next = s.notes.filter((n) => n.id !== id);
          return {
            notes: next,
            activeId: s.activeId === id ? (next[0]?.id ?? null) : s.activeId,
          };
        });

        if (await hasSession()) {
          const { error } = await supabase.from('notes').delete().eq('id', id);
          if (error) {
            console.error('[notesStore] deleteNote error:', error.message);
            get().fetchNotes();
          }
        }
      },

      renameNote: async (id, title) => {
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, title } : n)),
        }));

        if (await hasSession()) {
          const { error } = await supabase
            .from('notes')
            .update({ title, updated_at: new Date().toISOString() })
            .eq('id', id);
          if (error) console.error('[notesStore] renameNote error:', error.message);
        }
      },

      setActiveId: (id) => set({ activeId: id }),

      updateNote: (updated) => {
        set((s) => ({
          notes: s.notes.map((n) => (n.id === updated.id ? updated : n)),
        }));
      },

      addTask: async (noteId, text) => {
        const note = get().notes.find((n) => n.id === noteId);
        if (!note) return;

        const _hasSession = await hasSession();
        const position = note.tasks.length;

        if (!_hasSession) {
          const task: Task = {
            id: generateId(),
            text,
            done: false,
            position,
            created_at: new Date().toISOString(),
          };
          set((s) => ({
            notes: s.notes.map((n) =>
              n.id === noteId ? { ...n, tasks: [...n.tasks, task] } : n
            ),
          }));
          return;
        }

        const { data, error } = await supabase
          .from('tasks')
          .insert({ note_id: noteId, content: text, is_done: false, position })
          .select()
          .single();

        if (error || !data) {
          console.error('[notesStore] addTask error:', error?.message);
          return;
        }

        const task: Task = { id: data.id, text: data.content, done: data.is_done, position: data.position };
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId ? { ...n, tasks: [...n.tasks, task] } : n
          ),
        }));
      },

      toggleTask: async (noteId, taskId) => {
        const note = get().notes.find((n) => n.id === noteId);
        const task = note?.tasks.find((t) => t.id === taskId);
        if (!task) return;

        const newDone = !task.done;
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? { ...n, tasks: n.tasks.map((t) => (t.id === taskId ? { ...t, done: newDone } : t)) }
              : n
          ),
        }));

        if (await hasSession()) {
          const { error } = await supabase
            .from('tasks')
            .update({ is_done: newDone })
            .eq('id', taskId);
          if (error) console.error('[notesStore] toggleTask error:', error.message);
        }
      },

      deleteTask: async (noteId, taskId) => {
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId ? { ...n, tasks: n.tasks.filter((t) => t.id !== taskId) } : n
          ),
        }));

        if (await hasSession()) {
          const { error } = await supabase.from('tasks').delete().eq('id', taskId);
          if (error) console.error('[notesStore] deleteTask error:', error.message);
        }
      },

      editTask: async (noteId, taskId, text) => {
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? { ...n, tasks: n.tasks.map((t) => (t.id === taskId ? { ...t, text } : t)) }
              : n
          ),
        }));

        if (await hasSession()) {
          const { error } = await supabase
            .from('tasks')
            .update({ content: text })
            .eq('id', taskId);
          if (error) console.error('[notesStore] editTask error:', error.message);
        }
      },
    }),
    {
      name: 'noteboard-storage',
      partialize: (state) => ({ notes: state.notes, activeId: state.activeId }),
    }
  )
);