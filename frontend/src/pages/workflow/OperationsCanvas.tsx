import { useMemo } from 'react';
import {
  ReactFlow, Background, Controls, BaseEdge, EdgeLabelRenderer,
  getBezierPath, MarkerType, type EdgeProps, type Edge, type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { Operation } from './operations';

type AddOperationEdge = Edge<{ onAdd: () => void }>;

function AddButtonEdge(props: EdgeProps<AddOperationEdge>) {
  const [path, x, y] = getBezierPath(props);
  return (
    <>
      <BaseEdge id={props.id} path={path} markerEnd={props.markerEnd} style={props.style} />
      <EdgeLabelRenderer>
        <div className="nodrag nopan" style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, pointerEvents: 'all' }}>
          {props.label ? <span className="mr-2 text-xs text-secondary">{props.label}</span> : null}
          <button type="button" aria-label="Add operation" title="Add operation" onClick={props.data?.onAdd} className="h-6 w-6 rounded-full border border-white/30 bg-background text-text">+</button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { addButton: AddButtonEdge };

export function OperationsCanvas({ operations, onAdd }: { operations: Operation[]; onAdd: () => void }) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: AddOperationEdge[] = [];
    const visited = new Set<string>();
    const columns = new Map<number, number>();

    // A small breadth-first layout: roots at the top, branches on the next row.
    // Also include disconnected operations and cycles without a root.
    const roots = [...operations.filter((operation) => !operation.previous), ...operations];
    for (const root of roots) {
      const queue = [{ operation: root, depth: 0 }];
      for (let index = 0; index < queue.length; index++) {
        const { operation, depth } = queue[index];
        if (visited.has(operation.id)) continue;
        visited.add(operation.id);
        const column = columns.get(depth) ?? 0;
        columns.set(depth, column + 1);
        nodes.push({
          id: operation.id,
          position: { x: column * 240, y: depth * 180 },
          data: { label: operation.type.replace(/_/g, ' ') },
        });
        for (const next of [operation.next.true, operation.next.false]) {
          if (next) queue.push({ operation: next, depth: depth + 1 });
        }
      }
    }

    for (const operation of operations) {
      for (const branch of ['true', 'false'] as const) {
        const next = operation.next[branch];
        if (!next) continue;
        edges.push({
          id: `${operation.id}-${branch}-${next.id}`,
          source: operation.id, target: next.id, type: 'addButton',
          label: operation.type === 'condition' ? branch : undefined,
          markerEnd: { type: MarkerType.ArrowClosed },
          data: { onAdd },
        });
      }
    }
    return { nodes, edges };
  }, [operations, onAdd]);

  return (
    <ReactFlow className="workflow-canvas" nodes={nodes} edges={edges} edgeTypes={edgeTypes} fitView colorMode="dark"
      nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
      <Background />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
