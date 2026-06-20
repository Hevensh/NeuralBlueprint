import type {
  KnowledgeGraphControlState,
  KnowledgeNetworkState,
  TrainingControlState,
} from './knowledgeStorage';

export class KnowledgeGraphControlsState {
  static readonly defaults = new KnowledgeGraphControlsState(
    12,
    16,
    4,
    '42',
  );

  readonly minNodes: number;
  readonly maxNodes: number;
  readonly datasetCount: number;
  readonly generationSeed: string;

  constructor(
    minNodes: number,
    maxNodes: number,
    datasetCount: number,
    generationSeed: string,
  ) {
    this.minNodes = minNodes;
    this.maxNodes = maxNodes;
    this.datasetCount = datasetCount;
    this.generationSeed = generationSeed;
  }

  static fromNetworkState(state: KnowledgeNetworkState) {
    const saved = state.graphControls;
    return new KnowledgeGraphControlsState(
      saved.minNodes,
      saved.maxNodes,
      saved.datasetCount,
      saved.generationSeed,
    );
  }

  with(patch: Partial<KnowledgeGraphControlState>) {
    return new KnowledgeGraphControlsState(
      patch.minNodes ?? this.minNodes,
      patch.maxNodes ?? this.maxNodes,
      patch.datasetCount ?? this.datasetCount,
      patch.generationSeed ?? this.generationSeed,
    );
  }

  toStorage(): KnowledgeGraphControlState {
    return {
      minNodes: this.minNodes,
      maxNodes: this.maxNodes,
      datasetCount: this.datasetCount,
      generationSeed: this.generationSeed,
    };
  }
}

export class NetworkCapabilityState {
  static readonly defaults = new NetworkCapabilityState(1200, 3, '42');

  readonly memory: number;
  readonly reasoning: number;
  readonly initializationSeed: string;

  constructor(
    memory: number,
    reasoning: number,
    initializationSeed: string,
  ) {
    this.memory = memory;
    this.reasoning = reasoning;
    this.initializationSeed = initializationSeed;
  }

  static fromNetworkState(state: KnowledgeNetworkState) {
    return new NetworkCapabilityState(
      state.master.availableMemoryPoints,
      state.master.availableReasoningPoints,
      state.trainingControls.initializationSeed,
    );
  }
}

export class TrainingConfigurationState {
  static readonly defaults = new TrainingConfigurationState(-2, -4, 100);

  readonly learningRate: number;
  readonly regularizationRate: number;
  readonly trainSteps: number;

  constructor(
    learningRate: number,
    regularizationRate: number,
    trainSteps: number,
  ) {
    this.learningRate = learningRate;
    this.regularizationRate = regularizationRate;
    this.trainSteps = trainSteps;
  }

  static fromNetworkState(state: KnowledgeNetworkState) {
    const saved = state.trainingControls;
    return new TrainingConfigurationState(
      saved.learningRate,
      saved.regularizationRate,
      saved.trainSteps,
    );
  }

  with(patch: Partial<TrainingControlState>) {
    return new TrainingConfigurationState(
      patch.learningRate ?? this.learningRate,
      patch.regularizationRate ?? this.regularizationRate,
      patch.trainSteps ?? this.trainSteps,
    );
  }
}

export class KnowledgeGraphControllerState {
  readonly graph: KnowledgeGraphControlsState;
  readonly network: NetworkCapabilityState;
  readonly training: TrainingConfigurationState;

  constructor(
    graph: KnowledgeGraphControlsState,
    network: NetworkCapabilityState,
    training: TrainingConfigurationState,
  ) {
    this.graph = graph;
    this.network = network;
    this.training = training;
  }

  static fromNetworkState(state: KnowledgeNetworkState) {
    return new KnowledgeGraphControllerState(
      KnowledgeGraphControlsState.fromNetworkState(state),
      NetworkCapabilityState.fromNetworkState(state),
      TrainingConfigurationState.fromNetworkState(state),
    );
  }
}
