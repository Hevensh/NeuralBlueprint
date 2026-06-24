import type { DesktopFile } from '../desktop/desktopTypes';

export const INITIAL_DESKTOP_FILES: DesktopFile[] = [
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
