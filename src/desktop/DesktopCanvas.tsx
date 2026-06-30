import {
  getNodesBounds,
  ReactFlowProvider,
  type Edge,
  type ReactFlowInstance,
  type Viewport,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  clearWorkspace as clearDesktopWorkspace,
  INITIAL_DESKTOP_VIEWPORT,
  loadDesktopFiles,
  loadDesktopView,
  saveDesktopFiles,
  saveDesktopView,
  updateDesktopFile,
} from '../dataStorage/desktopStorage';
import { clearKnowledgeGraphSession } from '../dataStorage/knowledgeGraphStorage';
import { clearNeuralBlueprintGraph } from '../dataStorage/neuralBlueprintStorage';
import type { FileWorkspaceType, OpenFileType } from '../dataStorage/systemType';
import { clearTrainingCurves } from '../dataStorage/trainingCurveStorage';
import { INITIAL_DESKTOP_FILES } from '../taskData/desktopDefaults';
import {
  isDesktopFileVisible,
  toDesktopFlowPosition,
  toDesktopNodes,
} from './desktopFileLayout';
import { DesktopCanvasInner } from './DesktopCanvasInner';
import { DesktopLeftPanel } from './leftPanel';
import { DesktopRightPanel } from './rightPanel';
import { DesktopSettingsDialog } from './DesktopSettingsDialog';
import type { DesktopFile, DesktopIconNodeType } from './desktopTypes';

interface DesktopCanvasProp {
  openFile: OpenFileType;
}

