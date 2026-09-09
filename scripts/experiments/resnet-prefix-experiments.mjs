import assert from 'node:assert/strict';
import { createServer } from 'vite';

const RESNET_STAGE_IDS = [
  'cifar_res2', 'cifar_res3', 'cifar_res4', 'cifar_res5',
];

const server = await createServer({
  appType: 'custom',
  logLevel: 'error',
  server: { hmr: false, middlewareMode: true },
});

try {
  const modules = await loadModules(server);
  const reports = [];
  for (const pretrained of [false, true]) {
    for (let stageCount = 1; stageCount <= 4; stageCount += 1) {
      reports.push(runPrefix(modules, stageCount, pretrained));
    }
  }

  console.table(reports.map((report) => ({
    initialization: report.pretrained ? 'ImageNet' : 'scratch',
    stages: report.stageCount,
    inferenceStages: report.inferenceStageCount,
    capacity: report.capacity,
    transferWeights: report.transferWeights,
    initialAllocated: report.initialAllocated,
    finalAllocated: report.finalAllocated,
    edgeMemory: report.edgeMemory,
    valAccuracy: percent(report.valAccuracy),
    bestValAccuracy: percent(report.bestValAccuracy),
    peakVramMiB: report.peakVramMiB.toFixed(1),
    epochMinutes: report.epochMinutes,
  })));

  const selectedStageCases = [
    ['res2-res3', ['cifar_res2', 'cifar_res3']],
    ['res2-res4', ['cifar_res2', 'cifar_res4']],
    ['res3-res4-res5', ['cifar_res3', 'cifar_res4', 'cifar_res5']],
  ];
  const selectedReports = selectedStageCases.flatMap(([label, stageIds]) => (
    [false, true].map((pretrained) => runStageVariant(
      modules,
      stageIds,
      pretrained,
      label,
    ))
  ));
  console.log('\nSelected ResNet stages');
  console.table(selectedReports.map((report) => ({
    selection: report.variant,
    initialization: report.pretrained ? 'ImageNet' : 'scratch',
    stages: report.stageIds.map(shortStageId).join(' -> '),
    inferenceStages: report.inferenceStageCount,
    capacity: report.capacity,
    valAccuracy: percent(report.valAccuracy),
    bestValAccuracy: percent(report.bestValAccuracy),
  })));

  const swappedStageCases = [
    ['swap-res3-res4', [
      'cifar_res2', 'cifar_res4', 'cifar_res3', 'cifar_res5',
    ]],
    ['swap-res4-res5', [
      'cifar_res2', 'cifar_res3', 'cifar_res5', 'cifar_res4',
    ]],
  ];
  const swappedReports = swappedStageCases.map(([label, stageIds]) => (
    runStageVariant(modules, stageIds, true, label)
  ));
  console.log('\nSwapped ResNet stages');
  console.table(swappedReports.map((report) => ({
    order: report.variant,
    stages: report.stageIds.map(shortStageId).join(' -> '),
    capacity: report.capacity,
    transferWeights: report.transferWeights,
    edgeMemory: report.edgeMemory,
    valAccuracy: percent(report.valAccuracy),
    bestValAccuracy: percent(report.bestValAccuracy),
  })));

  const fullScratch = reports.find((report) => (
    !report.pretrained && report.stageCount === 4
  ));
  const fullPretrained = reports.find((report) => (
    report.pretrained && report.stageCount === 4
  ));
  assert.ok(fullScratch && fullPretrained);
  assert.ok(between(fullScratch.valAccuracy, 0.76, 0.83));
  assert.ok(between(fullPretrained.valAccuracy, 0.93, 0.97));
  for (const stageCount of [1, 2]) {
    const scratchPrefix = reports.find((report) => (
      !report.pretrained && report.stageCount === stageCount
    ));
    const pretrainedPrefix = reports.find((report) => (
      report.pretrained && report.stageCount === stageCount
    ));
    assert.ok(scratchPrefix && pretrainedPrefix);
    assert.ok(
      pretrainedPrefix.bestValAccuracy + 0.001
        >= scratchPrefix.bestValAccuracy,
      `Pretraining regressed the best ${stageCount}-stage checkpoint`,
    );
  }
  assert.ok(
    reports.every((report) => report.peakVramMiB <= 2560),
    'ResNet prefix runs should remain within the task3 2.5 GiB recommendation',
  );
  assertSelectedStageCases(selectedReports, fullScratch, fullPretrained);
  assertSwappedStageCases(swappedReports, fullPretrained);

  console.log('\nResNet prefix experiment completed.');
} finally {
  await server.close();
}

