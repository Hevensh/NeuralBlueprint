import { createSeededRandom, shuffleWith } from './labRandom';
import type { LabWorkstationOrientation } from './labSceneLayout';

export type LabDeskDecorationKind =
  | 'mug'
  | 'plant'
  | 'penCup'
  | 'books'
  | 'papers'
  | 'documentTray'
  | 'equipmentCrate';

export type LabDeskOccupant = 'npc' | 'player' | 'empty';
export type LabDeskDecorationSurface = 'desk' | 'towerTop';

export interface LabDeskDecoration {
  id: string;
  kind: LabDeskDecorationKind;
  surface: LabDeskDecorationSurface;
  column: number;
  row: number;
  width: number;
  depth: number;
  color: string;
  variant: number;
}

interface DecorationSpec {
  kind: LabDeskDecorationKind;
  width: number;
  depth: number;
  rotate?: boolean;
  occupants: LabDeskOccupant[];
  towerTop?: boolean;
}

interface CreateDeskDecorationsOptions {
  seed: string;
  workstationId: string;
  occupant: LabDeskOccupant;
  identity: string;
  accent: string;
  orientation: LabWorkstationOrientation;
  hasEndDivider: boolean;
}

const DESK_COLUMNS = 3;
const DESK_ROWS = 2;

const DECORATION_SPECS: DecorationSpec[] = [
  { kind: 'mug', width: 1, depth: 1, occupants: ['npc', 'player'], towerTop: true },
  { kind: 'plant', width: 1, depth: 1, occupants: ['npc', 'empty'], towerTop: true },
  { kind: 'penCup', width: 1, depth: 1, occupants: ['npc', 'player'], towerTop: true },
  { kind: 'books', width: 2, depth: 1, rotate: true, occupants: ['npc', 'player', 'empty'] },
  { kind: 'papers', width: 2, depth: 1, rotate: true, occupants: ['npc', 'player', 'empty'] },
  { kind: 'documentTray', width: 2, depth: 1, rotate: true, occupants: ['npc', 'empty'] },
  { kind: 'equipmentCrate', width: 2, depth: 2, occupants: ['empty'] },
];

const DECORATION_COLORS = [
  '#38bdf8',
  '#34d399',
  '#a78bfa',
  '#f59e0b',
  '#fb7185',
  '#94a3b8',
];

const SIZE_WEIGHTS = new Map([
  ['1x1', 12],
  ['2x1', 4],
  ['2x2', 1],
]);

export function createDeskDecorations({
  seed,
  workstationId,
  occupant,
  identity,
  accent,
  orientation,
  hasEndDivider,
}: CreateDeskDecorationsOptions): LabDeskDecoration[] {
  const random = createSeededRandom(
    `${seed}:desk-decoration:${workstationId}:${identity}`,
  );
  const occupied = createDeskOccupancy(
    occupant !== 'empty',
    orientation,
    hasEndDivider,
  );
  const decorations: LabDeskDecoration[] = [];
  const targetDeskItems = occupant === 'empty'
    ? 1 + Number(random() > 0.62)
    : 2;

  for (let index = 0; index < targetDeskItems; index += 1) {
    const placements = createPlacementCandidates(occupant, occupied, true);
    if (placements.length === 0) break;

    const placement = pickPlacement(placements, random);
    markOccupied(occupied, placement);
    decorations.push(toDecoration(
      placement,
      decorations.length,
      random,
      accent,
    ));
  }

  if (occupant !== 'empty' && (occupant === 'player' || random() > 0.42)) {
    const towerSpecs = DECORATION_SPECS.filter((spec) => (
      spec.towerTop && spec.occupants.includes(occupant)
    ));
    const spec = towerSpecs[Math.floor(random() * towerSpecs.length)];
    if (spec) {
      decorations.push({
        ...toDecoration(
          { spec, column: 0, row: 0, width: 1, depth: 1 },
          decorations.length,
          random,
          accent,
        ),
        surface: 'towerTop',
      });
    }
  }

  return decorations;
}

export function createCommonTableDecorations(
  seed: string,
): LabDeskDecoration[] {
  const random = createSeededRandom(`${seed}:common-table-decoration`);
  const occupied = createOccupancy(5, 3);
  const decorations: LabDeskDecoration[] = [];
  const targetItems = 3 + Math.floor(random() * 3);

  for (let index = 0; index < targetItems; index += 1) {
    const placements = createPlacementCandidates('empty', occupied, false);
    if (placements.length === 0) break;
    const placement = pickPlacement(placements, random);
    markOccupied(occupied, placement);
    decorations.push(toDecoration(
      placement,
      decorations.length,
      random,
      '#0ea5a4',
    ));
  }

  return decorations;
}

