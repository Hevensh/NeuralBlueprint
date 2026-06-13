import type { ModuleBaseNodeData, ModuleRankStats, ModuleVarianceStats } from '../ModuleBaseNodeTypes';

export const CORRELATION_DECAY = 0.35;
export const LINEAR_TRANSFORM_DECORRELATION = 0.24;

const BASE_PATH_LENGTH = 1;
const LINEAR_NONLINEAR_BASE_STRENGTH = 0.35;
const LINEAR_EXPANSION_STRENGTH = 0.25;
const RELU_TRANSFORM_BASE_STRENGTH = 0.15;
const DISTANCE_EPSILON = 1e-12;

interface ModuleTransformStep {
  id: string;
  strength: number;
  reverseStrength: number;
}

export function estimateNodeLinearCorrelationByCommonSources(
  nodeA: ModuleBaseNodeData,
  nodeB: ModuleBaseNodeData,
  nodeMap: Map<string, ModuleBaseNodeData>,
) {
  const sourcePathsToA = collectSourcePaths(nodeA.id, nodeMap);
  const sourcePathsToB = collectSourcePaths(nodeB.id, nodeMap);
  const correlations: number[] = [];

  sourcePathsToA.forEach((pathSourceToA, sourceId) => {
    const pathSourceToB = sourcePathsToB.get(sourceId);
    if (!pathSourceToB) return;

    const transformDistance = transformPathDistance(
      computeSourceTransformPath(pathSourceToA, nodeMap),
      computeSourceTransformPath(pathSourceToB, nodeMap),
    );

    correlations.push(clamp01(Math.exp(-LINEAR_TRANSFORM_DECORRELATION * transformDistance)));
  });

  if (correlations.length === 0) {
    return 0;
  }

  return clamp01(correlations.reduce((sum, correlation) => (
    sum + correlation
  ), 0) / correlations.length);
}

export function estimateNodeCovarianceCorrelationByCommonSources(
  nodeA: ModuleBaseNodeData,
  nodeB: ModuleBaseNodeData,
  nodeMap: Map<string, ModuleBaseNodeData>,
) {
  const sourcePathsToA = collectSourcePaths(nodeA.id, nodeMap);
  const sourcePathsToB = collectSourcePaths(nodeB.id, nodeMap);
  const correlations: number[] = [];

  sourcePathsToA.forEach((pathSourceToA, sourceId) => {
    const pathSourceToB = sourcePathsToB.get(sourceId);
    if (!pathSourceToB) return;

    const leftCorrelation = computeCovariancePathCorrelation(pathSourceToA, nodeMap);
    const rightCorrelation = computeCovariancePathCorrelation(pathSourceToB, nodeMap);

    correlations.push(leftCorrelation * rightCorrelation);
  });

  if (correlations.length === 0) {
    return 0;
  }

  return clamp01(correlations.reduce((sum, correlation) => (
    sum + correlation
  ), 0) / correlations.length);
}

export function estimateNodeCorrelationByCommonSources(
  nodeA: ModuleBaseNodeData,
  nodeB: ModuleBaseNodeData,
  nodeMap: Map<string, ModuleBaseNodeData>,
) {
  return estimateNodeLinearCorrelationByCommonSources(nodeA, nodeB, nodeMap);
}

export function getElementCorrBetweenNodes(
  nodeAId: string,
  nodeBId: string,
  statsByNodeId: Map<string, ModuleVarianceStats>,
  nodeMap: Map<string, ModuleBaseNodeData>,
): number {
  return getVarianceCorrBetweenNodes(
    nodeAId,
    nodeBId,
    statsByNodeId,
    nodeMap,
  );
}

export function getLinearCorrBetweenNodes(
  nodeAId: string,
  nodeBId: string,
  statsByNodeId: Map<string, ModuleRankStats>,
  nodeMap: Map<string, ModuleBaseNodeData>,
): number {
  return getRankCorrBetweenNodes(
    nodeAId,
    nodeBId,
    statsByNodeId,
    nodeMap,
  );
}

