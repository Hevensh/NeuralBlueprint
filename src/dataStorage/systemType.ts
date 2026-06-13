export type FileWorkspaceType = 'blueprint' | 'report';

export interface ActiveFileState {
  workspace: FileWorkspaceType;
  fileId: string;
}

export type OpenFileType = (workspace: FileWorkspaceType, fileId: string) => void;
export type CloseFileType = () => void;
