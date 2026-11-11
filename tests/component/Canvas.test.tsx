import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '@ui/App';

/*
 * Interaction tests for the canvas.
 *
 * These cover the three gaps left after the core landed:
 *   1. the node follows the pointer during a drag, and the edges follow it
 *   2. the connect flow actually works, end to end
 *   3. the keyboard shortcuts and the toolbar delete button
 *
 * jsdom has no `PointerEvent`, so the events are built by hand. The same
 * pattern is used in `usePointerDrag.test.tsx`.
 */

function pointerEvent(
  type: string,
  init: { clientX: number; clientY: number; pointerId?: number; button?: number },
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clientX', { value: init.clientX });
  Object.defineProperty(event, 'clientY', { value: init.clientY });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  Object.defineProperty(event, 'button', { value: init.button ?? 0 });
  return event;
}

function nodeGroup(id: string): Element {
  const group = document.querySelector(`g[data-node-id="${id}"]`);
  if (!(group instanceof Element)) throw new Error(`node ${id} is not rendered`);
  return group;
}

function shapeOf(id: string): Element {
  const shape = nodeGroup(id).querySelector('rect, polygon');
  if (!(shape instanceof Element)) throw new Error(`node ${id} has no shape`);
  return shape;
}

function edgeCount(): number {
  return document.querySelectorAll('[data-edge-id]').length;
}

/** The centre of a node, in SVG user units. */
function centreOf(id: string): { x: number; y: number } {
  const shape = shapeOf(id);
  const x = Number(shape.getAttribute('x'));
  const y = Number(shape.getAttribute('y'));
  const w = Number(shape.getAttribute('width'));
  const h = Number(shape.getAttribute('height'));
  return { x: x + w / 2, y: y + h / 2 };
}

