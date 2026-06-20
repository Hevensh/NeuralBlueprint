import type {
  KnowledgeEntity,
  KnowledgeGraph,
  MasterGraph,
} from './types';

export function getTrainingEntities(graph: KnowledgeGraph): KnowledgeEntity[] {
  return [
    ...Object.values(graph.nodes),
    ...graph.depEdges,
    ...graph.subEdges,
    ...graph.interEdges,
  ];
}

export function readEntityMemory(
  master: MasterGraph,
  entity: KnowledgeEntity,
): number {
  if (entity.kind === 'node') return master.nodes[entity.id]?.memory ?? 0;
  return master.edges[entity.id]?.memory ?? 0;
}

export function writeEntityMemory(
  master: MasterGraph,
  entity: KnowledgeEntity,
  memory: number,
) {
  const nextMemory = Math.max(0, memory);
  if (entity.kind === 'node') {
    master.nodes[entity.id] = { ...master.nodes[entity.id], memory: nextMemory };
  } else {
    master.edges[entity.id] = { ...master.edges[entity.id], memory: nextMemory };
  }
}

export function totalAllocatedMemory(master: MasterGraph): number {
  return [
    master.nodes,
    master.edges,
  ].reduce(
    (total, entities) => total
      + Object.values(entities).reduce((sum, entity) => sum + entity.memory, 0),
    0,
  );
}

export function clearAllocatedMemory(
  master: MasterGraph,
  entities: KnowledgeEntity[],
) {
  entities.forEach((entity) => writeEntityMemory(master, entity, 0));
}

export function entityRequiredMemory(entity: KnowledgeEntity) {
  return entity.kind === 'node'
    ? entity.requiredMemory
    : entity.stats.requiredMemory;
}
