/*
 * The reducer.
 *
 * `reducer(state, action)` is a pure function: same state and action always
 * give the same result, and nothing outside the returned value changes.
 * No React, no DOM, no randomness — the id generator is injected.
 *
 * History lives here rather than in a separate `history.ts` (Option A). The
 * rules are four sentences and three branches; splitting them into a second
 * file would scatter the knowledge of "what counts as a history entry" across
 * two modules without making either one easier to test.
 */

import { snap } from '@core/geometry';
import { defaultDeps, emptyDoc, HISTORY_LIMIT } from '@core/types';
import type { Action, Doc, EdgeEnd, FlowEdge, FlowNode, ReducerDeps, State } from '@core/types';

/* -------------------------------------------------------------------------- */
/* History                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Push the current document onto the history stack.
 *
 * The document pushed is the one *before* the change: `past` is a stack of
 * documents you can return to. `future` is cleared because a new change
 * invalidates the redo branch.
 */
function pushHistory(state: State, nextDoc: Doc): State {
  const past = [...state.past, state.doc];
  // Keep only the most recent entries, so memory stays bounded.
  const trimmed = past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past;

  return {
    ...state,
    doc: nextDoc,
    past: trimmed,
    future: [],
  };
}

/**
 * Step one document back. The current document moves onto `future`.
 */
function undo(state: State): State {
  const previous = state.past[state.past.length - 1];
  if (previous === undefined) return state;

  return {
    ...state,
    doc: previous,
    past: state.past.slice(0, -1),
    future: [...state.future, state.doc],
  };
}

/**
 * Step one document forward. The current document moves onto `past`.
 */
function redo(state: State): State {
  const next = state.future[state.future.length - 1];
  if (next === undefined) return state;

  return {
    ...state,
    doc: next,
    past: [...state.past, state.doc],
    future: state.future.slice(0, -1),
  };
}

/* -------------------------------------------------------------------------- */
/* Document helpers                                                            */
/* -------------------------------------------------------------------------- */

function findNode(doc: Doc, id: string): FlowNode | undefined {
  return doc.nodes.find((node) => node.id === id);
}

/**
 * Whether an edge would be invalid: a self-loop, or a duplicate of an edge
 * that already exists.
 *
 * Two edges are duplicates when they connect the same pair of nodes via the
 * same pair of sides.
 */
function isInvalidEdge(doc: Doc, from: EdgeEnd, to: EdgeEnd): boolean {
  if (from.nodeId === to.nodeId) return true;

  return doc.edges.some(
    (edge) =>
      edge.from.nodeId === from.nodeId &&
      edge.from.side === from.side &&
      edge.to.nodeId === to.nodeId &&
      edge.to.side === to.side,
  );
}

/** Delete the selected nodes, and every edge that touches them. */
function deleteSelection(doc: Doc, selection: State['selection']): Doc {
  const removedNodeIds = new Set(selection.nodeIds);
  const removedEdgeIds = new Set(selection.edgeIds);

  const nodes = doc.nodes.filter((node) => !removedNodeIds.has(node.id));
  const edges = doc.edges.filter(
    (edge) =>
      !removedEdgeIds.has(edge.id) &&
      !removedNodeIds.has(edge.from.nodeId) &&
      !removedNodeIds.has(edge.to.nodeId),
  );

  return { ...doc, nodes, edges };
}

/* -------------------------------------------------------------------------- */
/* The reducer                                                                 */
/* -------------------------------------------------------------------------- */

export function reducer(state: State, action: Action, deps: ReducerDeps = defaultDeps): State {
  switch (action.type) {
    case 'ADD_NODE': {
      const id = deps.nextId('n', state.doc);
      const node: FlowNode = {
        id,
        kind: action.kind,
        x: snap(action.x),
        y: snap(action.y),
        w: 120,
        h: 60,
        label: '',
      };

      const nextDoc: Doc = { ...state.doc, nodes: [...state.doc.nodes, node] };
      const nextState = pushHistory(state, nextDoc);
      return { ...nextState, selection: { nodeIds: [id], edgeIds: [] } };
    }

    case 'MOVE_NODE': {
      const node = findNode(state.doc, action.id);
      if (!node) return state;

      const x = snap(action.x);
      const y = snap(action.y);
      // Moving a node to where it already is is not a change, so it must not
      // cost an undo step.
      if (node.x === x && node.y === y) return state;

      const nodes = state.doc.nodes.map((candidate) =>
        candidate.id === action.id ? { ...candidate, x, y } : candidate,
      );

      return pushHistory(state, { ...state.doc, nodes });
    }

    case 'RENAME_NODE': {
      const node = findNode(state.doc, action.id);
      if (!node) return state;
      if (node.label === action.label) return state;

      const nodes = state.doc.nodes.map((candidate) =>
        candidate.id === action.id ? { ...candidate, label: action.label } : candidate,
      );

      return pushHistory(state, { ...state.doc, nodes });
    }

    case 'ADD_EDGE': {
      if (!findNode(state.doc, action.from.nodeId)) return state;
      if (!findNode(state.doc, action.to.nodeId)) return state;
      if (isInvalidEdge(state.doc, action.from, action.to)) return state;

      const edge: FlowEdge = {
        id: deps.nextId('e', state.doc),
        from: action.from,
        to: action.to,
      };

      return pushHistory(state, { ...state.doc, edges: [...state.doc.edges, edge] });
    }

    case 'DELETE_SELECTION': {
      const { nodeIds, edgeIds } = state.selection;
      if (nodeIds.length === 0 && edgeIds.length === 0) return state;

      const nextDoc = deleteSelection(state.doc, state.selection);
      return {
        ...pushHistory(state, nextDoc),
        selection: { nodeIds: [], edgeIds: [] },
      };
    }

    case 'SELECT': {
      // Selection never creates a history entry and never clears `future`.
      return {
        ...state,
        selection: {
          nodeIds: action.nodeIds ?? [],
          edgeIds: action.edgeIds ?? [],
        },
      };
    }

    case 'IMPORT': {
      const nextDoc = action.doc;
      const nextState = pushHistory(state, nextDoc);
      return { ...nextState, selection: { nodeIds: [], edgeIds: [] } };
    }

    case 'UNDO':
      return undo(state);

    case 'REDO':
      return redo(state);
  }
}

export { emptyDoc };
