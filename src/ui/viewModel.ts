/*
 * Day-1 stand-in for `src/core/types.ts`.
 *
 * TODO(hamid): delete this file the moment `src/core/types.ts` lands and import
 * the real types from `@core/types` instead. Nothing in `src/core/` may import
 * from here — the dependency only ever points ui -> core.
 */

export type NodeKind = 'rect' | 'diamond' | 'terminal';

export interface ViewNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface ViewEdge {
  id: string;
  from: { nodeId: string; side: 'top' | 'right' | 'bottom' | 'left' };
  to: { nodeId: string; side: 'top' | 'right' | 'bottom' | 'left' };
}

export interface ViewDoc {
  version: 1;
  nodes: ViewNode[];
  edges: ViewEdge[];
}
