import { createSeededRandom, shuffleWith } from '../labRandom';
import type { LabWorkstationOrientation } from '../labSceneLayout';
import {
  DECORATION_COLORS,
  DECORATION_SIZE_WEIGHTS,
  DECORATION_SPECS,
} from './decorationCatalog';
import type {
  DecorationPlacementCandidate,
  LabDecorationContext,
  LabDeskDecoration,
} from './decorationTypes';

interface CreateDeskDecorationsOptions {
  seed: string;
  workstationId: string;
  occupant: Exclude<LabDecorationContext, 'commonTable'>;
  identity: string;
  accent: string;
  orientation: LabWorkstationOrientation;
  hasEndDivider: boolean;
}

const DESK_COLUMNS = 3;
const DESK_ROWS = 2;

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
  const decorations = fillSurface(
    occupant,
    occupied,
    occupant === 'empty' ? 1 + Number(random() > 0.62) : 2,
    random,
    accent,
    true,
  );

  if (occupant !== 'empty' && (occupant === 'player' || random() > 0.42)) {
    const towerSpecs = DECORATION_SPECS.filter((spec) => (
      spec.towerTop && spec.contexts.includes(occupant)
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

export function createCommonTableDecorations(seed: string) {
  const random = createSeededRandom(`${seed}:common-table-decoration`);
  return fillSurface(
    'commonTable',
    createOccupancy(5, 3),
    3 + Math.floor(random() * 3),
    random,
    '#0ea5a4',
    false,
  );
}

function fillSurface(
  context: LabDecorationContext,
  occupied: boolean[][],
  targetCount: number,
  random: () => number,
  accent: string,
  useDividerClearance: boolean,
) {
  const decorations: LabDeskDecoration[] = [];
  const usedKinds = new Set<string>();
  for (let index = 0; index < targetCount; index += 1) {
    const candidates = createPlacementCandidates(
      context,
      occupied,
      useDividerClearance,
      usedKinds,
    );
    if (candidates.length === 0) break;
    const placement = pickPlacement(candidates, random);
    markOccupied(occupied, placement);
    usedKinds.add(placement.spec.kind);
    decorations.push(toDecoration(
      placement,
      decorations.length,
      random,
      accent,
    ));
  }
  return decorations;
}

function createDeskOccupancy(
  hasComputer: boolean,
  orientation: LabWorkstationOrientation,
  hasEndDivider: boolean,
) {
  const occupied = createOccupancy(DESK_COLUMNS, DESK_ROWS);
  if (hasComputer) {
    occupied[0][0] = true;
    occupied[0][1] = true;
    occupied[1][0] = true;
    occupied[1][1] = true;
    occupied[1][2] = true;
  }
  if (hasEndDivider) {
    occupied[DESK_ROWS - 1][orientation === 'x' ? 2 : 0] = true;
  }
  return occupied;
}

function createPlacementCandidates(
  context: LabDecorationContext,
  occupied: boolean[][],
  useDividerClearance: boolean,
  excludedKinds: Set<string>,
) {
  const candidates: DecorationPlacementCandidate[] = [];
  const rows = occupied.length;
  const columns = occupied[0]?.length ?? 0;

  DECORATION_SPECS
    .filter((spec) => (
      spec.contexts.includes(context) && !excludedKinds.has(spec.kind)
    ))
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
            ) candidates.push(candidate);
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

function hasDividerClearance(placement: DecorationPlacementCandidate) {
  const longSide = Math.max(placement.width, placement.depth);
  if (longSide !== 2 || placement.width * placement.depth !== 2) return true;
  return placement.depth === 1
    ? placement.row === DESK_ROWS - 1
    : placement.column === 1;
}

function pickPlacement(
  candidates: DecorationPlacementCandidate[],
  random: () => number,
) {
  const groups = new Map<string, DecorationPlacementCandidate[]>();
  candidates.forEach((candidate) => {
    const key = getSizeKey(candidate);
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  });
  const available = [...groups.entries()];
  const totalWeight = available.reduce(
    (total, [size]) => total + (DECORATION_SIZE_WEIGHTS.get(size) ?? 0),
    0,
  );
  let draw = random() * totalWeight;
  for (const [size, placements] of available) {
    draw -= DECORATION_SIZE_WEIGHTS.get(size) ?? 0;
    if (draw <= 0) {
      return placements[Math.floor(random() * placements.length)];
    }
  }
  return candidates[candidates.length - 1];
}

function getSizeKey(placement: DecorationPlacementCandidate) {
  const shortSide = Math.min(placement.width, placement.depth);
  const longSide = Math.max(placement.width, placement.depth);
  return `${longSide}x${shortSide}`;
}

function canPlace(
  occupied: boolean[][],
  placement: DecorationPlacementCandidate,
) {
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

function markOccupied(
  occupied: boolean[][],
  placement: DecorationPlacementCandidate,
) {
  for (let row = placement.row; row < placement.row + placement.depth; row += 1) {
    for (
      let column = placement.column;
      column < placement.column + placement.width;
      column += 1
    ) occupied[row][column] = true;
  }
}

function toDecoration(
  placement: DecorationPlacementCandidate,
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
    variant: Math.floor(random() * 65_536),
  };
}
