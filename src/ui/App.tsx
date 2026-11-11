import { useCallback, useMemo, useReducer, useRef, useState } from 'react';
import { reducer } from '@core/reducer';
import { exportDoc, importDoc } from '@core/serialize';
import { initialState } from '@core/types';
import type { Action, State } from '@core/types';
import { StatusBar, Toolbar } from '@ui/Toolbar';
import type { ToolbarAction } from '@ui/Toolbar';
import { Canvas } from '@ui/Canvas';
import fixture from '../../fixtures/login-flow.json';

const fixtureDoc = importDoc(fixture);
if (!fixtureDoc.ok) {
  // The fixture is part of the repository, so a broken fixture is a build
  // error, not a runtime condition.
  throw new Error(`The bundled fixture is invalid: ${fixtureDoc.error}`);
}

/**
 * The application shell.
 *
 * All document state lives in one reducer. The components below receive
 * plain props and dispatch actions, so the state transitions are all in
 * `src/core/reducer.ts` where they can be tested without a browser.
 */
export function App() {
  // The default id generator derives ids from the document, so it is safe
  // under React's StrictMode, which calls the reducer twice in development.
  const [state, dispatch] = useReducer(
    (current: State, action: Action) => reducer(current, action),
    initialState(fixtureDoc.ok ? fixtureDoc.doc : undefined),
  );
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { doc, selection, past, future } = state;

  const handleAddNode = useCallback((kind: ToolbarAction) => {
    dispatch({ type: 'ADD_NODE', kind, x: 360, y: 300 });
  }, []);

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const handleRedo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const handleExport = useCallback(() => {
    const blob = new Blob([exportDoc(doc)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flowboard.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [doc]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;

    const text = await file.text();
    const result = importDoc(text);

    if (result.ok) {
      dispatch({ type: 'IMPORT', doc: result.doc });
      setError(null);
    } else {
      // The current document is untouched: an invalid import is never
      // applied partially.
      setError(result.error);
    }
  }, []);

  const selectionLabel = useMemo(() => {
    const nodeCount = selection.nodeIds.length;
    const edgeCount = selection.edgeIds.length;
    if (nodeCount === 0 && edgeCount === 0) return 'none';

    const parts: string[] = [];
    if (nodeCount > 0) parts.push(`${nodeCount} ${nodeCount === 1 ? 'node' : 'nodes'}`);
    if (edgeCount > 0) parts.push(`${edgeCount} ${edgeCount === 1 ? 'edge' : 'edges'}`);
    return parts.join(', ');
  }, [selection]);

  return (
    <div className="app">
      <Toolbar
        onAddNode={handleAddNode}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onImport={handleImport}
        onExport={handleExport}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
      />

      <Canvas doc={doc} selection={selection} dispatch={dispatch} />

      <StatusBar
        nodeCount={doc.nodes.length}
        edgeCount={doc.edges.length}
        selectionLabel={selectionLabel}
      >
        {error ? (
          <span role="alert" className="app__error">
            {error}
          </span>
        ) : null}
      </StatusBar>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        data-testid="import-input"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
