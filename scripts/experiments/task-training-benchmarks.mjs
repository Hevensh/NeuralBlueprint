import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'error',
  server: { hmr: false, middlewareMode: true },
});

try {
  const { getTaskFileInitialState } = await server.ssrLoadModule(
    '/src/taskData/fileInitialState.ts',
  );
  const { createRuntimeNeuralBlueprintGraph } = await server.ssrLoadModule(
    '/src/dataStorage/neuralBlueprintStorage.ts',
  );
  const { updateState } = await server.ssrLoadModule(
    '/src/blueprint/neuralBlueprint/analysis/updateState.ts',
  );
  const { buildInferenceMemoryProfile } = await server.ssrLoadModule(
    '/src/blueprint/neuralBlueprint/analysis/inferenceMemoryProfile.ts',
  );
  const {
    createKnowledgeGraphMemory,
    setMemoryProfileSource,
  } = await server.ssrLoadModule(
    '/src/blueprint/knowledgeGraph/model/memoryState.ts',
  );
  const {
    applyPretrainedModuleAllocation,
    initializeAllocation,
  } = await server.ssrLoadModule(
    '/src/blueprint/knowledgeGraph/model/allocationStrategies.ts',
  );
  const {
    createTrainingRandomState,
    runTrainingSimulation,
  } = await server.ssrLoadModule(
    '/src/blueprint/knowledgeGraph/model/trainingSimulation.ts',
  );
  const { splitEnabledKnowledgeDatasets } = await server.ssrLoadModule(
    '/src/blueprint/knowledgeGraph/model/datasetSplit.ts',
  );
  const { estimateStagedMastery } = await server.ssrLoadModule(
    '/src/blueprint/knowledgeGraph/model/reasoning.ts',
  );
  const { computeKnowledgeLossReport } = await server.ssrLoadModule(
    '/src/blueprint/knowledgeGraph/model/lossMetrics.ts',
  );
  const {
    readEntityTotalMemory,
    totalAllocatedMemory,
  } = await server.ssrLoadModule(
    '/src/blueprint/knowledgeGraph/model/memoryOperations.ts',
  );

  const dependencies = {
    getTaskFileInitialState,
    createRuntimeNeuralBlueprintGraph,
    updateState,
    buildInferenceMemoryProfile,
    createKnowledgeGraphMemory,
    setMemoryProfileSource,
    applyPretrainedModuleAllocation,
    initializeAllocation,
    createTrainingRandomState,
    runTrainingSimulation,
    splitEnabledKnowledgeDatasets,
    estimateStagedMastery,
    computeKnowledgeLossReport,
    readEntityTotalMemory,
    totalAllocatedMemory,
  };

  const scenarios = [
    ['task1', task1Blueprint, 100],
    ['task2', (graph) => task2Blueprint(graph, 64), 100, 'task2_64'],
    ['task2', (graph) => task2Blueprint(graph, 128), 100, 'task2_128'],
    ['task2', (graph) => task2Blueprint(graph, 256), 100, 'task2_256'],
    ['task2', (graph) => task2Blueprint(graph, 512), 100, 'task2_512'],
    ['task3_cifar_scratch', undefined, 100],
    ['task3_cifar_pretrained', undefined, 100],
  ];
  const reports = scenarios.map(([fileId, customize, epochs, label]) => (
    runScenario(dependencies, fileId, customize, epochs, label)
  ));

  console.table(reports.map((report) => ({
    task: report.fileId,
    model: modelLabel(report.fileId),
    epochs: report.epochs,
    bestEpoch: report.bestEpoch,
    initialization: report.pretrained ? 'pretrained' : 'scratch',
    initialAllocated: report.initialAllocatedMemory,
    finalAllocated: report.finalAllocatedMemory,
    memory: report.profile.totalMemoryPoint,
    stages: report.profile.stages.length,
    trainAccuracy: percent(report.loss.graphTrainAccuracy),
    valAccuracy: percent(report.loss.graphValAccuracy),
    bestValAccuracy: percent(report.bestValAccuracy),
    valLoss: report.loss.graphValLoss.toFixed(4),
    bestValLoss: report.bestValLoss.toFixed(4),
    learnedEdges: report.learnedEdgeCount,
    edgeMemory: report.edgeMemory,
  })));

  assertScenarioBaselines(reports);
  console.log('\nAll task training benchmark assertions passed.');

  for (const report of process.argv.includes('--verbose') ? reports : []) {
    console.log(`\n${report.fileId}`);
    console.table(report.nodes);
    console.table(report.edges);
    if (report.fileId.startsWith('task2')) console.table(report.stageTrace);
    if (report.fileId.startsWith('task2')) console.table(
      report.profile.groups.map((group) => ({
        group: group.id,
        memory: group.memoryPoint,
        stages: group.inferenceStages.join(','),
      })),
    );
  }
} finally {
  await server.close();
}