function getVarianceCorrBetweenNodes(
  nodeAId: string,
  nodeBId: string,
  statsByNodeId: Map<string, ModuleVarianceStats>,
  nodeMap: Map<string, ModuleBaseNodeData>,
  visiting = new Set<string>(),
): number {
  if (nodeAId === nodeBId) {
    return 1;
  }

  const visitKey = `${nodeAId}->${nodeBId}:inputElementCorr`;
  if (visiting.has(visitKey)) {
    return 0;
  }

  const nodeA = nodeMap.get(nodeAId);
  const nodeB = nodeMap.get(nodeBId);
  const statsA = statsByNodeId.get(nodeAId);
  const statsB = statsByNodeId.get(nodeBId);
  if (!nodeA || !nodeB || !statsA || !statsB) {
    return 0;
  }

  if (hasSameReluInput(nodeA, nodeB)) {
    return 1;
  }

  const directAFromB = statsA.inputElementCorr?.[nodeBId];
  if (typeof directAFromB === 'number') {
    return clamp01(directAFromB);
  }

  const directBFromA = statsB.inputElementCorr?.[nodeAId];
  if (typeof directBFromA === 'number') {
    return clamp01(directBFromA);
  }

  const nextVisiting = new Set(visiting);
  nextVisiting.add(visitKey);
  let bestCorrelation = 0;

  nodeA.predecessors.forEach((predecessor) => {
    const localCorrelation = statsA.inputElementCorr?.[predecessor.id] ?? 0;
    if (localCorrelation <= 0) return;

    bestCorrelation = Math.max(
      bestCorrelation,
      localCorrelation * getVarianceCorrBetweenNodes(
        predecessor.id,
        nodeBId,
        statsByNodeId,
        nodeMap,
        nextVisiting,
      ),
    );
  });

  nodeB.predecessors.forEach((predecessor) => {
    const localCorrelation = statsB.inputElementCorr?.[predecessor.id] ?? 0;
    if (localCorrelation <= 0) return;

    bestCorrelation = Math.max(
      bestCorrelation,
      localCorrelation * getVarianceCorrBetweenNodes(
        nodeAId,
        predecessor.id,
        statsByNodeId,
        nodeMap,
        nextVisiting,
      ),
    );
  });

  return clamp01(bestCorrelation);
}

function getRankCorrBetweenNodes(
  nodeAId: string,
  nodeBId: string,
  statsByNodeId: Map<string, ModuleRankStats>,
  nodeMap: Map<string, ModuleBaseNodeData>,
  visiting = new Set<string>(),
): number {
  if (nodeAId === nodeBId) {
    return 1;
  }

  const visitKey = `${nodeAId}->${nodeBId}:inputLinearCorr`;
  if (visiting.has(visitKey)) {
    return 0;
  }

  const nodeA = nodeMap.get(nodeAId);
  const nodeB = nodeMap.get(nodeBId);
  const statsA = statsByNodeId.get(nodeAId);
  const statsB = statsByNodeId.get(nodeBId);
  if (!nodeA || !nodeB || !statsA || !statsB) {
    return 0;
  }

  if (hasSameReluInput(nodeA, nodeB)) {
    return 1;
  }

  const directAFromB = statsA.inputLinearCorr?.[nodeBId];
  if (typeof directAFromB === 'number') {
    return clamp01(directAFromB);
  }

  const directBFromA = statsB.inputLinearCorr?.[nodeAId];
  if (typeof directBFromA === 'number') {
    return clamp01(directBFromA);
  }

  const nextVisiting = new Set(visiting);
  nextVisiting.add(visitKey);
  let bestCorrelation = 0;

  nodeA.predecessors.forEach((predecessor) => {
    const localCorrelation = statsA.inputLinearCorr?.[predecessor.id] ?? 0;
    if (localCorrelation <= 0) return;

    bestCorrelation = Math.max(
      bestCorrelation,
      localCorrelation * getRankCorrBetweenNodes(
        predecessor.id,
        nodeBId,
        statsByNodeId,
        nodeMap,
        nextVisiting,
      ),
    );
  });

  nodeB.predecessors.forEach((predecessor) => {
    const localCorrelation = statsB.inputLinearCorr?.[predecessor.id] ?? 0;
    if (localCorrelation <= 0) return;

    bestCorrelation = Math.max(
      bestCorrelation,
      localCorrelation * getRankCorrBetweenNodes(
        nodeAId,
        predecessor.id,
        statsByNodeId,
        nodeMap,
        nextVisiting,
      ),
    );
  });

  return clamp01(bestCorrelation);
}

