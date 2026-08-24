import type { ModuleBaseNodeKind } from './ModuleBaseNodeTypes';

export interface ModuleDefinition {
  kind: ModuleBaseNodeKind;
  icon: string;
  paletteGroup: ModulePaletteGroup;
}

export type ModulePalettePreset = 'pretrained-resnet-stage';
export type ModulePaletteGroup =
  | 'inputOutput'
  | 'layers'
  | 'networks'
  | 'shape'
  | 'operations';

export const MODULE_PALETTE_GROUPS: readonly ModulePaletteGroup[] = [
  'inputOutput',
  'layers',
  'networks',
  'shape',
  'operations',
];

export interface ModulePaletteDefinition extends ModuleDefinition {
  id: string;
  preset?: ModulePalettePreset;
}

export const MODULE_DEFINITIONS = [
  { kind: 'Input', icon: 'X', paletteGroup: 'inputOutput' },
  { kind: '3DInput', icon: '3D', paletteGroup: 'inputOutput' },
  { kind: 'Linear', icon: 'W', paletteGroup: 'layers' },
  { kind: 'CNN', icon: 'C', paletteGroup: 'layers' },
  { kind: 'ResNetStage', icon: 'Res', paletteGroup: 'networks' },
  { kind: 'PatchEmbedding', icon: 'PE', paletteGroup: 'shape' },
  { kind: 'Resize', icon: 'RS', paletteGroup: 'shape' },
  { kind: 'Pooling', icon: 'P', paletteGroup: 'shape' },
  { kind: 'Normalization', icon: 'N', paletteGroup: 'layers' },
  { kind: 'Flatten', icon: 'F', paletteGroup: 'shape' },
  { kind: 'GlobalPooling', icon: 'GP', paletteGroup: 'shape' },
  { kind: 'ReLU', icon: 'R', paletteGroup: 'operations' },
  { kind: 'Dropout', icon: 'D', paletteGroup: 'operations' },
  { kind: 'Sum', icon: '+', paletteGroup: 'operations' },
  { kind: 'Output', icon: 'Y', paletteGroup: 'inputOutput' },
] as const satisfies readonly ModuleDefinition[];

export const MODULE_KINDS = MODULE_DEFINITIONS.map(
  (definition) => definition.kind,
);

export const MODULE_PALETTE_DEFINITIONS: readonly ModulePaletteDefinition[] = (
  MODULE_DEFINITIONS.flatMap<ModulePaletteDefinition>((definition) => (
    definition.kind === 'ResNetStage'
      ? [
          { ...definition, id: 'ResNetStage' },
          {
            ...definition,
            id: 'PretrainedResNetStage',
            icon: 'Res',
            preset: 'pretrained-resnet-stage' as const,
          },
        ]
      : [{ ...definition, id: definition.kind }]
  ))
);

const MODULE_KIND_SET = new Set<ModuleBaseNodeKind>(MODULE_KINDS);

export function isModuleBaseNodeKind(
  kind: string,
): kind is ModuleBaseNodeKind {
  return MODULE_KIND_SET.has(kind as ModuleBaseNodeKind);
}

export function getModuleDefinition(kind: ModuleBaseNodeKind) {
  return MODULE_DEFINITIONS.find((definition) => definition.kind === kind);
}
