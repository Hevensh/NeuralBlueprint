import type { Node } from '@xyflow/react';
import type { BlueprintTaskFeatureConfig } from '../taskData/blueprintFeatureConfig';

export type DesktopFileType = 'nbp' | 'rep';

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
