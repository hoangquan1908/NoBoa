import { useEffect } from 'react';
import { useBoardStore } from '@note-board-app/shared';

/**
 * useUndoRedo — binds keyboard shortcuts Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
 * and delete key to boardStore actions.
 *
 * Must be mounted inside a component that has access to the board context.
 */
export function useUndoRedo() {
  const undo = useBoardStore((s) => s.undo);
  const redo = useBoardStore((s) => s.redo);
  const deleteSelected = useBoardStore((s) => s.deleteSelected);
  const editingId = useBoardStore((s) => s.editingId);
  const expandedStickyId = useBoardStore((s) => s.editingId); // reuse editingId for overlay state
  const setConnectFrom = useBoardStore((s) => s.setConnectFrom);
  const setSelectedIds = useBoardStore((s) => s.setSelectedIds);
  const selectedIds = useBoardStore((s) => s.selectedIds);

  useEffect(() => {
    const isTypingTarget = () => {
      const el = document.activeElement;
      return (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement)?.isContentEditable
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (editingId || isTypingTarget()) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Escape') {
        setConnectFrom(null);
        setSelectedIds(new Set());
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        deleteSelected();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, deleteSelected, editingId, setConnectFrom, setSelectedIds, selectedIds]);
}
