import { useCallback, useEffect, useMemo, useState } from 'react';
import { edgePath, portPosition, snap } from '@core/geometry';
import { PORT_SIDES } from '@core/types';
import type { Action, Doc, EdgeEnd, FlowNode, Selection } from '@core/types';
import { usePointerDrag } from '@ui/hooks/usePointerDrag';
import { useConnect } from '@ui/hooks/useConnect';
import { isEditableTarget } from '@ui/keyboard';

export interface CanvasProps {
  doc: Doc;
  selection: Selection;
  dispatch: (action: Action) => void;
}

const NODE_FILL = 'var(--color-node-fill)';
const NODE_STROKE = 'var(--color-node-stroke)';
const EDGE_STROKE = 'var(--color-edge-stroke)';
const SELECTED_STROKE = 'var(--color-accent)';
const GRID_DOT = 'var(--color-grid-dot)';
const PORT_FILL = 'var(--color-port)';
const VALID_TARGET_STROKE = 'var(--color-port)';

const WIDTH = 720;
const HEIGHT = 620;
const PORT_RADIUS = 4;

/**
 * The SVG canvas.
 *
 * Renders the grid, the edges, and the nodes, and turns pointer input into
 * reducer actions. Every state change goes through `dispatch`, so the
 * document rules live in `src/core/reducer.ts` and stay testable.
 */
