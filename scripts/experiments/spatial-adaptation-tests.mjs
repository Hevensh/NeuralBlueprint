import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  logLevel: 'error',
  server: { hmr: false, middlewareMode: true },
});

try {
  const adaptation = await server.ssrLoadModule(
    '/src/blueprint/knowledgeGraph/model/adaptation.ts',
  );
  const { forwardCNNStats } = await server.ssrLoadModule(
    '/src/blueprint/neuralBlueprint/analysis/forward/cnn.ts',
  );
  const { forwardInputStats } = await server.ssrLoadModule(
    '/src/blueprint/neuralBlueprint/analysis/forward/input.ts',
  );
  const { forwardPoolingStats } = await server.ssrLoadModule(
    '/src/blueprint/neuralBlueprint/analysis/forward/pool.ts',
  );
  const { forwardPatchEmbeddingStats } = await server.ssrLoadModule(
    '/src/blueprint/neuralBlueprint/analysis/forward/patchEmbedding.ts',
  );
  const { forwardResizeStats } = await server.ssrLoadModule(
    '/src/blueprint/neuralBlueprint/analysis/forward/resize.ts',
  );
  const { forwardLinearStats } = await server.ssrLoadModule(
    '/src/blueprint/neuralBlueprint/analysis/forward/linear.ts',
  );
  const spatialTypes = await server.ssrLoadModule(
    '/src/blueprint/SpatialAdaptationTypes.ts',
  );
  const { getTaskFileInitialState } = await server.ssrLoadModule(
    '/src/taskData/fileInitialState.ts',
  );

  runAdaptationFormulaTests(adaptation);
  runCnnCalibrationTests({
    forwardCNNStats,
    forwardInputStats,
  });
  runSpatialViewTests({
    forwardCNNStats,
    forwardInputStats,
    forwardPoolingStats,
  });
  runPatchEmbeddingTests({
    forwardInputStats,
    forwardLinearStats,
    forwardPatchEmbeddingStats,
  });
  runResizeTests({
    forwardInputStats,
    forwardResizeStats,
  });
  runExperimentFixtureTests(
    getTaskFileInitialState,
    spatialTypes.DEFAULT_KNOWLEDGE_ADAPTATION_REQUIREMENT,
  );

  console.log('\nAll spatial adaptation assertions passed.');
} finally {
  await server.close();
}

function runSpatialViewTests({
  forwardCNNStats,
  forwardInputStats,
  forwardPoolingStats,
}) {
  const input = createImageInputStats(forwardInputStats);
  const oneFive = forwardCNNStats(createCnnConfig('one_5', 5), input);
  const firstThree = forwardCNNStats(createCnnConfig('first_3', 3), input);
  const twoThree = forwardCNNStats(
    createCnnConfig('second_3', 3),
    firstThree,
  );
  const dilatedThree = forwardCNNStats({
    ...createCnnConfig('dilated_3', 3),
    dilation: 2,
    padding: 2,
  }, input);
  assert.ok(oneFive && firstThree && twoThree && dilatedThree);
  assert.equal(oneFive.spatialView.axes.height.reach, 5);
  assert.equal(oneFive.spatialView.axes.width.reach, 5);
  assert.equal(oneFive.spatialView.viewRank, 25);
  assert.equal(twoThree.spatialView.axes.height.reach, 5);
  assert.equal(twoThree.spatialView.viewRank, 17);
  assert.equal(dilatedThree.spatialView.axes.height.reach, 5);
  assert.equal(dilatedThree.spatialView.viewRank, 9);
  assert.ok(oneFive.spatialView.viewRank > twoThree.spatialView.viewRank);

  const pooled = forwardPoolingStats({
    id: 'pool',
    name: 'Pooling',
    type: 'neuralBlueprint',
    kind: 'Pooling',
    links: { predecessorIds: [], successorIds: [] },
    predecessors: [],
    successors: [],
    poolMode: 'average',
    kernelSize: 2,
    stride: 2,
    padding: 0,
  }, firstThree);
  assert.ok(pooled);
  assert.equal(pooled.spatialView.axes.height.reach, 4);
  assert.equal(pooled.spatialView.axes.height.jump, 2);
  assert.equal(pooled.spatialView.viewRank, firstThree.spatialView.viewRank);

  console.log('\nSpatial view rank');
  console.table([
    { stack: '5x5', reach: 5, viewRank: oneFive.spatialView.viewRank },
    { stack: '3x3 -> 3x3', reach: 5, viewRank: twoThree.spatialView.viewRank },
    { stack: 'dilated 3x3', reach: 5, viewRank: dilatedThree.spatialView.viewRank },
    { stack: '3x3 -> pool2', reach: 4, viewRank: pooled.spatialView.viewRank },
  ]);
}

