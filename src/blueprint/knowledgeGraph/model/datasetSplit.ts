import {
  createSeededRandom,
  sampleNormal,
  type Random,
} from './random';
import type { KnowledgeGraphDefinition, NodeId } from './types';

export type DatasetSplitRatio = {
  train: number;
  val: number;
  test: number;
};

export type KnowledgeDataset = {
  id: string;
  label: string;
  seed: string;
  enabled: boolean;
  color: string;
  splitRatio: DatasetSplitRatio;
  nodeDataAmounts: Record<NodeId, number>;
};

export type KnowledgeDatasetCollection = {
  activeDatasetId: string;
  datasets: KnowledgeDataset[];
};

export type NodeDatasetSplit = {
  nodeId: NodeId;
  total: number;
  train: number;
  val: number;
  test: number;
};

export type DatasetSplitResult = {
  ratios: DatasetSplitRatio;
  nodes: Record<NodeId, NodeDatasetSplit>;
  totals: NodeDatasetSplit;
};

const DATASET_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
];

export function createEmptyKnowledgeDatasetCollection(): KnowledgeDatasetCollection {
  return {
    activeDatasetId: '',
    datasets: [],
  };
}

export function generateKnowledgeDatasets(
  graph: KnowledgeGraphDefinition,
  datasetCount: number,
  seed = '42',
  splitRatio: DatasetSplitRatio = { train: 4, val: 1, test: 0 },
): KnowledgeDatasetCollection {
  const nodeIds = Object.keys(graph.nodes);
  const count = Math.max(1, Math.floor(datasetCount));
  const random = createSeededRandom(`${seed}:datasets:${count}`);
  const coverageCount = Math.max(
    1,
    Math.min(
      nodeIds.length,
      Math.round(
        nodeIds.length * Math.min(1, (1 + Math.log(count)) / count),
      ),
    ),
  );
  const coverageVariation = Math.round(
    0.1 * nodeIds.length * Math.log(count),
  );
  const coverageCounts = Object.fromEntries(
    nodeIds.map((nodeId) => [nodeId, 0]),
  ) as Record<NodeId, number>;
  const neighbors = graphAdjacency(graph);

  const datasets = Array.from({ length: count }, (_, index): KnowledgeDataset => {
    const datasetSeed = datasetSeedAt(seed, index);
    const datasetRandom = createSeededRandom(datasetSeed);
    const datasetCoverageCount = Math.max(
      1,
      Math.min(
        nodeIds.length,
        coverageCount
          + Math.floor(random() * (coverageVariation * 2 + 1))
          - coverageVariation,
      ),
    );
    const coveredNodeIds = selectCoveredNodes(
      graph,
      datasetCoverageCount,
      neighbors,
      coverageCounts,
      random,
    );
    coveredNodeIds.forEach((nodeId) => {
      coverageCounts[nodeId] += 1;
    });
    return {
      id: `dataset_${index + 1}`,
      label: `Dataset ${index + 1}`,
      seed: datasetSeed,
      enabled: true,
      color: DATASET_COLORS[index % DATASET_COLORS.length],
      splitRatio,
      nodeDataAmounts: Object.fromEntries(
        nodeIds.map((id) => [
          id,
          coveredNodeIds.has(id)
            ? Math.max(1, Math.round(sampleNormal(datasetRandom, 90, 10)))
            : 0,
        ]),
      ),
    };
  });

  return {
    activeDatasetId: datasets[0]?.id ?? '',
    datasets,
  };
}

function selectCoveredNodes(
  graph: KnowledgeGraphDefinition,
  coverageCount: number,
  neighbors: Record<NodeId, Set<NodeId>>,
  coverageCounts: Record<NodeId, number>,
  random: Random,
) {
  const nodeIds = Object.keys(graph.nodes);
  const centerNodeId = pickDatasetCenter(graph, coverageCounts, random);
  const selected = new Set<NodeId>([centerNodeId]);
  const globalCenter = graphCenter(graph);

  while (selected.size < Math.min(coverageCount, nodeIds.length)) {
    const adjacent = [...new Set(
      [...selected].flatMap((nodeId) => [...neighbors[nodeId]]),
    )].filter((nodeId) => !selected.has(nodeId));
    const candidates = adjacent.length > 0
      ? adjacent
      : nodeIds.filter((nodeId) => !selected.has(nodeId));
    if (candidates.length === 0) break;

    const nextNodeId = weightedPick(candidates, (nodeId) => {
      const node = graph.nodes[nodeId];
      const distanceToDatasetCenter = nodeDistance(
        graph,
        nodeId,
        centerNodeId,
      );
      const distanceToGlobalCenter = Math.hypot(
        node.position.x - globalCenter.x,
        node.position.y - globalCenter.y,
      );
      const uncoveredBoost = coverageCounts[nodeId] === 0
        ? 5
        : 1 / (1 + coverageCounts[nodeId]);
      return uncoveredBoost
        * (1 + distanceToGlobalCenter / 220)
        / (1 + distanceToDatasetCenter / 180);
    }, random);
    selected.add(nextNodeId);
  }

  return selected;
}

