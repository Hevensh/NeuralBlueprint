import type { Viewport } from "@xyflow/react";
import { INITIAL_DESKTOP_FILES } from "../taskData/desktopDefaults";
import type { DesktopFile, DesktopIconNodeType } from "../desktop/desktopTypes";
import { appStorage } from "./storageAdapter";


const DESKTOP_DATA_STORAGE_KEY = 'neural-blueprint:desktop:v1';
const DESKTOP_VIEW_STORAGE_KEY = 'neural-blueprint:desktop-view:v1';


export function loadDesktopFiles(): DesktopFile[] {
  // // console.log('loading files');
  // try {
  //   const raw = appStorage.getItem(DESKTOP_DATA_STORAGE_KEY);
  //   if (!raw) return INITIAL_DESKTOP_FILES;

  //   const parsed = JSON.parse(raw) as DesktopFile[];

  //   // console.log('files loaded');
  //   return parsed;
  // } catch {
  //   return INITIAL_DESKTOP_FILES;
  // }
  return INITIAL_DESKTOP_FILES;
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
