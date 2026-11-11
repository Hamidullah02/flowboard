import { describe, expect, it } from 'vitest';
import { reducer } from '@core/reducer';
import { createCounterIdGenerator, emptyDoc, initialState, nextFreeId } from '@core/types';
import type { Doc, FlowNode, State } from '@core/types';

const deps = { nextId: createCounterIdGenerator() };

function node(id: string, overrides: Partial<FlowNode> = {}): FlowNode {
  return { id, kind: 'rect', x: 0, y: 0, w: 120, h: 60, label: id, ...overrides };
}

function docWith(nodes: FlowNode[]): Doc {
  return { version: 1, nodes, edges: [] };
}

describe('ADD_NODE', () => {
  it('adds a snapped node and selects it', () => {
    const next = reducer(initialState(), { type: 'ADD_NODE', kind: 'rect', x: 123, y: 87 }, deps);

    expect(next.doc.nodes).toHaveLength(1);
    expect(next.doc.nodes[0]?.x).toBe(120);
    expect(next.doc.nodes[0]?.y).toBe(90);
    expect(next.doc.nodes[0]?.kind).toBe('rect');
    expect(next.selection.nodeIds).toEqual([next.doc.nodes[0]?.id]);
  });

  it('records one history entry', () => {
    const next = reducer(initialState(), { type: 'ADD_NODE', kind: 'rect', x: 0, y: 0 }, deps);
    expect(next.past).toHaveLength(1);
    expect(next.future).toHaveLength(0);
  });
});

describe('MOVE_NODE', () => {
  it('moves a node to a snapped position', () => {
    const state = initialState(docWith([node('n1')]));

    const next = reducer(state, { type: 'MOVE_NODE', id: 'n1', x: 55, y: 65 }, deps);

    expect(next.doc.nodes[0]?.x).toBe(60);
    expect(next.doc.nodes[0]?.y).toBe(70);
  });

  it('ignores a move of an unknown node', () => {
    const state = initialState(docWith([node('n1')]));
    const next = reducer(state, { type: 'MOVE_NODE', id: 'nope', x: 10, y: 10 }, deps);

    expect(next).toBe(state);
  });

  it('does not create a history entry when the node does not move', () => {
    const state = initialState(docWith([node('n1')]));

    const next = reducer(state, { type: 'MOVE_NODE', id: 'n1', x: 0, y: 0 }, deps);

    expect(next).toBe(state);
    expect(next.past).toHaveLength(0);
  });
});

describe('RENAME_NODE', () => {
  it('renames a node', () => {
    const state = initialState(docWith([node('n1')]));

    const next = reducer(state, { type: 'RENAME_NODE', id: 'n1', label: 'Start' }, deps);

    expect(next.doc.nodes[0]?.label).toBe('Start');
  });

  it('ignores a rename of an unknown node', () => {
    const state = initialState(docWith([node('n1')]));
    expect(reducer(state, { type: 'RENAME_NODE', id: 'nope', label: 'x' }, deps)).toBe(state);
  });

  it('does not create a history entry when the label is unchanged', () => {
    const state = initialState(docWith([node('n1', { label: 'Same' })]));

    const next = reducer(state, { type: 'RENAME_NODE', id: 'n1', label: 'Same' }, deps);

    expect(next).toBe(state);
  });
});

describe('ADD_EDGE', () => {
  const twoNodes = docWith([node('n1'), node('n2')]);

  it('adds an edge between two existing nodes', () => {
    const next = reducer(
      initialState(twoNodes),
      {
        type: 'ADD_EDGE',
        from: { nodeId: 'n1', side: 'right' },
        to: { nodeId: 'n2', side: 'left' },
      },
      deps,
    );

    expect(next.doc.edges).toHaveLength(1);
    expect(next.past).toHaveLength(1);
  });

  it('rejects an edge to an unknown node', () => {
    const state = initialState(twoNodes);
    const next = reducer(
      state,
      {
        type: 'ADD_EDGE',
        from: { nodeId: 'n1', side: 'right' },
        to: { nodeId: 'ghost', side: 'left' },
      },
      deps,
    );

    expect(next).toBe(state);
  });

  it('allows the same pair of nodes on different sides', () => {
    const next = reducer(
      initialState(twoNodes),
      {
        type: 'ADD_EDGE',
        from: { nodeId: 'n1', side: 'right' },
        to: { nodeId: 'n2', side: 'left' },
      },
      deps,
    );

    const second = reducer(
      next,
      {
        type: 'ADD_EDGE',
        from: { nodeId: 'n1', side: 'bottom' },
        to: { nodeId: 'n2', side: 'top' },
      },
      deps,
    );

    expect(second.doc.edges).toHaveLength(2);
  });
});

