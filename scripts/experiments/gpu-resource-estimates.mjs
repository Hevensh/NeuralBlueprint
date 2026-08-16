import assert from 'node:assert/strict';
import { createServer } from 'vite';

const BYTES_PER_FP32 = 4;
const TRAINING_ACTIVATION_COPIES = 2;
const ACTIVATION_WORKSPACE_FACTOR = 1.5;
const RUNTIME_RESERVE_MIB = 256;
const DEFAULT_BATCH_SIZE = 64;

const server = await createServer({
  appType: 'custom',
  logLevel: 'error',
  server: { hmr: false, middlewareMode: true },
});

try {
  const { getTaskFileInitialState } = await server.ssrLoadModule(
    '/src/taskData/fileInitialState.ts',
  );
  const scenarios = [
    ['task1', task1Graph(requiredGraph(getTaskFileInitialState, 'task1'))],
    ['task2', task2Graph(requiredGraph(getTaskFileInitialState, 'task2'))],
    [
      'task3_cifar_scratch',
      requiredGraph(getTaskFileInitialState, 'task3_cifar_scratch'),
    ],
    [
      'task3_cifar_pretrained',
      requiredGraph(getTaskFileInitialState, 'task3_cifar_pretrained'),
    ],
  ];
  const reports = scenarios.map(([id, graph]) => ({
    id,
    ...estimateTrainingResources(graph, DEFAULT_BATCH_SIZE),
  }));

  console.table(reports.map((report) => ({
    task: report.id,
    batch: DEFAULT_BATCH_SIZE,
    parameters: report.parameterCount.toLocaleString('en-US'),
    parameterAndGradientMiB: fixed(report.parameterAndGradientMiB),
    savedActivationMiB: fixed(report.savedActivationMiB),
    estimatedPeakMiB: fixed(report.estimatedPeakMiB),
    recommendedVRAMMiB: report.recommendedVRAMMiB,
    batch128PeakMiB: fixed(report.batch128PeakMiB),
  })));

  const byId = new Map(reports.map((report) => [report.id, report]));
  assert.equal(byId.get('task1').parameterCount, 66);
  assert.equal(byId.get('task2').parameterCount, 8962);
  assert.equal(byId.get('task3_cifar_scratch').parameterCount, 606922);
  assert.deepEqual(
    comparableResources(byId.get('task3_cifar_scratch')),
    comparableResources(byId.get('task3_cifar_pretrained')),
    'Pretraining must not change model VRAM requirements',
  );
  assert.equal(byId.get('task1').recommendedVRAMMiB, 512);
  assert.equal(byId.get('task2').recommendedVRAMMiB, 512);
  assert.equal(byId.get('task3_cifar_scratch').recommendedVRAMMiB, 1024);

  console.log('\nAll four task VRAM estimate assertions passed.');
} finally {
  await server.close();
}

function estimateTrainingResources(graph, batchSize) {
  const nodes = topologicalNodes(graph);
  let shape = { channels: 0, height: 1, width: 1 };
  let parameterCount = 0;
  let activationElementsPerSample = 0;

  for (const node of nodes) {
    const config = node.config ?? {};
    if (node.kind === 'Input') {
      shape = { channels: config.outFeatures, height: 1, width: 1 };
      activationElementsPerSample += elements(shape);
    } else if (node.kind === '3DInput') {
      shape = {
        channels: config.outFeatures,
        height: numericDimension(config.height),
        width: numericDimension(config.width),
      };
      activationElementsPerSample += elements(shape);
    } else if (node.kind === 'CNN') {
      const outputChannels = config.outFeatures;
      parameterCount += convolutionParameters(
        shape.channels,
        outputChannels,
        config.kernelSize,
        config.useBias,
      );
      shape = convolutionOutputShape(shape, outputChannels, config);
      activationElementsPerSample += elements(shape);
    } else if (node.kind === 'ResNetStage') {
      const result = estimateResNetStage(shape, config);
      shape = result.shape;
      parameterCount += result.parameterCount;
      activationElementsPerSample += result.activationElementsPerSample;
    } else if (node.kind === 'Normalization') {
      parameterCount += 2 * shape.channels;
      activationElementsPerSample += elements(shape);
    } else if (node.kind === 'ReLU') {
      activationElementsPerSample += elements(shape);
    } else if (node.kind === 'Pooling') {
      shape = convolutionOutputShape(shape, shape.channels, config);
      activationElementsPerSample += elements(shape);
    } else if (node.kind === 'GlobalPooling') {
      shape = { channels: shape.channels, height: 1, width: 1 };
      activationElementsPerSample += elements(shape);
    } else if (node.kind === 'Flatten') {
      shape = { channels: elements(shape), height: 1, width: 1 };
    } else if (node.kind === 'Linear') {
      parameterCount += shape.channels * config.outFeatures
        + (config.useBias ? config.outFeatures : 0);
      shape = { ...shape, channels: config.outFeatures };
      activationElementsPerSample += elements(shape);
    }
  }

  const parameterAndGradientMiB = toMiB(
    parameterCount * BYTES_PER_FP32 * 2,
  );
  const savedActivationMiB = activationMiB(
    activationElementsPerSample,
    batchSize,
  );
  const estimatedPeakMiB = peakMiB(
    parameterAndGradientMiB,
    savedActivationMiB,
  );
  const batch128PeakMiB = peakMiB(
    parameterAndGradientMiB,
    activationMiB(activationElementsPerSample, 128),
  );

  return {
    parameterCount,
    activationElementsPerSample,
    parameterAndGradientMiB,
    savedActivationMiB,
    estimatedPeakMiB,
    batch128PeakMiB,
    recommendedVRAMMiB: Math.ceil(estimatedPeakMiB / 512) * 512,
  };
}