function pickDatasetCenter(
  graph: KnowledgeGraphDefinition,
  coverageCounts: Record<NodeId, number>,
  random: Random,
) {
  const center = graphCenter(graph);
  return weightedPick(Object.values(graph.nodes), (node) => {
    const uncoveredBoost = coverageCounts[node.id] === 0
      ? 4
      : 1 / (1 + coverageCounts[node.id]);
    return uncoveredBoost * (
      1 + Math.hypot(
        node.position.x - center.x,
        node.position.y - center.y,
      ) / 180
    );
  }, random).id;
}

function graphCenter(graph: KnowledgeGraphDefinition) {
  const nodes = Object.values(graph.nodes);
  return {
    x: nodes.reduce((sum, node) => sum + node.position.x, 0) / nodes.length,
    y: nodes.reduce((sum, node) => sum + node.position.y, 0) / nodes.length,
  };
}

function graphAdjacency(graph: KnowledgeGraphDefinition) {
  const neighbors = Object.fromEntries(
    Object.keys(graph.nodes).map((nodeId) => [nodeId, new Set<NodeId>()]),
  ) as Record<NodeId, Set<NodeId>>;
  [
    ...graph.depEdges,
    ...graph.subEdges,
    ...graph.interEdges,
  ].forEach((edge) => {
    neighbors[edge.source.id].add(edge.target.id);
    neighbors[edge.target.id].add(edge.source.id);
  });
  return neighbors;
}

function nodeDistance(
  graph: KnowledgeGraphDefinition,
  firstNodeId: NodeId,
  secondNodeId: NodeId,
) {
  const first = graph.nodes[firstNodeId].position;
  const second = graph.nodes[secondNodeId].position;
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function weightedPick<T>(
  values: T[],
  weightOf: (value: T) => number,
  random: Random,
) {
  const weighted = values.map((value) => ({
    value,
    weight: Math.max(0.001, weightOf(value)),
  }));
  let cursor = random() * weighted.reduce(
    (sum, item) => sum + item.weight,
    0,
  );
  return weighted.find((item) => {
    cursor -= item.weight;
    return cursor <= 0;
  })?.value ?? values.at(-1)!;
}

function datasetSeedAt(seed: string, index: number) {
  const baseSeed = Number.parseInt(seed || '42', 10);
  return String((Number.isFinite(baseSeed) ? baseSeed : 42) + index);
}

export function splitEnabledKnowledgeDatasets(
  graph: KnowledgeGraphDefinition,
  collection: KnowledgeDatasetCollection | undefined,
): DatasetSplitResult {
  const enabled = collection?.datasets.filter((dataset) => dataset.enabled) ?? [];
  const result = emptySplit(graph);

  enabled.forEach((dataset) => {
    const ratio = sanitizeRatio(dataset.splitRatio);
    Object.values(graph.nodes).forEach((node) => {
      const total = Math.max(
        0,
        Math.floor(dataset.nodeDataAmounts[node.id] ?? node.dataAmount),
      );
      const split = {
        nodeId: node.id,
        total,
        ...allocate(total, ratio),
      };
      addSplit(result.nodes[node.id], split);
      addSplit(result.totals, split);
    });
  });
  return result;
}

function allocate(total: number, ratio: DatasetSplitRatio) {
  const ratioTotal = ratio.train + ratio.val + ratio.test;
  const exact = [
    ['train', total * ratio.train / ratioTotal],
    ['val', total * ratio.val / ratioTotal],
    ['test', total * ratio.test / ratioTotal],
  ] as const;
  const counts = {
    train: Math.floor(exact[0][1]),
    val: Math.floor(exact[1][1]),
    test: Math.floor(exact[2][1]),
  };
  let remaining = total - counts.train - counts.val - counts.test;

  [...exact]
    .sort((a, b) => (b[1] % 1) - (a[1] % 1))
    .forEach(([key]) => {
      if (remaining <= 0) return;
      counts[key] += 1;
      remaining -= 1;
    });
  return counts;
}

function sanitizeRatio(ratio: DatasetSplitRatio): DatasetSplitRatio {
  const clean = {
    train: Math.max(0, Number.isFinite(ratio.train) ? ratio.train : 0),
    val: Math.max(0, Number.isFinite(ratio.val) ? ratio.val : 0),
    test: Math.max(0, Number.isFinite(ratio.test) ? ratio.test : 0),
  };
  return clean.train + clean.val + clean.test > 0
    ? clean
    : { train: 1, val: 0, test: 0 };
}

function emptySplit(
  graph: KnowledgeGraphDefinition,
  ratios: DatasetSplitRatio = { train: 0, val: 0, test: 0 },
): DatasetSplitResult {
  return {
    ratios,
    nodes: Object.fromEntries(
      Object.keys(graph.nodes).map((nodeId) => [
        nodeId,
        { nodeId, total: 0, train: 0, val: 0, test: 0 },
      ]),
    ),
    totals: { nodeId: 'total', total: 0, train: 0, val: 0, test: 0 },
  };
}

function addSplit(
  target: NodeDatasetSplit,
  source: NodeDatasetSplit | undefined,
) {
  if (!source) return;
  target.total += source.total;
  target.train += source.train;
  target.val += source.val;
  target.test += source.test;
}
