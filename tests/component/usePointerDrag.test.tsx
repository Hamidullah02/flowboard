import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { usePointerDrag } from '@ui/hooks/usePointerDrag';

/*
 * Acceptance test 11, mechanism level.
 *
 * "one drag with 20 pointer moves -> pointer up -> exactly one history entry."
 *
 * The reducer does not exist yet, so this proves the mechanism the reducer
 * will depend on: the hook reports the commit exactly once, no matter how
 * many pointer moves happened in between.
 */

function createSvgElement(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  // jsdom does not implement getScreenCTM, so the hook falls back to identity
  // mapping. That is fine: this test is about commit counts, not coordinates.
  return svg;
}

function pointerEvent(type: string, clientX: number, clientY: number): PointerEvent {
  const event = new Event(type, { bubbles: true }) as PointerEvent;
  Object.defineProperty(event, 'clientX', { value: clientX });
  Object.defineProperty(event, 'clientY', { value: clientY });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'button', { value: 0 });
  return event;
}

describe('usePointerDrag', () => {
  it('commits exactly once after many pointer moves', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => usePointerDrag({ onCommit }));

    const svg = createSvgElement();
    const target = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    svg.appendChild(target);
    document.body.appendChild(svg);

    act(() => {
      result.current.handlePointerDown({
        button: 0,
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        currentTarget: target,
      } as unknown as React.PointerEvent<SVGElement>);
    });

    expect(result.current.drag.active).toBe(true);
    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      for (let i = 0; i < 20; i++) {
        window.dispatchEvent(pointerEvent('pointermove', 100 + i, 100 + i));
      }
    });

    // 20 moves, still zero commits.
    expect(onCommit).not.toHaveBeenCalled();
    expect(result.current.drag.active).toBe(true);

    act(() => {
      window.dispatchEvent(pointerEvent('pointerup', 120, 120));
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(result.current.drag.active).toBe(false);

    document.body.removeChild(svg);
  });

  it('cancels with Escape without committing', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() => usePointerDrag({ onCommit, onCancel }));

    const svg = createSvgElement();
    const target = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    svg.appendChild(target);
    document.body.appendChild(svg);

    act(() => {
      result.current.handlePointerDown({
        button: 0,
        pointerId: 1,
        clientX: 10,
        clientY: 10,
        currentTarget: target,
      } as unknown as React.PointerEvent<SVGElement>);
    });

    act(() => {
      window.dispatchEvent(pointerEvent('pointermove', 50, 50));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(result.current.drag.active).toBe(false);

    document.body.removeChild(svg);
  });
});
