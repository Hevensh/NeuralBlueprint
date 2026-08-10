import { createSeededRandom } from './labRandom';
import type { LabNpcDefinition } from './labTypes';

export type LabNpcHeadShape = 'round' | 'square' | 'triangle' | 'hex' | 'diamond';
export type LabNpcModule =
  | 'vents'
  | 'antenna'
  | 'beacons'
  | 'fins'
  | 'sensor'
  | 'ports';
export type LabNpcEyeShape = 'round' | 'square' | 'diamond' | 'slit' | 'mixed';
export type LabNpcMouthShape = 'bar' | 'grille' | 'triangle' | 'square' | 'chevron';
export type LabNpcBodyShape = 'prism' | 'wedge' | 'stack' | 'crystal' | 'offset';

export interface LabNpcAppearance {
  head: LabNpcHeadShape;
  module: LabNpcModule;
  eyes: LabNpcEyeShape;
  mouth: LabNpcMouthShape;
  body: LabNpcBodyShape;
  shellColor: string;
  moduleColor: string;
  signalColor: string;
  eyeLeftY: number;
  eyeRightY: number;
  eyeLeftX: number;
  eyeRightX: number;
  eyeLeftScale: number;
  eyeRightScale: number;
  mouthX: number;
  mouthY: number;
  mouthScale: number;
  headTilt: number;
  headSkew: number;
  headApex: number;
  headLeftBase: number;
  headRightBase: number;
  headTopLeftX: number;
  headTopRightX: number;
  headRightY: number;
  headBottomRightX: number;
  headBottomLeftX: number;
  headLeftY: number;
  eyeLeftTilt: number;
  eyeRightTilt: number;
  mouthTilt: number;
  bodyTilt: number;
  bodySkew: number;
  bodyWidth: number;
  bodyHeight: number;
  bodyX: number;
  bodyApex: number;
  bodyLeftShoulder: number;
  bodyRightShoulder: number;
  bodyLeftFoot: number;
  bodyRightFoot: number;
}

const HEADS: LabNpcHeadShape[] = ['round', 'diamond', 'square', 'hex', 'triangle'];
const MODULES: LabNpcModule[] = [
  'vents',
  'antenna',
  'beacons',
  'fins',
  'sensor',
  'ports',
];
const EYES: LabNpcEyeShape[] = ['round', 'square', 'diamond', 'slit', 'mixed'];
const MOUTHS: LabNpcMouthShape[] = ['bar', 'grille', 'triangle', 'square', 'chevron'];
const BODIES: LabNpcBodyShape[] = ['prism', 'wedge', 'stack', 'crystal', 'offset'];
const SHELL_COLORS = ['#d6c7a8', '#afc5c2', '#c5b6d3', '#9db8c2', '#d0b4a6', '#aab7ce'];
const MODULE_COLORS = ['#263746', '#384b50', '#4b4059', '#53453e', '#2e4d59'];
const SIGNAL_COLORS = ['#34d399', '#22d3ee', '#fbbf24', '#fb7185', '#a78bfa'];

export function createLabNpcAppearance(npc: LabNpcDefinition): LabNpcAppearance {
  const random = createSeededRandom(`${npc.id}:appearance`);
  return {
    head: pick(HEADS, random),
    module: pick(MODULES, createSeededRandom(`${npc.id}:module`)),
    eyes: pick(EYES, random),
    mouth: pick(MOUTHS, random),
    body: pick(BODIES, random),
    shellColor: pick(SHELL_COLORS, random),
    moduleColor: pick(MODULE_COLORS, random),
    signalColor: pick(SIGNAL_COLORS, random),
    eyeLeftY: 37 + Math.round(random() * 16),
    eyeRightY: 37 + Math.round(random() * 16),
    eyeLeftX: 13 + Math.round(random() * 19),
    eyeRightX: 13 + Math.round(random() * 19),
    eyeLeftScale: 0.75 + random() * 0.8,
    eyeRightScale: 0.75 + random() * 0.8,
    mouthX: 42 + Math.round(random() * 16),
    mouthY: 60 + Math.round(random() * 18),
    mouthScale: 0.85 + random() * 0.5,
    headTilt: Math.round((random() - 0.5) * 28),
    headSkew: Math.round((random() - 0.5) * 30),
    headApex: 28 + Math.round(random() * 44),
    headLeftBase: 76 + Math.round(random() * 24),
    headRightBase: 76 + Math.round(random() * 24),
    headTopLeftX: 8 + Math.round(random() * 24),
    headTopRightX: 68 + Math.round(random() * 24),
    headRightY: 32 + Math.round(random() * 36),
    headBottomRightX: 55 + Math.round(random() * 35),
    headBottomLeftX: 10 + Math.round(random() * 35),
    headLeftY: 32 + Math.round(random() * 36),
    eyeLeftTilt: Math.round((random() - 0.5) * 56),
    eyeRightTilt: Math.round((random() - 0.5) * 56),
    mouthTilt: Math.round((random() - 0.5) * 48),
    bodyTilt: Math.round((random() - 0.5) * 16),
    bodySkew: Math.round((random() - 0.5) * 18),
    bodyWidth: 46 + Math.round(random() * 18),
    bodyHeight: 38 + Math.round(random() * 12),
    bodyX: 46 + Math.round(random() * 8),
    bodyApex: 35 + Math.round(random() * 30),
    bodyLeftShoulder: 8 + Math.round(random() * 25),
    bodyRightShoulder: 8 + Math.round(random() * 25),
    bodyLeftFoot: Math.round(random() * 24),
    bodyRightFoot: 76 + Math.round(random() * 24),
  };
}

function pick<T>(values: T[], random: () => number) {
  return values[Math.floor(random() * values.length)];
}
