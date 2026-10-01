"use client";

import { useMemo } from "react";
import type { DialogueTreeNode } from "@/lib/db/schema";

interface DialogueTreeConnectionsProps {
  nodes: DialogueTreeNode[];
  selectedNodeId: string | null;
}

export default function DialogueTreeConnections({
  nodes,
  selectedNodeId,
}: DialogueTreeConnectionsProps) {
  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  // Compute connections
  const connections = useMemo(() => {
    const list: Array<{
      id: string;
      parentId: string;
      childId: string;
      d: string;
      isActiveBranch: boolean;
    }> = [];

    // Find active branch path if a node is selected
    const activeBranchNodeIds = new Set<string>();
    if (selectedNodeId) {
      let curr = nodeMap.get(selectedNodeId);
      while (curr) {
        activeBranchNodeIds.add(curr.id);
        if (!curr.parentId) break;
        curr = nodeMap.get(curr.parentId);
      }
    }

    nodes.forEach((child) => {
      if (!child.parentId) return;
      const parent = nodeMap.get(child.parentId);
      if (!parent) return;

      const CARD_WIDTH = 310;
      const CARD_HALF_HEIGHT = 70;

      // Start on parent card's right handle
      const startX = parent.x + CARD_WIDTH + 26;
      const startY = parent.y + CARD_HALF_HEIGHT;

      // End on child card's left edge
      const endX = child.x - 4;
      const endY = child.y + CARD_HALF_HEIGHT;

      const controlDist = Math.max(60, Math.abs(endX - startX) * 0.45);
      const d = `M ${startX} ${startY} C ${startX + controlDist} ${startY}, ${endX - controlDist} ${endY}, ${endX} ${endY}`;

      const isActiveBranch =
        activeBranchNodeIds.has(child.id) &&
        activeBranchNodeIds.has(parent.id);

      list.push({
        id: `${parent.id}->${child.id}`,
        parentId: parent.id,
        childId: child.id,
        d,
        isActiveBranch,
      });
    });

    return list;
  }, [nodes, nodeMap, selectedNodeId]);

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible w-full h-full z-0"
      style={{ minWidth: 4000, minHeight: 4000 }}
    >
      <defs>
        {/* Normal arrow marker */}
        <marker
          id="dialogue-arrow-head"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path
            d="M 0 1 L 9 5 L 0 9 z"
            fill="currentColor"
            className="text-primary-500/60"
          />
        </marker>

        {/* Active branch arrow marker */}
        <marker
          id="dialogue-arrow-head-active"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path
            d="M 0 1 L 9 5 L 0 9 z"
            fill="currentColor"
            className="text-primary-500"
          />
        </marker>

        {/* Subtle glow filter */}
        <filter id="branch-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {connections.map((conn) => (
        <g key={conn.id}>
          {/* Background wider hit/glow curve */}
          {conn.isActiveBranch && (
            <path
              d={conn.d}
              fill="none"
              stroke="var(--color-primary-500, #0001d8)"
              strokeWidth="6"
              strokeOpacity="0.25"
              filter="url(#branch-glow)"
            />
          )}

          {/* Main curve line */}
          <path
            d={conn.d}
            fill="none"
            stroke={
              conn.isActiveBranch
                ? "var(--color-primary-500, #0001d8)"
                : "rgba(100, 116, 139, 0.4)"
            }
            strokeWidth={conn.isActiveBranch ? "2.5" : "1.8"}
            strokeDasharray={conn.isActiveBranch ? undefined : "4 3"}
            markerEnd={
              conn.isActiveBranch
                ? "url(#dialogue-arrow-head-active)"
                : "url(#dialogue-arrow-head)"
            }
            className="transition-all duration-300"
          />
        </g>
      ))}
    </svg>
  );
}
