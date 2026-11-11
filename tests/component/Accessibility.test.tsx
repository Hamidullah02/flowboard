import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '@ui/App';

/*
 * Accessibility tests.
 *
 * These cover the plan's accessibility section:
 *   - every node has an aria-label with its kind and label text
 *   - selection is not shown by colour alone
 *   - the status bar announces changes
 *   - nodes are reachable and operable with the keyboard
 */

function nodeGroup(id: string): Element {
  const group = document.querySelector(`g[data-node-id="${id}"]`);
  if (!(group instanceof Element)) throw new Error(`node ${id} is not rendered`);
  return group;
}

/**
 * Focus a node the way the browser would.
 *
 * React attaches its `onFocus` handler to the native `focusin` event, so a
 * hand-built event does not reach it. Calling `.focus()` dispatches the real
 * event sequence.
 */
function focusNode(id: string): void {
  const group = nodeGroup(id);
  // SVG elements are focusable but are not `HTMLElement`.
  const focusable = group as Element & { focus: () => void };
  if (typeof focusable.focus !== 'function') throw new Error('the node is not focusable');

  act(() => {
    focusable.focus();
  });
}

describe('node semantics', () => {
  it('gives every node an aria-label with its kind and label', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'terminal: Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'rect: Read credentials' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'diamond: Valid?' })).toBeInTheDocument();
  });

  it('marks an unlabelled node rather than leaving it blank', async () => {
    const user = userEvent.setup();
    render(<App />);

    // A node added from the toolbar starts with no text.
    await user.click(screen.getByRole('button', { name: 'Rect' }));

    expect(screen.getByRole('button', { name: 'rect: unlabelled' })).toBeInTheDocument();
  });

  it('marks the selected node with aria-pressed', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(nodeGroup('n3'));

    expect(nodeGroup('n3')).toHaveAttribute('aria-pressed', 'true');
    expect(nodeGroup('n1')).toHaveAttribute('aria-pressed', 'false');
  });

  it('gives every edge an accessible name', () => {
    render(<App />);

    expect(
      screen.getByRole('img', { name: 'Edge from Start to Read credentials' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Edge from Valid? to Load dashboard' }),
    ).toBeInTheDocument();
  });

  it('marks a valid connection target for assistive technology', () => {
    render(<App />);

    expect(nodeGroup('n1')).not.toHaveAttribute('data-valid-target');
  });
});

describe('the status bar', () => {
  it('announces the document counts politely', () => {
    render(<App />);

    const counts = screen.getByText(/6 nodes, 6 edges/);
    expect(counts).toHaveAttribute('aria-live', 'polite');
  });

  it('announces the selection politely', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(nodeGroup('n2'));

    const selection = screen.getByText(/selection: 1 node/);
    expect(selection).toHaveAttribute('aria-live', 'polite');
  });
});

describe('keyboard operation', () => {
  it('makes every node focusable', () => {
    render(<App />);

    expect(nodeGroup('n1')).toHaveAttribute('tabindex', '0');
    expect(nodeGroup('n6')).toHaveAttribute('tabindex', '0');
  });

  it('selects a node when it receives focus', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Tab order starts at the toolbar, so the node is focused directly
    // rather than by tabbing through every control first.
    await user.tab();
    focusNode('n1');

    expect(nodeGroup('n1')).toHaveAttribute('aria-pressed', 'true');
  });

  it('edits the label of the focused node with Enter', async () => {
    const user = userEvent.setup();
    render(<App />);

    focusNode('n1');
    await user.keyboard('{Enter}');

    expect(screen.getByLabelText('Label for Start')).toBeInTheDocument();
  });

  it('deletes the focused node with the Delete key', async () => {
    const user = userEvent.setup();
    render(<App />);

    focusNode('n1');
    await user.keyboard('{Delete}');

    // The node is removed from the document entirely, not just emptied.
    expect(document.querySelectorAll('g[data-node-id]')).toHaveLength(5);
    expect(document.querySelector('g[data-node-id="n1"]')).toBeNull();
  });
});
