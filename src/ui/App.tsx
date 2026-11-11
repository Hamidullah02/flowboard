import { useState } from 'react';
import { StatusBar, Toolbar } from '@ui/Toolbar';
import type { ToolbarAction } from '@ui/Toolbar';
import { Canvas } from '@ui/Canvas';
import type { ViewDoc } from '@ui/viewModel';
import fixture from '../../fixtures/login-flow.json';

/*
 * Day-1 shell.
 *
 * TODO(hamid): once `src/core/reducer.ts` and `src/core/types.ts` exist,
 * replace the local `ViewDoc` fixture state with `useReducer(reducer, initialState)`
 * and delete `src/ui/viewModel.ts`. Until then this file only proves the layout,
 * the styling, and the build pipeline.
 */
export function App() {
  const [doc] = useState<ViewDoc>(fixture as ViewDoc);
  const [notice, setNotice] = useState<string | null>(null);

  const notWired = (feature: string) => {
    setNotice(`${feature} is not wired yet — it needs src/core/reducer.ts.`);
  };

  const handleAddNode = (kind: ToolbarAction) => {
    notWired(`Adding a ${kind} node`);
  };

  return (
    <div className="app">
      <Toolbar
        onAddNode={handleAddNode}
        onUndo={() => {
          notWired('Undo');
        }}
        onRedo={() => {
          notWired('Redo');
        }}
        onImport={() => {
          notWired('Import');
        }}
        onExport={() => {
          notWired('Export');
        }}
        canUndo={false}
        canRedo={false}
      />

      <Canvas doc={doc} />

      <StatusBar nodeCount={doc.nodes.length} edgeCount={doc.edges.length} selectionLabel="none">
        {notice ? <span role="status">{notice}</span> : null}
      </StatusBar>
    </div>
  );
}