function runPatchEmbeddingTests({
  forwardInputStats,
  forwardLinearStats,
  forwardPatchEmbeddingStats,
}) {
  const input = createImageInputStats(forwardInputStats);
  const patch = forwardPatchEmbeddingStats({
    id: 'patch',
    name: 'PatchEmbedding',
    type: 'neuralBlueprint',
    kind: 'PatchEmbedding',
    links: { predecessorIds: [], successorIds: [] },
    predecessors: [],
    successors: [],
    outFeatures: 768,
    patchHeight: 16,
    patchWidth: 16,
    strideHeight: 16,
    strideWidth: 16,
    useBias: true,
    initializationMode: 'xavier_normal',
    biasInitializationMode: 'zeros',
  }, input);
  assert.ok(patch);
  assert.deepEqual(patch.shape, {
    time: 196,
    channels: 768,
    height: 'absent',
    width: 'absent',
  });
  assert.equal(patch.spatialView.axes.height.positions, 14);
  assert.equal(patch.spatialView.axes.width.positions, 14);
  assert.equal(patch.spatialView.axes.height.reach, 16);
  assert.equal(patch.spatialView.axes.height.jump, 16);
  assert.equal(patch.spatialView.viewRank, 256);
  assert.deepEqual(patch.spatialView.patchFrame.gridShape, {
    time: 'absent',
    height: 14,
    width: 14,
  });
  assert.deepEqual(patch.spatialView.patchFrame.flattenOrder, [
    'height',
    'width',
  ]);

  const linear = forwardLinearStats({
    id: 'linear',
    name: 'Linear',
    type: 'neuralBlueprint',
    kind: 'Linear',
    links: { predecessorIds: [], successorIds: [] },
    predecessors: [],
    successors: [],
    outFeatures: 512,
    useBias: true,
    initializationMode: 'xavier_normal',
    biasInitializationMode: 'zeros',
  }, patch);
  assert.deepEqual(linear.spatialView, patch.spatialView);

  console.log('\nPatch embedding');
  console.table([{
    input: '3 x 224 x 224',
    patch: '16 x 16 / stride 16',
    output: '196 x 768',
    grid: '14 x 14',
    viewRank: patch.spatialView.viewRank,
  }]);
}

function runResizeTests({ forwardInputStats, forwardResizeStats }) {
  const input = createImageInputStats(forwardInputStats);
  const sizes = [32, 128, 224, 384];
  const reports = sizes.map((size) => {
    const resized = forwardResizeStats({
      id: `resize_${size}`,
      name: `Resize ${size}`,
      type: 'neuralBlueprint',
      kind: 'Resize',
      links: { predecessorIds: [], successorIds: [] },
      predecessors: [],
      successors: [],
      targetHeight: size,
      targetWidth: size,
      interpolation: 'bilinear',
    }, input);
    assert.ok(resized);
    assert.deepEqual(resized.shape, {
      time: 'absent',
      channels: 3,
      height: size,
      width: size,
    });
    assert.equal(resized.spatialView.axes.height.sourceSize, size);
    assert.equal(resized.spatialView.axes.width.sourceSize, size);
    assert.equal(resized.spatialView.viewRank, input.spatialView.viewRank);
    return {
      target: `${size} x ${size}`,
      shape: `${resized.shape.channels} x ${resized.shape.height} x ${resized.shape.width}`,
      viewRank: resized.spatialView.viewRank,
    };
  });

  console.log('\nResize spatial adapter');
  console.table(reports);
}

function runAdaptationFormulaTests(adaptation) {
  const {
    computeAdaptationBalance,
    createEmptyAdaptationCapability,
    createEmptyAxisAdaptation,
  } = adaptation;
  const cases = [
    { label: 'no requirement', available: 0, required: 0, expected: 1 },
    { label: 'missing route', available: 0, required: 1, expected: 0.01 },
    { label: 'half capability', available: 0.5, required: 1, expected: 0.5 },
    { label: 'exact match', available: 1, required: 1, expected: 1 },
    { label: 'double capability', available: 2, required: 1, expected: 1.1 },
    { label: 'surplus clamp', available: 4, required: 1, expected: 1.1 },
  ];

  console.log('Adaptation formula boundaries');
  console.table(cases.map((testCase) => {
    const capability = createEmptyAdaptationCapability();
    const requirements = testCase.required > 0
      ? { height: createEmptyAxisAdaptation() }
      : {};
    capability.height.scale.small = testCase.available;
    if (requirements.height) {
      requirements.height.scale.small = testCase.required;
    }
    const result = computeAdaptationBalance(capability, requirements);
    assertClose(result.factor, testCase.expected, 1e-10, testCase.label);
    return {
      case: testCase.label,
      available: testCase.available,
      required: testCase.required,
      factor: round(result.factor, 6),
    };
  }));

  const capability = createEmptyAdaptationCapability();
  const requirements = { height: createEmptyAxisAdaptation() };
  ['small', 'medium', 'large', 'extraLarge', 'global'].forEach((band) => {
    capability.height.scale[band] = 1;
    requirements.height.scale[band] = 1;
  });
  capability.height.scale.global = 0;
  const bottleneck = computeAdaptationBalance(capability, requirements);
  assert.ok(
    bottleneck.factor > 0.02 && bottleneck.factor < 0.03,
    `one missing required cell should dominate: ${bottleneck.factor}`,
  );
  console.log(
    `One missing cell among five matched requirements => factor ${round(bottleneck.factor, 6)}`,
  );
}

