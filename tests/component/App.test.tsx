import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '@ui/App';

/*
 * Wiring tests for the shell.
 *
 * These prove that the UI is actually driven by the reducer: the toolbar
 * dispatches actions, the canvas renders the document, and the status bar
 * reports the counts. The reducer's own rules are covered in `tests/unit/`.
 */

function nodeGroup(id: string): Element {
  const group = document.querySelector(`g[data-node-id="${id}"]`);
  // SVG elements are not HTMLElements, so the check must be against Element.
  if (!(group instanceof Element)) throw new Error(`node ${id} is not rendered`);
  return group;
}

describe('App', () => {
  it('renders the fixture flowchart on load', () => {
    render(<App />);

    expect(screen.getByTestId('nodes').querySelectorAll('g[data-node-id]')).toHaveLength(6);
    expect(screen.getByTestId('edges').querySelectorAll('[data-edge-id]')).toHaveLength(6);
  });

  it('reports the node and edge counts in the status bar', () => {
    render(<App />);

    expect(screen.getByText(/6 nodes, 6 edges/)).toBeInTheDocument();
  });

  it('adds a node from the toolbar and selects it', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Rect' }));

    expect(screen.getByTestId('nodes').querySelectorAll('g[data-node-id]')).toHaveLength(7);
    expect(screen.getByText(/selection: 1 node/)).toBeInTheDocument();
  });

  it('undoes an added node and redoes it', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Rect' }));
    expect(screen.getByTestId('nodes').querySelectorAll('g[data-node-id]')).toHaveLength(7);

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('nodes').querySelectorAll('g[data-node-id]')).toHaveLength(6);

    await user.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getByTestId('nodes').querySelectorAll('g[data-node-id]')).toHaveLength(7);
  });

  it('enables undo only when there is something to undo', async () => {
    const user = userEvent.setup();
    render(<App />);

    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(undo).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Rect' }));
    expect(undo).toBeEnabled();
  });

  it('deletes the selected node with the Delete key', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(nodeGroup('n5'));
    expect(screen.getByText(/selection: 1 node/)).toBeInTheDocument();

    await user.keyboard('{Delete}');

    expect(screen.getByTestId('nodes').querySelectorAll('g[data-node-id]')).toHaveLength(5);
    // n5 had two edges, so both go with it.
    expect(screen.getByTestId('edges').querySelectorAll('[data-edge-id]')).toHaveLength(4);
  });

  it('renames a node on double click and Enter', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.dblClick(nodeGroup('n1'));

    const input = screen.getByLabelText('Label for Start');
    await user.clear(input);
    await user.type(input, 'Begin{Enter}');

    expect(screen.getByText('Begin')).toBeInTheDocument();
  });

  it('marks the selected node with aria-pressed', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(nodeGroup('n1'));

    expect(nodeGroup('n1')).toHaveAttribute('aria-pressed', 'true');
    expect(nodeGroup('n2')).toHaveAttribute('aria-pressed', 'false');
  });

  it('gives every node an aria-label with its kind and label', () => {
    render(<App />);

    const canvas = screen.getByTestId('canvas');
    const node = within(canvas).getByRole('button', { name: 'terminal: Start' });
    expect(node).toBeInTheDocument();
  });

  it('shows an inline error and keeps the document when an import is invalid', async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByTestId('import-input');
    const file = new File(['not json at all'], 'broken.json', { type: 'application/json' });
    await user.upload(input, file);

    expect(await screen.findByRole('alert')).toHaveTextContent(/not valid JSON/i);
    // The current document is untouched.
    expect(screen.getByTestId('nodes').querySelectorAll('g[data-node-id]')).toHaveLength(6);
  });

  it('imports a valid document and replaces the current one', async () => {
    const user = userEvent.setup();
    render(<App />);

    const doc = {
      version: 1,
      nodes: [{ id: 'x1', kind: 'rect', x: 0, y: 0, w: 120, h: 60, label: 'Only' }],
      edges: [],
    };
    const file = new File([JSON.stringify(doc)], 'ok.json', { type: 'application/json' });

    await user.upload(screen.getByTestId('import-input'), file);

    expect(screen.getByTestId('nodes').querySelectorAll('g[data-node-id]')).toHaveLength(1);
    expect(screen.getByText(/1 node, 0 edges/)).toBeInTheDocument();
  });
});
