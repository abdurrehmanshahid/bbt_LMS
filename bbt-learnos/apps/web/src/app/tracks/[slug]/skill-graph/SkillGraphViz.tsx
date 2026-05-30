'use client';

import dagre from 'dagre';
import Link from 'next/link';
import { useMemo } from 'react';

import type { ConceptGraphDto } from '@/lib/skill-graph';

interface Props {
  graph: ConceptGraphDto;
  earnedConceptIds: string[];
  readyConceptIds: string[];
}

const NODE_W = 144;
const NODE_H = 44;
const PAD = 40;

const STATUS_COLOR: Record<string, string> = {
  earned: '#22c55e',
  ready: '#f97316',
  locked: '#64748b',
};

export function SkillGraphViz({ graph, earnedConceptIds, readyConceptIds }: Props) {
  const earned = useMemo(() => new Set(earnedConceptIds), [earnedConceptIds]);
  const ready = useMemo(() => new Set(readyConceptIds), [readyConceptIds]);

  const { positions, svgW, svgH, edgePoints } = useMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', ranksep: 60, nodesep: 24 });
    g.setDefaultEdgeLabel(() => ({}));

    for (const node of graph.nodes) {
      g.setNode(node.id, { width: NODE_W, height: NODE_H });
    }
    for (const edge of graph.edges) {
      g.setEdge(edge.from, edge.to);
    }

    dagre.layout(g);

    const positions = new Map<string, { x: number; y: number }>();
    let maxX = 0;
    let maxY = 0;

    for (const nodeId of g.nodes()) {
      const n = g.node(nodeId);
      if (!n) continue;
      positions.set(nodeId, { x: n.x, y: n.y });
      if (n.x + NODE_W / 2 > maxX) maxX = n.x + NODE_W / 2;
      if (n.y + NODE_H / 2 > maxY) maxY = n.y + NODE_H / 2;
    }

    // Compute edge line endpoints
    const edgePoints = graph.edges.map((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      return from && to
        ? { x1: from.x, y1: from.y + NODE_H / 2, x2: to.x, y2: to.y - NODE_H / 2 }
        : null;
    });

    return { positions, svgW: maxX + PAD, svgH: maxY + PAD, edgePoints };
  }, [graph]);

  if (graph.nodes.length === 0) return null;

  return (
    <div className="overflow-auto rounded-xl border border-navy-700 bg-navy-950 p-4">
      <svg
        width={svgW}
        height={svgH}
        aria-label="Concept skill graph"
        className="block"
      >
        {/* Edges */}
        {edgePoints.map((ep, i) => {
          if (!ep) return null;
          return (
            <line
              key={i}
              x1={ep.x1}
              y1={ep.y1}
              x2={ep.x2}
              y2={ep.y2}
              stroke="#334155"
              strokeWidth={1.5}
              markerEnd="url(#arrow)"
            />
          );
        })}

        {/* Arrow marker */}
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#334155" />
          </marker>
        </defs>

        {/* Nodes */}
        {graph.nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const status = earned.has(node.id) ? 'earned' : ready.has(node.id) ? 'ready' : 'locked';
          const color = STATUS_COLOR[status] ?? STATUS_COLOR['locked'];
          const label = node.title.length > 19 ? node.title.slice(0, 17) + '…' : node.title;
          const x = pos.x - NODE_W / 2;
          const y = pos.y - NODE_H / 2;

          return (
            <Link key={node.id} href={`/concepts/${node.id}`}>
              <g transform={`translate(${x}, ${y})`} className="cursor-pointer group">
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  fill={color}
                  fillOpacity={0.12}
                  stroke={color}
                  strokeWidth={1.5}
                  className="group-hover:fill-opacity-25 transition-all"
                />
                <text
                  x={NODE_W / 2}
                  y={NODE_H / 2 + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill={color}
                  fontFamily="'DM Mono', monospace"
                >
                  {label}
                </text>
              </g>
            </Link>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-5 text-xs font-mono text-navy-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />
          Earned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500 inline-block" />
          Ready to learn
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-500 inline-block" />
          Locked
        </span>
      </div>
    </div>
  );
}