export function Canvas({ doc, selection, dispatch }: CanvasProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // The node being dragged. State, not a ref: the preview position depends
  // on it, and a ref would not trigger a re-render.
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);

  /**
   * One drag produces exactly one MOVE_NODE, dispatched on pointer up. The
   * preview position lives in the hook's local state, so pointer moves never
   * reach the reducer.
   */
  const { drag, handlePointerDown } = usePointerDrag({
    onCommit: (from, to) => {
      const nodeId = dragNodeId;
      setDragNodeId(null);
      if (nodeId === null) return;

      const node = doc.nodes.find((candidate) => candidate.id === nodeId);
      if (!node) return;

      // The node's top-left corner moves by the same delta as the pointer.
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      dispatch({
        type: 'MOVE_NODE',
        id: nodeId,
        x: snap(node.x + dx),
        y: snap(node.y + dy),
      });
    },
    onCancel: () => {
      setDragNodeId(null);
    },
  });

  const { connect, handlePortPointerDown } = useConnect({
    nodes: doc.nodes,
    onConnect: (from: EdgeEnd, to: EdgeEnd) => {
      dispatch({ type: 'ADD_EDGE', from, to });
    },
  });

  /**
   * The dragged node's preview position, snapped.
   *
   * The preview is computed from the pointer delta, exactly like the
   * committed position, so the node does not jump when the button is
   * released.
   */
  const previewOffset = useMemo(() => {
    if (!drag.active || dragNodeId === null) return null;
    if (!drag.origin || !drag.position) return null;

    return { x: drag.position.x - drag.origin.x, y: drag.position.y - drag.origin.y };
  }, [drag.active, drag.origin, drag.position, dragNodeId]);

  /**
   * The nodes as they should be drawn right now.
   *
   * During a drag the dragged node is replaced by its preview position, so
   * the edges that touch it follow the pointer.
   */
  const renderNodes = useMemo(() => {
    if (!previewOffset || dragNodeId === null) return doc.nodes;

    return doc.nodes.map((node) =>
      node.id === dragNodeId
        ? { ...node, x: snap(node.x + previewOffset.x), y: snap(node.y + previewOffset.y) }
        : node,
    );
  }, [doc.nodes, previewOffset, dragNodeId]);

  const handleNodePointerDown = useCallback(
    (event: React.PointerEvent<SVGGElement>, node: FlowNode) => {
      setDragNodeId(node.id);
      handlePointerDown(event);
    },
    [handlePointerDown],
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent<SVGGElement>, node: FlowNode) => {
      event.stopPropagation();
      dispatch({ type: 'SELECT', nodeIds: [node.id] });
    },
    [dispatch],
  );

  const handleBackgroundPointerDown = useCallback(() => {
    // A click on empty canvas clears the selection.
    dispatch({ type: 'SELECT' });
  }, [dispatch]);

  const handleLabelDoubleClick = useCallback((node: FlowNode) => {
    setEditingId(node.id);
  }, []);

  /**
   * Tabbing to a node selects it.
   *
   * The nodes are already focusable (`tabIndex={0}`), so Tab moves between
   * them in document order. Selecting on focus means the keyboard path
   * needs no separate "select" step before Enter or Delete works.
   */
  const handleFocusNode = useCallback(
    (node: FlowNode) => {
      dispatch({ type: 'SELECT', nodeIds: [node.id] });
    },
    [dispatch],
  );

  const commitLabel = useCallback(
    (node: FlowNode, label: string) => {
      setEditingId((current) => (current === node.id ? null : current));
      dispatch({ type: 'RENAME_NODE', id: node.id, label });
    },
    [dispatch],
  );

  // Delete and Backspace remove the selection. Enter starts editing the
  // selected node's label.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // A key aimed at a text field belongs to that field. Pressing Delete
      // inside the label editor must delete a character, not the node.
      if (isEditableTarget(event.target)) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        dispatch({ type: 'DELETE_SELECTION' });
        return;
      }

      if (event.key === 'Enter' && editingId === null && selection.nodeIds.length === 1) {
        const selectedId = selection.nodeIds[0];
        const node = doc.nodes.find((candidate) => candidate.id === selectedId);
        if (!node) return;

        event.preventDefault();
        setEditingId(node.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch, editingId, selection.nodeIds, doc.nodes]);

  const selectedNodeIds = new Set(selection.nodeIds);

  return (
    <main className="app__canvas">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="application"
        aria-label="Flowchart canvas"
        data-testid="canvas"
      >
        <defs>
          <pattern id="dot-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill={GRID_DOT} />
          </pattern>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 z" fill={EDGE_STROKE} />
          </marker>
        </defs>

        <rect
          width={WIDTH}
          height={HEIGHT}
          fill="url(#dot-grid)"
          data-testid="canvas-background"
          onPointerDown={handleBackgroundPointerDown}
        />

        <g data-testid="edges">
          {doc.edges.map((edge) => {
            const from = renderNodes.find((node) => node.id === edge.from.nodeId);
            const to = renderNodes.find((node) => node.id === edge.to.nodeId);
            if (!from || !to) return null;

            const selected = selection.edgeIds.includes(edge.id);

            return (
              <path
                key={edge.id}
                d={edgePath(from, edge.from.side, to, edge.to.side)}
                fill="none"
                stroke={selected ? SELECTED_STROKE : EDGE_STROKE}
                strokeWidth={selected ? 3 : 2}
                markerEnd="url(#arrowhead)"
                role="img"
                aria-label={`Edge from ${from.label} to ${to.label}`}
                data-edge-id={edge.id}
                onClick={(event) => {
                  event.stopPropagation();
                  dispatch({ type: 'SELECT', edgeIds: [edge.id] });
                }}
              />
            );
          })}
        </g>

        {/* The ghost line follows the pointer during a connection drag. */}
        {connect.active && connect.origin && connect.position ? (
          <path
            data-testid="ghost-line"
            d={ghostPath(doc, connect.origin, connect.position)}
            fill="none"
            stroke={SELECTED_STROKE}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        ) : null}

        <g data-testid="nodes">
          {renderNodes.map((node) => (
            <NodeShape
              key={node.id}
              node={node}
              selected={selectedNodeIds.has(node.id)}
              editing={editingId === node.id}
              showPorts={connect.active || hoveredId === node.id}
              validTarget={connect.targetNodeId === node.id}
              onPointerDown={handleNodePointerDown}
              onClick={handleNodeClick}
              onDoubleClick={handleLabelDoubleClick}
              onCommitLabel={commitLabel}
              onPortPointerDown={handlePortPointerDown}
              onHover={setHoveredId}
              onFocusNode={handleFocusNode}
            />
          ))}
        </g>
      </svg>

      {doc.nodes.length === 0 ? (
        <p className="canvas__hint" data-testid="empty-hint">
          Add a node to start
        </p>
      ) : null}
    </main>
  );
}

