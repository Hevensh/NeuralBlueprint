import type { Viewport } from "@xyflow/react";
import { INITIAL_DESKTOP_FILES } from "../taskData/desktopDefaults";
import type { DesktopFile, DesktopIconNodeType } from "../desktop/desktopTypes";
import { toDesktopGridPosition } from "../desktop/desktopFileLayout";
import { appStorage } from "./storageAdapter";


const DESKTOP_DATA_STORAGE_KEY = 'neural-blueprint:desktop:v1';
const DESKTOP_VIEW_STORAGE_KEY = 'neural-blueprint:desktop-view:v1';


export function loadDesktopFiles(): DesktopFile[] {
  const raw = appStorage.getItem(DESKTOP_DATA_STORAGE_KEY);
  return raw ? JSON.parse(raw) as DesktopFile[] : INITIAL_DESKTOP_FILES;
}

export function saveDesktopFiles(nodes: DesktopIconNodeType[]): void {
  saveDesktopFileList(nodes.map((node) => ({
    ...node.data.file,
    position: toDesktopGridPosition(node.position),
  })));

  // console.log('files saved');
}

export function updateDesktopFile(
  fileId: string,
  update: (file: DesktopFile) => DesktopFile,
): void {
  saveDesktopFileList(loadDesktopFiles().map((file) => (
    file.id === fileId ? update(file) : file
  )));
}

function saveDesktopFileList(files: DesktopFile[]): void {
  appStorage.setItem(DESKTOP_DATA_STORAGE_KEY, JSON.stringify(files));
}


export const INITIAL_DESKTOP_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 2 };
export function loadDesktopView(): Viewport {
  // console.log('loading viewport');
  try {
    const raw = appStorage.getItem(DESKTOP_VIEW_STORAGE_KEY);
    if (!raw) return INITIAL_DESKTOP_VIEWPORT;

    const viewport = JSON.parse(raw) as Viewport;

    // console.log('viewport loaded');
    return viewport;
  } catch {
    return INITIAL_DESKTOP_VIEWPORT;
  }
}

export function saveDesktopView(viewport: Viewport): void {
  appStorage.setItem(
    DESKTOP_VIEW_STORAGE_KEY,
    JSON.stringify(viewport),
  );

  // console.log('viewport saved');
}

export function clearWorkspace(): void {
  appStorage.removeItem(DESKTOP_DATA_STORAGE_KEY);
  appStorage.removeItem(DESKTOP_VIEW_STORAGE_KEY);
}
