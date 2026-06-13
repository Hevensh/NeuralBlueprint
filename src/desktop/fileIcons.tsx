import type { DesktopFileType } from './desktopTypes';
import { NeuralBlueprintIcon, TextFileIcon } from './DesktopFileIcons';

export function getFileIcon(type: DesktopFileType, size?: number) {
  if (type === 'nbp') return <NeuralBlueprintIcon size={size} />;
  if (type === 'rep') return <TextFileIcon size={size} />;
  return 'File';
}
