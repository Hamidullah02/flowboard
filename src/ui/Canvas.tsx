import type { ViewDoc, ViewNode } from '@ui/viewModel';

export interface CanvasProps {
  doc: ViewDoc;
}

const NODE_FILL = 'var(--color-node-fill)';
const NODE_STROKE = 'var(--color-node-stroke)';
const EDGE_STROKE = 'var(--color-edge-stroke)';
const GRID_DOT = 'var(--color-grid-dot)';

/**
 * The SVG canvas.
 *
 * Renders the dot grid, the edges, and the nodes. Interaction (drag, connect,
 * select) arrives with the reducer, in later days.
 */
export function Canvas({ doc }: CanvasProps) {
  const width = 720;
  const height = 620;

  return (
    <main className="app__canvas">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
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

        <rect width={width} height={height} fill="url(#dot-grid)" />

        <g data-testid="edges">
          {doc.edges.map((edge) => {
            const from = doc.nodes.find((node) => node.id === edge.from.nodeId);
            const to = doc.nodes.find((node) => node.id === edge.to.nodeId);
            if (!from || !to) return null;

            const start = portPosition(from, edge.from.side);
            const end = portPosition(to, edge.to.side);

            return (
              <line
                key={edge.id}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={EDGE_STROKE}
                strokeWidth={2}
                markerEnd="url(#arrowhead)"
              />
            );
          })}
        </g>

        <g data-testid="nodes">
          {doc.nodes.map((node) => (
            <NodeShape key={node.id} node={node} />
          ))}
        </g>
      </svg>
    </main>
  );
}

function NodeShape({ node }: { node: ViewNode }) {
  const common = {
    fill: NODE_FILL,
    stroke: NODE_STROKE,
    strokeWidth: 2,
  };

  return (
    <g data-node-id={node.id} aria-label={`${node.kind}: ${node.label}`}>
      {node.kind === 'rect' ? (
        <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={6} {...common} />
      ) : null}
      {node.kind === 'terminal' ? (
        <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={node.h / 2} {...common} />
      ) : null}
      {node.kind === 'diamond' ? <polygon points={diamondPoints(node)} {...common} /> : null}
      <text
        x={node.x + node.w / 2}
        y={node.y + node.h / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--color-text)"
        fontSize={14}
      >
        {node.label}
      </text>
    </g>
  );
}

function diamondPoints(node: ViewNode): string {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  return `${cx},${node.y} ${node.x + node.w},${cy} ${cx},${node.y + node.h} ${node.x},${cy}`;
}

function portPosition(
  node: ViewNode,
  side: 'top' | 'right' | 'bottom' | 'left',
): { x: number; y: number } {
  switch (side) {
    case 'top':
      return { x: node.x + node.w / 2, y: node.y };
    case 'right':
      return { x: node.x + node.w, y: node.y + node.h / 2 };
    case 'bottom':
      return { x: node.x + node.w / 2, y: node.y + node.h };
    case 'left':
      return { x: node.x, y: node.y + node.h / 2 };
  }
}
