import { MarkerType, Position } from '@xyflow/react';
import { PageType } from '../PageTypes';
import type {
  KnowledgeGraphEdges,
  KnowledgeGraphEdgeStats,
  KnowledgeGraphEdgeType,
  KnowledgeGraphNodeData,
  KnowledgeGraphNodeType,
} from './KnowledgeGraphNodeTypes';
import type { DatasetSplitResult } from './model/datasetSplit';
import type {
  EntityOverfitMetrics,
  KnowledgeLossReport,
} from './model/lossMetrics';
import type { ReasoningMasteryEstimate } from './model/reasoning';
import type {
  AnyKnowledgeEdge,
  KnowledgeGraph,
  KnowledgeMaster,
  MasterGraph,
} from './model/types';

export interface KnowledgeGraphElements {
  nodes: KnowledgeGraphNodeType[];
  edges: KnowledgeGraphEdges;
}

export function buildKnowledgeGraphElements(
  graph: KnowledgeGraph,
  master: MasterGraph,
  reasoning: ReasoningMasteryEstimate,
  loss: KnowledgeLossReport,
  dataset: DatasetSplitResult,
): KnowledgeGraphElements {
  const neighborIds = new Map<string, Set<string>>();
  const allEdges = [
    ...graph.depEdges,
    ...graph.subEdges,
    ...graph.interEdges,
  ];
  allEdges.forEach((edge) => {
    addNeighbor(edge.source.id, edge.target.id);
    addNeighbor(edge.target.id, edge.source.id);
  });

  const nodeData = new Map(
    Object.values(graph.nodes).map((node) => {
      const split = dataset.nodes[node.id];
      const nodeMaster = master.nodes[node.id];
      const data: KnowledgeGraphNodeData = {
        id: node.id,
        name: node.label,
        color: node.color,
        type: PageType.KnowledgeGraph,
        neighborCount: neighborIds.get(node.id)?.size ?? 0,
        showMemoryPreview: true,
        showMetricPreview: true,
        stats: {
          dataAmount: node.dataAmount,
          trainDataAmount: split?.train ?? node.dataAmount,
          valDataAmount: split?.val ?? 0,
          testDataAmount: split?.test ?? 0,
          requiredMemory: node.requiredMemory,
          effectiveRequiredMemory:
            reasoning.effectiveCost[node.id] ?? node.requiredMemory,
          allocatedMemory: nodeMaster?.memory ?? 0,
          mastery: reasoning.mastery[node.id] ?? nodeMaster?.mastery ?? 0,
          overfitPercent: loss.nodes[node.id]?.overfitPercent ?? 0,
          trainLoss: loss.nodes[node.id]?.trainLoss ?? 0,
          valLoss: loss.nodes[node.id]?.valLoss ?? 0,
        },
        position: node.position,
      };
      return [node.id, data];
    }),
  );

  const nodes = [...nodeData.values()].map<KnowledgeGraphNodeType>((data) => ({
    id: data.id,
    type: PageType.KnowledgeGraph,
    position: data.position,
    data,
  }));
  const depEdges = graph.depEdges.map((edge) => flowEdge(
    edge,
    true,
  ));
  const subEdges = graph.subEdges.map((edge) => flowEdge(
    edge,
  ));
  const interEdges = graph.interEdges.map((edge) => flowEdge(
    edge,
  ));
  const edges = {
    depEdges,
    subEdges,
    interEdges,
    all: [...depEdges, ...subEdges, ...interEdges],
  };

  return { nodes, edges };

  function addNeighbor(nodeId: string, neighborId: string) {
    neighborIds.set(
      nodeId,
      new Set([...(neighborIds.get(nodeId) ?? []), neighborId]),
    );
  }

  function flowEdge(
    edge: AnyKnowledgeEdge,
    markerEnd = false,
  ): KnowledgeGraphEdgeType {
    const source = nodeData.get(edge.source.id)!;
    const target = nodeData.get(edge.target.id)!;
    return {
      id: edge.id,
      source: source.id,
      target: target.id,
      type: 'knowledgeGraphEdge',
      ...edgeHandles(source, target),
      className: `knowledge-edge knowledge-edge-${edge.kind}`,
      ...(markerEnd
        ? { markerEnd: { type: MarkerType.ArrowClosed } }
        : {}),
      data: {
        kind: edge.kind,
        source,
        target,
        showMemoryPreview: true,
        showMetricPreview: true,
        stats: edgeStats(
          edge,
          master.edges[edge.id],
          loss.edges[edge.id],
        ),
      },
    };
  }
}

function edgeHandles(
  source: KnowledgeGraphNodeData,
  target: KnowledgeGraphNodeData,
) {
  const deltaX = target.position.x - source.position.x;
  const deltaY = target.position.y - source.position.y;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0
      ? {
          sourceHandle: `source-${Position.Right}`,
          targetHandle: `target-${Position.Left}`,
        }
      : {
          sourceHandle: `source-${Position.Left}`,
          targetHandle: `target-${Position.Right}`,
        };
  }
  return deltaY >= 0
    ? {
        sourceHandle: `source-${Position.Bottom}`,
        targetHandle: `target-${Position.Top}`,
      }
    : {
        sourceHandle: `source-${Position.Top}`,
        targetHandle: `target-${Position.Bottom}`,
      };
}

function edgeStats(
  edge: AnyKnowledgeEdge,
  master: KnowledgeMaster | undefined,
  loss: EntityOverfitMetrics | undefined,
): KnowledgeGraphEdgeStats {
  return {
    requiredMemory: edge.stats.requiredMemory,
    allocatedMemory: master?.memory ?? 0,
    mastery: master?.mastery ?? 0,
    effectiveMastery: loss?.effectiveMastery ?? master?.mastery ?? 0,
    overfitPercent: loss?.overfitPercent ?? 0,
  };
}