async function loadModules(vite) {
  const paths = {
    task: '/src/taskData/fileInitialState.ts',
    storage: '/src/dataStorage/neuralBlueprintStorage.ts',
    update: '/src/blueprint/neuralBlueprint/analysis/updateState.ts',
    profile: '/src/blueprint/neuralBlueprint/analysis/inferenceMemoryProfile.ts',
    memory: '/src/blueprint/knowledgeGraph/model/memoryState.ts',
    allocation: '/src/blueprint/knowledgeGraph/model/allocationStrategies.ts',
    training: '/src/blueprint/knowledgeGraph/model/trainingSimulation.ts',
    dataset: '/src/blueprint/knowledgeGraph/model/datasetSplit.ts',
    reasoning: '/src/blueprint/knowledgeGraph/model/reasoning.ts',
    loss: '/src/blueprint/knowledgeGraph/model/lossMetrics.ts',
    memoryOperations: '/src/blueprint/knowledgeGraph/model/memoryOperations.ts',
    resources: '/src/blueprint/neuralBlueprint/analysis/trainingResources.ts',
  };
  const loaded = await Promise.all(
    Object.entries(paths).map(async ([key, path]) => [key, await vite.ssrLoadModule(path)]),
  );
  return Object.fromEntries(loaded);
}

function runPrefix(modules, stageCount, pretrained) {
  return runStageVariant(
    modules,
    RESNET_STAGE_IDS.slice(0, stageCount),
    pretrained,
    `prefix-${stageCount}`,
  );
}

function runStageVariant(modules, stageIds, pretrained, variant) {
  const fileId = pretrained
    ? 'task3_cifar_pretrained'
    : 'task3_cifar_scratch';
  const initial = modules.task.getTaskFileInitialState(fileId);
  assert.ok(initial?.neuralBlueprint?.graph && initial.knowledgeGraph);
  const storedGraph = selectedStageGraph(initial.neuralBlueprint.graph, stageIds);
  const runtime = modules.storage.createRuntimeNeuralBlueprintGraph(storedGraph);
  const nodes = modules.update.updateState(runtime.nodes);
  const profile = modules.profile.buildInferenceMemoryProfile(nodes);
  const graph = initial.knowledgeGraph.graphDefinition;
  let memory = modules.memory.createKnowledgeGraphMemory(graph, 1200, 3);
  memory = modules.memory.setMemoryProfileSource(
    graph,
    memory,
    'blueprint',
    profile,
  );
  memory = modules.allocation.initializeAllocation(graph, memory, '42');
  if (profile.pretrainingModules.length > 0) {
    memory = modules.allocation.applyPretrainedModuleAllocation(
      graph,
      memory,
      profile.pretrainingModules,
    );
  }
  const initialAllocated = modules.memoryOperations.totalAllocatedMemory(memory);
  const result = modules.training.runTrainingSimulation(
    graph,
    memory,
    0,
    [],
    {
      optimizer: 'sgd',
      learningRate: -3,
      regularizationRate: -4,
      epochs: 100,
      datasetCollection: initial.knowledgeGraph.datasetCollection,
      trainingRandomState: modules.training.createTrainingRandomState('42'),
    },
  );
  const dataset = modules.dataset.splitEnabledKnowledgeDatasets(
    graph,
    initial.knowledgeGraph.datasetCollection,
  );
  const train = modules.reasoning.estimateStagedMastery(graph, result.memory, 'train');
  const validation = modules.reasoning.estimateStagedMastery(
    graph,
    result.memory,
    'val',
  );
  const loss = modules.loss.computeKnowledgeLossReport(
    graph,
    result.memory,
    train,
    validation,
    dataset,
  );
  const run = modules.resources.estimateTrainingRun(
    profile.trainingResources,
    dataset.samples.train,
    'sgd',
  );
  const edgeMemory = graph.depEdges.reduce((sum, edge) => (
    sum + modules.memoryOperations.readEntityTotalMemory(result.memory, edge)
  ), 0);

  return {
    variant,
    pretrained,
    stageIds,
    stageCount: stageIds.length,
    inferenceStageCount: profile.stages.length,
    capacity: profile.totalMemoryPoint,
    transferWeights: profile.pretrainingModules.map((module) => (
      `${module.order}:${module.aggregationWeight.toFixed(2)}`
    )).join(','),
    initialAllocated,
    finalAllocated: modules.memoryOperations.totalAllocatedMemory(result.memory),
    edgeMemory,
    valAccuracy: loss.graphValAccuracy,
    bestValAccuracy: Math.max(...result.lossHistory.map((point) => (
      Number.isFinite(point.valAccuracy) ? point.valAccuracy : -Infinity
    ))),
    peakVramMiB: run.estimatedPeakMiB,
    epochMinutes: run.gameMinutesPerEpoch,
  };
}

