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
  const {
    applyPretrainedModuleAllocation,
  } = await server.ssrLoadModule(
    '/src/blueprint/knowledgeGraph/model/allocationStrategies.ts',
  );
  const {
    createKnowledgeGraphMemory,
    setMemoryProfileSource,
  } = await server.ssrLoadModule(
    '/src/blueprint/knowledgeGraph/model/memoryState.ts',
  );
  const {
    readEntityPoolStageMemory,
    totalAllocatedMemory,
    writeEntityMemory,
  } = await server.ssrLoadModule(
    '/src/blueprint/knowledgeGraph/model/memoryOperations.ts',
  );
  const { createSpatialAdaptationCapability } = await server.ssrLoadModule(
    '/src/blueprint/SpatialAdaptationTypes.ts',
  );
  const { MODULE_PALETTE_DEFINITIONS } = await server.ssrLoadModule(
    '/src/blueprint/neuralBlueprint/moduleRegistry.ts',
  );
  const { createModuleNodeData } = await server.ssrLoadModule(
    '/src/blueprint/neuralBlueprint/moduleNodeFactory.ts',
  );
  const { createDroppedModuleGroup } = await server.ssrLoadModule(
    '/src/blueprint/neuralBlueprint/moduleDropFactory.ts',
  );
  const { buildInferenceMemoryProfile } = await server.ssrLoadModule(
    '/src/blueprint/neuralBlueprint/analysis/inferenceMemoryProfile.ts',
  );

  const resNetTemplates = MODULE_PALETTE_DEFINITIONS.filter(
    (definition) => definition.kind === 'ResNetStage',
  );
  assert.deepEqual(
    resNetTemplates.map((definition) => definition.preset ?? 'scratch'),
    ['scratch', 'pretrained-resnet-stage'],
  );
  const scratchTemplateNode = createModuleNodeData(
    'ResNetStage',
    moduleCommon('scratch-stage'),
  );
  const pretrainedTemplateNode = createModuleNodeData(
    'ResNetStage',
    moduleCommon('pretrained-stage'),
    { palettePreset: 'pretrained-resnet-stage', pretrainingOrder: 2 },
  );
  assert.deepEqual(
    [
      scratchTemplateNode.pretrainingOrder,
      scratchTemplateNode.pretrainedDependencyMemoryPoints,
    ],
    [0, 0],
  );
  assert.deepEqual(
    [
      pretrainedTemplateNode.pretrainingOrder,
      pretrainedTemplateNode.pretrainedDependencyMemoryPoints,
    ],
    [2, 72],
  );
  const scratchDrop = createDroppedModuleGroup(
    'ResNetStage',
    { x: 400, y: 300 },
    undefined,
    100,
  );
  const pretrainedDrop = createDroppedModuleGroup(
    'ResNetStage',
    { x: 400, y: 300 },
    'pretrained-resnet-stage',
    200,
  );
  assert.equal(scratchDrop.nodes.length, 4);
  assert.equal(scratchDrop.edges.length, 3);
  assert.deepEqual(
    scratchDrop.nodes.map((node) => [
      node.data.name,
      node.data.outFeatures,
      node.data.stride,
      node.data.pretrainingOrder,
    ]),
    [
      ['ResNetStage 1', 64, 1, 0],
      ['ResNetStage 2', 64, 2, 0],
      ['ResNetStage 3', 64, 2, 0],
      ['ResNetStage 4', 64, 2, 0],
    ],
  );
  assert.deepEqual(
    pretrainedDrop.nodes.map((node) => [
      node.data.name,
      node.data.pretrainingOrder,
      node.data.pretrainedDependencyMemoryPoints,
    ]),
    [
      ['Pretrained 1', 1, 72],
      ['Pretrained 2', 2, 72],
      ['Pretrained 3', 3, 72],
      ['Pretrained 4', 4, 72],
    ],
  );

  const scratch = requiredState(getTaskFileInitialState, 'task3_cifar_scratch');
  const pretrained = requiredState(
    getTaskFileInitialState,
    'task3_cifar_pretrained',
  );
  assert.deepEqual(stagePretraining(scratch), [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ]);
  assert.deepEqual(stagePretraining(pretrained), [
    [1, 72],
    [2, 72],
    [3, 72],
    [4, 72],
  ]);
  assert.deepEqual(stageNames(pretrained), [
    'Pretrained 1',
    'Pretrained 2',
    'Pretrained 3',
    'Pretrained 4',
  ]);

  const graph = pretrained.knowledgeGraph.graphDefinition;
  const dependencyMemoryRequirement = graph.depEdges.reduce(
    (sum, edge) => sum + edge.properties.requiredMemory,
    0,
  );
  const modules = [
    moduleProfile('res2', 1, 72, [0]),
    moduleProfile('res3', 2, 72, [1]),
    moduleProfile('res4', 3, 72, [2]),
    moduleProfile('res5', 4, 72, [3]),
  ];
  const profile = createProfile(modules, createSpatialAdaptationCapability);
  const presetMemory = createKnowledgeGraphMemory(graph, 4000, 15);
  const blueprintMemory = setMemoryProfileSource(
    graph,
    presetMemory,
    'blueprint',
    profile,
  );
  const allocated = applyPretrainedModuleAllocation(
    graph,
    blueprintMemory,
    modules,
  );

  assert.deepEqual(
    poolEdgeCounts(allocated, graph, readEntityPoolStageMemory),
    [3, 2, 4, 1],
  );
  assert.equal(totalAllocatedMemory(allocated), dependencyMemoryRequirement);
  const firstModuleEdges = allocatedEdgeIds(
    allocated,
    graph,
    'blueprint:0',
    readEntityPoolStageMemory,
  );

  const swappedModules = [
    moduleProfile('res2', 1, 72, [1]),
    moduleProfile('res3', 2, 72, [0]),
    modules[2],
    modules[3],
  ];
  const replaced = applyPretrainedModuleAllocation(
    graph,
    allocated,
    swappedModules,
  );
  assert.deepEqual(
    allocatedEdgeIds(
      replaced,
      graph,
      'blueprint:1',
      readEntityPoolStageMemory,
    ),
    firstModuleEdges,
  );
  assert.equal(totalAllocatedMemory(replaced), dependencyMemoryRequirement);

  const duplicatedParallel = applyPretrainedModuleAllocation(
    graph,
    blueprintMemory,
    [
      moduleProfile('parallel-left', 1, 72, [0], 0.5),
      moduleProfile('parallel-right', 1, 72, [0], 0.5),
    ],
  );
  const singleModule = applyPretrainedModuleAllocation(
    graph,
    blueprintMemory,
    [moduleProfile('single', 1, 72, [0])],
  );
  assert.equal(
    totalAllocatedMemory(duplicatedParallel),
    totalAllocatedMemory(singleModule),
  );
  assert.equal(totalAllocatedMemory(duplicatedParallel), 3 * 72);

  const parallelProfile = buildInferenceMemoryProfile(
    parallelPretrainedNodes(createModuleNodeData),
  );
  assert.deepEqual(
    parallelProfile.pretrainingModules.map((module) => [
      module.order,
      module.aggregationWeight,
    ]),
    [[1, 0.5], [1, 0.5]],
  );
  const varianceNodes = parallelPretrainedNodes(createModuleNodeData);
  setNodeVariances(varianceNodes, 'parallel-left', 1, 0.01);
  setNodeVariances(varianceNodes, 'parallel-right', 4, 1);
  const varianceSummary = buildInferenceMemoryProfile(varianceNodes)
    .groups[0].variance;
  assertClose(varianceSummary.forwardStd, Math.sqrt(2.5));
  assertClose(varianceSummary.backwardStd, Math.sqrt(0.505));
  assertClose(varianceSummary.ratio, 2.5 / 0.505);
  assertClose(varianceSummary.logDistance, (2 + Math.log10(4)) / 2);
  assert.equal(varianceSummary.validWeight, 1);

  setNodeVariances(varianceNodes, 'parallel-right', 4, Number.NaN);
  const partialVarianceSummary = buildInferenceMemoryProfile(varianceNodes)
    .groups[0].variance;
  assertClose(partialVarianceSummary.forwardStd, 1);
  assertClose(partialVarianceSummary.backwardStd, 0.1);
  assertClose(partialVarianceSummary.ratio, 100);
  assertClose(partialVarianceSummary.logDistance, 2);
  assert.equal(partialVarianceSummary.validWeight, 0.5);

  const mixedStrengthNodes = parallelPretrainedNodes(createModuleNodeData);
  mixedStrengthNodes.find((node) => node.id === 'parallel-right')
    .data.pretrainedDependencyMemoryPoints = 36;
  const mixedStrengthProfile = buildInferenceMemoryProfile(mixedStrengthNodes);
  assert.deepEqual(
    mixedStrengthProfile.pretrainingModules.map((module) => (
      module.aggregationWeight
    )),
    [1, 1],
  );

  const firstNode = Object.values(graph.nodes)[0];
  writeEntityMemory(blueprintMemory, firstNode, 1, 0);
  const preservesNodeInitialization = applyPretrainedModuleAllocation(
    graph,
    blueprintMemory,
    modules,
  );
  assert.equal(
    totalAllocatedMemory(preservesNodeInitialization),
    dependencyMemoryRequirement + 1,
  );

  console.table(modules.map((module, index) => ({
    order: module.order,
    pointsPerDependency: module.memoryPointsPerDependency,
    aggregationWeight: module.aggregationWeight,
    inferenceStages: module.inferenceStages.join(','),
    allocatedEdges: poolEdgeCounts(
      allocated,
      graph,
      readEntityPoolStageMemory,
    )[index],
  })));
  console.log('\nAll module-level pretraining allocation assertions passed.');
} finally {
  await server.close();
}

