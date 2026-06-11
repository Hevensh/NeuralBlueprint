import type { setPageStatesType } from "../dataStorage/systemType";
import { Background, ReactFlow, ReactFlowProvider, type Edge, type ReactFlowInstance } from "@xyflow/react";
import type { ModuleNodeType } from "./networkNodeTypes";
import { ModuleNode } from "./NetworkNode";
import { useState } from "react";

const nodeTypes = {
  moduleNode: ModuleNode,
};

interface BlueprintCanvasInnerProp {
}
export function BlueprintCanvasInner({ }: BlueprintCanvasInnerProp) {
  // init canvas
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance<ModuleNodeType, Edge> | null>(null);
  return (
    <div className="canvas-wrap">
      <ReactFlow<ModuleNodeType>
        nodes={[]}
        edges={[]}
        nodeTypes={nodeTypes}
        // onNodesChange={handleNodesChange}
        onInit={setReactFlowInstance}

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


interface BlueprintCanvasProp {
  setPage: setPageStatesType;
}
export function BlueprintCanvas({ setPage }: BlueprintCanvasProp) {
  return (
    <ReactFlowProvider>
      <div className="workspace">
        <header className="top-bar">
          <button className="close-button" onClick={() => setPage('desktop')} />
          <div className="top-bar-tabs">
            <button className="top-bar-tab active">Blueprint</button>
            <button className="top-bar-tab">Knowledge</button>
            <button className="top-bar-tab">Training</button>
          </div>
          <div className="title">Neural BluePrint</div>
        </header>

        <aside className="left-panel">
          <div className="title">Modules</div>
        </aside>

        <BlueprintCanvasInner />

        <aside className="right-panel">
          <button className="toggle-button" onClick={() => console.log('clicked')}> fitView </button>
          <button className="toggle-button active" onClick={() => console.log('clicked')}> fitView </button>
          <div className="title">Properties</div>
        </aside>
      </div>
    </ReactFlowProvider>
  );
}