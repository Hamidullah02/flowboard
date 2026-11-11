import { describe, expect, it } from 'vitest';
import { exportDoc, importDoc } from '@core/serialize';
import type { Doc } from '@core/types';

const DOC: Doc = {
  version: 1,
  nodes: [
    { id: 'n1', kind: 'rect', x: 0, y: 0, w: 120, h: 60, label: 'Start' },
    { id: 'n2', kind: 'diamond', x: 100, y: 200, w: 120, h: 80, label: 'Valid?' },
  ],
  edges: [{ id: 'e1', from: { nodeId: 'n1', side: 'bottom' }, to: { nodeId: 'n2', side: 'top' } }],
};

describe('exportDoc', () => {
  it('produces indented JSON', () => {
    expect(exportDoc(DOC)).toBe(JSON.stringify(DOC, null, 2));
  });

  it('includes the version field', () => {
    expect(exportDoc(DOC)).toContain('"version": 1');
  });
});

describe('importDoc', () => {
  it('accepts a valid document string', () => {
    const result = importDoc(exportDoc(DOC));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.doc).toEqual(DOC);
  });

  it('accepts an already-parsed document', () => {
    const result = importDoc(DOC);
    expect(result.ok).toBe(true);
  });

  it('rejects text that is not JSON', () => {
    const result = importDoc('not json at all');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toMatch(/not valid JSON/i);
  });

  it('rejects a JSON value that is not an object', () => {
    expect(importDoc('42').ok).toBe(false);
    expect(importDoc('[1,2,3]').ok).toBe(false);
    expect(importDoc('null').ok).toBe(false);
  });

  it('rejects an unsupported version', () => {
    const result = importDoc({ version: 2, nodes: [], edges: [] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toMatch(/version/i);
  });

  it('rejects a document without nodes or edges arrays', () => {
    expect(importDoc({ version: 1, edges: [] }).ok).toBe(false);
    expect(importDoc({ version: 1, nodes: [] }).ok).toBe(false);
  });

  it('rejects a node without an id', () => {
    const result = importDoc({
      version: 1,
      nodes: [{ kind: 'rect', x: 0, y: 0, w: 1, h: 1 }],
      edges: [],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a node with an unknown kind', () => {
    const result = importDoc({
      version: 1,
      nodes: [{ id: 'n1', kind: 'circle', x: 0, y: 0, w: 1, h: 1, label: '' }],
      edges: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toMatch(/kind/i);
  });

  it('rejects a node with a non-numeric position', () => {
    const result = importDoc({
      version: 1,
      nodes: [{ id: 'n1', kind: 'rect', x: 'left', y: 0, w: 1, h: 1, label: '' }],
      edges: [],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects duplicate node ids', () => {
    const node = { id: 'n1', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' };
    const result = importDoc({ version: 1, nodes: [node, node], edges: [] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toMatch(/duplicate/i);
  });

  it('rejects an edge that points at an unknown node', () => {
    const result = importDoc({
      version: 1,
      nodes: [],
      edges: [{ id: 'e1', from: { nodeId: 'n1', side: 'top' }, to: { nodeId: 'n2', side: 'top' } }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a self-loop', () => {
    const result = importDoc({
      version: 1,
      nodes: [{ id: 'n1', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' }],
      edges: [{ id: 'e1', from: { nodeId: 'n1', side: 'top' }, to: { nodeId: 'n1', side: 'top' } }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toMatch(/self-loop/i);
  });

  it('rejects duplicate edges', () => {
    const result = importDoc({
      version: 1,
      nodes: [
        { id: 'n1', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' },
        { id: 'n2', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' },
      ],
      edges: [
        { id: 'e1', from: { nodeId: 'n1', side: 'top' }, to: { nodeId: 'n2', side: 'top' } },
        { id: 'e2', from: { nodeId: 'n1', side: 'top' }, to: { nodeId: 'n2', side: 'top' } },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toMatch(/duplicates/i);
  });

  it('rejects an edge with an unknown side', () => {
    const result = importDoc({
      version: 1,
      nodes: [
        { id: 'n1', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' },
        { id: 'n2', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' },
      ],
      edges: [
        { id: 'e1', from: { nodeId: 'n1', side: 'middle' }, to: { nodeId: 'n2', side: 'top' } },
      ],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an edge without an id', () => {
    const result = importDoc({
      version: 1,
      nodes: [
        { id: 'n1', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' },
        { id: 'n2', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' },
      ],
      edges: [{ from: { nodeId: 'n1', side: 'top' }, to: { nodeId: 'n2', side: 'top' } }],
    });
    expect(result.ok).toBe(false);
  });
});

describe('malformed input', () => {
  it('rejects a node that is not an object', () => {
    const result = importDoc({ version: 1, nodes: ['nope'], edges: [] });
    expect(result.ok).toBe(false);
  });

  it('rejects an edge that is not an object', () => {
    const result = importDoc({ version: 1, nodes: [], edges: ['nope'] });
    expect(result.ok).toBe(false);
  });

  it('rejects an edge endpoint that is not an object', () => {
    const result = importDoc({
      version: 1,
      nodes: [
        { id: 'n1', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' },
        { id: 'n2', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' },
      ],
      edges: [{ id: 'e1', from: 'top', to: { nodeId: 'n2', side: 'top' } }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an edge endpoint without a node id', () => {
    const result = importDoc({
      version: 1,
      nodes: [
        { id: 'n1', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' },
        { id: 'n2', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' },
      ],
      edges: [{ id: 'e1', from: { side: 'top' }, to: { nodeId: 'n2', side: 'top' } }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects duplicate edge ids', () => {
    const result = importDoc({
      version: 1,
      nodes: [
        { id: 'n1', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' },
        { id: 'n2', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' },
        { id: 'n3', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' },
      ],
      edges: [
        { id: 'e1', from: { nodeId: 'n1', side: 'top' }, to: { nodeId: 'n2', side: 'top' } },
        { id: 'e1', from: { nodeId: 'n1', side: 'bottom' }, to: { nodeId: 'n3', side: 'top' } },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toMatch(/duplicate edge id/i);
  });

  it('rejects an edge whose target node is unknown', () => {
    const result = importDoc({
      version: 1,
      nodes: [{ id: 'n1', kind: 'rect', x: 0, y: 0, w: 1, h: 1, label: '' }],
      edges: [
        { id: 'e1', from: { nodeId: 'n1', side: 'top' }, to: { nodeId: 'ghost', side: 'top' } },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toMatch(/ends at an unknown node/i);
  });
});
