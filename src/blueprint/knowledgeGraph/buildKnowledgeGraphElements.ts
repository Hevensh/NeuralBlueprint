import { MarkerType, Position } from '@xyflow/react';
import { PageType } from '../PageTypes';
import type {
  KnowledgeGraphEdges,
  KnowledgeGraphEdgeMetrics,
  KnowledgeGraphEdgeType,
  KnowledgeGraphNodeData,
  KnowledgeGraphNodeType,
} from './KnowledgeGraphNodeTypes';
import type { DatasetSplitResult } from './model/datasetSplit';
import type { KnowledgeLossReport } from './model/lossMetrics';
import {
  computeOverfitFactor,
  computeOverfitPercent,
} from './model/lossMetrics';
import {
  readEntityMemory,
  readEntityStageMemory,
} from './model/memoryOperations';
import type {
  ReasoningMasteryEstimate,
  ReasoningStageEstimate,
} from './model/reasoning';
import { computeTrainingSignal } from './model/trainingSignal';
import type { UtilityReport } from './model/utilityEstimate';
import type {
  AnyKnowledgeEdge,
  KnowledgeGraphDefinition,
  KnowledgeGraphMemory,
} from './model/types';

export interface KnowledgeGraphElements {
  nodes: KnowledgeGraphNodeType[];
  edges: KnowledgeGraphEdges;
}

export function buildKnowledgeGraphElements(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  reasoning: ReasoningMasteryEstimate,
  validationReasoning: ReasoningMasteryEstimate,
  loss: KnowledgeLossReport,
  dataset: DatasetSplitResult,
  utilities: UtilityReport,
): KnowledgeGraphElements {
  const neighborIds = new Map<string, Set<string>>();
  const memorySelectionLabel = `[${memory.selectedInferenceStage}]`;
  const visibleStage = memory.selectedInferenceStage;
  const visibleReasoning = reasoning.stages[visibleStage] ?? reasoning;
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
      const data: KnowledgeGraphNodeData = {
        id: node.id,
        name: node.label,
        color: node.color,
        type: PageType.KnowledgeGraph,
        neighborCount: neighborIds.get(node.id)?.size ?? 0,
        memorySelectionLabel,
        showMemoryPreview: true,
        showMetricPreview: true,
        showUtilityPreview: true,
        showGlobalDebugPreview: true,
        properties: {
          dataAmount: node.dataAmount,
          requiredMemory: node.requiredMemory,
        },
        metrics: {
          trainDataAmount: split?.train ?? node.dataAmount,
          valDataAmount: split?.val ?? 0,
          testDataAmount: split?.test ?? 0,
          effectiveRequiredMemory:
            visibleReasoning.effectiveCost[node.id] ?? node.requiredMemory,
          allocatedMemory: readEntityMemory(memory, node),
          mastery: visibleReasoning.mastery[node.id] ?? 0,
          overfitPercent:
            (visibleReasoning.overfitRate[node.id] ?? 0) * 100,
          trainLoss: loss.nodes[node.id]?.trainLoss ?? 0,
          valLoss: loss.nodes[node.id]?.valLoss ?? 0,
          training: computeTrainingSignal(
            node,
            utilities,
            memory.selectedInferenceStage,
          ),
          stagePreviews: utilities.stages.map((utilityStage, stage) => ({
            utility: utilityStage.nodes[node.id]?.total ?? 0,
            allocated: readEntityStageMemory(memory, node, stage),
            required:
              reasoning.stages[stage]?.effectiveCost[node.id]
              ?? node.requiredMemory,
          })),
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
        ? {
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#38bdf8',
            },
          }
        : {}),
      data: {
        id: edge.id,
        kind: edge.kind,
        memorySelectionLabel,
        source,
        target,
        showMemoryPreview: true,
        showMetricPreview: true,
        showUtilityPreview: true,
        showGlobalDebugPreview: true,
        properties: {
          requiredMemory: edge.properties.requiredMemory,
          lambda: edge.properties.lambda,
        },
        metrics: edgeMetrics(
          edge,
          memory,
          visibleReasoning,
          validationReasoning.stages[visibleStage] ?? validationReasoning,
          utilities,
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

function edgeMetrics(
  edge: AnyKnowledgeEdge,
  memory: KnowledgeGraphMemory,
  stage: ReasoningStageEstimate,
  validationStage: ReasoningStageEstimate,
  utilities: UtilityReport,
): KnowledgeGraphEdgeMetrics {
  const cumulativeMemory = stage.edges[edge.id]?.allocatedMemory ?? 0;
  const visibleMemory = readEntityStageMemory(
    memory,
    edge,
    memory.selectedInferenceStage,
  );
  const mastery = stage.edges[edge.id]?.mastery ?? 0;
  return {
    allocatedMemory: visibleMemory,
    mastery,
    effectiveMastery: validationStage.edges[edge.id]?.mastery ?? mastery,
    overfitPercent: computeOverfitPercent(computeOverfitFactor(
      cumulativeMemory,
      edge.properties.requiredMemory,
      edge.properties.overfitCoefficient,
    )),
    training: computeTrainingSignal(
      edge,
      utilities,
      memory.selectedInferenceStage,
    ),
    stagePreviews: utilities.stages.map((utilityStage, stage) => ({
      utility: utilityStage.edges[edge.id]?.total ?? 0,
      allocated: readEntityStageMemory(memory, edge, stage),
      required: edge.properties.requiredMemory,
    })),
  };
}
