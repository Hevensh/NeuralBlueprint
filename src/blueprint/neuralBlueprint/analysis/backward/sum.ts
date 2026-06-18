import type {
  ModuleBaseNodeData,
  ModuleStatsBackward,
} from '../../ModuleBaseNodeTypes';

export function flattenSumOutputs(
  gradients: ModuleStatsBackward[],
  outputNodes: ModuleBaseNodeData[],
  statsByNodeId: Map<string, ModuleStatsBackward>,
  visiting = new Set<string>(),
) {
  const flattenedGradients: ModuleStatsBackward[] = [];
  const flattenedOutputNodes: ModuleBaseNodeData[] = [];

  outputNodes.forEach((outputNode, index) => {
    const gradient = gradients[index];
    if (
      outputNode.kind !== 'Sum'
      || outputNode.successors.length === 0
      || visiting.has(outputNode.id)
    ) {
      if (gradient) {
        flattenedGradients.push(gradient);
        flattenedOutputNodes.push(outputNode);
      }
      return;
    }

    const nextVisiting = new Set(visiting);
    nextVisiting.add(outputNode.id);
    const nestedOutputNodes: ModuleBaseNodeData[] = [];
    const nestedGradients = outputNode.successors
      .map((successor) => {
        const successorStats = statsByNodeId.get(successor.id);
        if (successorStats) {
          nestedOutputNodes.push(successor);
        }
        return successorStats;
      })
      .filter(
        (successorStats): successorStats is ModuleStatsBackward => (
          Boolean(successorStats)
        ),
      );
    const nestedFlattened = flattenSumOutputs(
      nestedGradients,
      nestedOutputNodes,
      statsByNodeId,
      nextVisiting,
    );

    flattenedGradients.push(...nestedFlattened.gradients);
    flattenedOutputNodes.push(...nestedFlattened.outputNodes);
  });

  return {
    gradients: flattenedGradients,
    outputNodes: flattenedOutputNodes,
  };
}
