import { useCallback, useEffect, useRef, useState } from 'react';
import { hitTestNode, nearestPort } from '@core/geometry';
import type { EdgeEnd, FlowNode } from '@core/types';
import { clientToSvg } from '@ui/pointer';
import type { Point } from '@ui/pointer';

export interface ConnectState {
  /** True while a connection drag is in progress. */
  active: boolean;
  /** The port the drag started from. */
  origin: EdgeEnd | null;
  /** Current pointer position in SVG user units. Null when idle. */
  position: Point | null;
  /** The node under the pointer, if any. */
  targetNodeId: string | null;
}

const IDLE: ConnectState = { active: false, origin: null, position: null, targetNodeId: null };

export interface UseConnectOptions {
  /** The nodes a connection can target. */
  nodes: FlowNode[];
  /** Called once, on pointer up over a node. */
  onConnect: (from: EdgeEnd, to: EdgeEnd) => void;
}

/**
 * Dragging from a port to another node.
 *
 * Like `usePointerDrag`, this commits exactly once: the ghost line follows
 * the pointer, and the edge is created on pointer up. Releasing over empty
 * space cancels, and releasing over the origin node is a self-loop, which
 * the reducer rejects.
 */
export function useConnect({ nodes, onConnect }: UseConnectOptions): {
  connect: ConnectState;
  handlePortPointerDown: (event: React.PointerEvent<SVGCircleElement>, origin: EdgeEnd) => void;
} {
  const [connect, setConnect] = useState<ConnectState>(IDLE);

  // Refs, not state: the window listeners must read the live values without
  // re-subscribing on every pointer move.
  const nodesRef = useRef(nodes);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const originRef = useRef<EdgeEnd | null>(null);
  const onConnectRef = useRef(onConnect);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);

  const handlePortPointerDown = useCallback(
    (event: React.PointerEvent<SVGCircleElement>, origin: EdgeEnd) => {
      const svg = event.currentTarget.ownerSVGElement;
      if (!svg) return;

      svgRef.current = svg;
      originRef.current = origin;

      // Pointer capture is not implemented everywhere; without it the drag
      // still works, it just stops when the pointer leaves the port.
      if (typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      setConnect({
        active: true,
        origin,
        position: clientToSvg(event, svg),
        targetNodeId: null,
      });
    },
    [],
  );

  useEffect(() => {
    if (!connect.active) return;

    const handleMove = (event: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;

      const point = clientToSvg(event, svg);
      const target = hitTestNode(point, nodesRef.current);

      setConnect((current) =>
        current.active
          ? { ...current, position: point, targetNodeId: target?.id ?? null }
          : current,
      );
    };

    const handleUp = (event: PointerEvent) => {
      const svg = svgRef.current;
      const origin = originRef.current;
      originRef.current = null;

      if (svg && origin) {
        const point = clientToSvg(event, svg);
        const target = hitTestNode(point, nodesRef.current);

        // Releasing over the origin node would be a self-loop. The reducer
        // rejects that too, but not offering it in the first place keeps the
        // gesture honest.
        if (target && target.id !== origin.nodeId) {
          onConnectRef.current(origin, {
            nodeId: target.id,
            side: nearestPort(target, point),
          });
        }
      }

      setConnect(IDLE);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      originRef.current = null;
      setConnect(IDLE);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [connect.active]);

  return { connect, handlePortPointerDown };
}
