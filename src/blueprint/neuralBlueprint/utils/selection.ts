import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ModuleBaseNode, ModuleNodeData } from '../ModuleBaseNodeTypes';

export function syncSelectedNode(
  nodes: ModuleBaseNode[],
  selectedNodeIdRef: MutableRefObject<string | null>,
  setSelectedNode: Dispatch<SetStateAction<ModuleNodeData | null>>,
) {
  const selectedNode = nodes.find((node) => node.id === selectedNodeIdRef.current)
    ?? nodes.find((node) => node.selected);
  if (selectedNode) {
    selectedNodeIdRef.current = selectedNode.id;
    setSelectedNode(selectedNode.data);
  }
}
