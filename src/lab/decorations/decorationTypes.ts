export type LabDeskDecorationKind =
  | 'mug'
  | 'plant'
  | 'penCup'
  | 'deskLamp'
  | 'cactus'
  | 'figurine'
  | 'headphones'
  | 'books'
  | 'papers'
  | 'printer'
  | 'oscilloscope'
  | 'networkSwitch'
  | 'documentTray'
  | 'equipmentCrate'
  | 'gpuTestBench';

export type LabDecorationContext =
  | 'npc'
  | 'player'
  | 'empty'
  | 'commonTable';

export type LabDeskDecorationSurface = 'desk' | 'towerTop';

export interface LabDeskDecoration {
  id: string;
  kind: LabDeskDecorationKind;
  surface: LabDeskDecorationSurface;
  column: number;
  row: number;
  width: number;
  depth: number;
  color: string;
  variant: number;
}

export interface DecorationSpec {
  kind: LabDeskDecorationKind;
  width: number;
  depth: number;
  rotate?: boolean;
  contexts: LabDecorationContext[];
  towerTop?: boolean;
}

export interface DecorationPlacementCandidate {
  spec: DecorationSpec;
  column: number;
  row: number;
  width: number;
  depth: number;
}