function runCnnCalibrationTests({
  forwardCNNStats,
  forwardInputStats,
}) {
  const calibration = [1, 3, 5, 7].map((kernelSize) => {
    const layers = simulateCnnLayers(
      kernelSize,
      14,
      forwardCNNStats,
      forwardInputStats,
    );
    return {
      kernel: `${kernelSize}x${kernelSize}`,
      firstS: firstRequiredLayer(layers, 'small', 1),
      firstM: firstRequiredLayer(layers, 'medium', 1),
      firstL: firstRequiredLayer(layers, 'large', 1),
      firstXL: firstRequiredLayer(layers, 'extraLarge', 1),
      firstG: firstRequiredLayer(layers, 'global', 1),
    };
  });

  console.log('\nView-derived scale projection (first layer with >= 1 point)');
  console.table(calibration);

  const one = calibration.find((row) => row.kernel === '1x1');
  assert.deepEqual(withoutKernel(one), {
    firstS: '-',
    firstM: '-',
    firstL: '-',
    firstXL: '-',
    firstG: '-',
  });
  const three = calibration.find((row) => row.kernel === '3x3');
  const five = calibration.find((row) => row.kernel === '5x5');
  const seven = calibration.find((row) => row.kernel === '7x7');
  ['firstS', 'firstM', 'firstL', 'firstXL', 'firstG'].forEach((field) => {
    assert.ok(firstLayerValue(seven[field]) <= firstLayerValue(five[field]));
    assert.ok(firstLayerValue(five[field]) <= firstLayerValue(three[field]));
  });

  const oneFive = simulateCnnLayers(
    5,
    1,
    forwardCNNStats,
    forwardInputStats,
  ).at(-1);
  const twoThree = simulateCnnLayers(
    3,
    2,
    forwardCNNStats,
    forwardInputStats,
  ).at(-1);
  const oneFivePoints = integerPoints(oneFive);
  const twoThreePoints = integerPoints(twoThree);
  Object.keys(oneFivePoints).forEach((band) => {
    assert.ok(
      oneFivePoints[band] >= twoThreePoints[band],
      `one dense 5x5 should not trail two 3x3 at ${band}`,
    );
  });
}

function runExperimentFixtureTests(
  getTaskFileInitialState,
  totalRequirement,
) {
  const baseline = getRequiredInitialState(
    getTaskFileInitialState,
    'cnn_scale12_baseline',
  );
  const multiSize = getRequiredInitialState(
    getTaskFileInitialState,
    'cnn_scale12_multisize',
  );
  const baselineCnns = baseline.neuralBlueprint.graph.nodes.filter(
    (node) => node.kind === 'CNN',
  );
  const multiSizeCnns = multiSize.neuralBlueprint.graph.nodes.filter(
    (node) => node.kind === 'CNN',
  );
  assert.equal(baselineCnns.length, 11);
  assert.equal(multiSizeCnns.length, 11);
  assert.ok(baselineCnns.every((node) => node.config.kernelSize === 3));
  assert.deepEqual(
    countBy(multiSizeCnns.map((node) => node.config.kernelSize)),
    { 3: 3, 5: 8 },
  );

  const baselineKnowledge = baseline.knowledgeGraph.graphDefinition;
  const multiSizeKnowledge = multiSize.knowledgeGraph.graphDefinition;
  assert.deepEqual(
    normalizedKnowledgeExperiment(baselineKnowledge),
    normalizedKnowledgeExperiment(multiSizeKnowledge),
    'both networks must use exactly the same staged knowledge graph',
  );
  assert.equal(Object.keys(baselineKnowledge.nodes).length, 12);
  assert.equal(baselineKnowledge.depEdges.length, 9);

  Object.values(baselineKnowledge.nodes).forEach((node) => {
    assert.ok(node.dataAmount >= 1 && node.dataAmount <= 120);
    assert.ok(node.requiredMemory >= 24 && node.requiredMemory <= 36);
    assert.deepEqual(
      node.adaptationRequirements.height,
      node.adaptationRequirements.width,
    );
    assert.equal(node.adaptationRequirements.time, undefined);
    assert.equal(
      sumRoute(node.adaptationRequirements.height.scale)
        + sumRoute(node.adaptationRequirements.width.scale),
      totalRequirement,
    );
    assert.equal(sumRoute(node.adaptationRequirements.height.index), 0);
  });

  console.log('\nExperiment fixtures');
  console.table([
    {
      file: 'cnn_scale12_baseline',
      cnnCount: baselineCnns.length,
      kernels: '11 x 3x3',
      knowledgeStages: 'S -> M -> L -> XL',
    },
    {
      file: 'cnn_scale12_multisize',
      cnnCount: multiSizeCnns.length,
      kernels: '3 x 3x3 + 8 x 5x5',
      knowledgeStages: 'S -> M -> L -> XL',
    },
  ]);
}

