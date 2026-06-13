import type { DesktopFile } from "../desktop/desktopTypes";
import type { Edge } from "@xyflow/react";
import type { PageNodeData } from "../blueprint/PageTypes";
import { appStorage } from "./storageAdapter";


export interface GraphSchema {
  nodes: PageNodeData[];
  edges: Edge[];
}



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
    const raw = appStorage.getItem(STORAGE_KEY);
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
  appStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...workspace,
      updatedAt: Date.now(),
    }),
  );
}

export function clearWorkspace(STORAGE_KEY: string): void {
  appStorage.removeItem(STORAGE_KEY);
}
