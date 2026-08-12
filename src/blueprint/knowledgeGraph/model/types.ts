export type NodeId = string;
export type EdgeId = string;

export type KnowledgeEdgeKind = 'dependency' | 'substitute' | 'interference';

export type AdaptationRequirementValue = number;
export type ReceptiveFieldBand =
  | 'small'
  | 'medium'
  | 'large'
  | 'extraLarge'
  | 'global';
export type DistanceIndexBand =
  | 'none'
  | 'short'
  | 'medium'
  | 'long'
  | 'global';
export type KnowledgeAdaptationRoute = 'receptiveField' | 'distanceIndex';

export type ReceptiveFieldPoints<T = number> = Record<ReceptiveFieldBand, T>;
export type DistanceIndexPoints<T = number> = Record<DistanceIndexBand, T>;

export type KnowledgeAdaptationPoints<T = number> = {
  receptiveField: ReceptiveFieldPoints<T>;
  distanceIndex: DistanceIndexPoints<T>;
};

export type KnowledgeAdaptationRequirements =
  KnowledgeAdaptationPoints<AdaptationRequirementValue>;

export type KnowledgeAdaptationMatch = {
  receptiveField: number;
  distanceIndex: number;
  combined: number;
};

export type KnowledgeNode = {
  kind: 'node';
  id: NodeId;
  label: string;
  dataAmount: number;
  requiredMemory: number;
  adaptationRequirements: KnowledgeAdaptationRequirements;
  overfitCoefficient: number;
  lossMin: number;
  lossMax: number;
  color: string;
  position: {
    x: number;
    y: number;
  };
};

export type KnowledgeEdgeProperties = {
  requiredMemory: number;
  adaptationRequirements: KnowledgeAdaptationRequirements;
  overfitCoefficient: number;
  lambda: number;
};

export type KnowledgeEdge<Kind extends KnowledgeEdgeKind> = {
  kind: Kind;
  id: EdgeId;
  source: KnowledgeNode;
  target: KnowledgeNode;
  properties: KnowledgeEdgeProperties;
};

export type DependencyEdge = KnowledgeEdge<'dependency'>;
export type SubstituteEdge = KnowledgeEdge<'substitute'>;
export type InterferenceEdge = KnowledgeEdge<'interference'>;
export type AnyKnowledgeEdge =
  | DependencyEdge
  | SubstituteEdge
  | InterferenceEdge;
export type KnowledgeEntity = KnowledgeNode | AnyKnowledgeEdge;

export type KnowledgeGraphDefinition = {
  nodes: Record<NodeId, KnowledgeNode>;
  depEdges: DependencyEdge[];
  subEdges: SubstituteEdge[];
  interEdges: InterferenceEdge[];
};

export type KnowledgeLossPoint = {
  epoch: number;
  trainLoss: number;
  valLoss: number | null;
};

export type MemoryProfileSource = 'preset' | 'blueprint';

export type KnowledgeMemoryBudgetPool = {
  id: string;
  inferenceStages: number[];
  memoryPoint: number;
  adaptationCapability: KnowledgeAdaptationPoints;
  varianceLogDistance?: number;
};

export type KnowledgeMemoryAllocation = {
  nodes: Record<NodeId, number>;
  edges: Record<EdgeId, number>;
};

export type KnowledgeMemoryStageTable = {
  stage: number;
  allocations: Record<string, KnowledgeMemoryAllocation>;
};

export type KnowledgeGraphMemory = {
  budgetPools: KnowledgeMemoryBudgetPool[];
  stageTables: KnowledgeMemoryStageTable[];
  selectedInferenceStage: number;
  memoryProfileSource: MemoryProfileSource;
  presetMemoryPoints: number;
  presetReasoningPoints: number;
  availableMemoryPoints: number;
  availableReasoningPoints: number;
};

export type KnowledgeGraphStats = {
  nodeCount: number;
  dependencyEdgeCount: number;
  substituteEdgeCount: number;
  interferenceEdgeCount: number;
  totalRequiredNodeMemory: number;
  totalRequiredEdgeMemory: number;
  totalAllocatedNodeMemory: number;
  totalAllocatedEdgeMemory: number;
  availableMemoryPoints: number;
  usedMemoryPoints: number;
  remainingMemoryPoints: number;
  availableReasoningPoints: number;
  maxDependencyDepth: number;
};
