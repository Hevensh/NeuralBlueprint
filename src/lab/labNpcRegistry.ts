import type { LabDayConfig, LabNpcDefinition } from './labTypes';

const LAB_NPCS: LabNpcDefinition[] = [
  {
    id: 'senior-avery',
    role: 'senior',
    name: { en: 'Avery', zh: '艾文学长' },
    color: '#38bdf8',
    topics: [
      {
        id: 'research-direction',
        question: {
          en: 'How should I choose the next experiment?',
          zh: '下一个实验应该怎么选？',
        },
        response: {
          en: 'Change one important assumption at a time, then keep the curve that makes the comparison clear.',
          zh: '每次只改一个重要假设，再保留能清楚对比的训练曲线。',
        },
      },
      {
        id: 'model-capacity',
        question: {
          en: 'What should I watch when model capacity changes?',
          zh: '模型容量变化时应该看什么？',
        },
        response: {
          en: 'Watch both what the network can learn and where its inference memory is being spent.',
          zh: '同时观察网络能学到什么，以及推理记忆被分配到了哪里。',
        },
      },
    ],
  },
  {
    id: 'peer-mira',
    role: 'peer',
    name: { en: 'Mira', zh: '米拉' },
    color: '#a78bfa',
    topics: [
      {
        id: 'current-work',
        question: {
          en: 'What are you working on today?',
          zh: '你今天在做什么？',
        },
        response: {
          en: 'I am comparing small architecture changes. The surprising runs are usually the useful ones.',
          zh: '我在比较一些小的结构变化，那些意外的训练结果往往最有用。',
        },
      },
    ],
  },
  {
    id: 'senior-noah',
    role: 'senior',
    name: { en: 'Noah', zh: '诺亚学长' },
    color: '#22d3ee',
    topics: [
      {
        id: 'reading-loss',
        question: {
          en: 'How do you read a training curve?',
          zh: '你是怎么看训练曲线的？',
        },
        response: {
          en: 'Start with the validation minimum, then ask what changed before and after that epoch.',
          zh: '先找到验证损失的最低点，再分析那一轮前后发生了什么。',
        },
      },
    ],
  },
  {
    id: 'peer-iris',
    role: 'peer',
    name: { en: 'Iris', zh: '艾瑞丝' },
    color: '#34d399',
    topics: [
      {
        id: 'knowledge-graph',
        question: {
          en: 'Why model knowledge as a graph?',
          zh: '为什么要把知识建成图？',
        },
        response: {
          en: 'Because learning one concept can enable, replace, or interfere with learning another.',
          zh: '因为学会一个概念，可能会帮助、替代或干扰另一个概念的学习。',
        },
      },
    ],
  },
  {
    id: 'peer-evan',
    role: 'peer',
    name: { en: 'Evan', zh: '伊万' },
    color: '#f59e0b',
    topics: [
      {
        id: 'record-results',
        question: {
          en: 'Which experiment results should I keep?',
          zh: '哪些实验结果值得保留？',
        },
        response: {
          en: 'Keep the baseline, the best run, and one failed run that explains why the final choice works.',
          zh: '保留基线、最佳结果，以及一个能说明最终选择为什么有效的失败实验。',
        },
      },
    ],
  },
];

export const DEFAULT_LAB_DAY_CONFIG: LabDayConfig = {
  workstationLayout: {
    allowedGroupLengths: [2, 3, 4],
    minTotalWorkstations: 6,
    maxTotalWorkstations: 8,
  },
  npcCount: 3,
  minAttendance: 1,
  maxAttendance: 3,
  npcPool: LAB_NPCS,
};
