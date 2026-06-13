import type { NodeProps } from '@xyflow/react';
import type { DesktopIconNodeType } from './desktopTypes';
import { getFileIcon } from './fileIcons';

export function DesktopIconNode({ data, selected }: NodeProps<DesktopIconNodeType>) {
  const { file } = data;

  return (
    <div
      className={`desktop-icon-node ${selected ? 'selected' : ''}`}
    >
      <div className="desktop-icon-symbol">
        {getFileIcon(file.type)}
      </div>
      <div className="desktop-icon-name">
        {file.name}
      </div>
    </div>
  );
}