function moduleCommon(id) {
  return {
    id,
    name: 'ResNetStage',
    type: 'neuralBlueprint',
  };
}

function parallelPretrainedNodes(createModuleNodeData) {
  const input = createModuleNodeData('3DInput', moduleCommon('parallel-input'));
  const left = createModuleNodeData(
    'ResNetStage',
    moduleCommon('parallel-left'),
    { palettePreset: 'pretrained-resnet-stage', pretrainingOrder: 1 },
  );
  const right = createModuleNodeData(
    'ResNetStage',
    moduleCommon('parallel-right'),
    { palettePreset: 'pretrained-resnet-stage', pretrainingOrder: 1 },
  );
  const sum = createModuleNodeData('Sum', moduleCommon('parallel-sum'));
  const output = createModuleNodeData('Output', moduleCommon('parallel-output'));

  input.successors = [left, right];
  left.predecessors = [input];
  left.successors = [sum];
  right.predecessors = [input];
  right.successors = [sum];
  sum.predecessors = [left, right];
  sum.successors = [output];
  output.predecessors = [sum];
  [left, right].forEach((node) => {
    node.memoryPoint = 1000;
    node.inferenceTopologyOrder = new Set([0]);
    node.internalInferenceTopologyOrder = new Set([0]);
  });

  return [input, left, right, sum, output].map((data, index) => ({
    id: data.id,
    type: data.type,
    position: { x: index * 100, y: 0 },
    data,
  }));
}

