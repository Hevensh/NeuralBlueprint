import type { DesktopFile } from "../desktop/desktopTypes";




export interface WorkspaceState {
  id: string;
  name: string;
  graph: GraphSchema;
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  ui: {
    activeWorkspace: 'blueprint' | 'knowledge' | 'training';
    showRankAnalysis: boolean;
    showVarianceAnalysis: boolean;
  };
  desktop: {
    files: DesktopFile[];
    selectedFileId: string | null;
  };
  updatedAt: number;
}

export function loadWorkspace(STORAGE_KEY: string): WorkspaceState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as WorkspaceState;

    if (!parsed.id || !parsed.graph || !parsed.ui || !parsed.desktop) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveWorkspace(STORAGE_KEY: string, workspace: WorkspaceState): void {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...workspace,
      updatedAt: Date.now(),
    }),
  );
}

export function clearWorkspace(STORAGE_KEY: string): void {
  window.localStorage.removeItem(STORAGE_KEY);
}