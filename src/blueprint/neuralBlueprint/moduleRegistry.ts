import type { ModuleBaseNodeKind } from './ModuleBaseNodeTypes';

export interface ModuleDefinition {
  kind: ModuleBaseNodeKind;
  icon: string;
}

export const MODULE_DEFINITIONS = [
  { kind: 'Input', icon: 'X' },
  { kind: '3DInput', icon: '3D' },
  { kind: 'Linear', icon: 'W' },
  { kind: 'CNN', icon: 'C' },
  { kind: 'Pooling', icon: 'P' },
  { kind: 'Flatten', icon: 'F' },
  { kind: 'GlobalPooling', icon: 'GP' },
  { kind: 'ReLU', icon: 'R' },
  { kind: 'Dropout', icon: 'D' },
  { kind: 'Sum', icon: '+' },
  { kind: 'Output', icon: 'Y' },
] as const satisfies readonly ModuleDefinition[];

export const MODULE_KINDS = MODULE_DEFINITIONS.map(
  (definition) => definition.kind,
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
