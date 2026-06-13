import type { Viewport } from '@xyflow/react';
import type { ModuleBaseNode } from '../ModuleBaseNodeTypes';

export interface CorrelationLine {
  id: string;
  labels: string[];
  fontSize: number;
  lineGap: number;
  strokeWidth: number;
  strokeDasharray: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
}

export function createCorrelationLines(
  sumNode: ModuleBaseNode | null,
  nodes: ModuleBaseNode[],
  viewport: Viewport,
  showVarianceAnalysis: boolean,
  showRankAnalysis: boolean,
): CorrelationLine[] {
  if (!sumNode?.data.sumInputPairStats?.length || (!showVarianceAnalysis && !showRankAnalysis)) {
    return [];
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return sumNode.data.sumInputPairStats
    .map((pair) => {
      const leftNode = nodeById.get(pair.leftNodeId);
      const rightNode = nodeById.get(pair.rightNodeId);
      if (!leftNode || !rightNode) return null;

      const leftCenter = getNodeScreenCenter(leftNode, viewport);
      const rightCenter = getNodeScreenCenter(rightNode, viewport);
      const labels = [
        showVarianceAnalysis ? `corr  ${pair.covarianceCorrelation.toFixed(3)}` : null,
        showRankAnalysis ? `rho  ${pair.linearCorrelation.toFixed(3)}` : null,
      ].filter((label): label is string => Boolean(label));

      return {
        id: `sum-correlation-${sumNode.id}-${pair.leftNodeId}-${pair.rightNodeId}`,
        labels,
        fontSize: 12 * viewport.zoom,
        lineGap: 15 * viewport.zoom,
        strokeWidth: 4 * viewport.zoom,
        strokeDasharray: `${8 * viewport.zoom} ${12 * viewport.zoom}`,
        x1: leftCenter.x,
        y1: leftCenter.y,
        x2: rightCenter.x,
        y2: rightCenter.y,
        labelX: (leftCenter.x + rightCenter.x) / 2,
        labelY: (leftCenter.y + rightCenter.y) / 2,
      };
    })
    .filter((line): line is CorrelationLine => Boolean(line));
}

function getNodeScreenCenter(node: ModuleBaseNode, viewport: Viewport) {
  const width = node.measured?.width ?? node.width ?? 120;
  const height = node.measured?.height ?? node.height ?? 56;

  return {
    x: (node.position.x + width / 2) * viewport.zoom + viewport.x,
    y: (node.position.y + height / 2) * viewport.zoom + viewport.y,
  };
}
