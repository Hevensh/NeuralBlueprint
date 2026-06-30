import type {
  Task2GuideText,
  Task2GuideTextValues,
} from './task2.en';

export function createTask2GuideTextZh({
  trainEpochs,
  targetValLoss,
  retryEpochs, 
}: Task2GuideTextValues): Task2GuideText {
  return {
    title: '任务 2：非线性回归',
    steps: {
      addLinear: {
        title: '添加 Linear',
        description: '先尝试线性拟合',
        hint: '从左侧面板拖入一个 Linear 节点。',
        info: {
          title: '单个 Linear 变换本身不会弯曲。',
          body: '目标模式是非线性的。直线可以减少一部分误差，但无法贴合弯曲趋势。',
        },
        dragLabel: 'Linear',
      },
      addRelu: {
        title: '添加 ReLU',
        description: '加入非线性能力',
        hint: '把一个 ReLU 节点拖入画布。',
        info: {
          title: 'ReLU 会给模型带来分段线性的弯折能力。',
          body: '把 ReLU 放在 Linear 层之间后，网络可以组合多段直线，比单条直线更好地拟合曲线数据。',
        },
        dragLabel: 'ReLU',
      },
      connectNetwork: {
        title: '连接网络',
        description: '构建 Input → Linear → ReLU → Linear → Output',
        hint: '在 ReLU 后再加入一个 Linear 节点，然后连成完整路径。',
        info: {
          title: '第二个 Linear 用来还原最终输出维度。',
          body: '第一个 Linear 生成隐藏特征，ReLU 负责弯折这些特征，最后一个 Linear 再映射回 Output 需要的目标维度。',
        },
        addOutputLinear: {
          title: '添加输出 Linear',
          hint: '在 ReLU 后方再拖入一个 Linear 节点。',
        },
        connectInput: {
          title: '连接 Input',
          hint: '从 Input 的输出连接点拖到第一个 Linear 的输入连接点。',
        },
        connectRelu: {
          title: '连接 ReLU',
          hint: '从第一个 Linear 的输出连接点拖到 ReLU 的输入连接点。',
        },
        connectOutputLinear: {
          title: '连接输出 Linear',
          hint: '从 ReLU 的输出连接点拖到第二个 Linear 的输入连接点。',
        },
        selectOutputLinear: {
          title: '选择输出 Linear',
          hint: '选中 ReLU 后面的第二个 Linear 节点。',
        },
        setOutputDim: {
          title: '设置 Output Dim',
          hint: '将这个 Linear 节点的 Output Dim 设置为 Output 需要的目标维度。',
        },
        connectOutput: {
          title: '连接 Output',
          hint: '从第二个 Linear 的输出连接点拖到 Output 的输入连接点。',
        },
      },
      trainAndSave: {
        title: `训练 ${trainEpochs} 轮`,
        description: '训练并保存曲线',
        hint: `训练 ${trainEpochs} 轮，然后记录 Loss History。`,
        info: {
          title: '先保存第一条曲线作为基线。',
          body: '这条基线记录了调节隐藏维度之前，当前网络结构的表现。',
        },
        openTraining: {
          title: '打开训练',
          hint: '切换到 Training Process 标签页。',
        },
        initializeNetwork: {
          title: '初始化网络',
          hint: '点击 Initialize Model。',
        },
        setTrainSteps: {
          title: '设置训练步数',
          hint: `将 Train Steps 设为 ${trainEpochs}。`,
        },
        train: {
          title: '训练',
          hint: `点击 Train，运行 ${trainEpochs} 轮。`,
        },
        save: {
          title: '保存曲线',
          hint: '点击 Record Loss History。',
        },
      },
      tuneHiddenDim: {
        title: '调整隐藏维度',
        description: `达到 best val < ${targetValLoss}`,
        hint: `增大第一个 Linear 的 Output Dim，重新训练，让 Best Val Loss 小于 ${targetValLoss}。`,
        info: {
          title: '更大的隐藏维度会给非线性拟合更多分段。',
          body: '第一个 Linear 控制隐藏宽度。如果它太小，ReLU 能提供的弯折段数也会太少。增大它后重新训练，直到验证损失足够低。',
        },
        selectFirstLinear: {
          title: '选择第一个 Linear',
          hint: '选择直接连接在 Input 后面的 Linear 节点。',
        },
        openBlueprint: {
          title: '返回蓝图',
          hint: `训练到 ${retryEpochs} epoch 后 Best Val 仍然没有达标。返回蓝图，继续增大第一个 Linear 的 Output Dim。`,
        },
        setOutputDim: {
          title: '增大 Output Dim',
          hint: '增大这个 Linear 节点的 Output Dim。',
        },
        initializeNetwork: {
          title: '重新初始化网络',
          hint: '如果网络结构发生变化，再次点击 Initialize Model。',
        },
        retrain: {
          title: '重新训练',
          hint: `再次运行训练，直到 Best Val Loss 低于 ${targetValLoss}。`,
        },
      },
    },
  };
}
