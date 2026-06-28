import type {
  ModuleBaseNode,
  ModuleNodeData,
  ModuleStats,
  ModuleStatsBackward,
} from '../ModuleBaseNodeTypes';
import { aggregateBackwardStats } from './aggregation/backward';
import { backwardModuleStats } from './backward/backwardModuleStats';
import { computeBackwardOutputPairStats } from './backward/correlation';
import { flattenSumOutputs } from './backward/sum';
import { getDefaultOutputGradient } from './backward/utils';
import { forwardModuleStats } from './forward/forwardModuleStats';
import {
  getDisconnectedStats,
  getEmptyStats,
  getInvalidInferenceStats,
} from './forward/utils/moduleStats';
import { EMPTY_STATS } from './forward/utils/constants';

export function updateModuleStats(nodes: ModuleBaseNode[]): void {
  const nodeData = nodes.map((node) => node.data);
  runForwardStats(nodeData);
  runBackwardStats(nodeData);
}

export function runForwardStats(
  nodes: ModuleNodeData[],
): Map<string, ModuleStats> {
  const stats = new Map<string, ModuleStats>();
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const sortedNodes = [...nodes].sort((left, right) => (
    (left.forwardTopologyOrder ?? 0) - (right.forwardTopologyOrder ?? 0)
  ));

  sortedNodes.forEach((node) => {
    if (node.inCycle) {
      const emptyStats = getEmptyStats(node);
      node.sumInputPairStats = undefined;
      node.stats = emptyStats;
      stats.set(node.id, emptyStats);
      return;
    }

    if (node.kind !== 'Input' && node.predecessors.length === 0) {
      const disconnectedStats = getDisconnectedStats(node);
      node.sumInputPairStats = undefined;
      node.stats = disconnectedStats;
      stats.set(node.id, disconnectedStats);
      return;
    }

    const inputNodes: ModuleNodeData[] = [];
    const inputs = node.predecessors
      .map((predecessor) => {
        const inputNode = nodeMap.get(predecessor.id);
        const inputStats = stats.get(predecessor.id);
        if (inputNode && inputStats) {
          inputNodes.push(inputNode);
        }
        return inputStats;
      })
      .filter((inputStats): inputStats is ModuleStats => Boolean(inputStats));

    if (inputs.some((input) => input.dimLabel !== 'normal')) {
      const invalidStats = getInvalidInferenceStats(node, '---');
      node.sumInputPairStats = undefined;
      node.stats = invalidStats;
      stats.set(node.id, invalidStats);
      return;
    }

    const result = forwardModuleStats({
      node,
      inputs,
      inputNodes,
      nodeMap,
      statsByNodeId: stats,
    });

    node.sumInputPairStats = result.sumInputPairStats;
    node.stats = result.stats;
    stats.set(node.id, result.stats);
  });

  return stats;
}

export function runBackwardStats(
  nodes: ModuleNodeData[],
): Map<string, ModuleStatsBackward> {
  const stats = new Map<string, ModuleStatsBackward>();
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const sortedNodes = [...nodes].sort((left, right) => (
    (left.backwardTopologyOrder ?? 0) - (right.backwardTopologyOrder ?? 0)
  ));

  sortedNodes.forEach((node) => {
    if (node.inCycle) {
      const emptyStats = getEmptyStats(node);
      node.backwardOutputPairStats = undefined;
      node.statsBackward = emptyStats;
      stats.set(node.id, emptyStats);
      return;
    }

    const outputNodes: ModuleNodeData[] = [];
    const outputGradients = node.successors
      .map((successor) => {
        const outputNode = nodeMap.get(successor.id);
        const outputStats = stats.get(successor.id);
        if (outputNode && outputStats) {
          outputNodes.push(outputNode);
        }
        return outputStats;
      })
      .filter(
        (outputStats): outputStats is ModuleStatsBackward => Boolean(outputStats),
      );

    if (node.kind !== 'Output' && outputGradients.length === 0) {
      const emptyStats = getEmptyStats(node);
      node.backwardOutputPairStats = undefined;
      node.statsBackward = emptyStats;
      stats.set(node.id, emptyStats);
      return;
    }

    if (
      node.kind !== 'Output'
      && outputGradients.some(isInvalidBackwardStats)
    ) {
      node.backwardOutputPairStats = undefined;
      node.statsBackward = EMPTY_STATS;
      stats.set(node.id, EMPTY_STATS);
      return;
    }

    const flattened = flattenSumOutputs(
      outputGradients,
      outputNodes,
      stats,
    );
    const outputPairStats = computeBackwardOutputPairStats(
      flattened.outputNodes,
      flattened.gradients,
      nodeMap,
    );
    const gradient = node.kind === 'Output'
      ? getOutputInitialGradient(node)
      : aggregateBackwardStats(flattened.gradients, outputPairStats);
    const result = backwardModuleStats(node, gradient);

    node.backwardOutputPairStats = outputPairStats.length > 0
      ? outputPairStats
      : undefined;
    node.statsBackward = result;
    stats.set(node.id, result);
  });

  return stats;
}

function getOutputInitialGradient(node: ModuleNodeData): ModuleStatsBackward {
  const rank = node.stats?.rank;
  if (node.stats?.dimLabel !== 'normal' || !Number.isFinite(rank)) {
    return EMPTY_STATS;
  }

  return getDefaultOutputGradient(rank as number);
}

function isInvalidBackwardStats(stats: ModuleStatsBackward) {
  return !Number.isFinite(stats.rank)
    || !Number.isFinite(stats.effectiveRank)
    || !Number.isFinite(stats.saturation)
    || !Number.isFinite(stats.mean)
    || !Number.isFinite(stats.variance);
}
