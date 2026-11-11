import type { ReactNode } from 'react';

export type ToolbarAction = 'rect' | 'diamond' | 'terminal';

export interface ToolbarProps {
  onAddNode: (action: ToolbarAction) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onImport: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canDelete: boolean;
}

/**
 * Top toolbar: node creation, history, and import/export.
 *
 * The toolbar is presentational. It owns no state and knows nothing about the
 * document model, so it stays testable on its own.
 */
export function Toolbar({
  onAddNode,
  onUndo,
  onRedo,
  onDelete,
  onImport,
  onExport,
  canUndo,
  canRedo,
  canDelete,
}: ToolbarProps) {
  return (
    <header className="app__toolbar">
      <span className="app__brand">Flowboard</span>

      <div className="app__group" role="group" aria-label="Add node">
        <button
          type="button"
          className="button"
          onClick={() => {
            onAddNode('rect');
          }}
        >
          Rect
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            onAddNode('diamond');
          }}
        >
          Diamond
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            onAddNode('terminal');
          }}
        >
          Terminal
        </button>
      </div>

      <span className="app__spacer" />

      <div className="app__group" role="group" aria-label="History">
        <button type="button" className="button" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" className="button" onClick={onRedo} disabled={!canRedo}>
          Redo
        </button>
        <button type="button" className="button" onClick={onDelete} disabled={!canDelete}>
          Delete
        </button>
      </div>

      <div className="app__group" role="group" aria-label="Document">
        <button type="button" className="button" onClick={onImport}>
          Import
        </button>
        <button type="button" className="button" onClick={onExport}>
          Export
        </button>
      </div>
    </header>
  );
}

export interface StatusBarProps {
  nodeCount: number;
  edgeCount: number;
  selectionLabel: string;
  children?: ReactNode;
}

/**
 * Bottom status bar: document counts and current selection.
 *
 * The counts are in a live region, so a screen reader announces the change
 * when a node is added or deleted. `aria-live="polite"` means the
 * announcement waits for a pause rather than interrupting whatever the user
 * is reading.
 */
export function StatusBar({ nodeCount, edgeCount, selectionLabel, children }: StatusBarProps) {
  return (
    <footer className="app__status">
      <span aria-live="polite" aria-atomic="true">
        {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}, {edgeCount}{' '}
        {edgeCount === 1 ? 'edge' : 'edges'}
      </span>
      <span aria-live="polite" aria-atomic="true">
        selection: {selectionLabel}
      </span>
      {children}
    </footer>
  );
}
