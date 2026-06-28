import {
  getNodesBounds,
  ReactFlowProvider,
  type Edge,
  type ReactFlowInstance,
  type Viewport,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useRef, useState } from 'react';

import { loadDesktopFiles, loadDesktopView, saveDesktopFiles, saveDesktopView } from '../dataStorage/desktopStorage';
import { clearKnowledgeGraphSession } from '../dataStorage/knowledgeGraphStorage';
import { clearNeuralBlueprintGraph } from '../dataStorage/neuralBlueprintStorage';
import type { FileWorkspaceType, OpenFileType } from '../dataStorage/systemType';
import { clearTrainingCurves } from '../dataStorage/trainingCurveStorage';
import { INITIAL_DESKTOP_FILES } from '../taskData/desktopDefaults';
import { DesktopCanvasInner } from './DesktopCanvasInner';
import { DesktopLeftPanel } from './leftPanel';
import { DesktopRightPanel } from './rightPanel';
import type { DesktopFile, DesktopIconNodeType } from './desktopTypes';

interface DesktopCanvasProp {
  openFile: OpenFileType;
}

export function DesktopCanvas({ openFile }: DesktopCanvasProp) {
  const [selectedFile, setSelectedFile] = useState<DesktopFile | null>(null);
  const [saveNotice, setSaveNotice] = useState('');
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
      ? { ...selectedFile, name }
      : null;
    if (renamedFile) {
      setSelectedFile(renamedFile);
    }
    canvas?.updateNodeData(fileId, (node) => ({
      file: {
        ...node.data.file,
        name,
      },
    }));
  }, [canvas, pushHistory, selectedFile]);

  const deleteDesktopFile = useCallback((fileId: string) => {
    if (!selectedFile?.deletable) return;
    pushHistory();
    setSelectedFile(null);
    canvas?.deleteElements({ nodes: [{ id: fileId }] });
  }, [canvas, pushHistory, selectedFile?.deletable]);

  const resetDesktopFileStorage = useCallback((file: DesktopFile) => {
    if (file.type === 'nbp') {
      clearNeuralBlueprintGraph(file.id);
      clearKnowledgeGraphSession(file.id);
      clearTrainingCurves(file.id);
      showSaveNotice('File storage reset');
      return;
    }

    showSaveNotice('No stored data for this file type');
  }, [showSaveNotice]);

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
      INITIAL_DESKTOP_FILES.map((file) => [file.id, file.position]),
    );

    const startNodes = canvas.getNodes();
    const targetNodes = startNodes.map((node) => {
      const position = initialPositions.get(node.id);
      if (!position) return node;

      const nextPosition = { ...position };
      return {
        ...node,
        position: nextPosition,
        data: {
          ...node.data,
          file: {
            ...node.data.file,
            position: nextPosition,
          },
        },
      };
    });
    const targetResetNodes = targetNodes.filter((node) => initialPositions.has(node.id));
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
              position: nextPosition,
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

        <DesktopLeftPanel onResetPositions={resetDesktopFilePositions} />

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
      </div>
    </ReactFlowProvider>
  );
}
