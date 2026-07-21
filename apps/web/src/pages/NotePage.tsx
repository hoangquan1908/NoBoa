import { useState, useEffect } from "react";
import { Plus, X, List, LayoutGrid, ChevronUp, ChevronDown } from "lucide-react";
import { Note } from '@note-board-app/shared';
import { Board } from '@note-board-app/shared';
import { makeBoardStub } from '@note-board-app/shared';
import { createBoardRemote, renameBoardRemote, deleteBoardRemote } from '@note-board-app/shared';
import { deleteBoard as deleteBoardCache } from '@note-board-app/shared';
import { TodoPanel } from "../components/todo/TaskList";
import { BoardCanvas } from "../components/board/BoardCanvas";

interface NoteViewProps {
  note: Note;
  onUpdate: (n: Note) => void;
  isHeaderExpanded: boolean;
}

export function NoteView({ note, onUpdate, isHeaderExpanded }: NoteViewProps) {
  const [tab, setTab] = useState<"todo" | "board">("todo");
  const [renamingBoard, setRenamingBoard] = useState<string | null>(null);
  const [boardRenameVal, setBoardRenameVal] = useState("");
  const [renamingNote, setRenamingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState(note.title);

  useEffect(() => { setNoteTitle(note.title); }, [note.title]);

  const activeBoard = note.boards.find((b) => b.id === note.activeBoardId) ?? note.boards[0];
  const pending = note.tasks.filter((t) => !t.done).length;

  const addBoard = async () => {
    const name = `Board ${note.boards.length + 1}`;
    try {
      // Tạo trên Supabase trước để có id ổn định ngay từ đầu, tránh
      // trường hợp id local (uid()) không khớp với id thật trên server.
      const remote = await createBoardRemote(note.id, name);
      const b = makeBoardStub(remote.id, remote.name);
      onUpdate({ ...note, boards: [...note.boards, b], activeBoardId: b.id });
    } catch (err) {
      console.error('[NotePage] addBoard failed:', err);
      // Fallback: vẫn tạo local để không chặn UX khi mất mạng; board này
      // sẽ không có trên Supabase cho tới khi user thử lại có mạng.
      const b = makeBoardStub(crypto.randomUUID(), name);
      onUpdate({ ...note, boards: [...note.boards, b], activeBoardId: b.id });
    }
  };

  const deleteBoard = async (id: string) => {
    if (note.boards.length <= 1) return;
    const boards = note.boards.filter((b) => b.id !== id);
    onUpdate({
      ...note,
      boards,
      activeBoardId: note.activeBoardId === id ? boards[0].id : note.activeBoardId,
    });
    // Dọn cache local + xoá trên Supabase (cascade tự xoá items/links/strokes).
    deleteBoardCache(id).catch((err) => console.error('[NotePage] clear board cache failed:', err));
    try {
      await deleteBoardRemote(id);
    } catch (err) {
      console.error('[NotePage] deleteBoard remote failed:', err);
    }
  };

  const renameBoard = async (id: string, name: string) => {
    if (!name.trim()) return;
    onUpdate({ ...note, boards: note.boards.map((b) => b.id === id ? { ...b, name: name.trim() } : b) });
    try {
      await renameBoardRemote(id, name.trim());
    } catch (err) {
      console.error('[NotePage] renameBoard remote failed:', err);
    }
  };

  const updateBoard = (b: Board) =>
    onUpdate({ ...note, boards: note.boards.map((ob) => ob.id === b.id ? b : ob) });

  const commitNoteRename = () => {
    if (noteTitle.trim()) onUpdate({ ...note, title: noteTitle.trim() });
    setRenamingNote(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {isHeaderExpanded && (
        <>
          {/* Note header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border flex-shrink-0 bg-card/50">
            {renamingNote ? (
              <input
                autoFocus
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                onBlur={commitNoteRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitNoteRename();
                  if (e.key === "Escape") { setNoteTitle(note.title); setRenamingNote(false); }
                }}
                className="flex-1 text-base font-semibold bg-transparent outline-none border-b-2 border-primary/40"
              />
            ) : (
              <h2
                className="flex-1 text-base font-semibold truncate cursor-pointer hover:text-primary/80 transition-all"
                title="Double-click to rename"
                onDoubleClick={() => { setNoteTitle(note.title); setRenamingNote(true); }}
              >
                {note.title}
              </h2>
            )}
            <div className="flex items-center gap-2">
              {pending > 0 && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {pending} pending tasks
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center border-b border-border px-4 gap-0 flex-shrink-0 bg-card/30">
            {([
              { v: "todo" as const, label: "List", icon: <List size={13} /> },
              { v: "board" as const, label: "Board", icon: <LayoutGrid size={13} /> },
            ]).map(({ v, label, icon }) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 -mb-px transition-all ${
                  tab === v
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Board selector */}
          {tab === "board" && (
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border overflow-x-auto flex-shrink-0 bg-card/20">
              {note.boards.map((b) => (
                <div key={b.id} className="group flex items-center gap-0.5 flex-shrink-0">
                  {renamingBoard === b.id ? (
                    <input
                      autoFocus
                      value={boardRenameVal}
                      onChange={(e) => setBoardRenameVal(e.target.value)}
                      onBlur={() => { renameBoard(b.id, boardRenameVal); setRenamingBoard(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { renameBoard(b.id, boardRenameVal); setRenamingBoard(null); }
                        if (e.key === "Escape") setRenamingBoard(null);
                      }}
                      className="text-xs border border-primary/40 rounded-md px-2 py-1 outline-none w-28 bg-background"
                    />
                  ) : (
                    <button
                      onClick={() => onUpdate({ ...note, activeBoardId: b.id })}
                      onDoubleClick={() => { setBoardRenameVal(b.name); setRenamingBoard(b.id); }}
                      className={`text-xs px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                        b.id === note.activeBoardId
                          ? "bg-primary text-primary-foreground font-medium"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {b.name}
                    </button>
                  )}
                  {note.boards.length > 1 && (
                    <button
                      onClick={() => deleteBoard(b.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-all"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addBoard}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all flex-shrink-0"
              >
                <Plus size={11} /> New Board
              </button>
            </div>
          )}
        </>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === "todo"
          ? <TodoPanel note={note} onUpdate={onUpdate} />
          : activeBoard && <BoardCanvas board={activeBoard} onUpdate={updateBoard} />
        }
      </div>
    </div>
  );
}
