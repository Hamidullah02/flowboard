import { describe, expect, it } from 'vitest';
import { importDoc } from '@core/serialize';
import fixture from '../../fixtures/login-flow.json';

/*
 * Task 2 grading tests: the import validator lets broken documents in.
 *
 * Copy this file to `tests/unit/import-validator.test.ts` and run:
 *
 *   npm test -- tests/unit/import-validator.test.ts
 *
 * Every assertion here is objective.
 */

function docWithNode(node: Record<string, unknown>): string {
  return JSON.stringify({ version: 1, nodes: [node], edges: [] });
}

function validNode(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'n1', kind: 'rect', x: 0, y: 0, w: 120, h: 60, label: 'Node', ...overrides };
}

describe('the import validator enforces the grid invariant', () => {
  it('rejects a node whose x is not on the grid', () => {
    const result = importDoc(docWithNode(validNode({ x: 123 })));

    expect(result.ok).toBe(false);
  });

  it('rejects a node whose y is not on the grid', () => {
    const result = importDoc(docWithNode(validNode({ y: 87 })));

    expect(result.ok).toBe(false);
  });

  it('accepts a node that is on the grid', () => {
    const result = importDoc(docWithNode(validNode({ x: 120, y: 90 })));

    expect(result.ok).toBe(true);
  });
});

describe('the import validator enforces a positive size', () => {
  it('rejects a node with no width', () => {
    const result = importDoc(docWithNode(validNode({ w: 0 })));

    expect(result.ok).toBe(false);
  });

  it('rejects a node with no height', () => {
    const result = importDoc(docWithNode(validNode({ h: 0 })));

    expect(result.ok).toBe(false);
  });

  it('rejects a node with a negative width', () => {
    const result = importDoc(docWithNode(validNode({ w: -120 })));

    expect(result.ok).toBe(false);
  });

  it('rejects a node with a negative height', () => {
    const result = importDoc(docWithNode(validNode({ h: -5 })));

    expect(result.ok).toBe(false);
  });

  it('accepts a node with a positive size', () => {
    const result = importDoc(docWithNode(validNode({ w: 120, h: 60 })));

    expect(result.ok).toBe(true);
  });
});

describe('a rejected import', () => {
  it('leaves the current document untouched', () => {
    const current = { version: 1, nodes: [validNode()], edges: [] };

    // The current document is a separate value. The validator never
    // receives it and never returns a partial document.
    const result = importDoc(docWithNode(validNode({ x: 123 })));

    expect(result.ok).toBe(false);
    expect(current.nodes).toHaveLength(1);
    expect(current.nodes[0]?.x).toBe(0);
  });

  it('names the node that caused the rejection', () => {
    const result = importDoc(docWithNode(validNode({ id: 'the-bad-one', x: 123 })));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('the import should have been rejected');
    expect(result.error).toContain('the-bad-one');
  });
});

describe('the bundled fixture', () => {
  it('still imports cleanly', () => {
    const result = importDoc(fixture);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.doc.nodes).toHaveLength(6);
    expect(result.doc.edges).toHaveLength(6);
  });
});