export function DesktopCanvas({ openFile }: DesktopCanvasProp) {
  const [selectedFile, setSelectedFile] = useState<DesktopFile | null>(null);
  const [saveNotice, setSaveNotice] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [initFiles] = useState<DesktopFile[]>(loadDesktopFiles);
  
  const [initViewport] = useState<Viewport>(loadDesktopView);
  const [canvas, setCanvas] =
    useState<ReactFlowInstance<DesktopIconNodeType, Edge> | null>(null);

  const historyRef = useRef<DesktopIconNodeType[][]>([]);
  const saveNoticeTimerRef = useRef<number | null>(null);
  const resetAnimationFrameRef = useRef<number | null>(null);

  const showSaveNotice = useCallback((message: string) => {
    setSaveNotice(message);
    if (saveNoticeTimerRef.current !== null) {
      window.clearTimeout(saveNoticeTimerRef.current);
    }
    saveNoticeTimerRef.current = window.setTimeout(() => {
      setSaveNotice('');
    }, 1400);
  }, []);

  const pushHistory = useCallback(() => {
    historyRef.current = [...historyRef.current, canvas?.getNodes() ?? []];
  }, [canvas]);

  const exitApp = useCallback(() => {
    const closePage = () => {
      window.close();
      window.setTimeout(() => {
        if (!window.closed) window.location.href = 'about:blank';
      }, 120);
    };

    if (window.neuralBlueprintApp) {
      void window.neuralBlueprintApp.quit().finally(closePage);
      return;
    }

    void fetch('/__neural-blueprint-exit', { method: 'POST' })
      .finally(closePage);
  }, []);

  const handleOpenFile = useCallback((file: DesktopFile) => {
    saveDesktopFiles(canvas?.getNodes() ?? []);
    const viewport = canvas?.getViewport();
    if (viewport) {
      saveDesktopView(viewport);
    }
    console.log('open file:', file.id);
    const workspace: FileWorkspaceType = file.type === 'nbp' ? 'blueprint' : 'report';
    openFile(workspace, file);
  }, [canvas, openFile]);

  const renameDesktopFile = useCallback((fileId: string, name: string) => {
    pushHistory();
    const renamedFile = selectedFile?.id === fileId
      ? { ...selectedFile, name, localizedNames: undefined }
      : null;
    if (renamedFile) {
      setSelectedFile(renamedFile);
    }
    canvas?.updateNodeData(fileId, (node) => ({
      file: {
        ...node.data.file,
        name,
        localizedNames: undefined,
      },
    }));
  }, [canvas, pushHistory, selectedFile]);

  const deleteDesktopFile = useCallback((fileId: string) => {
    if (!selectedFile?.deletable) return;
    pushHistory();
    setSelectedFile(null);
    canvas?.deleteElements({ nodes: [{ id: fileId }] });
  }, [canvas, pushHistory, selectedFile?.deletable]);

  const clearDesktopFileRuntime = useCallback((file: DesktopFile) => {
    if (file.type !== 'nbp') return false;

    clearNeuralBlueprintGraph(file.id);
    clearKnowledgeGraphSession(file.id);
    clearTrainingCurves(file.id);
    return true;
  }, []);

  const resetDesktopFileStorage = useCallback((file: DesktopFile) => {
    if (clearDesktopFileRuntime(file)) {
      updateDesktopFile(file.id, (desktopFile) => ({
        ...desktopFile,
        completed: false,
        guideCompletedStepCount: 0,
      }));
      setSelectedFile((current) => (
        current?.id === file.id
          ? { ...current, completed: false, guideCompletedStepCount: 0 }
          : current
      ));
      const currentNodes = canvas?.getNodes() ?? [];
      const nextFiles = currentNodes.map((node) => (
        node.id === file.id
          ? {
            ...node.data.file,
            completed: false,
            guideCompletedStepCount: 0,
          }
          : node.data.file
      ));
      canvas?.setNodes(currentNodes.map((node, index) => ({
        ...node,
        hidden: !isDesktopFileVisible(nextFiles[index], nextFiles),
        data: {
          ...node.data,
          file: nextFiles[index],
        },
      })));
      showSaveNotice('File storage reset');
      return;
    }

    showSaveNotice('No stored data for this file type');
  }, [canvas, clearDesktopFileRuntime, showSaveNotice]);

  const resetAllFiles = useCallback(() => {
    const files = new Map<string, DesktopFile>();
    loadDesktopFiles().forEach((file) => files.set(file.id, file));
    canvas?.getNodes().forEach((node) => files.set(node.data.file.id, node.data.file));
    INITIAL_DESKTOP_FILES.forEach((file) => files.set(file.id, file));
    files.forEach(clearDesktopFileRuntime);

    pushHistory();
    clearDesktopWorkspace();
    const initialNodes = toDesktopNodes(INITIAL_DESKTOP_FILES);
    canvas?.setNodes(initialNodes);
    void canvas?.setViewport(INITIAL_DESKTOP_VIEWPORT, { duration: 300 });
    setSelectedFile(null);
    showSaveNotice('All files reset');
  }, [canvas, clearDesktopFileRuntime, pushHistory, showSaveNotice]);

  const undo = useCallback(() => {
    const previousNodes = historyRef.current.at(-1);
    if (!previousNodes) return;

    historyRef.current = historyRef.current.slice(0, -1);
    canvas?.setNodes(previousNodes);
    setSelectedFile(previousNodes.find((node) => node.selected)?.data.file ?? null);
  }, [canvas]);

  const resetDesktopFilePositions = useCallback(() => {
    if (!canvas) return;

    const initialPositions = new Map(
      INITIAL_DESKTOP_FILES.map((file) => [
        file.id,
        toDesktopFlowPosition(file.position),
      ]),
    );
    const initialFiles = new Map(
      INITIAL_DESKTOP_FILES.map((file) => [file.id, file]),
    );

    const startNodes = canvas.getNodes();
    const targetNodes = startNodes.map((node) => {
      const position = initialPositions.get(node.id);
      if (!position) return node;
      const file = initialFiles.get(node.id);

      const nextPosition = { ...position };
      return {
        ...node,
        position: nextPosition,
        data: {
          ...node.data,
          file: {
            ...node.data.file,
            position: file?.position ?? node.data.file.position,
          },
        },
      };
    });
    const targetResetNodes = targetNodes.filter((node) => (
      initialPositions.has(node.id) && !node.hidden
    ));
    if (targetResetNodes.length === 0) return;

    if (resetAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(resetAnimationFrameRef.current);
    }

    const duration = 300;
    const padding = 0.2;
    const startedAt = performance.now();
    const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

    pushHistory();
    void canvas.fitBounds(getNodesBounds(targetResetNodes), {
      padding,
      duration,
      ease: easeOutCubic,
    });

    const setInterpolatedNodes = (progress: number) => {
      const easedProgress = easeOutCubic(progress);
      const nextNodes = startNodes.map((node) => {
        const targetPosition = initialPositions.get(node.id);
        if (!targetPosition) return node;
        const initialFile = initialFiles.get(node.id);

        const nextPosition = {
          x: node.position.x + (targetPosition.x - node.position.x) * easedProgress,
          y: node.position.y + (targetPosition.y - node.position.y) * easedProgress,
        };

        return {
          ...node,
          position: nextPosition,
          data: {
            ...node.data,
            file: {
              ...node.data.file,
              position: initialFile?.position ?? node.data.file.position,
            },
          },
        };
      });

      canvas.setNodes(nextNodes);
      return nextNodes;
    };

    const commitFinalNodes = () => {
      canvas.setNodes(targetNodes);
      setSelectedFile(targetNodes.find((node) => node.selected)?.data.file ?? null);
      saveDesktopFiles(targetNodes);
      resetAnimationFrameRef.current = null;
    };

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      if (progress >= 1) {
        commitFinalNodes();
        return;
      }

      setInterpolatedNodes(progress);
      resetAnimationFrameRef.current = window.requestAnimationFrame(animate);
    };

    resetAnimationFrameRef.current = window.requestAnimationFrame(animate);
  }, [canvas, pushHistory]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  useEffect(() => () => {
    if (saveNoticeTimerRef.current !== null) {
      window.clearTimeout(saveNoticeTimerRef.current);
    }
    if (resetAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(resetAnimationFrameRef.current);
    }
  }, []);

  return (
    <ReactFlowProvider>
      <div className="workspace">
        <header className="top-bar">
          <div className="desktop-title">Neural BluePrint</div>
        </header>

        <DesktopLeftPanel
          onOpenSettings={() => setSettingsOpen(true)}
          onResetPositions={resetDesktopFilePositions}
        />

        <DesktopCanvasInner
          initFiles={initFiles}
          initViewport={initViewport}
          onOpenFile={handleOpenFile}
          showSaveNotice={showSaveNotice}
          pushHistory={pushHistory}
          setCanvas={setCanvas}
          setSelectedFile={setSelectedFile}
        />

        <DesktopRightPanel
          selectedFile={selectedFile}
          onRenameFile={renameDesktopFile}
          onDeleteFile={deleteDesktopFile}
          onResetFile={resetDesktopFileStorage}
        />

        <div className={`desktop-save-toast ${saveNotice ? 'visible' : ''}`}>
          {saveNotice}
        </div>

        {settingsOpen && (
          <DesktopSettingsDialog
            onClose={() => setSettingsOpen(false)}
            onExit={exitApp}
            onResetAllFiles={resetAllFiles}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}