function setNodeVariances(nodes, nodeId, forwardVariance, backwardVariance) {
  const node = nodes.find((candidate) => candidate.id === nodeId);
  assert.ok(node, `missing node ${nodeId}`);
  node.data.stats.distribution.variance = forwardVariance;
  node.data.statsBackward = {
    rank: { ...node.data.stats.rank },
    distribution: {
      ...node.data.stats.distribution,
      variance: backwardVariance,
    },
  };
}

function assertClose(actual, expected, epsilon = 1e-10) {
  assert.ok(actual !== null);
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

function requiredState(getTaskFileInitialState, fileId) {
  const state = getTaskFileInitialState(fileId);
  assert.ok(state, `missing task state ${fileId}`);
  assert.ok(state.neuralBlueprint);
  assert.ok(state.knowledgeGraph);
  return state;
}

function stagePretraining(state) {
  return state.neuralBlueprint.graph.nodes
    .filter((node) => node.kind === 'ResNetStage')
    .map((node) => [
      node.config.pretrainingOrder,
      node.config.pretrainedDependencyMemoryPoints,
    ]);
}

function stageNames(state) {
  return state.neuralBlueprint.graph.nodes
    .filter((node) => node.kind === 'ResNetStage')
    .map((node) => node.name);
}

function moduleProfile(
  nodeId,
  order,
  memoryPointsPerDependency,
  inferenceStages,
  aggregationWeight = 1,
) {
  return {
    nodeId,
    order,
    memoryPointsPerDependency,
    aggregationWeight,
    inferenceStages,
  };
}

function createProfile(modules, createCapability) {
  const groups = modules.map((module) => ({
    id: module.inferenceStages.join(','),
    nodeIds: [module.nodeId],
    inferenceStages: module.inferenceStages,
    memoryPoint: 1000,
    adaptationCapability: createCapability(),
    variance: {
      forwardStd: null,
      backwardStd: null,
      ratio: null,
      logDistance: null,
      validWeight: 0,
    },
    varianceLogDistance: 0,
    nodeWeights: [],
    aggregationPairs: [],
    ratio: 0.25,
  }));
  return {
    networkSignature: 'pretraining-test',
    pretrainingModules: modules,
    totalMemoryPoint: 4000,
    totalAdaptationCapability: createCapability(),
    groups,
    stages: [],
  };
}

function poolEdgeCounts(memory, graph, readMemory) {
  return memory.budgetPools.map((pool) => (
    graph.depEdges.filter((edge) => (
      pool.inferenceStages.some((stage) => (
        readMemory(memory, edge, pool.id, stage) > 0
      ))
    )).length
  ));
}

function allocatedEdgeIds(memory, graph, poolId, readMemory) {
  const pool = memory.budgetPools.find((candidate) => candidate.id === poolId);
  assert.ok(pool, `missing pool ${poolId}`);
  return graph.depEdges
    .filter((edge) => pool.inferenceStages.some((stage) => (
      readMemory(memory, edge, poolId, stage) > 0
    )))
    .map((edge) => edge.id)
    .sort();
}