export function transformPathDistance(
  leftPath: ModuleTransformStep[] = [],
  rightPath: ModuleTransformStep[] = [],
) {
  let commonPrefixLength = 0;
  while (
    commonPrefixLength < leftPath.length
    && commonPrefixLength < rightPath.length
    && leftPath[commonPrefixLength].id === rightPath[commonPrefixLength].id
  ) {
    commonPrefixLength += 1;
  }

  const leftArm = leftPath.slice(commonPrefixLength);
  const rightArm = rightPath.slice(commonPrefixLength);
  const leftToRight = [...leftArm].reverse().reduce((sum, step) => (
    sum + getTransformStepBackwardCost(step)
  ), 0) + rightArm.reduce((sum, step) => (
    sum + getTransformStepForwardCost(step)
  ), 0);
  const rightToLeft = [...rightArm].reverse().reduce((sum, step) => (
    sum + getTransformStepBackwardCost(step)
  ), 0) + leftArm.reduce((sum, step) => (
    sum + getTransformStepForwardCost(step)
  ), 0);

  return (leftToRight + rightToLeft) / 2;
}

export function computePathLengthByModules(
  pathNodeIds: string[],
  nodeMap: Map<string, ModuleBaseNodeData>,
): number {
  let length = 0;

  for (let index = 1; index < pathNodeIds.length; index += 1) {
    const previousNode = nodeMap.get(pathNodeIds[index - 1]);
    const node = nodeMap.get(pathNodeIds[index]);
    if (!node) continue;

    length += computeModulePathCost(
      node,
      getPathStepDirection(previousNode, node),
    );
  }

  return length;
}

type PathStepDirection = 'forward' | 'backward';

export function computeModulePathCost(
  node: ModuleBaseNodeData,
  direction: PathStepDirection = 'forward',
) {
  switch (node.kind) {
    case 'Input':
      return 0;
    case 'Linear':
      return computeLinearPathCost(node, direction);
    case 'ReLU':
      return computeReluPathCost(node);
    case 'Sum':
      return computeSumPathCost(node);
    default:
      return BASE_PATH_LENGTH;
  }
}

export function computeLinearPathCost(
  node: ModuleBaseNodeData,
  direction: PathStepDirection = 'forward',
) {
  const inputSize = Math.max(getModuleInputSize(node), 1);
  const outputSize = Math.max(getModuleOutputSize(node), 1);

  return direction === 'forward'
    ? BASE_PATH_LENGTH * (inputSize / outputSize)
    : BASE_PATH_LENGTH * (outputSize / inputSize);
}

export function computeReluPathCost(node: ModuleBaseNodeData) {
  return node.kind === 'Input' ? 0 : BASE_PATH_LENGTH;
}

export function computeSumPathCost(node: ModuleBaseNodeData) {
  return node.kind === 'Input' ? 0 : BASE_PATH_LENGTH;
}

export function getModuleInputSize(node: ModuleBaseNodeData): number {
  return Number(
    node.inputSize
      ?? node.inFeatures
      ?? node.inputDim
      ?? node.rankStats?.rank
      ?? 1,
  );
}

export function getModuleOutputSize(node: ModuleBaseNodeData): number {
  return Number(
    node.outputSize
      ?? node.outFeatures
      ?? node.outputDim
      ?? node.rankStats?.rank
      ?? getModuleInputSize(node),
  );
}

function computeSourceTransformPath(
  pathNodeIds: string[],
  nodeMap: Map<string, ModuleBaseNodeData>,
) {
  let committedPath: ModuleTransformStep[] = [];
  let pendingPath: ModuleTransformStep[] = [];

  for (let index = 1; index < pathNodeIds.length; index += 1) {
    const node = nodeMap.get(pathNodeIds[index]);
    if (!node) continue;

    if (node.kind === 'Linear') {
      pendingPath = [...pendingPath, getLinearTransformStep(node)];
    }
    if (node.kind === 'ReLU') {
      committedPath = [
        ...committedPath,
        ...pendingPath,
        getReluTransformStep(node, nodeMap.get(pathNodeIds[index - 1])?.varianceStats),
      ];
      pendingPath = [];
    }
  }

  return committedPath;
}

