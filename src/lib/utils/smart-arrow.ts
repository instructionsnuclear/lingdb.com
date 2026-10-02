/**
 * Smart procedural arrow path computation for node graphs & dialogue trees.
 * Calculates optimal anchor points and smooth cubic Bezier paths in real time.
 */

export interface Box {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface SmartArrowResult {
  d: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const CARD_WIDTH = 310;
export const CARD_HEIGHT = 110;

/**
 * Computes a procedural, obstacle-aware Bezier curve between a parent phrase box
 * and a child response box based on their live (x, y) coordinates.
 */
export function computeSmartArrow(
  parent: Box,
  child: Box,
  cardWidth = CARD_WIDTH,
  cardHeight = CARD_HEIGHT,
): SmartArrowResult {
  const pWidth = parent.width ?? cardWidth;
  const pHeight = parent.height ?? cardHeight;
  const cWidth = child.width ?? cardWidth;
  const cHeight = child.height ?? cardHeight;

  const pHalfH = pHeight / 2;
  const cHalfH = cHeight / 2;

  // The connection line starts from the very right center side of the phrase card's border
  const startX = Math.round(parent.x + pWidth);
  const startY = Math.round(parent.y + pHalfH);

  // 1. STANDARD FORWARD FLOW: child is to the right of parent card
  if (child.x >= startX + 20) {
    const endX = Math.round(child.x);
    const endY = Math.round(child.y + cHalfH);
    const dist = endX - startX;
    const curvature = Math.max(45, Math.min(dist * 0.5, 220));

    const cp1x = Math.round(startX + curvature);
    const cp1y = startY;
    const cp2x = Math.round(endX - curvature);
    const cp2y = endY;

    return {
      d: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`,
      startX,
      startY,
      endX,
      endY,
    };
  }

  // 2. CHILD IS BELOW AND HORIZONTALLY OVERLAPPING OR SLIGHTLY LEFT
  if (child.y >= parent.y + pHeight * 0.7) {
    if (child.x + cWidth >= parent.x - 20) {
      // Enter child Top
      const endX = Math.round(child.x + cWidth * 0.5);
      const endY = Math.round(child.y);

      const cp1x = Math.round(Math.max(startX + 40, endX + 30));
      const cp1y = startY;
      const cp2x = endX;
      const cp2y = Math.round(Math.max(startY + 30, endY - 45));

      return {
        d: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`,
        startX,
        startY,
        endX,
        endY,
      };
    } else {
      // Child is below and further to the left
      const endX = Math.round(child.x + cWidth);
      const endY = Math.round(child.y + cHalfH);
      const loopX = Math.round(startX + 45);
      const midY = Math.round(startY + (endY - startY) * 0.5);

      return {
        d: `M ${startX} ${startY} C ${loopX} ${startY}, ${loopX} ${midY}, ${Math.round((startX + endX) / 2)} ${midY} S ${Math.round(endX + 50)} ${endY}, ${endX} ${endY}`,
        startX,
        startY,
        endX,
        endY,
      };
    }
  }

  // 3. CHILD IS ABOVE AND HORIZONTALLY OVERLAPPING OR SLIGHTLY LEFT
  if (child.y + cHeight * 0.7 <= parent.y) {
    if (child.x + cWidth >= parent.x - 20) {
      // Enter child Bottom
      const endX = Math.round(child.x + cWidth * 0.5);
      const endY = Math.round(child.y + cHeight);

      const cp1x = Math.round(Math.max(startX + 40, endX + 30));
      const cp1y = startY;
      const cp2x = endX;
      const cp2y = Math.round(Math.min(startY - 30, endY + 45));

      return {
        d: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`,
        startX,
        startY,
        endX,
        endY,
      };
    } else {
      // Child is above and further to the left
      const endX = Math.round(child.x + cWidth);
      const endY = Math.round(child.y + cHalfH);
      const loopX = Math.round(startX + 45);
      const midY = Math.round(startY + (endY - startY) * 0.5);

      return {
        d: `M ${startX} ${startY} C ${loopX} ${startY}, ${loopX} ${midY}, ${Math.round((startX + endX) / 2)} ${midY} S ${Math.round(endX + 50)} ${endY}, ${endX} ${endY}`,
        startX,
        startY,
        endX,
        endY,
      };
    }
  }

  // 4. CHILD IS TO THE LEFT ON THE SAME VERTICAL LEVEL
  const loopAbove = (child.y + cHalfH) - startY >= 0;
  const loopY = Math.round(
    loopAbove
      ? Math.min(parent.y, child.y) - 60
      : Math.max(parent.y + pHeight, child.y + cHeight) + 60,
  );
  const endX = Math.round(child.x + cWidth);
  const endY = Math.round(child.y + cHalfH);

  return {
    d: `M ${startX} ${startY} C ${Math.round(startX + 50)} ${startY}, ${Math.round(startX + 40)} ${loopY}, ${Math.round((startX + endX) / 2)} ${loopY} S ${Math.round(endX + 50)} ${endY}, ${endX} ${endY}`,
    startX,
    startY,
    endX,
    endY,
  };
}
