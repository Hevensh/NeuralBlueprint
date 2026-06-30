export interface Task1GuideTextValues {
  outputDim: number;
  trainEpochs: number;
}

export function createTask1GuideTextEn({
  outputDim,
  trainEpochs,
}: Task1GuideTextValues) {
  return {
    title: 'Task 1: Linear Regression',
    steps: {
      addLinear: {
        title: 'Add Linear',
        description: 'Add a Linear node',
        hint: 'Drag a Linear node from the left panel.',
        info: {
          title: 'Linear regression starts from one trainable transform.',
          body: 'A Linear node learns a weighted mapping from the input features to the output. For this task, the network needs one Linear transform between Input and Output.',
        },
        dragLabel: 'Linear',
      },
      connectNetwork: {
        title: 'Connect',
        description: 'Connect Input to Output',
        hint: 'Connect Input to Output through one or more Linear nodes.',
        info: {
          title: 'Data must have a complete path through the model.',
          body: 'A valid model needs information to flow from Input through the Linear node and finally into Output. Extra Linear nodes are acceptable as long as the path is complete.',
        },
        connectInput: {
          title: 'Connect Input',
          hint: 'Drag from Input output handle to Linear input handle.',
        },
        connectOutput: {
          title: 'Connect Output',
          hint: 'Then drag from Linear output handle to Output input handle.',
        },
      },
      setLinearOutput: {
        title: 'Set Dimension',
        description: `Set last Linear output dim to ${outputDim}`,
        hint: `Set the last Linear node's Output Dim to ${outputDim}, so the Output dim is normal.`,
        info: {
          title: 'The final output dimension must match the target.',
          body: `Linear regression predicts a target vector. Here the Output node needs ${outputDim} values, so the last Linear node must also output ${outputDim} dimensions.`,
        },
        selectLinear: {
          title: 'Select Linear',
          hint: 'Select the Linear node connected to Output.',
        },
      },
      initializeNetwork: {
        title: 'Initialize Network',
        description: 'Initialize neural memory',
        hint: 'Click Initialize Model in Network Capability.',
        info: {
          title: 'Initialization assigns the model its starting capacity.',
          body: 'Before training, the network needs an initial memory allocation. This creates the starting point for the training process.',
        },
        openTraining: {
          title: 'Open Training',
          hint: 'Switch to the Training Process tab.',
        },
      },
      trainEpochs: {
        title: `Train ${trainEpochs} Epochs`,
        description: `Train to epoch ${trainEpochs}`,
        hint: `Train the model until Train Epochs reaches ${trainEpochs}.`,
        info: {
          title: 'Training repeatedly improves the current mapping.',
          body: `Each epoch updates the memory allocation and loss curve. In this level, run training until the counter reaches ${trainEpochs} epochs.`,
        },
        openTraining: {
          title: 'Open Training',
          hint: 'Switch to the Training Process tab.',
        },
        setTrainSteps: {
          title: 'Set Train Steps',
          hint: `Set Train Steps to ${trainEpochs}.`,
        },
        train: {
          title: 'Train',
          hint: `Click Train to run ${trainEpochs} epochs.`,
        },
      },
    },
  };
}

export type Task1GuideText = ReturnType<typeof createTask1GuideTextEn>;
