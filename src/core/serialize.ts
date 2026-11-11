/*
 * Serialization.
 *
 * Export is plain JSON. Import validates the shape and the invariants first
 * and never applies a document partially: either the whole document is
 * accepted, or the current document is left untouched and an error is
 * returned.
 */

import { NODE_KINDS, PORT_SIDES } from '@core/types';
import type { Doc, EdgeEnd, FlowEdge, FlowNode, NodeKind, PortSide } from '@core/types';

export type ImportResult = { ok: true; doc: Doc } | { ok: false; error: string };

/**
 * The result of one parsing step.
 *
 * A discriminated union rather than an object with optional fields: with
 * `exactOptionalPropertyTypes` on, `{ error: string | undefined }` is not
 * assignable to `{ error?: string }`, and the union also removes the
 * "which field is set?" question at every call site.
 */
type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Serialise a document. The `version` field is what makes the format
 * forward-compatible: a future version can be detected on import.
 */
export function exportDoc(doc: Doc): string {
  return JSON.stringify(doc, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNodeKind(value: unknown): value is NodeKind {
  return typeof value === 'string' && (NODE_KINDS as readonly string[]).includes(value);
}

function isPortSide(value: unknown): value is PortSide {
  return typeof value === 'string' && (PORT_SIDES as readonly string[]).includes(value);
}

function parseNode(value: unknown, index: number): ParseResult<FlowNode> {
  if (!isRecord(value)) {
    return { ok: false, error: `Node at index ${index} is not an object.` };
  }

  const id = value['id'];
  if (typeof id !== 'string' || id.length === 0) {
    return { ok: false, error: `Node at index ${index} has no valid id.` };
  }

  const kind = value['kind'];
  if (!isNodeKind(kind)) {
    return { ok: false, error: `Node "${id}" has an unknown kind.` };
  }

  const label = value['label'];
  if (typeof label !== 'string') {
    return { ok: false, error: `Node "${id}" has an invalid label.` };
  }

  const x = value['x'];
  const y = value['y'];
  const w = value['w'];
  const h = value['h'];
  if (
    typeof x !== 'number' ||
    !Number.isFinite(x) ||
    typeof y !== 'number' ||
    !Number.isFinite(y) ||
    typeof w !== 'number' ||
    !Number.isFinite(w) ||
    typeof h !== 'number' ||
    !Number.isFinite(h)
  ) {
    return { ok: false, error: `Node "${id}" has an invalid position or size.` };
  }

  return { ok: true, value: { id, kind, x, y, w, h, label } };
}

function parseEdgeEnd(value: unknown, edgeId: string): ParseResult<EdgeEnd> {
  if (!isRecord(value)) {
    return { ok: false, error: `Edge "${edgeId}" has an invalid endpoint.` };
  }

  const nodeId = value['nodeId'];
  if (typeof nodeId !== 'string' || nodeId.length === 0) {
    return { ok: false, error: `Edge "${edgeId}" has an endpoint without a node id.` };
  }

  const side = value['side'];
  if (!isPortSide(side)) {
    return { ok: false, error: `Edge "${edgeId}" has an endpoint with an unknown side.` };
  }

  return { ok: true, value: { nodeId, side } };
}

function parseEdge(value: unknown, index: number): ParseResult<FlowEdge> {
  if (!isRecord(value)) {
    return { ok: false, error: `Edge at index ${index} is not an object.` };
  }

  const id = value['id'];
  if (typeof id !== 'string' || id.length === 0) {
    return { ok: false, error: `Edge at index ${index} has no valid id.` };
  }

  const from = parseEdgeEnd(value['from'], id);
  if (!from.ok) return from;

  const to = parseEdgeEnd(value['to'], id);
  if (!to.ok) return to;

  return { ok: true, value: { id, from: from.value, to: to.value } };
}

/**
 * Parse and validate a document.
 *
 * The raw input may be a JSON string or an already-parsed value. Validation
 * covers the shape and every invariant the reducer maintains, so an invalid
 * document can never enter the app.
 */
export function importDoc(raw: unknown): ImportResult {
  let parsed: unknown = raw;

  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return { ok: false, error: 'The file is not valid JSON.' };
    }
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'The document must be a JSON object.' };
  }
  if (parsed['version'] !== 1) {
    return { ok: false, error: `Unsupported document version: ${String(parsed['version'])}.` };
  }
  if (!Array.isArray(parsed['nodes'])) {
    return { ok: false, error: 'The document must contain a "nodes" array.' };
  }
  if (!Array.isArray(parsed['edges'])) {
    return { ok: false, error: 'The document must contain an "edges" array.' };
  }

  const nodes: FlowNode[] = [];
  const seenNodeIds = new Set<string>();

  for (const [index, rawNode] of (parsed['nodes'] as unknown[]).entries()) {
    const result = parseNode(rawNode, index);
    if (!result.ok) return { ok: false, error: result.error };

    if (seenNodeIds.has(result.value.id)) {
      return { ok: false, error: `Duplicate node id: "${result.value.id}".` };
    }
    seenNodeIds.add(result.value.id);
    nodes.push(result.value);
  }

  const edges: FlowEdge[] = [];
  const seenEdgeIds = new Set<string>();
  const seenEdgePairs = new Set<string>();

  for (const [index, rawEdge] of (parsed['edges'] as unknown[]).entries()) {
    const result = parseEdge(rawEdge, index);
    if (!result.ok) return { ok: false, error: result.error };

    const edge = result.value;

    if (seenEdgeIds.has(edge.id)) {
      return { ok: false, error: `Duplicate edge id: "${edge.id}".` };
    }
    seenEdgeIds.add(edge.id);

    if (!seenNodeIds.has(edge.from.nodeId)) {
      return { ok: false, error: `Edge "${edge.id}" starts at an unknown node.` };
    }
    if (!seenNodeIds.has(edge.to.nodeId)) {
      return { ok: false, error: `Edge "${edge.id}" ends at an unknown node.` };
    }
    if (edge.from.nodeId === edge.to.nodeId) {
      return { ok: false, error: `Edge "${edge.id}" is a self-loop.` };
    }

    const pairKey = `${edge.from.nodeId}:${edge.from.side}-${edge.to.nodeId}:${edge.to.side}`;
    if (seenEdgePairs.has(pairKey)) {
      return { ok: false, error: `Edge "${edge.id}" duplicates another edge.` };
    }
    seenEdgePairs.add(pairKey);

    edges.push(edge);
  }

  return { ok: true, doc: { version: 1, nodes, edges } };
}
