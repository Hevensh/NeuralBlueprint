import type { Viewport } from '@xyflow/react';
import type { InferenceMemoryAggregationPair } from '../../InferenceMemoryProfileTypes';
import type {
  ModuleAnalysisDirection,
  ModuleBaseNode,
} from '../ModuleBaseNodeTypes';

export interface CorrelationLine {
  id: string;
  labels: string[];
  tone?: 'safe' | 'danger';
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
  anchorNode: ModuleBaseNode | null,
  nodes: ModuleBaseNode[],
  viewport: Viewport,
  showVarianceAnalysis: boolean,
  showRankAnalysis: boolean,
  analysisDirection: ModuleAnalysisDirection = 'forward',
): CorrelationLine[] {
  if (!anchorNode) {
    return [];
  }

  const pairs = analysisDirection === 'backward'
    ? anchorNode.data.backwardOutputPairStats
    : anchorNode.data.sumInputPairStats;
  if (!pairs?.length || (!showVarianceAnalysis && !showRankAnalysis)) {
    return [];
  }

  const anchorNodeId = anchorNode.id;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const drawnPairKeys = new Set<string>();

  return pairs
    .map((pair): CorrelationLine | null => {
      if (pair.leftNodeId === pair.rightNodeId) return null;

      const pairKey = getPairKey(pair.leftNodeId, pair.rightNodeId);
      if (drawnPairKeys.has(pairKey)) return null;

      const leftNode = nodeById.get(pair.leftNodeId);
      const rightNode = nodeById.get(pair.rightNodeId);
      if (!leftNode || !rightNode) return null;

      drawnPairKeys.add(pairKey);
      const leftCenter = getNodeScreenCenter(leftNode, viewport);
      const rightCenter = getNodeScreenCenter(rightNode, viewport);
      const labels = [
        showVarianceAnalysis ? `corr  ${pair.covarianceCorrelation.toFixed(3)}` : null,
        showRankAnalysis ? `rho  ${pair.linearCorrelation.toFixed(3)}` : null,
      ].filter((label): label is string => Boolean(label));

      return {
        id: `${analysisDirection}-correlation-${anchorNodeId}-${pair.leftNodeId}-${pair.rightNodeId}`,
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

export function createInferenceMemoryAggregationLines(
  pairs: InferenceMemoryAggregationPair[],
  nodes: ModuleBaseNode[],
  viewport: Viewport,
): CorrelationLine[] {
  if (pairs.length === 0) return [];

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return pairs
    .map((pair): CorrelationLine | null => {
      if (pair.leftNodeId === pair.rightNodeId) return null;

      const leftNode = nodeById.get(pair.leftNodeId);
      const rightNode = nodeById.get(pair.rightNodeId);
      if (!leftNode || !rightNode) return null;

      const leftCenter = getNodeScreenCenter(leftNode, viewport);
      const rightCenter = getNodeScreenCenter(rightNode, viewport);

      return {
        id: `inference-memory-aggregation-${pair.leftNodeId}-${pair.rightNodeId}`,
        labels: [
          pair.rho > 0 ? 'connected' : 'disconnected',
        ],
        tone: pair.rho > 0 ? 'danger' : 'safe',
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

function getPairKey(leftNodeId: string, rightNodeId: string) {
  return leftNodeId < rightNodeId
    ? `${leftNodeId}:${rightNodeId}`
    : `${rightNodeId}:${leftNodeId}`;
}

function getNodeScreenCenter(node: ModuleBaseNode, viewport: Viewport) {
  const width = node.measured?.width ?? node.width ?? 120;
  const height = node.measured?.height ?? node.height ?? 56;

  return {
    x: (node.position.x + width / 2) * viewport.zoom + viewport.x,
    y: (node.position.y + height / 2) * viewport.zoom + viewport.y,
  };
}
