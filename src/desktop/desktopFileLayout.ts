import type { DesktopFile, DesktopIconNodeType } from './desktopTypes';

const DESKTOP_GRID_SIZE = 120;

export function toDesktopFlowPosition(position: DesktopFile['position']) {
  return {
    x: position.x * DESKTOP_GRID_SIZE,
    y: position.y * DESKTOP_GRID_SIZE,
  };
}

export function toDesktopGridPosition(position: DesktopFile['position']) {
  return {
    x: position.x / DESKTOP_GRID_SIZE,
    y: position.y / DESKTOP_GRID_SIZE,
  };
}

export function toDesktopNodes(files: DesktopFile[]): DesktopIconNodeType[] {
  return files.map((file) => toDesktopNode(file, files));
}

export function toDesktopNode(
  file: DesktopFile,
  files: DesktopFile[] = [file],
): DesktopIconNodeType {
  return {
    id: file.id,
    type: 'desktopIcon',
    position: toDesktopFlowPosition(file.position),
    hidden: !isDesktopFileVisible(file, files),
    data: {
      file,
    },
    draggable: true,
    deletable: file.deletable,
    selectable: true,
  };
}

export function isDesktopFileVisible(
  file: DesktopFile,
  files: DesktopFile[],
) {
  if (file.visible === false) return false;

  const fileById = new Map(files.map((item) => [item.id, item]));
  return (file.dependencyFileIds ?? []).every((fileId) => (
    fileById.get(fileId)?.completed === true
  ));
}