describe('DELETE_SELECTION', () => {
  it('deletes selected edges only', () => {
    const doc: Doc = {
      version: 1,
      nodes: [node('n1'), node('n2')],
      edges: [
        { id: 'e1', from: { nodeId: 'n1', side: 'right' }, to: { nodeId: 'n2', side: 'left' } },
      ],
    };

    const selected = reducer(initialState(doc), { type: 'SELECT', edgeIds: ['e1'] });
    const next = reducer(selected, { type: 'DELETE_SELECTION' }, deps);

    expect(next.doc.edges).toHaveLength(0);
    expect(next.doc.nodes).toHaveLength(2);
  });

  it('does nothing when nothing is selected', () => {
    const state = initialState(docWith([node('n1')]));
    expect(reducer(state, { type: 'DELETE_SELECTION' }, deps)).toBe(state);
  });
});

describe('SELECT', () => {
  it('replaces the selection', () => {
    const state = initialState(docWith([node('n1'), node('n2')]));

    const next = reducer(state, { type: 'SELECT', nodeIds: ['n2'] }, deps);

    expect(next.selection.nodeIds).toEqual(['n2']);
    expect(next.selection.edgeIds).toEqual([]);
  });

  it('clears the selection when called with no arguments', () => {
    const state = reducer(initialState(), { type: 'SELECT', nodeIds: ['n1'] }, deps);

    const next = reducer(state, { type: 'SELECT' }, deps);

    expect(next.selection.nodeIds).toEqual([]);
  });

  it('creates no history entry', () => {
    const state = initialState();

    const next = reducer(state, { type: 'SELECT', nodeIds: ['n1'] }, deps);

    expect(next.past).toHaveLength(0);
    expect(next.future).toHaveLength(0);
  });
});

describe('IMPORT', () => {
  it('replaces the document and clears the selection', () => {
    const state = reducer(initialState(), { type: 'SELECT', nodeIds: ['n1'] }, deps);

    const next = reducer(state, { type: 'IMPORT', doc: docWith([node('x')]) }, deps);

    expect(next.doc.nodes.map((n) => n.id)).toEqual(['x']);
    expect(next.selection.nodeIds).toEqual([]);
    expect(next.past).toHaveLength(1);
  });
});

describe('history', () => {
  function edit(state: State, label: string): State {
    return reducer(state, { type: 'RENAME_NODE', id: 'n1', label }, deps);
  }

  it('undo is a no-op when there is no history', () => {
    const state = initialState(docWith([node('n1')]));
    expect(reducer(state, { type: 'UNDO' }, deps)).toBe(state);
  });

  it('redo is a no-op when there is no future', () => {
    const state = initialState(docWith([node('n1')]));
    expect(reducer(state, { type: 'REDO' }, deps)).toBe(state);
  });

  it('restores the previous document on undo', () => {
    const state = initialState(docWith([node('n1')]));
    const edited = edit(state, 'Edited');

    const undone = reducer(edited, { type: 'UNDO' }, deps);

    expect(undone.doc.nodes[0]?.label).toBe('n1');
    expect(undone.past).toHaveLength(0);
    expect(undone.future).toHaveLength(1);
  });

  it('reapplies the edit on redo', () => {
    const state = initialState(docWith([node('n1')]));
    const edited = edit(state, 'Edited');
    const undone = reducer(edited, { type: 'UNDO' }, deps);

    const redone = reducer(undone, { type: 'REDO' }, deps);

    expect(redone.doc.nodes[0]?.label).toBe('Edited');
    expect(redone.past).toHaveLength(1);
    expect(redone.future).toHaveLength(0);
  });

  it('clears the future when a new edit is made after an undo', () => {
    const state = initialState(docWith([node('n1')]));
    const edited = edit(state, 'One');
    const undone = reducer(edited, { type: 'UNDO' }, deps);

    const reEdited = edit(undone, 'Two');

    expect(reEdited.future).toHaveLength(0);
    expect(reEdited.doc.nodes[0]?.label).toBe('Two');
  });

  it('caps the history at 100 entries and drops the oldest', () => {
    let state = initialState(docWith([node('n1')]));

    for (let index = 0; index < 101; index++) {
      state = edit(state, `Label ${index}`);
    }

    expect(state.past).toHaveLength(100);
    // The oldest surviving entry is the document before edit #1.
    const oldest = state.past[0];
    expect(oldest?.nodes[0]?.label).toBe('Label 0');
  });

  it('does not create a history entry for a selection change', () => {
    const state = initialState(docWith([node('n1')]));

    const next = reducer(state, { type: 'SELECT', nodeIds: ['n1'] }, deps);

    expect(next.past).toHaveLength(0);
  });
});