/** The ghost line runs from the origin port to the pointer. */
function ghostPath(doc: Doc, origin: EdgeEnd, position: { x: number; y: number }): string {
  const node = doc.nodes.find((candidate) => candidate.id === origin.nodeId);
  if (!node) return '';

  const start = portPosition(node, origin.side);
  return `M ${start.x} ${start.y} L ${position.x} ${position.y}`;
}

interface NodeShapeProps {
  node: FlowNode;
  selected: boolean;
  editing: boolean;
  showPorts: boolean;
  validTarget: boolean;
  onPointerDown: (event: React.PointerEvent<SVGGElement>, node: FlowNode) => void;
  onClick: (event: React.MouseEvent<SVGGElement>, node: FlowNode) => void;
  onDoubleClick: (node: FlowNode) => void;
  onCommitLabel: (node: FlowNode, label: string) => void;
  onPortPointerDown: (event: React.PointerEvent<SVGCircleElement>, origin: EdgeEnd) => void;
  onHover: (nodeId: string | null) => void;
  onFocusNode: (node: FlowNode) => void;
}

function NodeShape({
  node,
  selected,
  editing,
  showPorts,
  validTarget,
  onPointerDown,
  onClick,
  onDoubleClick,
  onCommitLabel,
  onPortPointerDown,
  onHover,
  onFocusNode,
}: NodeShapeProps) {
  const common = {
    fill: NODE_FILL,
    stroke: validTarget ? VALID_TARGET_STROKE : selected ? SELECTED_STROKE : NODE_STROKE,
    strokeWidth: validTarget || selected ? 3 : 2,
  };

  return (
    <g
      data-node-id={node.id}
      role="button"
      tabIndex={0}
      aria-label={`${node.kind}: ${node.label || 'unlabelled'}`}
      aria-pressed={selected}
      data-valid-target={validTarget ? 'true' : undefined}
      className="node"
      onPointerDown={(event) => {
        onPointerDown(event, node);
      }}
      onPointerEnter={() => {
        onHover(node.id);
      }}
      onPointerLeave={() => {
        onHover(null);
      }}
      onClick={(event) => {
        onClick(event, node);
      }}
      onFocus={() => {
        // Tabbing to a node selects it, so Enter can edit it and Delete can
        // remove it without a second step.
        onFocusNode(node);
      }}
      onDoubleClick={() => {
        onDoubleClick(node);
      }}
    >
      {node.kind === 'rect' ? (
        <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={6} {...common} />
      ) : null}
      {node.kind === 'terminal' ? (
        <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={node.h / 2} {...common} />
      ) : null}
      {node.kind === 'diamond' ? <polygon points={diamondPoints(node)} {...common} /> : null}

      {editing ? (
        <foreignObject x={node.x} y={node.y} width={node.w} height={node.h}>
          <input
            className="node__label-input"
            defaultValue={node.label}
            autoFocus
            aria-label={`Label for ${node.label || 'node'}`}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onCommitLabel(node, event.currentTarget.value);
              } else if (event.key === 'Escape') {
                onCommitLabel(node, node.label);
              }
            }}
            onBlur={(event) => {
              onCommitLabel(node, event.currentTarget.value);
            }}
          />
        </foreignObject>
      ) : (
        <text
          x={node.x + node.w / 2}
          y={node.y + node.h / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-text)"
          fontSize={14}
          pointerEvents="none"
        >
          {node.label}
        </text>
      )}

      {/* Ports appear on hover, so they never crowd the canvas. */}
      {showPorts
        ? PORT_SIDES.map((side) => {
            const port = portPosition(node, side);
            return (
              <circle
                key={side}
                cx={port.x}
                cy={port.y}
                r={PORT_RADIUS}
                fill={PORT_FILL}
                data-port={`${node.id}:${side}`}
                aria-label={`Port ${side} of ${node.label || node.id}`}
                role="button"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onPortPointerDown(event, { nodeId: node.id, side });
                }}
              />
            );
          })
        : null}
    </g>
  );
}

function diamondPoints(node: FlowNode): string {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  return `${cx},${node.y} ${node.x + node.w},${cy} ${cx},${node.y + node.h} ${node.x},${cy}`;
}
