/*
 * The document model.
 *
 * Everything in `src/core/` is plain TypeScript: no React, no DOM, no
 * randomness. The reducer is a pure function, so every rule about the
 * document can be tested without a browser.
 */

export type NodeKind = 'rect' | 'diamond' | 'terminal';

export type PortSide = 'top' | 'right' | 'bottom' | 'left';

export const NODE_KINDS: readonly NodeKind[] = ['rect', 'diamond', 'terminal'];

export const PORT_SIDES: readonly PortSide[] = ['top', 'right', 'bottom', 'left'];

/** Maximum number of history entries kept in `past`. */
export const HISTORY_LIMIT = 100;

/** The bounding box of a node. `x, y` is the top-left corner. */
export interface FlowNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

/** One end of an edge: a node plus the side the edge attaches to. */
export interface EdgeEnd {
  nodeId: string;
  side: PortSide;
}

export interface FlowEdge {
  id: string;
  from: EdgeEnd;
  to: EdgeEnd;
}

/** A whole flowchart document. */
export interface Doc {
  version: 1;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface Selection {
  nodeIds: string[];
  edgeIds: string[];
}

export interface State {
  doc: Doc;
  selection: Selection;
  past: Doc[];
  future: Doc[];
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

export type Action =
  | { type: 'ADD_NODE'; kind: NodeKind; x: number; y: number }
  | { type: 'MOVE_NODE'; id: string; x: number; y: number }
  | { type: 'RENAME_NODE'; id: string; label: string }
  | { type: 'ADD_EDGE'; from: EdgeEnd; to: EdgeEnd }
  | { type: 'DELETE_SELECTION' }
  | { type: 'SELECT'; nodeIds?: string[]; edgeIds?: string[] }
  | { type: 'IMPORT'; doc: Doc }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export type ActionType = Action['type'];

/* -------------------------------------------------------------------------- */
/* Ids                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Injectable side effects.
 *
 * The reducer needs an id for new nodes and edges. Ids are derived from the
 * document by default, which keeps the reducer pure, but the generator is
 * injected so tests can drive the numbering explicitly.
 *
 * The generator receives the document it is generating an id for, because the
 * default implementation needs it.
 */
export interface ReducerDeps {
  /** Returns the next unused id for the given prefix, e.g. `n1`, `e1`. */
  nextId: (prefix: 'n' | 'e', doc: Doc) => string;
}

/**
 * The default id generator: the first free number for the prefix.
 *
 * It reads the document rather than keeping a counter, so calling it twice
 * with the same document gives the same answer. That matters because React's
 * StrictMode calls a reducer twice in development to surface impurity; a
 * counter would burn two ids per change and hand out `n2` where `n1` was
 * meant.
 */
export function nextFreeId(prefix: 'n' | 'e', doc: Doc): string {
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  let highest = 0;

  const consider = (id: string) => {
    const match = pattern.exec(id);
    if (!match) return;

    const value = Number(match[1]);
    if (Number.isInteger(value) && value > highest) highest = value;
  };

  for (const node of doc.nodes) consider(node.id);
  for (const edge of doc.edges) consider(edge.id);

  return `${prefix}${highest + 1}`;
}

export const defaultDeps: ReducerDeps = {
  nextId: nextFreeId,
};

/**
 * A deterministic id generator that counts up: `n1`, `n2`, ... and `e1`, `e2`,
 * ...
 *
 * Useful in tests that want to assert on exact ids. The counter is per
 * prefix, so node and edge ids never collide.
 */
export function createCounterIdGenerator(): ReducerDeps['nextId'] {
  const counters: Record<'n' | 'e', number> = { n: 0, e: 0 };
  return (prefix) => {
    counters[prefix] += 1;
    return `${prefix}${counters[prefix]}`;
  };
}

/* -------------------------------------------------------------------------- */
/* Empty state                                                                */
/* -------------------------------------------------------------------------- */

/** An empty document. */
export function emptyDoc(): Doc {
  return { version: 1, nodes: [], edges: [] };
}

/** An empty state, with no history. */
export function initialState(doc: Doc = emptyDoc()): State {
  return {
    doc,
    selection: { nodeIds: [], edgeIds: [] },
    past: [],
    future: [],
  };
}