describe('emptyDoc', () => {
  it('creates an empty document', () => {
    expect(emptyDoc()).toEqual({ version: 1, nodes: [], edges: [] });
  });
});

describe('edge cases', () => {
  it('moves only the targeted node', () => {
    const state = initialState(docWith([node('n1'), node('n2', { x: 50, y: 50 })]));

    const next = reducer(state, { type: 'MOVE_NODE', id: 'n1', x: 10, y: 10 }, deps);

    expect(next.doc.nodes[0]?.x).toBe(10);
    expect(next.doc.nodes[1]?.x).toBe(50);
  });

  it('renames only the targeted node', () => {
    const state = initialState(docWith([node('n1'), node('n2')]));

    const next = reducer(state, { type: 'RENAME_NODE', id: 'n1', label: 'Renamed' }, deps);

    expect(next.doc.nodes[0]?.label).toBe('Renamed');
    expect(next.doc.nodes[1]?.label).toBe('n2');
  });

  describe('nextFreeId', () => {
    it('starts at 1 for an empty document', () => {
      expect(nextFreeId('n', emptyDoc())).toBe('n1');
      expect(nextFreeId('e', emptyDoc())).toBe('e1');
    });

    it('returns the first free number for the prefix', () => {
      const doc = docWith([node('n1'), node('n2')]);
      expect(nextFreeId('n', doc)).toBe('n3');
    });

    it('ignores ids that do not follow the prefix pattern', () => {
      const doc = docWith([node('start'), node('n1')]);
      expect(nextFreeId('n', doc)).toBe('n2');
    });

    it('ignores a non-numeric suffix', () => {
      const doc = docWith([node('n1'), node('nX')]);
      expect(nextFreeId('n', doc)).toBe('n2');
    });

    it('looks at edges as well as nodes', () => {
      const doc: Doc = {
        version: 1,
        nodes: [node('n1')],
        edges: [
          { id: 'e1', from: { nodeId: 'n1', side: 'top' }, to: { nodeId: 'n1', side: 'bottom' } },
        ],
      };
      expect(nextFreeId('e', doc)).toBe('e2');
    });

    it('gives the same answer when called twice with the same document', () => {
      // React's StrictMode calls the reducer twice in development. A generator
      // with hidden state would hand out two different ids there.
      const doc = docWith([node('n1')]);
      expect(nextFreeId('n', doc)).toBe(nextFreeId('n', doc));
    });

    it('is the default id generator', () => {
      const state = initialState(docWith([node('n1'), node('n2')]));

      const next = reducer(state, { type: 'ADD_NODE', kind: 'rect', x: 0, y: 0 });

      expect(next.doc.nodes[2]?.id).toBe('n3');
    });

    it('keeps node and edge counters apart', () => {
      const state = initialState(docWith([node('n1')]));

      const next = reducer(state, {
        type: 'ADD_EDGE',
        from: { nodeId: 'n1', side: 'top' },
        to: { nodeId: 'n1', side: 'bottom' },
      });

      // A self-loop is rejected, so the edge id is never used.
      expect(next.doc.edges).toHaveLength(0);
    });
  });
  it('deletes an edge whose source node is deleted', () => {
    const doc: Doc = {
      version: 1,
      nodes: [node('n1'), node('n2')],
      edges: [
        { id: 'e1', from: { nodeId: 'n1', side: 'right' }, to: { nodeId: 'n2', side: 'left' } },
      ],
    };

    const selected = reducer(initialState(doc), { type: 'SELECT', nodeIds: ['n1'] });
    const next = reducer(selected, { type: 'DELETE_SELECTION' }, deps);

    expect(next.doc.edges).toHaveLength(0);
  });

  it('deletes an edge whose target node is deleted', () => {
    const doc: Doc = {
      version: 1,
      nodes: [node('n1'), node('n2')],
      edges: [
        { id: 'e1', from: { nodeId: 'n1', side: 'right' }, to: { nodeId: 'n2', side: 'left' } },
      ],
    };

    const selected = reducer(initialState(doc), { type: 'SELECT', nodeIds: ['n2'] });
    const next = reducer(selected, { type: 'DELETE_SELECTION' }, deps);

    expect(next.doc.edges).toHaveLength(0);
  });

  it('keeps edges that touch no deleted node', () => {
    const doc: Doc = {
      version: 1,
      nodes: [node('n1'), node('n2'), node('n3')],
      edges: [
        { id: 'e1', from: { nodeId: 'n2', side: 'right' }, to: { nodeId: 'n3', side: 'left' } },
      ],
    };

    const selected = reducer(initialState(doc), { type: 'SELECT', nodeIds: ['n1'] });
    const next = reducer(selected, { type: 'DELETE_SELECTION' }, deps);

    expect(next.doc.edges).toHaveLength(1);
  });
});
