import type { DesktopFile } from '../desktop/desktopTypes';

export type FileWorkspaceType = 'blueprint' | 'report';

export interface ActiveFileState {
  workspace: FileWorkspaceType;
  file: DesktopFile;
}

export type OpenFileType = (workspace: FileWorkspaceType, file: DesktopFile) => void;
export type CloseFileType = () => void;
