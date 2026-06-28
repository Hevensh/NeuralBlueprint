import type { DesktopFile } from '../desktop/desktopTypes';
import { configFileTask1 } from './configs/task1';

export const INITIAL_DESKTOP_FILES: DesktopFile[] = [
  {
    id: 'experimental_nbp',
    name: 'Experimental Blueprint',
    type: 'nbp',
    deletable: false,
    position: { x: 120, y: 0 },
  },
  {
    id: 'task1:welcome to neural blueprint',
    name: 'Task 1: Welcome to Neural Blueprint',
    type: 'nbp',
    deletable: false,
    position: { x: 240, y: 0 },
    config: configFileTask1,
  },


  {
    id: 'experimental_rep',
    name: 'Experimental Report',
    type: 'rep',
    deletable: false,
    position: { x: 120, y: 120 },
  },
];