describe('dragging a node', () => {
  it('follows the pointer before the drag is released', () => {
    render(<App />);

    const start = centreOf('n2');
    expect(shapeOf('n2').getAttribute('x')).toBe('300');

    fireEvent(nodeGroup('n2'), pointerEvent('pointerdown', { clientX: start.x, clientY: start.y }));
    fireEvent(
      window,
      pointerEvent('pointermove', { clientX: start.x + 40, clientY: start.y + 40 }),
    );

    // The node has already moved, even though the button is still down.
    expect(shapeOf('n2').getAttribute('x')).toBe('340');
    expect(shapeOf('n2').getAttribute('y')).toBe('180');
  });

  it('snaps the preview to the grid', () => {
    render(<App />);

    const start = centreOf('n2');
    fireEvent(nodeGroup('n2'), pointerEvent('pointerdown', { clientX: start.x, clientY: start.y }));
    fireEvent(
      window,
      pointerEvent('pointermove', { clientX: start.x + 37, clientY: start.y + 23 }),
    );

    expect(shapeOf('n2').getAttribute('x')).toBe('340');
    expect(shapeOf('n2').getAttribute('y')).toBe('160');
  });

  it('moves the edges with the node', () => {
    render(<App />);

    const before = document.querySelector('[data-edge-id="e2"]')?.getAttribute('d');
    const start = centreOf('n2');

    fireEvent(nodeGroup('n2'), pointerEvent('pointerdown', { clientX: start.x, clientY: start.y }));
    fireEvent(
      window,
      pointerEvent('pointermove', { clientX: start.x + 40, clientY: start.y + 40 }),
    );

    const after = document.querySelector('[data-edge-id="e2"]')?.getAttribute('d');
    expect(after).not.toBe(before);
  });

  it('commits the final position on pointer up', () => {
    render(<App />);

    const start = centreOf('n2');
    fireEvent(nodeGroup('n2'), pointerEvent('pointerdown', { clientX: start.x, clientY: start.y }));
    fireEvent(
      window,
      pointerEvent('pointermove', { clientX: start.x + 40, clientY: start.y + 40 }),
    );
    fireEvent(window, pointerEvent('pointerup', { clientX: start.x + 40, clientY: start.y + 40 }));

    expect(shapeOf('n2').getAttribute('x')).toBe('340');
    expect(shapeOf('n2').getAttribute('y')).toBe('180');
  });

  it('leaves the node where it was when the drag is cancelled with Escape', () => {
    render(<App />);

    const start = centreOf('n2');
    fireEvent(nodeGroup('n2'), pointerEvent('pointerdown', { clientX: start.x, clientY: start.y }));
    fireEvent(
      window,
      pointerEvent('pointermove', { clientX: start.x + 40, clientY: start.y + 40 }),
    );
    fireEvent(window, new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(shapeOf('n2').getAttribute('x')).toBe('300');
    expect(shapeOf('n2').getAttribute('y')).toBe('140');
  });
});

describe('connecting two nodes', () => {
  it('shows no ports until a node is hovered', () => {
    render(<App />);

    expect(document.querySelectorAll('[data-port]')).toHaveLength(0);

    fireEvent(nodeGroup('n1'), pointerEvent('pointerover', { clientX: 360, clientY: 64 }));

    expect(document.querySelectorAll('[data-port]')).toHaveLength(4);
  });

  it('shows a ghost line while a port is being dragged', () => {
    render(<App />);

    fireEvent(nodeGroup('n1'), pointerEvent('pointerover', { clientX: 360, clientY: 64 }));
    const port = document.querySelector('[data-port="n1:bottom"]');
    if (!(port instanceof Element)) throw new Error('the bottom port is not rendered');

    fireEvent(port, pointerEvent('pointerdown', { clientX: 360, clientY: 88 }));

    expect(screen.getByTestId('ghost-line')).toBeInTheDocument();
  });

  it('creates an edge when the drag is released on another node', () => {
    render(<App />);

    const before = edgeCount();

    fireEvent(nodeGroup('n1'), pointerEvent('pointerover', { clientX: 360, clientY: 64 }));
    const port = document.querySelector('[data-port="n1:bottom"]');
    if (!(port instanceof Element)) throw new Error('the bottom port is not rendered');

    fireEvent(port, pointerEvent('pointerdown', { clientX: 360, clientY: 88 }));
    fireEvent(window, pointerEvent('pointermove', { clientX: 360, clientY: 300 }));
    fireEvent(window, pointerEvent('pointerup', { clientX: 360, clientY: 300 }));

    expect(edgeCount()).toBe(before + 1);
  });

  it('creates no edge when the drag is released on empty canvas', () => {
    render(<App />);

    const before = edgeCount();

    fireEvent(nodeGroup('n1'), pointerEvent('pointerover', { clientX: 360, clientY: 64 }));
    const port = document.querySelector('[data-port="n1:bottom"]');
    if (!(port instanceof Element)) throw new Error('the bottom port is not rendered');

    fireEvent(port, pointerEvent('pointerdown', { clientX: 360, clientY: 88 }));
    fireEvent(window, pointerEvent('pointermove', { clientX: 40, clientY: 580 }));
    fireEvent(window, pointerEvent('pointerup', { clientX: 40, clientY: 580 }));

    expect(edgeCount()).toBe(before);
  });

  it('creates no edge when the drag is released on the origin node', () => {
    render(<App />);

    const before = edgeCount();

    fireEvent(nodeGroup('n1'), pointerEvent('pointerover', { clientX: 360, clientY: 64 }));
    const port = document.querySelector('[data-port="n1:bottom"]');
    if (!(port instanceof Element)) throw new Error('the bottom port is not rendered');

    fireEvent(port, pointerEvent('pointerdown', { clientX: 360, clientY: 88 }));
    fireEvent(window, pointerEvent('pointermove', { clientX: 360, clientY: 64 }));
    fireEvent(window, pointerEvent('pointerup', { clientX: 360, clientY: 64 }));

    expect(edgeCount()).toBe(before);
  });

  it('creates one history entry for the whole connection', async () => {
    const user = userEvent.setup();
    render(<App />);

    const before = edgeCount();
    fireEvent(nodeGroup('n1'), pointerEvent('pointerover', { clientX: 360, clientY: 64 }));
    const port = document.querySelector('[data-port="n1:bottom"]');
    if (!(port instanceof Element)) throw new Error('the bottom port is not rendered');

    fireEvent(port, pointerEvent('pointerdown', { clientX: 360, clientY: 88 }));
    fireEvent(window, pointerEvent('pointermove', { clientX: 360, clientY: 300 }));
    fireEvent(window, pointerEvent('pointerup', { clientX: 360, clientY: 300 }));

    expect(edgeCount()).toBe(before + 1);

    // One undo removes the new edge, so the connection cost exactly one
    // history entry.
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(edgeCount()).toBe(before);
  });
});

describe('keyboard shortcuts', () => {
  it('undoes with Ctrl+Z', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Rect' }));
    expect(document.querySelectorAll('g[data-node-id]')).toHaveLength(7);

    await user.keyboard('{Control>}z{/Control}');

    expect(document.querySelectorAll('g[data-node-id]')).toHaveLength(6);
  });

  it('redoes with Ctrl+Shift+Z', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Rect' }));
    await user.keyboard('{Control>}z{/Control}');
    expect(document.querySelectorAll('g[data-node-id]')).toHaveLength(6);

    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

    expect(document.querySelectorAll('g[data-node-id]')).toHaveLength(7);
  });

  it('starts editing the label with Enter on a selected node', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(nodeGroup('n1'));
    await user.keyboard('{Enter}');

    expect(screen.getByLabelText('Label for Start')).toBeInTheDocument();
  });

  it('does not delete a node while a label is being edited', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.dblClick(nodeGroup('n1'));
    const input = screen.getByLabelText('Label for Start');
    await user.clear(input);
    await user.type(input, 'Begin');

    // Delete inside the label editor must delete a character, not the node.
    await user.keyboard('{Delete}');

    expect(document.querySelectorAll('g[data-node-id]')).toHaveLength(6);
    expect(nodeGroup('n1')).toBeInTheDocument();
  });
});

describe('the toolbar delete button', () => {
  it('deletes the selection', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(nodeGroup('n5'));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(document.querySelectorAll('g[data-node-id]')).toHaveLength(5);
    expect(edgeCount()).toBe(4);
  });

  it('is disabled when nothing is selected', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });
});

describe('the empty canvas', () => {
  it('shows a hint when the document has no nodes', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Delete every node to empty the document.
    for (const id of ['n1', 'n2', 'n3', 'n4', 'n5', 'n6']) {
      await user.click(nodeGroup(id));
      await user.keyboard('{Delete}');
    }

    expect(document.querySelectorAll('g[data-node-id]')).toHaveLength(0);
    expect(screen.getByText(/add a node to start/i)).toBeInTheDocument();
  });
});
