import {
  Background,
  ReactFlow,
  useNodesState,
  useReactFlow,
  useViewport,
  type Edge,
  type NodeChange,
  type ReactFlowInstance,
  type Viewport,
} from '@xyflow/react';

import { type Dispatch, type DragEvent, type SetStateAction, useCallback, useEffect, useState } from 'react';

import { saveDesktopFiles, saveDesktopView } from '../dataStorage/desktopStorage';
import {
  toDesktopGridPosition,
  toDesktopNode,
  toDesktopNodes,
} from './desktopFileLayout';
import { DesktopIconNode } from './DesktopIconNode';
import { DESKTOP_FILE_DRAG_TYPE } from './leftPanel';
import type { DesktopFile, DesktopFileType, DesktopIconNodeType } from './desktopTypes';

const nodeTypes = {
  desktopIcon: DesktopIconNode,
};

function getDefaultFileName(type: DesktopFileType) {
  return type === 'nbp' ? 'Untitled Blueprint' : 'Untitled Report';
}

function isDesktopFileType(type: string): type is DesktopFileType {
  return type === 'nbp' || type === 'rep';
}

interface DesktopCanvasInnerProp {
  initFiles: DesktopFile[];
  initViewport: Viewport;
  onOpenFile: (file: DesktopFile) => void;
  showSaveNotice: (message: string) => void;
  pushHistory: () => void;
  setCanvas: Dispatch<SetStateAction<ReactFlowInstance<DesktopIconNodeType, Edge> | null>>;
  setSelectedFile: Dispatch<SetStateAction<DesktopFile | null>>;
}

export function DesktopCanvasInner({
  initFiles,
  initViewport,
  onOpenFile,
  showSaveNotice,
  pushHistory,
  setCanvas,
  setSelectedFile,
}: DesktopCanvasInnerProp) {
  const { screenToFlowPosition } = useReactFlow<DesktopIconNodeType, Edge>();
  const [initNodes] = useState<DesktopIconNodeType[]>(
    () => toDesktopNodes(initFiles),
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<DesktopIconNodeType>(initNodes);

  const handleNodesChange = useCallback((changes: NodeChange<DesktopIconNodeType>[]) => {
    if (changes.some((change) => change.type === 'remove')) {
      pushHistory();
      setSelectedFile(null);
    }
    onNodesChange(changes);
  }, [onNodesChange, pushHistory, setSelectedFile]);

  const createDesktopFile = useCallback((type: DesktopFileType, position: { x: number; y: number }) => {
    pushHistory();
    const nextFile: DesktopFile = {
      id: `${type}_${Date.now()}`,
      name: getDefaultFileName(type),
      type,
      deletable: true,
      completed: false,
      visible: true,
      dependencyFileIds: [],
      position: toDesktopGridPosition({
        x: position.x - 50,
        y: position.y - 80,
      }),
    };

    setSelectedFile(nextFile);
    setNodes((currentNodes) => [
      ...currentNodes.map((node) => ({ ...node, selected: false })),
      {
        ...toDesktopNode(nextFile),
        selected: true,
      },
    ]);
  }, [pushHistory, setNodes, setSelectedFile]);

  const selectNode = useCallback((node: DesktopIconNodeType) => {
    setSelectedFile(node.data.file);
  }, [setSelectedFile]);

  const startNodeDrag = useCallback((node: DesktopIconNodeType) => {
    pushHistory();
    selectNode(node);
  }, [pushHistory, selectNode]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const type = event.dataTransfer.getData(DESKTOP_FILE_DRAG_TYPE);
    if (!isDesktopFileType(type)) return;

    createDesktopFile(
      type,
      screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }),
    );
  }, [createDesktopFile, screenToFlowPosition]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveDesktopFiles(nodes);
      showSaveNotice('File status saved');
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [nodes, showSaveNotice]);

  const viewport = useViewport();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveDesktopView(viewport);
      showSaveNotice('View saved');
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [showSaveNotice, viewport]);

  return (
    <div className="canvas-wrap" onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow<DesktopIconNodeType>
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onNodeClick={(_, node) => selectNode(node)}
        onNodeDoubleClick={(_, node) => onOpenFile(node.data.file)}
        onNodeDragStart={(_, node) => startNodeDrag(node)}
        onPaneClick={() => setSelectedFile(null)}
        onInit={setCanvas}
        defaultViewport={initViewport}
        nodesDraggable
        nodesConnectable={false}
        deleteKeyCode="Delete"
        elementsSelectable
        selectionOnDrag
        fitView={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
