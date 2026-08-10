import type { DecorationSpec } from './decorationTypes';

export const DECORATION_SPECS: DecorationSpec[] = [
  { kind: 'mug', width: 1, depth: 1, contexts: ['npc', 'player', 'commonTable'], towerTop: true },
  { kind: 'plant', width: 1, depth: 1, contexts: ['npc', 'empty', 'commonTable'], towerTop: true },
  { kind: 'penCup', width: 1, depth: 1, contexts: ['npc', 'player', 'commonTable'], towerTop: true },
  { kind: 'deskLamp', width: 1, depth: 1, contexts: ['npc', 'player', 'commonTable'] },
  { kind: 'cactus', width: 1, depth: 1, contexts: ['npc', 'empty', 'commonTable'], towerTop: true },
  { kind: 'figurine', width: 1, depth: 1, contexts: ['npc', 'player'], towerTop: true },
  { kind: 'headphones', width: 1, depth: 1, contexts: ['npc', 'player'], towerTop: true },
  { kind: 'books', width: 2, depth: 1, contexts: ['npc', 'player', 'empty', 'commonTable'] },
  { kind: 'papers', width: 2, depth: 1, rotate: true, contexts: ['npc', 'player', 'empty', 'commonTable'] },
  { kind: 'printer', width: 2, depth: 1, contexts: ['empty', 'commonTable'] },
  { kind: 'oscilloscope', width: 2, depth: 1, contexts: ['empty', 'commonTable'] },
  { kind: 'networkSwitch', width: 2, depth: 1, contexts: ['empty', 'commonTable'] },
  { kind: 'documentTray', width: 2, depth: 1, contexts: ['npc', 'empty', 'commonTable'] },
  { kind: 'equipmentCrate', width: 2, depth: 2, contexts: ['empty', 'commonTable'] },
  { kind: 'gpuTestBench', width: 2, depth: 2, contexts: ['commonTable'] },
];

export const DECORATION_COLORS = [
  '#38bdf8',
  '#34d399',
  '#a78bfa',
  '#f59e0b',
  '#fb7185',
  '#94a3b8',
];

export const DECORATION_SIZE_WEIGHTS = new Map([
  ['1x1', 12],
  ['2x1', 4],
  ['2x2', 1],
]);
