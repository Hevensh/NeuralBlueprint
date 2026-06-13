import type {
  ModuleBaseNode,
  ModuleBaseNodeData,
} from './neuralBlueprint/ModuleBaseNodeTypes';
import type {
  KnowledgeGraphNodeData,
  KnowledgeGraphNodeType,
} from './knowledgeGraph/KnowledgeGraphNodeTypes';
import type {
  TrainingProcessNodeData,
  TrainingProcessNodeType,
} from './trainingProcess/TrainingProcessNodeTypes';

export const PageType = {
  NeuralBlueprint: 'neuralBlueprint',
  KnowledgeGraph: 'knowledgeGraph',
  TrainingProcess: 'trainingProcess',
} as const;

export type PageType = typeof PageType[keyof typeof PageType];
export type NeuralBlueprintPageType = typeof PageType.NeuralBlueprint;
export type KnowledgeGraphPageType = typeof PageType.KnowledgeGraph;
export type TrainingProcessPageType = typeof PageType.TrainingProcess;

export type PageNodeData =
  | ModuleBaseNodeData
  | KnowledgeGraphNodeData
  | TrainingProcessNodeData;

export type PageNodeType =
  | ModuleBaseNode
  | KnowledgeGraphNodeType
  | TrainingProcessNodeType;
