import type { Viewport } from "@xyflow/react";
import {
  createDesktopFileFromDefinition,
  createInitialDesktopFiles,
  DESKTOP_FILE_DEFINITIONS,
} from "../taskData/desktopDefaults";
import type {
  DesktopFile,
  DesktopIconNodeType,
  StoredDesktopFile,
} from "../desktop/desktopTypes";
import { toDesktopGridPosition } from "../desktop/desktopFileLayout";
import { appStorage } from "./storageAdapter";


const DESKTOP_DATA_STORAGE_KEY = 'neural-blueprint:desktop:v2';
const DESKTOP_VIEW_STORAGE_KEY = 'neural-blueprint:desktop-view:v1';


export function loadDesktopFiles(): DesktopFile[] {
  const raw = appStorage.getItem(DESKTOP_DATA_STORAGE_KEY);
  if (!raw) return createInitialDesktopFiles();

  const storedFiles = JSON.parse(raw) as StoredDesktopFile[];
  const definedProgress = new Map(
    storedFiles
      .filter((file) => file.kind === 'defined')
      .map((file) => [file.id, file]),
  );
  const definedFiles = DESKTOP_FILE_DEFINITIONS.map((definition) => {
    const progress = definedProgress.get(definition.id);
    return progress
      ? toDesktopFile(progress) as DesktopFile
      : createDesktopFileFromDefinition(definition);
  });
  const customFiles = storedFiles
    .filter((file) => file.kind === 'custom')
    .map(toDesktopFile)
    .filter((file): file is DesktopFile => Boolean(file));

  return [...definedFiles, ...customFiles];
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
  appStorage.setItem(
    DESKTOP_DATA_STORAGE_KEY,
    JSON.stringify(files.map(toStoredDesktopFile)),
  );
}

const definitionById = new Map(
  DESKTOP_FILE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

function toStoredDesktopFile(file: DesktopFile): StoredDesktopFile {
  const definition = definitionById.get(file.id);
  const progress = {
    id: file.id,
    position: file.position,
    completed: file.completed,
    guideCompletedStepCount: file.guideCompletedStepCount ?? 0,
  };

  return definition
    ? {
        ...progress,
        kind: 'defined',
        nameOverride: file.localizedNames ? undefined : file.name,
      }
    : {
        ...progress,
        kind: 'custom',
        name: file.name,
        type: file.type,
      };
}

function toDesktopFile(stored: StoredDesktopFile): DesktopFile | null {
  if (stored.kind === 'custom') {
    return {
      id: stored.id,
      name: stored.name,
      type: stored.type,
      deletable: true,
      completed: stored.completed,
      visible: true,
      dependencyFileIds: [],
      position: stored.position,
      guideCompletedStepCount: stored.guideCompletedStepCount,
    };
  }

  const definition = definitionById.get(stored.id);
  if (!definition) return null;
  const { initialPosition: _, ...fileDefinition } = definition;

  return {
    ...fileDefinition,
    name: stored.nameOverride ?? definition.name,
    localizedNames: stored.nameOverride
      ? undefined
      : definition.localizedNames,
    position: stored.position,
    completed: stored.completed,
    guideCompletedStepCount: stored.guideCompletedStepCount,
  };
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
