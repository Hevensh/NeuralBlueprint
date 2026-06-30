export interface Task2GuideTextValues {
  trainEpochs: number;
  targetValLoss: number;
}

export function createTask2GuideTextEn({
  trainEpochs,
  targetValLoss,
}: Task2GuideTextValues) {
  return {
    title: 'Task 2: Nonlinear Regression',
    steps: {
      addLinear: {
        title: 'Add Linear',
        description: 'Try a linear fit first',
        hint: 'Drag a Linear node from the left panel.',
        info: {
          title: 'A single Linear transform cannot bend.',
          body: 'The target pattern is nonlinear. A straight line can reduce part of the error, but it cannot follow the curved trend.',
        },
        dragLabel: 'Linear',
      },
      addRelu: {
        title: 'Add ReLU',
        description: 'Add nonlinearity',
        hint: 'Drag a ReLU node into the canvas.',
        info: {
          title: 'ReLU gives the model piecewise-linear bends.',
          body: 'With ReLU between Linear layers, the network can combine straight segments and fit curved data much better than one straight line.',
        },
        dragLabel: 'ReLU',
      },
      connectNetwork: {
        title: 'Connect Network',
        description: 'Build Input → Linear → ReLU → Linear → Output',
        hint: 'Add one more Linear node after ReLU, then connect the full path to Output.',
        info: {
          title: 'The second Linear restores the final output dimension.',
          body: 'The first Linear creates hidden features, ReLU bends them, and the final Linear maps those features back to the target dimension required by Output.',
        },
        addOutputLinear: {
          title: 'Add Output Linear',
          hint: 'Drag another Linear node after ReLU.',
        },
        connectInput: {
          title: 'Connect Input',
          hint: 'Drag from Input output handle to the first Linear input handle.',
        },
        connectRelu: {
          title: 'Connect ReLU',
          hint: 'Drag from the first Linear output handle to the ReLU input handle.',
        },
        connectOutputLinear: {
          title: 'Connect Output Linear',
          hint: 'Drag from ReLU output handle to the second Linear input handle.',
        },
        selectOutputLinear: {
          title: 'Select Output Linear',
          hint: 'Select the second Linear node after ReLU.',
        },
        setOutputDim: {
          title: 'Set Output Dim',
          hint: 'Set this Linear node’s Output Dim to the Output target dimension.',
        },
        connectOutput: {
          title: 'Connect Output',
          hint: 'Drag from the second Linear output handle to Output input handle.',
        },
      },
      trainAndSave: {
        title: `Train ${trainEpochs} Epochs`,
        description: 'Train and save the curve',
        hint: `Train for ${trainEpochs} epochs, then record the loss history.`,
        info: {
          title: 'Save the first curve as a baseline.',
          body: 'This baseline records how the current network performs before tuning the hidden dimension.',
        },
        openTraining: {
          title: 'Open Training',
          hint: 'Switch to the Training Process tab.',
        },
        initializeNetwork: {
          title: 'Initialize Network',
          hint: 'Click Initialize Model.',
        },
        setTrainSteps: {
          title: 'Set Train Steps',
          hint: `Set Train Steps to ${trainEpochs}.`,
        },
        train: {
          title: 'Train',
          hint: `Click Train to run ${trainEpochs} epochs.`,
        },
        save: {
          title: 'Save Curve',
          hint: 'Click Record Loss History.',
        },
      },
      tuneHiddenDim: {
        title: 'Tune Hidden Dim',
        description: `Reach best val < ${targetValLoss}`,
        hint: `Increase the first Linear output dim, retrain, and make Best Val Loss lower than ${targetValLoss}.`,
        info: {
          title: 'More hidden dimensions give the nonlinear fit more segments.',
          body: 'The first Linear controls hidden width. If it is too small, ReLU has too few bends. Increase it, then retrain until validation loss is low enough.',
        },
        selectFirstLinear: {
          title: 'Select First Linear',
          hint: 'Select the Linear node directly after Input.',
        },
        setOutputDim: {
          title: 'Increase Output Dim',
          hint: 'Increase this Linear node’s Output Dim.',
        },
        initializeNetwork: {
          title: 'Reinitialize Network',
          hint: 'Click Initialize Model again if the network changed.',
        },
        retrain: {
          title: 'Retrain',
          hint: `Run training again until Best Val Loss is below ${targetValLoss}.`,
        },
      },
    },
  };
}

export type Task2GuideText = ReturnType<typeof createTask2GuideTextEn>;