function simulateCnnLayers(
  kernelSize,
  depth,
  forwardCNNStats,
  forwardInputStats,
) {
  let stats = forwardInputStats({
    id: 'input',
    name: '3DInput',
    type: 'neuralBlueprint',
    kind: '3DInput',
    links: { predecessorIds: [], successorIds: [] },
    predecessors: [],
    successors: [],
    outFeatures: 3,
    inputEffectiveRank: 3,
    normalizationMode: '0-1',
    time: 'absent',
    height: 224,
    width: 224,
  });
  const layers = [];

  for (let index = 0; index < depth; index += 1) {
    stats = forwardCNNStats({
      id: `cnn_${index + 1}`,
      name: 'CNN',
      type: 'neuralBlueprint',
      kind: 'CNN',
      links: { predecessorIds: [], successorIds: [] },
      predecessors: [],
      successors: [],
      outFeatures: 32,
      kernelSize,
      stride: 1,
      padding: Math.floor(kernelSize / 2),
      dilation: 1,
      useBias: true,
      initializationMode: 'xavier_normal',
      biasInitializationMode: 'zeros',
    }, stats);
    assert.ok(stats, `CNN ${kernelSize}x${kernelSize} layer ${index + 1}`);
    layers.push(stats.adaptation.repetition.effective);
  }

  return layers;
}

function createImageInputStats(forwardInputStats) {
  return forwardInputStats({
    id: 'input',
    name: '3DInput',
    type: 'neuralBlueprint',
    kind: '3DInput',
    links: { predecessorIds: [], successorIds: [] },
    predecessors: [],
    successors: [],
    outFeatures: 3,
    inputEffectiveRank: 3,
    normalizationMode: '0-1',
    time: 'absent',
    height: 224,
    width: 224,
  });
}

function createCnnConfig(id, kernelSize) {
  return {
    id,
    name: 'CNN',
    type: 'neuralBlueprint',
    kind: 'CNN',
    links: { predecessorIds: [], successorIds: [] },
    predecessors: [],
    successors: [],
    outFeatures: 32,
    kernelSize,
    stride: 1,
    padding: Math.floor(kernelSize / 2),
    dilation: 1,
    useBias: true,
    initializationMode: 'xavier_normal',
    biasInitializationMode: 'zeros',
  };
}

function firstRequiredLayer(layers, band, requirement) {
  const index = layers.findIndex((rank) => rank[band] >= requirement);
  return index >= 0 ? index + 1 : '-';
}

function integerPoints(rank) {
  return Object.fromEntries(
    Object.entries(rank).map(([band, value]) => [band, Math.floor(value)]),
  );
}

function getRequiredInitialState(getTaskFileInitialState, fileId) {
  const state = getTaskFileInitialState(fileId);
  assert.ok(state?.neuralBlueprint, `${fileId} neural blueprint missing`);
  assert.ok(state?.knowledgeGraph, `${fileId} knowledge graph missing`);
  return state;
}

function normalizedKnowledgeExperiment(graph) {
  return {
    nodes: Object.values(graph.nodes).map((node) => ({
      id: node.id,
      label: node.label,
      requirements: node.adaptationRequirements,
    })),
    dependencyEdges: graph.depEdges.map((edge) => ({
      source: edge.source.id,
      target: edge.target.id,
    })),
  };
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function withoutKernel({ kernel: _kernel, ...calibration }) {
  return calibration;
}

function firstLayerValue(value) {
  return value === '-' ? Number.POSITIVE_INFINITY : value;
}

function sumRoute(route) {
  return Object.values(route).reduce((sum, value) => sum + value, 0);
}

function assertClose(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

function round(value, digits) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}
