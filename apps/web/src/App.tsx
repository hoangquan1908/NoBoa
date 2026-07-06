import { useState, useCallback, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Note } from "./types/note.types";
import { makeNote, initNotes } from "./lib/utils";
import { NoteView } from "./pages/NotePage";

const INITIAL_NOTES = initNotes();

export default function App() {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [activeId, setActiveId] = useState<string>(INITIAL_NOTES[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const activeNote = notes.find((n) => n.id === activeId) ?? notes[0];

  const updateNote = useCallback((updated: Note) => {
    setNotes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(true), 1400);
  }, []);

  const addNote = () => {
    const n = makeNote("New Note");
    setNotes((prev) => [...prev, n]);
    setActiveId(n.id);
  };

  const deleteNote = (id: string) => {
    if (notes.length <= 1) return;
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}
    >
      {/* ── SIDEBAR ── */}
      <aside
        className="flex-shrink-0 border-r border-border flex flex-col overflow-hidden transition-[width] duration-200"
        style={{ width: sidebarOpen ? 240 : 0, background: "var(--sidebar)" }}
      >
        {sidebarOpen && (
          <>
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <span className="text-sm font-semibold text-foreground tracking-tight">Notes</span>
              <div className="flex items-center gap-2">
                {!saved && (
                  <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>
                )}
                {saved && (
                  <span className="text-xs text-muted-foreground/50">Saved</span>
                )}
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
            </div>

            {/* New note button */}
            <div className="px-3 py-2 flex-shrink-0">
              <button
                onClick={addNote}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary border border-primary/20 hover:bg-primary/8 hover:border-primary/35 transition-all"
              >
                <Plus size={14} /> New Note
              </button>
            </div>

            {/* Notes list */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-px">
              {notes.map((note) => {
                const pendingCount = note.tasks.filter((t) => !t.done).length;
                const isActive = note.id === activeId;
                return (
                  <div
                    key={note.id}
                    onClick={() => setActiveId(note.id)}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                      isActive
                        ? "bg-primary/12 text-primary"
                        : "hover:bg-black/[0.05] text-foreground"
                    }`}
                  >
                    <span className="flex-1 text-sm font-medium truncate">{note.title}</span>
                    {pendingCount > 0 && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                          isActive
                            ? "bg-primary/18 text-primary"
                            : "bg-muted-foreground/15 text-muted-foreground"
                        }`}
                      >
                        {pendingCount}
                      </span>
                    )}
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-all flex-shrink-0"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background">
        {!sidebarOpen && (
          <div className="flex items-center px-3 py-2 border-b border-border flex-shrink-0 bg-card/40">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <ChevronRight size={14} />
            </button>
            <span className="ml-2 text-sm text-muted-foreground font-medium">
              {activeNote?.title}
            </span>
          </div>
        )}
        {activeNote ? (
          <NoteView key={activeNote.id} note={activeNote} onUpdate={updateNote} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a note to get started
          </div>
        )}
      </main>
    </div>
  );
}
