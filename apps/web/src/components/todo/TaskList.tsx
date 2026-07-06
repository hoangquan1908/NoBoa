import { useState } from "react";
import { Plus, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Note } from "../../types/note.types";
import { TaskRow } from "./TaskItem";
import { uid } from "../../lib/utils";

type TaskFilter = "all" | "todo" | "done";

interface TodoPanelProps {
  note: Note;
  onUpdate: (n: Note) => void;
}

export function TodoPanel({ note, onUpdate }: TodoPanelProps) {
  const [newText, setNewText] = useState("");
  const [filterMode, setFilterMode] = useState<TaskFilter>("all");
  const [doneOpen, setDoneOpen] = useState(true);

  const tasks = note.tasks;
  const doneCount = tasks.filter((t) => t.done).length;
  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
  const pending = tasks.filter((t) => !t.done);
  const doneList = tasks.filter((t) => t.done);

  const add = () => {
    if (!newText.trim()) return;
    onUpdate({
      ...note,
      tasks: [...tasks, { id: uid(), text: newText.trim(), done: false }],
    });
    setNewText("");
  };

  const toggle = (id: string) =>
    onUpdate({
      ...note,
      tasks: tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    });

  const del = (id: string) =>
    onUpdate({ ...note, tasks: tasks.filter((t) => t.id !== id) });

  const edit = (id: string, text: string) =>
    onUpdate({
      ...note,
      tasks: tasks.map((t) => (t.id === id ? { ...t, text } : t)),
    });

  const visibleTodo = filterMode === "done" ? [] : pending;
  const visibleDone = filterMode === "todo" ? [] : doneList;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Progress */}
      <div className="px-5 py-3 border-b border-border flex-shrink-0">
        <div className="flex justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">
            {doneCount}/{tasks.length} done
          </span>
          <span className="text-xs font-semibold text-primary">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Add task */}
      <div className="px-5 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2 focus-within:border-primary/40 focus-within:bg-card transition-all">
          <Plus size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add task... (Press Enter)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-5 py-2 border-b border-border flex-shrink-0">
        {(["all", "todo", "done"] as TaskFilter[]).map((v) => (
          <button
            key={v}
            onClick={() => setFilterMode(v)}
            className={`text-xs px-2.5 py-1 rounded-md transition-all ${
              filterMode === v
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {v === "all"
              ? `All (${tasks.length})`
              : v === "todo"
              ? `Todo (${pending.length})`
              : `Done (${doneList.length})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {visibleTodo.length > 0 && (
          <div className="px-5">
            {filterMode === "all" && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-1 mb-1.5">
                Todo
              </p>
            )}
            {visibleTodo.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={toggle} onDelete={del} onEdit={edit} />
            ))}
          </div>
        )}

        {visibleDone.length > 0 && (
          <div className="px-5 mt-2">
            <button
              onClick={() => setDoneOpen((s) => !s)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 hover:text-foreground transition-all w-full"
            >
              {doneOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Done ({doneList.length})
            </button>
            {doneOpen &&
              visibleDone.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={toggle} onDelete={del} onEdit={edit} />
              ))}
          </div>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-16">
            <Check size={36} className="mx-auto mb-3 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">
              No tasks yet. Add your first one!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
