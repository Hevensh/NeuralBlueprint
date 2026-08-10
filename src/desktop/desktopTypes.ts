import type { Node } from '@xyflow/react';
import type { BlueprintTaskFeatureConfig } from '../taskData/blueprintFeatureConfig';

export type DesktopFileType = 'nbp' | 'rep';

export interface DesktopFileDefinition {
  id: string;
  name: string;
  localizedNames?: Partial<Record<'en' | 'zh', string>>;
  type: DesktopFileType;
  deletable: boolean;
  visible: boolean;
  dependencyFileIds: string[];
  initialPosition: {
    x: number;
    y: number;
  };
  config?: BlueprintTaskFeatureConfig;
}

export type StoredDesktopFile = {
  kind: 'defined';
  id: string;
  nameOverride?: string;
  position: DesktopFile['position'];
  completed: boolean;
  guideCompletedStepCount: number;
} | {
  kind: 'custom';
  id: string;
  name: string;
  type: DesktopFileType;
  position: DesktopFile['position'];
  completed: boolean;
  guideCompletedStepCount: number;
};

export interface DesktopFile {
  id: string;
  name: string;
  localizedNames?: Partial<Record<'en' | 'zh', string>>;
  type: DesktopFileType;
  deletable: boolean;
  completed: boolean;
  visible: boolean;
  dependencyFileIds: string[];
  position: {
    x: number;
    y: number;
  };
  config?: BlueprintTaskFeatureConfig;
  guideCompletedStepCount?: number;
}

export interface DesktopIconData extends Record<string, unknown> {
  file: DesktopFile;
}

export type DesktopIconNodeType = Node<DesktopIconData>;
