import { useCallback, useRef, useState } from 'react';

const MAX_HISTORY_DEPTH = 30;

/**
 * Custom hook for undo/redo functionality.
 * Wraps a state value with history tracking.
 *
 * Usage:
 *   const { value, setValue, undo, redo, canUndo, canRedo } = useHistory(initialValue);
 */
export default function useHistory(initialValue) {
  const [value, setValueInternal] = useState(initialValue);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const skipSnapshotRef = useRef(false);

  const setValue = useCallback((updater) => {
    setValueInternal((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      if (!skipSnapshotRef.current) {
        undoStackRef.current = [
          ...undoStackRef.current.slice(-MAX_HISTORY_DEPTH + 1),
          prev,
        ];
        redoStackRef.current = [];
      }

      skipSnapshotRef.current = false;
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;

    setValueInternal((prev) => {
      const previousState = undoStackRef.current[undoStackRef.current.length - 1];
      undoStackRef.current = undoStackRef.current.slice(0, -1);
      redoStackRef.current = [...redoStackRef.current, prev];
      return previousState;
    });
  }, []);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;

    setValueInternal((prev) => {
      const nextState = redoStackRef.current[redoStackRef.current.length - 1];
      redoStackRef.current = redoStackRef.current.slice(0, -1);
      undoStackRef.current = [...undoStackRef.current, prev];
      return nextState;
    });
  }, []);

  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  return { value, setValue, undo, redo, canUndo, canRedo };
}
