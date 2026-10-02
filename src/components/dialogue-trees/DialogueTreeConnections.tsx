"use client";

import { useMemo } from "react";
import type { DialogueTreeNode } from "@/lib/db/schema";
import { computeSmartArrow } from "@/lib/utils/smart-arrow";

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

      const smartArrow = computeSmartArrow(parent, child);

      const isActiveBranch =
        activeBranchNodeIds.has(child.id) &&
        activeBranchNodeIds.has(parent.id);

      list.push({
        id: `${parent.id}->${child.id}`,
        parentId: parent.id,
        childId: child.id,
        d: smartArrow.d,
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
      {connections.map((conn) => (
        <path
          key={conn.id}
          d={conn.d}
          fill="none"
          stroke={
            conn.isActiveBranch
              ? "var(--color-primary-500, #0001d8)"
              : "rgba(100, 116, 139, 0.4)"
          }
          strokeWidth={conn.isActiveBranch ? "2.5" : "1.8"}
          strokeDasharray={conn.isActiveBranch ? undefined : "4 3"}
          className="transition-colors duration-200"
        />
      ))}
    </svg>
  );
}