function computeCovariancePathCorrelation(
  pathNodeIds: string[],
  nodeMap: Map<string, ModuleBaseNodeData>,
) {
  let correlation = 1;

  for (let index = 1; index < pathNodeIds.length; index += 1) {
    const node = nodeMap.get(pathNodeIds[index]);
    if (!node) continue;

    if (node.kind === 'Linear') {
      correlation *= 1 / Math.sqrt(Math.max(getModuleInputSize(node), 1));
    }
    if (node.kind === 'ReLU') {
      correlation *= 1 / Math.sqrt(2);
    }
  }

  return clamp01(correlation);
}

function getLinearTransformStep(node: ModuleBaseNodeData): ModuleTransformStep {
  const inputSize = Math.max(getModuleInputSize(node), DISTANCE_EPSILON);
  const outputSize = Math.max(getModuleOutputSize(node), DISTANCE_EPSILON);
  const expansion = Math.max(0, Math.log(outputSize / inputSize));
  const strength = LINEAR_NONLINEAR_BASE_STRENGTH + LINEAR_EXPANSION_STRENGTH * expansion;

  return {
    id: node.id,
    strength,
    reverseStrength: strength,
  };
}

function getReluTransformStep(
  node: ModuleBaseNodeData,
  inputStats?: ModuleVarianceStats,
): ModuleTransformStep {
  const lostRatio = getReluLostRatio(inputStats);
  const forwardStrength = RELU_TRANSFORM_BASE_STRENGTH + lostRatio;
  const reverseStrength = RELU_TRANSFORM_BASE_STRENGTH + Math.log1p(lostRatio);

  return {
    id: `${node.kind}:${node.predecessors.map((predecessor) => predecessor.id).join('|')}`,
    strength: forwardStrength,
    reverseStrength,
  };
}

function getReluLostRatio(inputStats?: ModuleVarianceStats) {
  if (!inputStats) {
    return 0;
  }

  const negativeRate = inputStats.negativeRate ?? 0.5;
  return negativeRate / Math.max(1 - negativeRate, DISTANCE_EPSILON);
}

function getTransformStepForwardCost(step: ModuleTransformStep) {
  return Math.max(0, step.strength);
}

function getTransformStepBackwardCost(step: ModuleTransformStep) {
  return Math.max(0, step.reverseStrength);
}

function collectSourcePaths(
  nodeId: string,
  nodeMap: Map<string, ModuleBaseNodeData>,
  visiting = new Set<string>(),
): Map<string, string[]> {
  const node = nodeMap.get(nodeId);
  if (!node || visiting.has(nodeId)) {
    return new Map();
  }
  if (node.predecessors.length === 0) {
    return new Map([[nodeId, [nodeId]]]);
  }

  const nextVisiting = new Set(visiting);
  nextVisiting.add(nodeId);

  return node.predecessors.reduce((paths, predecessor) => {
    const predecessorPaths = collectSourcePaths(
      predecessor.id,
      nodeMap,
      nextVisiting,
    );

    predecessorPaths.forEach((path, sourceId) => {
      paths.set(sourceId, [...path, nodeId]);
    });

    return paths;
  }, new Map<string, string[]>());
}

function hasSameReluInput(
  nodeA: ModuleBaseNodeData,
  nodeB: ModuleBaseNodeData,
) {
  return nodeA.kind === 'ReLU'
    && nodeB.kind === 'ReLU'
    && nodeA.predecessors.length === 1
    && nodeB.predecessors.length === 1
    && nodeA.predecessors[0].id === nodeB.predecessors[0].id;
}

function getPathStepDirection(
  previousNode: ModuleBaseNodeData | undefined,
  node: ModuleBaseNodeData,
): PathStepDirection {
  if (!previousNode) {
    return 'forward';
  }

  return node.predecessors.some((predecessor) => predecessor.id === previousNode.id)
    ? 'forward'
    : 'backward';
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}
