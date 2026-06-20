export type NodeId = string;
export type EdgeId = string;

export type KnowledgeEdgeKind = 'dependency' | 'substitute' | 'interference';

export type KnowledgeNode = {
  kind: 'node';
  id: NodeId;
  label: string;
  dataAmount: number;
  requiredMemory: number;
  overfitCoefficient: number;
  lossMin: number;
  lossMax: number;
  color: string;
  position: {
    x: number;
    y: number;
  };
};

export type KnowledgeEdgeStats = {
  requiredMemory: number;
  overfitCoefficient: number;
  lambda: number;
};

export type KnowledgeEdge<Kind extends KnowledgeEdgeKind> = {
  kind: Kind;
  id: EdgeId;
  source: KnowledgeNode;
  target: KnowledgeNode;
  stats: KnowledgeEdgeStats;
};

export type DependencyEdge = KnowledgeEdge<'dependency'>;
export type SubstituteEdge = KnowledgeEdge<'substitute'>;
export type InterferenceEdge = KnowledgeEdge<'interference'>;
export type AnyKnowledgeEdge =
  | DependencyEdge
  | SubstituteEdge
  | InterferenceEdge;
export type KnowledgeEntity = KnowledgeNode | AnyKnowledgeEdge;

export type KnowledgeGraph = {
  nodes: Record<NodeId, KnowledgeNode>;
  depEdges: DependencyEdge[];
  subEdges: SubstituteEdge[];
  interEdges: InterferenceEdge[];
};

export type KnowledgeMaster = {
  id: NodeId;
  memory: number;
  mastery: number;
};

export type MasterGraph = {
  nodes: Record<NodeId, KnowledgeMaster>;
  edges: Record<EdgeId, KnowledgeMaster>;
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