interface PlacementCandidate {
  spec: DecorationSpec;
  column: number;
  row: number;
  width: number;
  depth: number;
}

function createDeskOccupancy(
  hasComputer: boolean,
  orientation: LabWorkstationOrientation,
  hasEndDivider: boolean,
) {
  const occupied = createOccupancy(DESK_COLUMNS, DESK_ROWS);
  if (hasComputer) {
    occupied[0][1] = true;
    occupied[1][1] = true;
    occupied[0][0] = true;
    occupied[1][0] = true;
    occupied[1][2] = true;
  }
  if (hasEndDivider) {
    const dividerColumn = orientation === 'x' ? 2 : 0;
    occupied[DESK_ROWS - 1][dividerColumn] = true;
  }
  return occupied;
}

function createPlacementCandidates(
  occupant: LabDeskOccupant,
  occupied: boolean[][],
  useDividerClearance: boolean,
) {
  const candidates: PlacementCandidate[] = [];
  const rows = occupied.length;
  const columns = occupied[0]?.length ?? 0;
  DECORATION_SPECS
    .filter((spec) => spec.occupants.includes(occupant))
    .forEach((spec) => {
      const sizes = [{ width: spec.width, depth: spec.depth }];
      if (spec.rotate && spec.width !== spec.depth) {
        sizes.push({ width: spec.depth, depth: spec.width });
      }
      sizes.forEach(({ width, depth }) => {
        for (let row = 0; row <= rows - depth; row += 1) {
          for (let column = 0; column <= columns - width; column += 1) {
            const candidate = { spec, column, row, width, depth };
            if (
              canPlace(occupied, candidate)
              && (!useDividerClearance || hasDividerClearance(candidate))
            ) {
              candidates.push(candidate);
            }
          }
        }
      });
    });
  return shuffleWith(candidates, createSeededRandom(
    occupied.flat().map(Number).join(''),
  ));
}

function createOccupancy(columns: number, rows: number) {
  return Array.from({ length: rows }, () => (
    Array.from({ length: columns }, () => false)
  ));
}

function hasDividerClearance(placement: PlacementCandidate) {
  const longSide = Math.max(placement.width, placement.depth);
  if (longSide !== 2 || placement.width * placement.depth !== 2) return true;
  return placement.depth === 1
    ? placement.row === DESK_ROWS - 1
    : placement.column === 1;
}

function pickPlacement(
  candidates: PlacementCandidate[],
  random: () => number,
) {
  const groups = new Map<string, PlacementCandidate[]>();
  candidates.forEach((candidate) => {
    const key = getSizeKey(candidate);
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  });
  const available = [...groups.entries()];
  const totalWeight = available.reduce(
    (total, [size]) => total + (SIZE_WEIGHTS.get(size) ?? 0),
    0,
  );
  let draw = random() * totalWeight;
  for (const [size, placements] of available) {
    draw -= SIZE_WEIGHTS.get(size) ?? 0;
    if (draw <= 0) {
      return placements[Math.floor(random() * placements.length)];
    }
  }
  return candidates[candidates.length - 1];
}

function getSizeKey(placement: PlacementCandidate) {
  const shortSide = Math.min(placement.width, placement.depth);
  const longSide = Math.max(placement.width, placement.depth);
  return `${longSide}x${shortSide}`;
}

function canPlace(occupied: boolean[][], placement: PlacementCandidate) {
  for (let row = placement.row; row < placement.row + placement.depth; row += 1) {
    for (
      let column = placement.column;
      column < placement.column + placement.width;
      column += 1
    ) {
      if (occupied[row][column]) return false;
    }
  }
  return true;
}

function markOccupied(occupied: boolean[][], placement: PlacementCandidate) {
  for (let row = placement.row; row < placement.row + placement.depth; row += 1) {
    for (
      let column = placement.column;
      column < placement.column + placement.width;
      column += 1
    ) {
      occupied[row][column] = true;
    }
  }
}

function toDecoration(
  placement: PlacementCandidate,
  index: number,
  random: () => number,
  accent: string,
): LabDeskDecoration {
  return {
    id: `${placement.spec.kind}-${index}`,
    kind: placement.spec.kind,
    surface: 'desk',
    column: placement.column,
    row: placement.row,
    width: placement.width,
    depth: placement.depth,
    color: random() > 0.46
      ? accent
      : DECORATION_COLORS[Math.floor(random() * DECORATION_COLORS.length)],
    variant: Math.floor(random() * 4),
  };
}
