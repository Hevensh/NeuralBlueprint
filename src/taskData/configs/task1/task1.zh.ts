import type {
  Task1GuideText,
  Task1GuideTextValues,
} from './task1.en';

export function createTask1GuideTextZh({
  outputDim,
  trainEpochs,
}: Task1GuideTextValues): Task1GuideText {
  return {
    title: '任务 1：线性回归',
    completionInfo: {
      title: '你完成了线性回归流程。',
      body: `这个任务介绍了 Neural Blueprint 的基础流程：添加 Linear 变换、连接有效的 Input 到 Output 路径、把最后一层输出维度调整为 ${outputDim}、初始化模型，并训练 ${trainEpochs} 个 epoch。`,
    },
    steps: {
      addLinear: {
        title: '添加 Linear',
        description: '添加一个 Linear 节点',
        hint: '从左侧面板拖入一个 Linear 节点。',
        info: {
          title: '线性回归从一个可训练变换开始。',
          body: 'Linear 节点会学习从输入特征到输出结果的加权映射。在这个任务中，网络需要在 Input 和 Output 之间放置一个 Linear 变换。',
        },
        dragLabel: 'Linear',
      },
      connectNetwork: {
        title: '连接网络',
        description: '连接 Input 到 Output',
        hint: '通过一个或多个 Linear 节点连接 Input 和 Output。',
        info: {
          title: '数据需要沿着完整路径流过模型。',
          body: '一个有效模型需要让信息从 Input 出发，经过 Linear 节点，最后进入 Output。中间有多个 Linear 也可以，只要路径完整即可。',
        },
        connectInput: {
          title: '连接 Input',
          hint: '从 Input 的输出连接点拖到 Linear 的输入连接点。',
        },
        connectOutput: {
          title: '连接 Output',
          hint: '然后从 Linear 的输出连接点拖到 Output 的输入连接点。',
        },
      },
      setLinearOutput: {
        title: '设置维度',
        description: `将最后一个 Linear 的输出维度设为 ${outputDim}`,
        hint: `将连接到 Output 的最后一个 Linear 节点的 Output Dim 设为 ${outputDim}，使 Output 维度显示正常。`,
        info: {
          title: '最后一层输出维度必须和目标一致。',
          body: `线性回归要预测目标向量。这里 Output 节点需要 ${outputDim} 个值，所以最后一个 Linear 节点也必须输出 ${outputDim} 维。`,
        },
        selectLinear: {
          title: '选择 Linear',
          hint: '选中连接到 Output 的 Linear 节点。',
        },
      },
      initializeNetwork: {
        title: '初始化网络',
        description: '初始化神经记忆',
        hint: '在网络能力模块中点击初始化模型。',
        info: {
          title: '初始化会给模型分配起始能力。',
          body: '训练开始前，网络需要先获得初始记忆分配。这一步会生成训练过程的起点。',
        },
        openTraining: {
          title: '打开训练',
          hint: '切换到训练过程标签页。',
        },
      },
      trainEpochs: {
        title: `训练 ${trainEpochs} 轮`,
        description: `训练到第 ${trainEpochs} 轮`,
        hint: `训练模型，直到训练轮次达到 ${trainEpochs}。`,
        info: {
          title: '训练会反复改进当前映射。',
          body: `每一轮训练都会更新记忆分配和损失曲线。在这一关中，将训练运行到 ${trainEpochs} 轮即可。`,
        },
        openTraining: {
          title: '打开训练',
          hint: '切换到训练过程标签页。',
        },
        setTrainEpochs: {
          title: '设置训练轮数',
          hint: `将训练轮数设为 ${trainEpochs}。`,
        },
        train: {
          title: '训练',
          hint: `点击训练，运行 ${trainEpochs} 轮。`,
        },
      },
    },
  };
}