function selectedStageGraph(graph, stageIds) {
  const chainIds = [
    'cifar_input',
    'cifar_resize',
    'cifar_stem',
    'cifar_pool',
    ...stageIds,
    'cifar_global_pool',
    'cifar_classifier',
    'cifar_output',
  ];
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  return {
    ...graph,
    nodes: chainIds.map((id) => {
      const node = byId.get(id);
      assert.ok(node, `Missing ${id}`);
      return node;
    }),
    edges: chainIds.slice(1).map((target, index) => ({
      id: `${chainIds[index]}-${target}`,
      source: chainIds[index],
      target,
    })),
  };
}

function shortStageId(stageId) {
  return stageId.replace('cifar_', '');
}

function assertSelectedStageCases(reports, fullScratch, fullPretrained) {
  reports.forEach((report) => {
    assert.equal(
      report.inferenceStageCount,
      1,
      `${report.variant} should use the single global inference state`,
    );
    assert.ok(
      report.capacity < fullScratch.capacity,
      `${report.variant} should have lower capacity than the full ResNet`,
    );
    if (report.pretrained) {
      assert.ok(
        report.valAccuracy <= fullPretrained.valAccuracy + 0.001,
        `${report.variant} should not outperform the canonical pretrained model`,
      );
    }
    assert.ok(
      Number.isFinite(report.valAccuracy)
        && Number.isFinite(report.bestValAccuracy),
      `${report.variant} should produce finite validation metrics`,
    );
  });
}

function assertSwappedStageCases(reports, fullPretrained) {
  reports.forEach((report) => {
    assert.equal(report.stageCount, 4);
    assert.equal(report.inferenceStageCount, fullPretrained.inferenceStageCount);
    assert.ok(
      Number.isFinite(report.valAccuracy)
        && Number.isFinite(report.bestValAccuracy),
      `${report.variant} should produce finite validation metrics`,
    );
    assert.ok(
      report.valAccuracy <= fullPretrained.valAccuracy + 0.001,
      `${report.variant} should not outperform the canonical stage order`,
    );
    assert.ok(
      report.edgeMemory < fullPretrained.edgeMemory,
      `${report.variant} should lose edge memory after stage-order mismatch`,
    );
  });
}

function percent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'N/A';
}

function between(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}
