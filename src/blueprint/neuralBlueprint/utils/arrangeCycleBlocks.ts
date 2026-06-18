import type { ModuleBaseNode } from '../ModuleBaseNodeTypes';

export interface ArrangeNodeBlock {
  id: string;
  node: ModuleBaseNode;
  members: ModuleBaseNode[];
  columnWidth: number;
  heightUnits: number;
}

export interface ArrangeCyclePreprocessResult {
  layoutNodes: ModuleBaseNode[];
  blockById: Map<string, ArrangeNodeBlock>;
  blockByMemberId: Map<string, ArrangeNodeBlock>;
}

export function preprocessArrangeCycleBlocks(
  nodes: ModuleBaseNode[],
): ArrangeCyclePreprocessResult {
  const components = collectStronglyConnectedComponents(nodes);
  const blockByMemberId = new Map<string, ArrangeNodeBlock>();
  const blocks = components.map((members) => {
    const orderedMembers = [...members].sort(compareNodePosition);
    const isCycle = orderedMembers.length > 1 || hasSelfLoop(orderedMembers[0]);
    const columnWidth = isCycle ? Math.max(1, Math.round(Math.sqrt(orderedMembers.length))) : 1;
    const heightUnits = isCycle
      ? Math.ceil(orderedMembers.length / columnWidth) * 2
      : 2;
    const id = isCycle ? `cycle:${orderedMembers[0].id}` : orderedMembers[0].id;
    const representative = orderedMembers[0];
    const node: ModuleBaseNode = {
      ...representative,
      id,
      data: {
        ...representative.data,
        id,
        name: isCycle ? `Cycle (${orderedMembers.length})` : representative.data.name,
        predecessors: [],
        successors: [],
        inCycle: isCycle,
      },
    };
    const block: ArrangeNodeBlock = {
      id,
      node,
      members: orderedMembers,
      columnWidth,
      heightUnits,
    };

    orderedMembers.forEach((member) => {
      blockByMemberId.set(member.id, block);
    });

    return block;
  });

  const blockById = new Map(blocks.map((block) => [block.id, block]));

  blocks.forEach((block) => {
    const predecessorIds = new Set<string>();
    const successorIds = new Set<string>();

    block.members.forEach((member) => {
      member.data.predecessors.forEach((predecessor) => {
        const predecessorBlock = blockByMemberId.get(predecessor.id);
        if (predecessorBlock && predecessorBlock.id !== block.id) {
          predecessorIds.add(predecessorBlock.id);
        }
      });
      member.data.successors.forEach((successor) => {
        const successorBlock = blockByMemberId.get(successor.id);
        if (successorBlock && successorBlock.id !== block.id) {
          successorIds.add(successorBlock.id);
        }
      });
    });

    block.node.data.predecessors = [...predecessorIds].map((id) => blockById.get(id)!.node.data);
    block.node.data.successors = [...successorIds].map((id) => blockById.get(id)!.node.data);
  });

  assignBlockTopologyOrders(blocks, blockById);

  return {
    layoutNodes: blocks.map((block) => block.node),
    blockById,
    blockByMemberId,
  };
}

function collectStronglyConnectedComponents(nodes: ModuleBaseNode[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const indexById = new Map<string, number>();
  const lowLinkById = new Map<string, number>();
  const stack: ModuleBaseNode[] = [];
  const stackedIds = new Set<string>();
  const components: ModuleBaseNode[][] = [];
  let nextIndex = 0;

  function visit(node: ModuleBaseNode) {
    indexById.set(node.id, nextIndex);
    lowLinkById.set(node.id, nextIndex);
    nextIndex += 1;
    stack.push(node);
    stackedIds.add(node.id);

    node.data.successors.forEach((successorData) => {
      const successor = nodeById.get(successorData.id);
      if (!successor) return;

      if (!indexById.has(successor.id)) {
        visit(successor);
        lowLinkById.set(
          node.id,
          Math.min(lowLinkById.get(node.id)!, lowLinkById.get(successor.id)!),
        );
      } else if (stackedIds.has(successor.id)) {
        lowLinkById.set(
          node.id,
          Math.min(lowLinkById.get(node.id)!, indexById.get(successor.id)!),
        );
      }
    });

    if (lowLinkById.get(node.id) !== indexById.get(node.id)) return;

    const component: ModuleBaseNode[] = [];
    let member: ModuleBaseNode;

    do {
      member = stack.pop()!;
      stackedIds.delete(member.id);
      component.push(member);
    } while (member.id !== node.id);

    components.push(component);
  }

  nodes.forEach((node) => {
    if (!indexById.has(node.id)) visit(node);
  });

  return components;
}

function assignBlockTopologyOrders(
  blocks: ArrangeNodeBlock[],
  blockById: Map<string, ArrangeNodeBlock>,
) {
  const forwardOrders = new Map<string, number>();
  const backwardOrders = new Map<string, number>();

  function getForwardOrder(block: ArrangeNodeBlock): number {
    const cached = forwardOrders.get(block.id);
    if (cached !== undefined) return cached;

    const order = block.node.data.predecessors.reduce((maximum, predecessor) => {
      const predecessorBlock = blockById.get(predecessor.id)!;
      return Math.max(
        maximum,
        getForwardOrder(predecessorBlock) + predecessorBlock.columnWidth,
      );
    }, 0);

    forwardOrders.set(block.id, order);
    return order;
  }

  function getBackwardOrder(block: ArrangeNodeBlock): number {
    const cached = backwardOrders.get(block.id);
    if (cached !== undefined) return cached;

    const order = block.node.data.successors.reduce((maximum, successor) => {
      const successorBlock = blockById.get(successor.id)!;
      return Math.max(
        maximum,
        getBackwardOrder(successorBlock) + successorBlock.columnWidth,
      );
    }, 0);

    backwardOrders.set(block.id, order);
    return order;
  }

  blocks.forEach((block) => {
    block.node.data.forwardTopologyOrder = getForwardOrder(block);
    block.node.data.backwardTopologyOrder = getBackwardOrder(block);
  });
}

function hasSelfLoop(node: ModuleBaseNode) {
  return node.data.successors.some((successor) => successor.id === node.id);
}

function compareNodePosition(left: ModuleBaseNode, right: ModuleBaseNode) {
  return left.position.y - right.position.y
    || left.position.x - right.position.x
    || left.id.localeCompare(right.id);
}
