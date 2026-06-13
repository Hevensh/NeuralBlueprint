import {
  ReactFlowProvider,
  type Edge,
  type ReactFlowInstance,
  type Viewport,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useRef, useState } from 'react';

import { loadDesktopFiles, loadDesktopView, saveDesktopFiles, saveDesktopView } from '../dataStorage/desktopStorage';
import type { FileWorkspaceType, OpenFileType } from '../dataStorage/systemType';
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
    openFile(workspace, file.id);
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

  const undo = useCallback(() => {
    const previousNodes = historyRef.current.at(-1);
    if (!previousNodes) return;

    historyRef.current = historyRef.current.slice(0, -1);
    canvas?.setNodes(previousNodes);
    setSelectedFile(previousNodes.find((node) => node.selected)?.data.file ?? null);
  }, [canvas]);

  const fitView = () => {
    canvas?.fitView({
      padding: 0.2,
      duration: 300,
    });
  };

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
  }, []);

  return (
    <ReactFlowProvider>
      <div className="workspace">
        <header className="top-bar">
          <div className="desktop-title">Neural BluePrint</div>
        </header>

        <DesktopLeftPanel onFitView={fitView} />

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
        />

        <div className={`desktop-save-toast ${saveNotice ? 'visible' : ''}`}>
          {saveNotice}
        </div>
      </div>
    </ReactFlowProvider>
  );
}
