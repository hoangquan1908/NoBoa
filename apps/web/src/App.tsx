import { useEffect, useRef, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Trash2, Loader2, LogOut, LogIn } from "lucide-react";
import { useNotesStore, useAuthStore } from "@note-board-app/shared";
import { NoteView } from "./pages/NotePage";
import { AuthPage } from "./pages/AuthPage";
import { useSupabaseSync } from "./hooks/useSupabaseSync";

export default function App() {
  const { user, loading: authLoading, initialize, signOut } = useAuthStore();
  const {
    notes,
    activeId,
    loading: notesLoading,
    saving,
    fetchNotes,
    addNote,
    deleteNote,
    setActiveId,
    updateNote,
    renameNote,
  } = useNotesStore();

  // Worker đồng bộ board nền — chỉ chạy khi đã đăng nhập (board của
  // user chưa đăng nhập chỉ tồn tại local, không có nơi để đồng bộ lên).
  useSupabaseSync(!authLoading && !!user);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isNoteHeaderExpanded, setIsNoteHeaderExpanded] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // 1. Init auth session on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 2. Fetch notes (depends on session, notesStore handles local vs supabase)
  useEffect(() => {
    if (!authLoading) {
      fetchNotes();
    }
  }, [authLoading, user, fetchNotes]);

  const activeNote = notes.find((n) => n.id === activeId) ?? notes[0];

  const handleUpdateNote = (updated: typeof notes[0]) => {
    const original = notes.find((n) => n.id === updated.id);
    if (original && original.title !== updated.title) {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        renameNote(updated.id, updated.title);
      }, 800);
    }
    updateNote(updated);
  };

  // ── Auth loading (checking session) ──────────────────────────
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background gap-3 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  const username = user?.user_metadata?.username ?? user?.email?.split("@")[0] ?? "User";

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
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-foreground tracking-tight">Notes</span>
                <span className="text-xs text-muted-foreground truncate" title={username}>
                  {user ? username : "Local storage"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {saving && (
                  <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>
                )}
                {user ? (
                  <button
                    onClick={signOut}
                    className="p-1 rounded text-muted-foreground hover:bg-muted/60 hover:text-destructive transition-all flex items-center gap-1"
                    title="Sign out"
                  >
                    <LogOut size={13} />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="p-1 rounded text-muted-foreground hover:bg-muted/60 hover:text-primary transition-all flex items-center gap-1"
                    title="Sign in to save online"
                  >
                    <LogIn size={13} />
                  </button>
                )}
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
            </div>

            {/* New note */}
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
              {notesLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
                  <Loader2 size={14} className="animate-spin" /> Loading...
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  No notes yet. Create one!
                </div>
              ) : (
                notes.map((note) => {
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
                })
              )}
            </div>
          </>
        )}
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0 bg-card/40">
          <div className="flex items-center">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                <ChevronRight size={14} />
              </button>
            )}
            <span className="ml-2 text-sm text-muted-foreground font-medium truncate">
              {activeNote?.title}
            </span>
          </div>
          <button
            onClick={() => setIsNoteHeaderExpanded(p => !p)}
            className="p-1.5 rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
            title={isNoteHeaderExpanded ? "Collapse header" : "Expand header"}
          >
            {isNoteHeaderExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {notesLoading ? (
          <div className="flex-1 flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading your notes...</span>
          </div>
        ) : activeNote ? (
          <NoteView 
            key={activeNote.id} 
            note={activeNote} 
            onUpdate={handleUpdateNote} 
            isHeaderExpanded={isNoteHeaderExpanded} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <p className="text-sm">No notes yet.</p>
            <button
              onClick={addNote}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-primary border border-primary/20 hover:bg-primary/8 transition-all"
            >
              <Plus size={14} /> Create your first note
            </button>
          </div>
        )}
      </main>

      {/* ── AUTH MODAL ── */}
      {showAuthModal && <AuthPage onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
