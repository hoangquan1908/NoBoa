import { useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { Task } from '@note-board-app/shared';

interface TaskRowProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}

export function TaskRow({ task, onToggle, onDelete, onEdit }: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.text);

  const commit = () => {
    if (val.trim()) onEdit(task.id, val.trim());
    else setVal(task.text);
    setEditing(false);
  };

  return (
    <div
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-black/5 transition-all ${
        task.done ? "opacity-55" : ""
      }`}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={`flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
          task.done
            ? "bg-primary border-primary"
            : "border-muted-foreground/40 hover:border-primary/60"
        }`}
        style={{ width: 18, height: 18 }}
      >
        {task.done && (
          <Check size={10} className="text-primary-foreground" strokeWidth={3} />
        )}
      </button>

      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setVal(task.text);
              setEditing(false);
            }
          }}
          className="flex-1 text-sm bg-transparent outline-none border-b border-primary/40 py-0.5"
        />
      ) : (
        <span
          className={`flex-1 text-sm leading-snug ${
            task.done ? "line-through text-muted-foreground" : ""
          }`}
          onDoubleClick={() => {
            setVal(task.text);
            setEditing(true);
          }}
        >
          {task.text}
        </span>
      )}

      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            setVal(task.text);
            setEditing(true);
          }}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-all"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}
