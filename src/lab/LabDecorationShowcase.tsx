import { DECORATION_COLORS, DECORATION_SPECS } from './decorations/decorationCatalog';
import type { LabDeskDecoration } from './decorations/decorationTypes';
import { useLanguage } from '../i18n/LanguageContext';
import { LabCommonTable } from './LabFurniture';
import type { LabFurniturePlacement } from './labSceneLayout';

const TABLE_COLUMNS = 5;
const TABLE_ROWS = 3;
const TABLE_PLACEMENTS: LabFurniturePlacement[] = [
  { x: 6, y: 4, orientation: 'x' },
  { x: 14, y: 5, orientation: 'x' },
  { x: 10, y: 11, orientation: 'x' },
  { x: 18, y: 12, orientation: 'x' },
];

const SHOWCASE_TABLES = packDecorations();
const DECORATION_INDEX = new Map(DECORATION_SPECS.map((spec, index) => (
  [spec.kind, index + 1]
)));

export function LabDecorationShowcase() {
  return SHOWCASE_TABLES.map((decorations, index) => (
    <LabCommonTable
      decorations={decorations}
      getDecorationLabel={(decoration) => String(DECORATION_INDEX.get(decoration.kind))}
      key={`decoration-showcase-${index}`}
      placement={TABLE_PLACEMENTS[index]}
    />
  ));
}

export function LabDecorationShowcaseLegend() {
  const { labels } = useLanguage();
  return (
    <aside className="lab-decoration-showcase-legend">
      <strong>{labels.lab.decorationShowcaseTitle}</strong>
      <ol>
        {DECORATION_SPECS.map((spec, index) => (
          <li key={spec.kind}>
            <span>{index + 1}</span>
            {formatKind(spec.kind)}
          </li>
        ))}
      </ol>
    </aside>
  );
}

function formatKind(kind: string) {
  return kind.replace(/([A-Z])/g, ' $1').toLowerCase();
}

function packDecorations() {
  const tables: LabDeskDecoration[][] = [[]];
  let occupied = createOccupancy();
  DECORATION_SPECS.forEach((spec, index) => {
    let position = findSpace(occupied, spec.width, spec.depth);
    if (!position) {
      tables.push([]);
      occupied = createOccupancy();
      position = findSpace(occupied, spec.width, spec.depth)!;
    }
    markOccupied(occupied, position.column, position.row, spec.width, spec.depth);
    tables[tables.length - 1].push({
      id: `showcase-${spec.kind}`,
      kind: spec.kind,
      surface: 'desk',
      column: position.column,
      row: position.row,
      width: spec.width,
      depth: spec.depth,
      color: DECORATION_COLORS[index % DECORATION_COLORS.length],
      variant: index * 4_099 + 17,
    });
  });
  return tables;
}

function createOccupancy() {
  return Array.from({ length: TABLE_ROWS }, () => (
    Array.from({ length: TABLE_COLUMNS }, () => false)
  ));
}

function findSpace(occupied: boolean[][], width: number, depth: number) {
  for (let row = 0; row <= TABLE_ROWS - depth; row += 1) {
    for (let column = 0; column <= TABLE_COLUMNS - width; column += 1) {
      if (isFree(occupied, column, row, width, depth)) return { column, row };
    }
  }
  return null;
}

function isFree(
  occupied: boolean[][],
  column: number,
  row: number,
  width: number,
  depth: number,
) {
  return occupied.slice(row, row + depth).every((cells) => (
    cells.slice(column, column + width).every((cell) => !cell)
  ));
}

function markOccupied(
  occupied: boolean[][],
  column: number,
  row: number,
  width: number,
  depth: number,
) {
  for (let y = row; y < row + depth; y += 1) {
    for (let x = column; x < column + width; x += 1) occupied[y][x] = true;
  }
}
