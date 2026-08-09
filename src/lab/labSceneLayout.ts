import { createSeededRandom, shuffleWith } from './labRandom';
import type { LabWorkstationLayoutConfig } from './labTypes';

export const LAB_ROOM_WIDTH = 24;
export const LAB_ROOM_DEPTH = 16;
export const LAB_WORKSTATION_SIZE = 3;

export interface LabGridPoint {
  x: number;
  y: number;
}

export type LabWorkstationOrientation = 'x' | 'y';

export interface LabWorkstationPlacement extends LabGridPoint {
  workstationId: string;
  groupId: string;
  indexInGroup: number;
  groupLength: number;
  orientation: LabWorkstationOrientation;
}

export interface LabFurniturePlacement extends LabGridPoint {
  orientation: LabWorkstationOrientation;
}

export interface LabSceneLayout {
  workstations: LabWorkstationPlacement[];
  whiteboard: LabFurniturePlacement;
  bookshelf: LabFurniturePlacement;
  servers: LabFurniturePlacement[];
  trainingCapacity: number;
}

interface WorkstationGroupCandidate {
  orientation: LabWorkstationOrientation;
  workstationOrigins: LabGridPoint[];
  occupiedTiles: LabGridPoint[];
}

interface FurnitureCandidate {
  placement: LabFurniturePlacement;
  occupiedTiles: LabGridPoint[];
}

interface ServerGroupCandidate {
  placements: LabFurniturePlacement[];
  occupiedTiles: LabGridPoint[];
}

export function createLabSceneLayout(
  seed: string,
  config: LabWorkstationLayoutConfig,
): LabSceneLayout {
  const random = createSeededRandom(`${seed}:scene`);
  const groupLengths = pickGroupLengths(config, random);
  const groups = placeGroups(groupLengths, random);
  const occupied = groups.flatMap((group) => group.occupiedTiles);
  const serverCount = 2 + Math.floor(random() * 3);
  const servers = pickServerGroup(
    createServerGroupCandidates(serverCount),
    occupied,
    random,
  );
  const whiteboard = pickFurniture(
    createEdgeCandidates(4),
    [...occupied, ...servers.occupiedTiles],
    random,
  );
  const bookshelf = pickFurniture(
    createEdgeCandidates(2),
    [...occupied, ...servers.occupiedTiles, ...whiteboard.occupiedTiles],
    random,
  );

  let workstationIndex = 0;
  return {
    workstations: groups.flatMap((group, groupIndex) => (
      group.workstationOrigins.map((origin, indexInGroup) => ({
        ...origin,
        workstationId: `workstation-${workstationIndex += 1}`,
        groupId: `workstation-group-${groupIndex + 1}`,
        indexInGroup,
        groupLength: group.workstationOrigins.length,
        orientation: group.orientation,
      }))
    )),
    whiteboard: whiteboard.placement,
    bookshelf: bookshelf.placement,
    servers: servers.placements,
    trainingCapacity: servers.placements.length,
  };
}

function pickGroupLengths(
  config: LabWorkstationLayoutConfig,
  random: () => number,
) {
  const lengths = [...new Set(config.allowedGroupLengths)]
    .filter((length) => Number.isInteger(length) && length > 0)
    .sort((first, second) => second - first);
  const combinations = createLengthCombinations(
    lengths,
    config.minTotalWorkstations,
    config.maxTotalWorkstations,
  );
  const targetTotals = [...new Set(combinations.map((values) => sum(values)))];
  const target = targetTotals[Math.floor(random() * targetTotals.length)];
  const candidates = combinations.filter((values) => sum(values) === target);
  return candidates[Math.floor(random() * candidates.length)];
}

function createLengthCombinations(
  lengths: number[],
  minimum: number,
  maximum: number,
) {
  const combinations: number[][] = [];

  const visit = (start: number, current: number[], total: number) => {
    if (total >= minimum) combinations.push(current);
    for (let index = start; index < lengths.length; index += 1) {
      const length = lengths[index];
      if (total + length <= maximum) {
        visit(index, [...current, length], total + length);
      }
    }
  };

  visit(0, [], 0);
  if (combinations.length === 0) {
    throw new Error('Lab workstation layout has no valid group combination.');
  }
  return combinations;
}

function placeGroups(lengths: number[], random: () => number) {
  const placed: WorkstationGroupCandidate[] = [];

  const visit = (index: number): boolean => {
    if (index === lengths.length) return true;
    const candidates = shuffleWith(createGroupCandidates(lengths[index]), random);
    for (const candidate of candidates) {
      if (placed.every((group) => minimumGroupDistance(group, candidate) >= 2)) {
        placed.push(candidate);
        if (visit(index + 1)) return true;
        placed.pop();
      }
    }
    return false;
  };

  if (!visit(0)) {
    throw new Error('Lab workstation groups do not fit inside the room.');
  }
  return placed;
}

