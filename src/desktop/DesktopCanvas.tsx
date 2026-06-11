import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  useViewport,
  type Edge,
  type NodeChange,
  type ReactFlowInstance,
  type Viewport,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { DesktopFile, DesktopFileType, DesktopIconNodeType } from './desktopTypes';
import { DesktopIconNode } from './DesktopIconNode';
import { loadDesktopView, saveDesktopView, loadDesktopFiles, saveDesktopFiles } from '../dataStorage/desktopStorage';
import type { setPageStatesType } from '../dataStorage/systemType';


const nodeTypes = {
  desktopIcon: DesktopIconNode,
};

function toDesktopNode(
  file: DesktopFile,
  onOpenFile: (file: DesktopFile) => void,
): DesktopIconNodeType {
  return {
    id: file.id,
    type: 'desktopIcon',
    position: file.position,
    data: {
      file,
      onOpenFile,
    },
    draggable: true,
    selectable: true,
  };
}


interface DesktopCanvasInnerProp {
  initFiles: DesktopIconNodeType[];
  setCanvas: React.Dispatch<React.SetStateAction<ReactFlowInstance<DesktopIconNodeType, Edge> | null>>;
  initViewport: Viewport;
}
function DesktopCanvasInner(
  { initFiles, setCanvas, initViewport }: DesktopCanvasInnerProp) {

  // const createDesktopFile = (type: DesktopFileType) => {
  //   if (!contextMenu) return;

  //   const id = `${type}_${Date.now()}`;

  //   const nextFile: DesktopFile = {
  //     id,
  //     type,
  //     name:
  //       type === 'nbp'
  //         ? 'Untitled Blueprint'
  //         : type === 'rep'
  //           ? 'Untitled Report'
  //           : 'New Folder',
  //     position: {
  //       x: contextMenu.flowX,
  //       y: contextMenu.flowY,
  //     },
  //   };

  //   const nextNode = toDesktopNode(
  //     nextFile,
  //     handleOpenFile,
  //   );

  //   setNodes((currentNodes) => [...currentNodes, nextNode]);
  // };
  // const deleteDesktopFile = (file: DesktopFile) => {
  //   setNodes((currentNodes) =>
  //     currentNodes.filter((node) => node.id !== file.id),
  //   );
  // };

  // import nodes state

  const [nodes, setNodes, onNodesChange] = useNodesState<DesktopIconNodeType>(initFiles);
  const handleNodesChange = (changes: NodeChange<DesktopIconNodeType>[]) => {
    onNodesChange(changes);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveDesktopFiles(nodes);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [nodes]);

  const viewport = useViewport();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveDesktopView(viewport);
    }, 500);
    return () => window.clearTimeout(timer);
  })

  return (
    <div className="canvas-wrap">
      <ReactFlow<DesktopIconNodeType>
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onInit={setCanvas}

        defaultViewport={initViewport}
        nodesDraggable
        nodesConnectable={false}

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

interface DesktopCanvasProp {
  setPage: setPageStatesType;
}
export function DesktopCanvas({ setPage }: DesktopCanvasProp) {
  // init nodes;
  const handleOpenFile = useCallback((file: DesktopFile) => {
    console.log('open file:', file);
    setPage(file.type == 'nbp' ? 'blueprint' : 'report');
  }, [setPage]);
  const [initFiles, ] = useState<DesktopIconNodeType[]>(()=>loadDesktopFiles().map((file) => toDesktopNode(file, handleOpenFile)));
  const [initViewport, ] = useState<Viewport>(loadDesktopView);


  const fitView = () => {
    canvas?.fitView({
      padding: 0.2,
      duration: 300,
    });
  }

  // init canvas
  const [canvas, setCanvas] =
    useState<ReactFlowInstance<DesktopIconNodeType, Edge> | null>(null);

  return (
    <ReactFlowProvider>
      <div className="workspace">
        <header className="top-bar">
          <button className="action-button" onClick={() => fitView()}> fitView </button>
          <div className="desktop-title">Neural BluePrint</div>
        </header>

        <aside className="left-panel">
          <div className="title">Modules</div>
        </aside>

        <DesktopCanvasInner initFiles={initFiles} setCanvas={setCanvas} initViewport={initViewport} />

        <aside className="right-panel">
          <div className="title">Properties</div>
        </aside>
      </div>
    </ReactFlowProvider>
  );
}
