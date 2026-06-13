import type { Node } from '@xyflow/react';

export type DesktopFileType = 'nbp' | 'rep';

export interface DesktopFile {
  id: string;
  name: string;
  type: DesktopFileType;
  deletable: boolean;
  position: {
    x: number;
    y: number;
  };
}

export interface DesktopIconData extends Record<string, unknown> {
  file: DesktopFile;
}

export type DesktopIconNodeType = Node<DesktopIconData>;