function runScenario(
  dependencies,
  fileId,
  customizeBlueprint,
  epochs = 100,
  label = fileId,
) {
  const initial = dependencies.getTaskFileInitialState(fileId);
  assert.ok(initial?.neuralBlueprint?.graph, `missing blueprint for ${fileId}`);
  assert.ok(initial.knowledgeGraph, `missing knowledge graph for ${fileId}`);

  const storedGraph = customizeBlueprint
    ? customizeBlueprint(initial.neuralBlueprint.graph)
    : initial.neuralBlueprint.graph;
  const runtime = dependencies.createRuntimeNeuralBlueprintGraph(storedGraph);
  const nodes = dependencies.updateState(runtime.nodes);
  const profile = dependencies.buildInferenceMemoryProfile(nodes);
  const graph = initial.knowledgeGraph.graphDefinition;
  let memory = dependencies.createKnowledgeGraphMemory(graph, 1200, 3);
  memory = dependencies.setMemoryProfileSource(graph, memory, 'blueprint', profile);
  memory = dependencies.initializeAllocation(graph, memory, '42');
  if (profile.pretrainingModules.length > 0) {
    memory = dependencies.applyPretrainedModuleAllocation(
      graph,
      memory,
      profile.pretrainingModules,
    );
  }
  const initialAllocatedMemory = dependencies.totalAllocatedMemory(memory);

  const result = dependencies.runTrainingSimulation(
    graph,
    memory,
    0,
    [],
    {
      optimizer: 'sgd',
      learningRate: -3,
      regularizationRate: -4,
      epochs,
      datasetCollection: initial.knowledgeGraph.datasetCollection,
      trainingRandomState: dependencies.createTrainingRandomState('42'),
    },
  );
  const dataset = dependencies.splitEnabledKnowledgeDatasets(
    graph,
    initial.knowledgeGraph.datasetCollection,
  );
  const train = dependencies.estimateStagedMastery(graph, result.memory, 'train');
  const validation = dependencies.estimateStagedMastery(
    graph,
    result.memory,
    'val',
  );
  const loss = dependencies.computeKnowledgeLossReport(
    graph,
    result.memory,
    train,
    validation,
    dataset,
  );
  const edges = graph.depEdges.map((edge) => ({
    edge: edge.id,
    memory: dependencies.readEntityTotalMemory(result.memory, edge),
    masteryValue: validation.stages.at(-1)?.edges[edge.id]?.mastery ?? 0,
    mastery: percent(validation.stages.at(-1)?.edges[edge.id]?.mastery),
  }));
  const knowledgeNodes = Object.values(graph.nodes).map((node) => ({
    node: node.id,
    required: node.requiredMemory,
    memory: dependencies.readEntityTotalMemory(result.memory, node),
    mastery: percent(validation.mastery[node.id]),
    valLoss: loss.nodes[node.id]?.valLoss.toFixed(3),
  }));
  const stageTrace = validation.stages.map((stage) => ({
    stage: stage.stage,
    targetCost: stage.effectiveCost.relu_breakpoint,
    targetMemory: stage.adjustedMemory.relu_breakpoint,
    targetMastery: stage.mastery.relu_breakpoint,
    sourceMastery: stage.mastery.linear_feature,
    dependencyMastery: stage.edges.dependency_1?.mastery,
  }));
  const validationPoints = result.lossHistory.filter((point) => (
    Number.isFinite(point.valLoss)
  ));
  const bestValidation = validationPoints.reduce((best, point) => {
    if (!best) return point;
    if (Number.isFinite(point.valAccuracy)) {
      return point.valAccuracy > (best.valAccuracy ?? -Infinity)
        ? point
        : best;
    }
    return point.valLoss < best.valLoss ? point : best;
  }, null);

  return {
    fileId: label,
    epochs: result.epoch,
    pretrained: profile.pretrainingModules.length > 0,
    initialAllocatedMemory,
    finalAllocatedMemory: dependencies.totalAllocatedMemory(result.memory),
    profile,
    loss,
    nodes: knowledgeNodes,
    stageTrace,
    bestEpoch: bestValidation?.epoch ?? result.epoch,
    bestValLoss: Math.min(...validationPoints.map((point) => point.valLoss)),
    bestValAccuracy: validationPoints.reduce((best, point) => (
      Number.isFinite(point.valAccuracy)
        ? Math.max(best, point.valAccuracy)
        : best
    ), Number.NEGATIVE_INFINITY),
    edges,
    learnedEdgeCount: edges.filter((edge) => edge.memory > 0).length,
    edgeMemory: edges.reduce((sum, edge) => sum + edge.memory, 0),
  };
}

