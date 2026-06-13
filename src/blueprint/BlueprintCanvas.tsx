import { ReactFlowProvider } from "@xyflow/react";
import type { CloseFileType } from "../dataStorage/systemType";
import { BlueprintTopBarTabs } from "./topBarTabs";
import { NeuralBlueprintWorkspace } from "./neuralBlueprint/NeuralBlueprintWorkspace";


interface BlueprintCanvasProp {
  fileId: string;
  closeFile: CloseFileType;
}
export function BlueprintCanvas({ fileId, closeFile }: BlueprintCanvasProp) {
  return (
    <ReactFlowProvider>
      <div className="workspace">
        <header className="top-bar">
          <button className="close-button" onClick={closeFile} />
          <BlueprintTopBarTabs />
          <div className="title">Neural BluePrint</div>
        </header>

        <NeuralBlueprintWorkspace fileId={fileId} />
      </div>
    </ReactFlowProvider>
  );
}
