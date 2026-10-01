import type { DialogueTreeNode } from "@/lib/db/schema";

const CARD_WIDTH = 310;
const HORIZONTAL_GAP = 140; // Space between parent right edge and child left edge
const NODE_HEIGHT = 160;
const VERTICAL_GAP = 50;

/**
 * Traces the conversation line from root down to the target node
 * Returns array of phrases in order: [rootPhrase, response1, response2, ... targetPhrase]
 */
export function getConversationLine(
  nodes: DialogueTreeNode[],
  targetNodeId: string,
): string[] {
  const nodeMap = new Map<string, DialogueTreeNode>(nodes.map((n) => [n.id, n]));
  const line: string[] = [];

  let current = nodeMap.get(targetNodeId);
  while (current) {
    line.unshift(current.text);
    if (!current.parentId) break;
    current = nodeMap.get(current.parentId);
  }

  return line;
}

/**
 * Gets the depth level of a node in the tree (0 for root)
 */
export function getNodeDepth(
  nodes: DialogueTreeNode[],
  targetNodeId: string,
): number {
  const nodeMap = new Map<string, DialogueTreeNode>(nodes.map((n) => [n.id, n]));
  let depth = 0;
  let current = nodeMap.get(targetNodeId);

  while (current && current.parentId) {
    depth++;
    current = nodeMap.get(current.parentId);
  }

  return depth;
}

/**
 * Beautiful hierarchical tree layout algorithm for horizontal dialogue trees
 * Computes non-overlapping (x, y) coordinates for all nodes starting from root.
 */
export function layoutDialogueTree(
  nodes: DialogueTreeNode[],
  startX = 100,
  startY = 280,
): DialogueTreeNode[] {
  if (nodes.length === 0) return [];

  const nodeMap = new Map<string, DialogueTreeNode>(
    nodes.map((n) => [n.id, { ...n, childrenIds: [...(n.childrenIds || [])] }]),
  );

  // Identify root nodes (nodes with parentId null)
  const roots: DialogueTreeNode[] = [];
  nodeMap.forEach((n) => {
    if (!n.parentId) {
      roots.push(n);
    }
  });

  // Re-build childrenIds accurately
  nodeMap.forEach((n) => {
    n.childrenIds = [];
  });
  nodeMap.forEach((n) => {
    if (n.parentId && nodeMap.has(n.parentId)) {
      nodeMap.get(n.parentId)!.childrenIds.push(n.id);
    }
  });

  // Calculate subtree heights
  const subtreeHeightMap = new Map<string, number>();

  function computeHeight(nodeId: string): number {
    const node = nodeMap.get(nodeId);
    if (!node || node.childrenIds.length === 0) {
      subtreeHeightMap.set(nodeId, NODE_HEIGHT);
      return NODE_HEIGHT;
    }

    let total = 0;
    node.childrenIds.forEach((childId) => {
      total += computeHeight(childId);
    });
    total += (node.childrenIds.length - 1) * VERTICAL_GAP;

    const h = Math.max(NODE_HEIGHT, total);
    subtreeHeightMap.set(nodeId, h);
    return h;
  }

  roots.forEach((root) => computeHeight(root.id));

  // Position nodes recursively
  function positionSubtree(nodeId: string, x: number, currentTopY: number) {
    const node = nodeMap.get(nodeId)!;
    const h = subtreeHeightMap.get(nodeId) || NODE_HEIGHT;

    node.x = x;
    node.y = Math.round(currentTopY + h / 2 - NODE_HEIGHT / 2);

    let childY = currentTopY;
    node.childrenIds.forEach((childId) => {
      const childHeight = subtreeHeightMap.get(childId) || NODE_HEIGHT;
      positionSubtree(
        childId,
        x + CARD_WIDTH + HORIZONTAL_GAP,
        childY,
      );
      childY += childHeight + VERTICAL_GAP;
    });
  }

  let rootTopY = startY;
  roots.forEach((root) => {
    const rootHeight = subtreeHeightMap.get(root.id) || NODE_HEIGHT;
    positionSubtree(root.id, startX, rootTopY);
    rootTopY += rootHeight + VERTICAL_GAP * 2;
  });

  return Array.from(nodeMap.values());
}