function assertScenarioBaselines(reports) {
  const byId = new Map(reports.map((report) => [report.fileId, report]));
  const task1 = byId.get('task1');
  const task2At64 = byId.get('task2_64');
  const task2At128 = byId.get('task2_128');
  const task2At256 = byId.get('task2_256');
  const task2At512 = byId.get('task2_512');
  const scratch = byId.get('task3_cifar_scratch');
  const pretrained = byId.get('task3_cifar_pretrained');
  assert.ok(
    task1
    && task2At64
    && task2At128
    && task2At256
    && task2At512
    && scratch
    && pretrained,
  );

  assert.equal(task1.epochs, 100);
  assert.ok(task1.bestValLoss <= 0.1, 'Task 1 best model regressed');

  assert.equal(task2At256.epochs, 100);
  assert.ok(
    task2At64.bestValLoss > 1,
    'Task 2 width 64 should remain clearly under capacity',
  );
  assert.ok(
    between(task2At128.bestValLoss, 0.45, 0.55),
    'Task 2 width 128 should reach about 0.5 Best Val Loss',
  );
  assert.ok(
    between(task2At256.bestValLoss, 0.25, 0.35),
    'Task 2 width 256 should reach about 0.3 Best Val Loss',
  );
  assert.ok(
    task2At512.bestValLoss > task2At256.bestValLoss + 0.1,
    'Task 2 should start overfitting above width 256',
  );
  for (const report of [task2At64, task2At128, task2At256, task2At512]) {
    assert.equal(report.learnedEdgeCount, 1, `${report.fileId} lost its dependency`);
  }

  assert.equal(scratch.epochs, 100);
  assert.ok(
    between(scratch.loss.graphValAccuracy, 0.76, 0.83),
    'Task 3A validation accuracy left the 80% target band',
  );
  assert.equal(pretrained.epochs, 100);
  assert.ok(
    between(pretrained.loss.graphValAccuracy, 0.93, 0.97),
    'Task 3B validation accuracy left the 93-97% target band',
  );
  assert.ok(
    pretrained.loss.graphValAccuracy - scratch.loss.graphValAccuracy >= 0.1,
    'Task 3 pretraining advantage is too small',
  );
}

function modelLabel(fileId) {
  return {
    task1: 'Linear(2)',
    task2_64: 'Linear(64)-ReLU-Linear(2)',
    task2_128: 'Linear(128)-ReLU-Linear(2)',
    task2_256: 'Linear(256)-ReLU-Linear(2)',
    task2_512: 'Linear(512)-ReLU-Linear(2)',
    task3_cifar_scratch: 'ResNet-18 scratch',
    task3_cifar_pretrained: 'ResNet-18 ImageNet',
  }[fileId] ?? fileId;
}

function between(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function task1Blueprint(graph) {
  return {
    ...graph,
    nodes: [
      ...graph.nodes,
      storedLinear('task1_best_linear', 2, 430, 360),
    ],
    edges: chain(['task1_input', 'task1_best_linear', 'task1_output']),
  };
}

function task2Blueprint(graph, hiddenDim) {
  return {
    ...graph,
    nodes: [
      ...graph.nodes,
      storedLinear('task2_hidden', hiddenDim, 330, 360),
      storedRelu('task2_relu', 520, 360),
      storedLinear('task2_classifier', 2, 710, 360),
    ],
    edges: chain([
      'task2_input',
      'task2_hidden',
      'task2_relu',
      'task2_classifier',
      'task2_output',
    ]),
  };
}

function storedLinear(id, outFeatures, x, y) {
  return {
    id,
    name: 'Linear',
    kind: 'Linear',
    position: { x, y },
    config: {
      initializationMode: 'xavier_normal',
      biasInitializationMode: 'zeros',
      outFeatures,
      useBias: true,
    },
  };
}

function storedRelu(id, x, y) {
  return {
    id,
    name: 'ReLU',
    kind: 'ReLU',
    position: { x, y },
    config: {},
  };
}

function chain(ids) {
  return ids.slice(1).map((target, index) => ({
    id: `${ids[index]}-${target}`,
    source: ids[index],
    target,
  }));
}

function percent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'N/A';
}
