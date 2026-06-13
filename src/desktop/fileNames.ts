import type { DesktopFileType } from './desktopTypes';

export function getFileTypeLabel(type: DesktopFileType) {
  return type === 'nbp' ? 'Neural Blueprint' : 'Report';
}
