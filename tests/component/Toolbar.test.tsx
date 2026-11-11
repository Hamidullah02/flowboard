import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Toolbar } from '@ui/Toolbar';

/*
 * Component-level smoke test.
 *
 * It proves the Vitest + Testing Library pipeline works end to end
 * (jsdom environment, aliases, setup file, RTL matchers) without touching
 * `tests/unit/`, which is reserved for your own work.
 */
describe('Toolbar', () => {
  it('renders the node creation buttons and the history buttons', () => {
    render(
      <Toolbar
        onAddNode={() => {
          /* no-op */
        }}
        onUndo={() => {
          /* no-op */
        }}
        onRedo={() => {
          /* no-op */
        }}
        onImport={() => {
          /* no-op */
        }}
        onExport={() => {
          /* no-op */
        }}
        canUndo={false}
        canRedo={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Rect' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Diamond' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terminal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });
});