function estimateResNetStage(inputShape, config) {
  let shape = inputShape;
  let parameterCount = 0;
  let activationElementsPerSample = 0;
  const outputChannels = config.outFeatures;

  for (let block = 0; block < config.blockCount; block += 1) {
    const blockInput = shape;
    const stride = block === 0 ? config.stride : 1;
    const convConfig = { kernelSize: 3, padding: 1, stride };
    parameterCount += convolutionParameters(
      blockInput.channels,
      outputChannels,
      3,
      false,
    ) + 2 * outputChannels;
    shape = convolutionOutputShape(blockInput, outputChannels, convConfig);
    activationElementsPerSample += elements(shape);

    parameterCount += convolutionParameters(
      outputChannels,
      outputChannels,
      3,
      false,
    ) + 2 * outputChannels;
    activationElementsPerSample += elements(shape);

    const needsProjection = stride !== 1
      || blockInput.channels !== outputChannels;
    if (needsProjection) {
      parameterCount += convolutionParameters(
        blockInput.channels,
        outputChannels,
        1,
        false,
      ) + 2 * outputChannels;
      activationElementsPerSample += elements(shape);
    }
    activationElementsPerSample += elements(shape);
  }

  return { shape, parameterCount, activationElementsPerSample };
}

function convolutionParameters(inputChannels, outputChannels, kernelSize, bias) {
  return inputChannels * outputChannels * kernelSize ** 2
    + (bias ? outputChannels : 0);
}

function convolutionOutputShape(input, outputChannels, config) {
  const kernelSize = config.kernelSize ?? 1;
  const stride = config.stride ?? 1;
  const padding = config.padding ?? 0;
  const height = Math.floor(
    (input.height + 2 * padding - kernelSize) / stride + 1,
  );
  const width = Math.floor(
    (input.width + 2 * padding - kernelSize) / stride + 1,
  );
  return { channels: outputChannels, height, width };
}

function topologicalNodes(graph) {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const indegree = new Map(graph.nodes.map((node) => [node.id, 0]));
  const successors = new Map(graph.nodes.map((node) => [node.id, []]));
  graph.edges.forEach((edge) => {
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    successors.get(edge.source)?.push(edge.target);
  });
  const queue = graph.nodes
    .filter((node) => indegree.get(node.id) === 0)
    .map((node) => node.id);
  const ordered = [];
  while (queue.length > 0) {
    const id = queue.shift();
    ordered.push(byId.get(id));
    successors.get(id)?.forEach((target) => {
      const next = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, next);
      if (next === 0) queue.push(target);
    });
  }
  assert.equal(ordered.length, graph.nodes.length, 'Blueprint must be acyclic');
  return ordered;
}

function task1Graph(graph) {
  return appendChain(graph, [storedLinear('task1_best', 2)]);
}

function task2Graph(graph) {
  return appendChain(graph, [
    storedLinear('task2_hidden', 256),
    storedRelu('task2_relu'),
    storedLinear('task2_classifier', 2),
  ]);
}

function appendChain(graph, middleNodes) {
  const input = graph.nodes.find((node) => (
    node.kind === 'Input' || node.kind === '3DInput'
  ));
  const output = graph.nodes.find((node) => node.kind === 'Output');
  assert.ok(input && output);
  const nodes = [input, ...middleNodes, output];
  return {
    nodes,
    edges: nodes.slice(1).map((node, index) => ({
      id: `${nodes[index].id}-${node.id}`,
      source: nodes[index].id,
      target: node.id,
    })),
  };
}

function storedLinear(id, outFeatures) {
  return {
    id,
    kind: 'Linear',
    config: { outFeatures, useBias: true },
  };
}

function storedRelu(id) {
  return { id, kind: 'ReLU', config: {} };
}

function requiredGraph(getTaskFileInitialState, fileId) {
  const graph = getTaskFileInitialState(fileId)?.neuralBlueprint?.graph;
  assert.ok(graph, `Missing blueprint for ${fileId}`);
  return graph;
}

function activationMiB(elementsPerSample, batchSize) {
  return toMiB(
    elementsPerSample
    * batchSize
    * BYTES_PER_FP32
    * TRAINING_ACTIVATION_COPIES,
  );
}

function peakMiB(parameterAndGradientMiB, savedActivationMiB) {
  return RUNTIME_RESERVE_MIB
    + parameterAndGradientMiB
    + ACTIVATION_WORKSPACE_FACTOR * savedActivationMiB;
}

function elements(shape) {
  return shape.channels * shape.height * shape.width;
}

function numericDimension(value) {
  return typeof value === 'number' ? value : 1;
}

function toMiB(bytes) {
  return bytes / 1024 ** 2;
}

function fixed(value) {
  return value.toFixed(2);
}

function comparableResources(report) {
  return {
    parameterCount: report.parameterCount,
    activationElementsPerSample: report.activationElementsPerSample,
    estimatedPeakMiB: report.estimatedPeakMiB,
    recommendedVRAMMiB: report.recommendedVRAMMiB,
  };
}