function createGroupCandidates(length: number) {
  const candidates: WorkstationGroupCandidate[] = [];
  const groupSize = length * LAB_WORKSTATION_SIZE;

  for (let y = 2; y <= LAB_ROOM_DEPTH - LAB_WORKSTATION_SIZE - 2; y += 1) {
    for (let x = 2; x <= LAB_ROOM_WIDTH - groupSize - 2; x += 1) {
      const workstationOrigins = Array.from({ length }, (_, offset) => ({
        x: x + offset * LAB_WORKSTATION_SIZE,
        y,
      }));
      candidates.push({
        orientation: 'x',
        workstationOrigins,
        occupiedTiles: workstationOrigins.flatMap(createWorkstationFootprint),
      });
    }
  }

  for (let x = 2; x <= LAB_ROOM_WIDTH - LAB_WORKSTATION_SIZE - 2; x += 1) {
    for (let y = 2; y <= LAB_ROOM_DEPTH - groupSize - 2; y += 1) {
      const workstationOrigins = Array.from({ length }, (_, offset) => ({
        x,
        y: y + offset * LAB_WORKSTATION_SIZE,
      }));
      candidates.push({
        orientation: 'y',
        workstationOrigins,
        occupiedTiles: workstationOrigins.flatMap(createWorkstationFootprint),
      });
    }
  }

  return candidates;
}

function createWorkstationFootprint(origin: LabGridPoint) {
  return Array.from({ length: LAB_WORKSTATION_SIZE }, (_, y) => (
    Array.from({ length: LAB_WORKSTATION_SIZE }, (_, x) => ({
      x: origin.x + x,
      y: origin.y + y,
    }))
  )).flat();
}

function createEdgeCandidates(length: number) {
  const candidates: FurnitureCandidate[] = [];

  for (let x = 2; x <= LAB_ROOM_WIDTH - length - 2; x += 1) {
    const occupiedTiles = Array.from({ length }, (_, offset) => ({
      x: x + offset,
      y: 1,
    }));
    candidates.push({
      placement: { x: x + (length - 1) / 2, y: 1, orientation: 'x' },
      occupiedTiles,
    });
  }

  for (let y = 2; y <= LAB_ROOM_DEPTH - length - 2; y += 1) {
    const occupiedTiles = Array.from({ length }, (_, offset) => ({
      x: 1,
      y: y + offset,
    }));
    candidates.push({
      placement: { x: 1, y: y + (length - 1) / 2, orientation: 'y' },
      occupiedTiles,
    });
  }

  return candidates;
}

function createServerGroupCandidates(count: number) {
  const candidates: ServerGroupCandidate[] = [];
  const groupLength = count * 2;

  for (let x = 2; x <= LAB_ROOM_WIDTH - groupLength - 2; x += 1) {
    candidates.push({
      placements: Array.from({ length: count }, (_, index) => ({
        x: x + index * 2 + 0.5,
        y: 1.5,
        orientation: 'x',
      })),
      occupiedTiles: createRectangleFootprint(x, 1, groupLength, 2),
    });
  }

  for (let y = 2; y <= LAB_ROOM_DEPTH - groupLength - 2; y += 1) {
    candidates.push({
      placements: Array.from({ length: count }, (_, index) => ({
        x: 1.5,
        y: y + index * 2 + 0.5,
        orientation: 'y',
      })),
      occupiedTiles: createRectangleFootprint(1, y, 2, groupLength),
    });
  }

  return candidates;
}

function pickFurniture(
  candidates: FurnitureCandidate[],
  blockedTiles: LabGridPoint[],
  random: () => number,
) {
  const candidate = shuffleWith(candidates, random).find(({ occupiedTiles }) => (
    occupiedTiles.every((tile) => (
      blockedTiles.every((blockedTile) => gridDistance(tile, blockedTile) >= 2)
    ))
  ));
  if (!candidate) throw new Error('Lab furniture does not fit inside the room.');
  return candidate;
}

function pickServerGroup(
  candidates: ServerGroupCandidate[],
  blockedTiles: LabGridPoint[],
  random: () => number,
) {
  const candidate = shuffleWith(candidates, random).find(({ occupiedTiles }) => (
    occupiedTiles.every((tile) => (
      blockedTiles.every((blockedTile) => gridDistance(tile, blockedTile) >= 2)
    ))
  ));
  if (!candidate) throw new Error('Lab servers do not fit inside the room.');
  return candidate;
}

function createRectangleFootprint(
  startX: number,
  startY: number,
  width: number,
  depth: number,
) {
  return Array.from({ length: depth }, (_, y) => (
    Array.from({ length: width }, (_, x) => ({
      x: startX + x,
      y: startY + y,
    }))
  )).flat();
}

function minimumGroupDistance(
  first: WorkstationGroupCandidate,
  second: WorkstationGroupCandidate,
) {
  return Math.min(...first.occupiedTiles.flatMap((firstTile) => (
    second.occupiedTiles.map((secondTile) => gridDistance(firstTile, secondTile))
  )));
}

function gridDistance(first: LabGridPoint, second: LabGridPoint) {
  return Math.max(
    Math.abs(first.x - second.x),
    Math.abs(first.y - second.y),
  );
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
