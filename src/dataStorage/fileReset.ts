import type { DesktopFile } from '../desktop/desktopTypes';
import { INITIAL_DESKTOP_FILES } from '../taskData/desktopDefaults';
import { clearWorkspace, loadDesktopFiles } from './desktopStorage';
import { clearKnowledgeGraphSession } from './knowledgeGraphStorage';
import { clearNeuralBlueprintGraph } from './neuralBlueprintStorage';
import { clearTrainingCurves } from './trainingCurveStorage';

export function clearDesktopFileRuntime(file: DesktopFile) {
  if (file.type !== 'nbp') return false;

  clearNeuralBlueprintGraph(file.id);
  clearKnowledgeGraphSession(file.id);
  clearTrainingCurves(file.id);
  return true;
}

export function resetAllFileStorage(currentFiles: DesktopFile[] = []) {
  const files = new Map<string, DesktopFile>();
  [...loadDesktopFiles(), ...currentFiles, ...INITIAL_DESKTOP_FILES]
    .forEach((file) => files.set(file.id, file));
  files.forEach(clearDesktopFileRuntime);
  clearWorkspace();
}
