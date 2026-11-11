import { useCallback, useEffect, useRef, useState } from 'react';
import { clientToSvg } from '@ui/pointer';
import type { Point } from '@ui/pointer';

export interface DragState {
  /** True while a drag is in progress. */
  active: boolean;
  /** Current pointer position in SVG user units. Null when idle. */
  position: Point | null;
  /** Position where the drag started, in SVG user units. */
  origin: Point | null;
}

export interface UsePointerDragOptions {
  /** Called once when the drag ends. This is the only commit point. */
  onCommit: (from: Point, to: Point) => void;
  /** Called when the drag is cancelled with Escape. Nothing is committed. */
  onCancel?: () => void;
}

export interface UsePointerDragResult {
  drag: DragState;
  /** Attach to the element that starts a drag. */
  handlePointerDown: (event: React.PointerEvent<SVGElement>) => void;
}

const IDLE: DragState = { active: false, position: null, origin: null };

/**
 * Drag handling that produces exactly one commit per drag.
 *
 * The rule this hook exists to enforce: **never dispatch on pointer move**.
 * Pointer moves only update local preview state. The reducer is called once,
 * on pointer up. That is what makes one drag equal one undo step
 * (acceptance test 11: 20 pointer moves, 1 history entry).
 *
 * `setPointerCapture` is used so the drag survives the pointer leaving the
 * element that started it.
 */
export function usePointerDrag({
  onCommit,
  onCancel,
}: UsePointerDragOptions): UsePointerDragResult {
  const [drag, setDrag] = useState<DragState>(IDLE);

  // Refs, not state: the pointer handlers must read the live values without
  // re-subscribing on every move.
  const originRef = useRef<Point | null>(null);
  const positionRef = useRef<Point | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const onCommitRef = useRef(onCommit);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCommitRef.current = onCommit;
    onCancelRef.current = onCancel;
  }, [onCommit, onCancel]);

  const handlePointerDown = useCallback((event: React.PointerEvent<SVGElement>) => {
    if (event.button !== 0) return;

    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;

    const point = clientToSvg(event, svg);
    svgRef.current = svg;
    originRef.current = point;
    positionRef.current = point;

    // Pointer capture is not implemented everywhere (jsdom, older Safari).
    // Without it the drag still works, it just stops when the pointer leaves
    // the element that started it.
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    setDrag({ active: true, position: point, origin: point });
  }, []);

  const finish = useCallback((commit: boolean) => {
    const origin = originRef.current;
    const position = positionRef.current;

    originRef.current = null;
    positionRef.current = null;
    setDrag(IDLE);

    if (commit && origin && position) {
      onCommitRef.current(origin, position);
    } else if (!commit) {
      onCancelRef.current?.();
    }
  }, []);

  useEffect(() => {
    if (!drag.active) return;

    const handleMove = (event: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;

      const point = clientToSvg(event, svg);
      positionRef.current = point;
      setDrag((current) => (current.active ? { ...current, position: point } : current));
    };

    const handleUp = () => {
      finish(true);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        finish(false);
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drag.active, finish]);

  return { drag, handlePointerDown };
}
