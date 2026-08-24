import type { BlueprintTaskFeatureConfig } from '../../blueprintFeatureConfig';
import type {
  TaskFileConfig,
  TaskModuleEdgeConfig,
  TaskModuleNodeConfig,
} from '../../taskFileTypes';
import { configTask3Scratch } from '../task3';

const CIFAR_CLASSES = 10;

export const configFileTask4: BlueprintTaskFeatureConfig = {
  neuralBlueprint: {
    canOpenTab: true,
    availableModuleKinds: [
      '3DInput',
      'Resize',
      'CNN',
      'Pooling',
      'GlobalPooling',
      'Linear',
      'ReLU',
      'Sum',
    ],
    showBackwardAnalysisControl: true,
    showVarianceAnalysisToggle: true,
    showRankAnalysisToggle: true,
    showRepetitionAnalysisToggle: true,
    showDistanceIndexAnalysisToggle: true,
  },
  knowledgeGraph: {
    canOpenTab: true,
    showKnowledgeGraphControls: true,
    networkCapabilityMode: 'blueprint',
    showAllocationButtons: true,
    enableMemoryAnalysis: true,
    enableMasteryOverfitAnalysis: true,
    enableUtilityAnalysis: true,
    enableGlobalDebugPreview: true,
  },
};

const sharedKnowledgeGraph = configTask3Scratch.knowledgeGraph;

export const configTask4MobileNetScratch: TaskFileConfig = {
  seed: '411',
  neuralBlueprint: createMobileNetBlueprint(false),
  knowledgeGraph: sharedKnowledgeGraph,
};

export const configTask4MobileNetMultiScale: TaskFileConfig = {
  seed: '412',
  neuralBlueprint: createMobileNetBlueprint(true),
  knowledgeGraph: sharedKnowledgeGraph,
};

function createMobileNetBlueprint(multiScale: boolean) {
  const nodes: TaskModuleNodeConfig[] = [];
  const edges: TaskModuleEdgeConfig[] = [];
  let current = 'mobilenet_stem_relu';

  addNode({
    id: 'mobilenet_input',
    kind: '3DInput',
    position: { x: 0, y: 0 },
    outFeatures: 3,
    inputEffectiveRank: 3,
    height: 32,
    width: 32,
    normalizationMode: 'standard',
    deletable: false,
  });
  addNode({
    id: 'mobilenet_resize',
    kind: 'Resize',
    position: { x: 0, y: 1 },
    name: 'Resize',
    targetHeight: 224,
    targetWidth: 224,
    interpolation: 'bilinear',
    deletable: false,
  });
  addNode(cnn('mobilenet_stem', 32, 3, 2, 1, { x: 1, y: 0 }));
  addNode(relu('mobilenet_stem_relu', { x: 2, y: 0 }));
  connect('mobilenet_input', 'mobilenet_resize');
  connect('mobilenet_resize', 'mobilenet_stem');
  connect('mobilenet_stem', 'mobilenet_stem_relu');

  // Two representative blocks are enough to expose the design pattern:
  // the first changes resolution, while the second keeps the shape and uses
  // the residual shortcut.
  current = addInvertedResidual(
    'mobilenet_block1',
    current,
    32,
    64,
    2,
    3,
    multiScale,
    0,
  );
  current = addInvertedResidual(
    'mobilenet_block2',
    current,
    64,
    64,
    1,
    3,
    multiScale,
    1,
  );

  addNode({
    id: 'mobilenet_global_pool',
    kind: 'GlobalPooling',
    position: { x: 18, y: 0 },
    poolMode: 'average',
  });
  addNode({
    id: 'mobilenet_classifier',
    kind: 'Linear',
    position: { x: 19, y: 0 },
    outFeatures: CIFAR_CLASSES,
    useBias: true,
  });
  addNode({
    id: 'mobilenet_output',
    kind: 'Output',
    position: { x: 20, y: 0 },
    neededOutputDim: CIFAR_CLASSES,
    deletable: false,
  });
  connect(current, 'mobilenet_global_pool');
  connect('mobilenet_global_pool', 'mobilenet_classifier');
  connect('mobilenet_classifier', 'mobilenet_output');

  return {
    nodes,
    edges,
    layout: {
      origin: { x: 120, y: 300 },
      gap: { x: 170, y: 150 },
    },
  };

  function addNode(node: TaskModuleNodeConfig) {
    nodes.push(node);
  }

  function connect(source: string, target: string) {
    edges.push({ source, target });
  }

  function addInvertedResidual(
    id: string,
    inputId: string,
    inputChannels: number,
    outputChannels: number,
    stride: number,
    baseKernel: number,
    useMultiScale: boolean,
    blockIndex: number,
  ) {
    const x = 4 + blockIndex * 7;
    const expandedChannels = inputChannels * 3;
    const expandId = `${id}_expand`;
    const expandReluId = `${id}_expand_relu`;
    addNode(cnn(expandId, expandedChannels, 1, 1, 1, { x, y: 0 }));
    addNode(relu(expandReluId, { x, y: -1 }));
    connect(inputId, expandId);
    connect(expandId, expandReluId);

    const kernels = useMultiScale ? [baseKernel, 5] : [baseKernel];
    const branchIds = kernels.map((kernel, branchIndex) => {
      const branch = `${id}_branch${branchIndex + 1}`;
      const depthwiseId = `${branch}_depthwise`;
      const depthwiseReluId = `${branch}_relu`;
      const projectId = `${branch}_project`;
      const branchY = useMultiScale ? branchIndex * 2 - 1 : 0;
      addNode(cnn(
        depthwiseId,
        expandedChannels,
        kernel,
        stride,
        expandedChannels,
        { x: x + 1, y: branchY },
      ));
      addNode(relu(depthwiseReluId, { x: x + 2, y: branchY }));
      addNode(cnn(
        projectId,
        outputChannels,
        1,
        1,
        1,
        { x: x + 3, y: branchY },
      ));
      connect(expandReluId, depthwiseId);
      connect(depthwiseId, depthwiseReluId);
      connect(depthwiseReluId, projectId);
      return projectId;
    });

    const canSkip = stride === 1 && inputChannels === outputChannels;
    if (!canSkip && branchIds.length === 1) return withActivation(branchIds[0]);

    const sumId = `${id}_sum`;
    addNode({
      id: sumId,
      kind: 'Sum',
      position: { x: x + 4, y: 0 },
    });
    branchIds.forEach((branchId) => connect(branchId, sumId));
    if (canSkip) connect(inputId, sumId);
    return withActivation(sumId);

    function withActivation(sourceId: string) {
      const activationId = `${id}_relu`;
      addNode(relu(activationId, { x: x + 5, y: 0 }));
      connect(sourceId, activationId);
      return activationId;
    }
  }
}

function cnn(
  id: string,
  outFeatures: number,
  kernelSize: number,
  stride: number,
  groups: number,
  position: { x: number; y: number },
) {
  return {
    id,
    kind: 'CNN' as const,
    position,
    outFeatures,
    kernelSize,
    stride,
    padding: Math.floor(kernelSize / 2),
    dilation: 1,
    groups,
    useBias: false,
  };
}

function relu(id: string, position: { x: number; y: number }) {
  return {
    id,
    kind: 'ReLU' as const,
    position,
  };
}
