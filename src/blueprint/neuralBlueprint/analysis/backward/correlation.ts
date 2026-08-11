import type {
  BackwardOutputPairStats,
  ModuleNodeData,
  ModuleStatsBackward,
} from '../../ModuleBaseNodeTypes';
import {
  LINEAR_TRANSFORM_DECORRELATION,
  computePathLengthByModules,
  getModuleOutputSize,
} from '../correlation';
import { clamp01 } from '../forward/utils/math';

export function computeBackwardOutputPairStats(
  outputNodes: ModuleNodeData[],
  gradients: ModuleStatsBackward[],
  nodeMap: Map<string, ModuleNodeData>,
): BackwardOutputPairStats[] {
  const pairs: BackwardOutputPairStats[] = [];

  for (let leftIndex = 0; leftIndex < outputNodes.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < outputNodes.length;
      rightIndex += 1
    ) {
      const leftNode = outputNodes[leftIndex];
      const rightNode = outputNodes[rightIndex];
      const covarianceCorrelation = estimateBackwardCovarianceCorrelation(
        leftNode,
        rightNode,
        nodeMap,
      );
      const linearCorrelation = estimateBackwardLinearCorrelation(
        leftNode,
        rightNode,
        nodeMap,
      );
      const covariance = covarianceCorrelation
        * Math.sqrt(Math.max(
          gradients[leftIndex]?.distribution.variance ?? 0,
          0,
        ))
        * Math.sqrt(Math.max(
          gradients[rightIndex]?.distribution.variance ?? 0,
          0,
        ));

      pairs.push({
        leftNodeId: leftNode.id,
        rightNodeId: rightNode.id,
        covarianceCorrelation,
        linearCorrelation,
        covariance,
      });
    }
  }

  return pairs;
}

function estimateBackwardCovarianceCorrelation(
  leftNode: ModuleNodeData,
  rightNode: ModuleNodeData,
  nodeMap: Map<string, ModuleNodeData>,
) {
  const leftPaths = collectSinkPaths(leftNode.id, nodeMap);
  const rightPaths = collectSinkPaths(rightNode.id, nodeMap);
  const correlations: number[] = [];

  leftPaths.forEach((leftPath, sinkId) => {
    const rightPath = rightPaths.get(sinkId);
    if (!rightPath) return;

    correlations.push(
      computeBackwardPathCorrelation(leftPath, nodeMap)
        * computeBackwardPathCorrelation(rightPath, nodeMap),
    );
  });

  return averageCorrelation(correlations);
}

function estimateBackwardLinearCorrelation(
  leftNode: ModuleNodeData,
  rightNode: ModuleNodeData,
  nodeMap: Map<string, ModuleNodeData>,
) {
  const leftPaths = collectSinkPaths(leftNode.id, nodeMap);
  const rightPaths = collectSinkPaths(rightNode.id, nodeMap);
  const correlations: number[] = [];

  leftPaths.forEach((leftPath, sinkId) => {
    const rightPath = rightPaths.get(sinkId);
    if (!rightPath) return;

    const distance = computePathLengthByModules(
      [...leftPath].reverse(),
      nodeMap,
    ) + computePathLengthByModules(
      [...rightPath].reverse(),
      nodeMap,
    );
    correlations.push(
      Math.exp(-LINEAR_TRANSFORM_DECORRELATION * distance),
    );
  });

  return averageCorrelation(correlations);
}

function computeBackwardPathCorrelation(
  pathNodeIds: string[],
  nodeMap: Map<string, ModuleNodeData>,
) {
  let correlation = 1;

  for (let index = 1; index < pathNodeIds.length; index += 1) {
    const node = nodeMap.get(pathNodeIds[index]);
    if (!node) continue;

    if (node.kind === 'Linear') {
      correlation *= 1 / Math.sqrt(Math.max(getModuleOutputSize(node), 1));
    }
    if (node.kind === 'ReLU') {
      const inputStats = node.predecessors[0]?.stats;
      const keepRate = 1
        - (inputStats?.distribution.zeroRate ?? 0)
        - (inputStats?.distribution.negativeRate ?? 0.5);
      correlation *= Math.sqrt(clamp01(keepRate));
    }
    if (node.kind === 'Dropout') {
      correlation *= Math.sqrt(1 - clamp01(node.dropoutRate));
    }
  }

  return clamp01(correlation);
}

function collectSinkPaths(
  nodeId: string,
  nodeMap: Map<string, ModuleNodeData>,
  visiting = new Set<string>(),
): Map<string, string[]> {
  const node = nodeMap.get(nodeId);
  if (!node || visiting.has(nodeId)) {
    return new Map();
  }
  if (node.successors.length === 0) {
    return new Map([[nodeId, [nodeId]]]);
  }

  const nextVisiting = new Set(visiting);
  nextVisiting.add(nodeId);

  return node.successors.reduce((paths, successor) => {
    const successorPaths = collectSinkPaths(
      successor.id,
      nodeMap,
      nextVisiting,
    );

    successorPaths.forEach((path, sinkId) => {
      paths.set(sinkId, [nodeId, ...path]);
    });

    return paths;
  }, new Map<string, string[]>());
}

function averageCorrelation(correlations: number[]) {
  if (correlations.length === 0) {
    return 0;
  }

  return clamp01(
    correlations.reduce((sum, correlation) => sum + correlation, 0)
      / correlations.length,
  );
}
