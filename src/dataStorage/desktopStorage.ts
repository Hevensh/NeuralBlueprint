import type { Viewport } from "@xyflow/react";
import type { DesktopFile, DesktopIconNodeType } from "../desktop/desktopTypes";
import { appStorage } from "./storageAdapter";


const DESKTOP_DATA_STORAGE_KEY = 'neural-blueprint:desktop:v1';
const DESKTOP_VIEW_STORAGE_KEY = 'neural-blueprint:desktop-view:v1';


const initialFiles: DesktopFile[] = [
  {
    id: 'experimental_nbp',
    name: 'Experimental Blueprint',
    type: 'nbp',
    deletable: false,
    position: { x: 120, y: 100 },
  },
  {
    id: 'experimental_rep',
    name: 'Experimental Report',
    type: 'rep',
    deletable: false,
    position: { x: 120, y: 240 },
  },
];

export function loadDesktopFiles(): DesktopFile[] {
  // console.log('loading files');
  try {
    const raw = appStorage.getItem(DESKTOP_DATA_STORAGE_KEY);
    if (!raw) return initialFiles;

    const parsed = JSON.parse(raw) as DesktopFile[];

    // console.log('files loaded');
    return parsed;
  } catch {
    return initialFiles;
  }
}

export function saveDesktopFiles(nodes: DesktopIconNodeType[]): void {
  appStorage.setItem(
    DESKTOP_DATA_STORAGE_KEY,
    JSON.stringify(nodes.map((node) => ({
      ...node.data.file,
      position: node.position
    }))),
  );

  // console.log('files saved');
}


const initialViewport: Viewport = { x: 0, y: 0, zoom: 1 };
export function loadDesktopView(): Viewport {
  // console.log('loading viewport');
  try {
    const raw = appStorage.getItem(DESKTOP_VIEW_STORAGE_KEY);
    if (!raw) return initialViewport;

    const viewport = JSON.parse(raw) as Viewport;

    // console.log('viewport loaded');
    return viewport;
  } catch {
    return initialViewport;
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
