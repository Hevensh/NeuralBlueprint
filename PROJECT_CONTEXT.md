# NeuralBlueprint Project Context

## Project Stack

- Vite + React + TypeScript.
- Main canvas library: `@xyflow/react`.
- App entry: `src/App.tsx`.
- Global style entry: `src/style.css`.

## Current Source Layout

```text
src/
├─ App.tsx
├─ main.tsx
├─ style.css
├─ canvas.css
├─ buttons.css
├─ modules.css
├─ dataStorage/
├─ desktop/
└─ blueprint/
```

## Desktop Area

Desktop files live in:

```text
src/desktop/
├─ DesktopCanvas.tsx
├─ DesktopCanvasInner.tsx
├─ DesktopIconNode.tsx
├─ desktopTypes.ts
├─ desktop.css
├─ fileNames.ts
├─ leftPanel.tsx
└─ rightPanel.tsx
```

### Desktop Responsibilities

`DesktopCanvas.tsx` is the outer shell:

- Owns `selectedFile`.
- Owns `saveNotice`.
- Owns `historyRef` for undo.
- Owns the current React Flow `canvas` instance.
- Saves current desktop state before opening a file.
- Handles file rename, file delete, undo, and fit view.

`DesktopCanvasInner.tsx` owns React Flow node behavior:

- Builds desktop nodes.
- Owns React Flow nodes state via `useNodesState`.
- Handles drag-and-drop file creation.
- Handles node click, node drag start, pane click, and node double click.
- Saves files and viewport on a delayed timer.

Node data is intentionally small:

```ts
export interface DesktopIconData extends Record<string, unknown> {
  file: DesktopFile;
}
```

Do not store callback functions such as `onOpenFile` in node data. Opening files is handled through React Flow:

```tsx
onNodeDoubleClick={(_, node) => onOpenFile(node.data.file)}
```

This avoids stale closures when returning to the desktop after opening and closing a file.

### Desktop File Model

```ts
export type DesktopFileType = 'nbp' | 'rep';

export interface DesktopFile {
  id: string;
  name: string;
  type: DesktopFileType;
  deletable: boolean;
  position: {
    x: number;
    y: number;
  };
}
```

`name` is stored without a file extension. `type` carries the file type.

Default desktop files are defined in `src/dataStorage/desktopStorage.ts`:

- `Experimental Blueprint`
- `Experimental Report`

Both default files use `deletable: false`. Drag-created files use `deletable: true`.

### Desktop Interactions

- Left panel title: `Available Files`.
- Left panel can drag-create:
  - `Blueprint`
  - `Report`
- Left panel has a `Center View` button.
- Right panel shows the selected file:
  - editable `Name`
  - `Type`
  - `Delete` button below properties
- `Delete` key deletes selected deletable nodes.
- `Backspace` does not delete nodes.
- Delete button is disabled for non-deletable files.
- `Ctrl+Z` restores previous nodes from `historyRef`.

Undo uses:

```ts
historyRef.current = [...historyRef.current, canvas?.getNodes() ?? []];
canvas?.setNodes(previousNodes);
```

## Storage

Storage is abstracted through:

```text
src/dataStorage/storageAdapter.ts
```

Current adapter still uses `window.localStorage`, but storage callers use `appStorage` instead of touching `window.localStorage` directly.

Files using the adapter:

- `src/dataStorage/desktopStorage.ts`
- `src/dataStorage/workspaceStorage.ts`

Future storage changes should happen mostly inside `storageAdapter.ts`.

## Blueprint Area

Blueprint files live in:

```text
src/blueprint/
├─ BlueprintCanvas.tsx
├─ networkNodeTypes.ts
├─ topBarTabs.tsx
├─ neuralBlueprint/
│  ├─ NeuralBlueprintNode.tsx
│  ├─ NeuralBlueprintNodeTypes.ts
│  └─ NeuralBlueprintNode.css
├─ knowledgeGraph/
│  ├─ KnowledgeGraphNode.tsx
│  ├─ KnowledgeGraphNodeTypes.ts
│  └─ KnowledgeGraphNode.css
└─ trainingProcess/
   ├─ TrainingProcessNode.tsx
   ├─ TrainingProcessNodeTypes.ts
   └─ TrainingProcessNode.css
```

The three blueprint subdirectories are module/page folders, not just node folders. Future module-specific interactions should also live inside the corresponding folder.

`top-bar-tabs` is extracted into:

```text
src/blueprint/topBarTabs.tsx
```

`BlueprintCanvas.tsx` currently registers these node types:

- `neuralBlueprint`
- `knowledgeGraph`
- `trainingProcess`

`networkNodeTypes.ts` is the shared type entry for blueprint nodes.

## Current Build Status

The latest checked command passed:

```powershell
npm.cmd run build
```

