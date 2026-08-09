import type { CSSProperties } from 'react';
import {
  LAB_ROOM_DEPTH,
  LAB_ROOM_WIDTH,
  type LabGridPoint,
  type LabFurniturePlacement,
  type LabWorkstationOrientation,
  type LabWorkstationPlacement,
} from './labSceneLayout';

const LAB_HALF_TILE_X = 1.9;
const LAB_HALF_TILE_Y = 1.75;
const LAB_HEIGHT_STEP = 4.1;

export interface LabFloorTile extends LabGridPoint {
  id: string;
  variant: number;
}

export interface LabWorkstationDivider extends LabGridPoint {
  face: 'l' | 'r';
  kind: 'back' | 'side' | 'front';
  length: 2 | 3;
  height: number;
}

export interface LabComputerTowerFace extends LabGridPoint {
  face: 't' | 'l' | 'r';
  height: number;
  kind: 'top' | 'front' | 'side';
  size: 'top' | 'short' | 'long';
}

export interface LabSeatSupportFace extends LabGridPoint {
  face: 'l' | 'r';
  height: number;
}

export interface LabIsoFaceGeometry extends LabGridPoint {
  face: 't' | 'l' | 'r';
  height: number;
  role: 'top' | 'front' | 'side';
  horizontalLength?: number;
  verticalLength?: number;
  xLength?: number;
  yLength?: number;
}

export interface LabWorkstationGeometry {
  deskCenter: LabGridPoint;
  playerHint: LabGridPoint;
  seat: LabGridPoint;
  monitor: LabGridPoint;
  monitorFace: 'l' | 'r';
  keyboard: LabIsoFaceGeometry;
  keyboardRows: LabIsoFaceGeometry[];
  computerTower: LabComputerTowerFace[];
  seatSupports: LabSeatSupportFace[];
  dividers: LabWorkstationDivider[];
}

export function createLabFloorTiles(): LabFloorTile[] {
  return Array.from({ length: LAB_ROOM_DEPTH }, (_, y) => (
    Array.from({ length: LAB_ROOM_WIDTH }, (_, x) => ({
      id: `floor-${x}-${y}`,
      x,
      y,
      variant: (x + y) % 2,
    }))
  )).flat();
}

export function projectLabGridPoint(
  point: LabGridPoint,
  height = 0,
  layerOffset = 0,
): CSSProperties {
  return {
    left: `${50 + (point.x - point.y) * LAB_HALF_TILE_X}%`,
    top: `${16 + (point.x + point.y) * LAB_HALF_TILE_Y - height * LAB_HEIGHT_STEP}%`,
    zIndex: getLabDepthIndex(point, height) + layerOffset,
  };
}

export function getLabDepthIndex(point: LabGridPoint, height = 0) {
  return 100 + Math.round((point.x + point.y + height) * 100);
}

export function createLabCuboidFaces(
  placement: LabFurniturePlacement,
  width: number,
  depth: number,
  height: number,
): LabIsoFaceGeometry[] {
  const xLength = placement.orientation === 'x' ? width : depth;
  const yLength = placement.orientation === 'x' ? depth : width;
  return [
    {
      ...placement,
      face: 't',
      height,
      role: 'top',
      xLength,
      yLength,
    },
    {
      x: placement.x + xLength / 2,
      y: placement.y,
      face: 'l',
      height: height / 2,
      role: placement.orientation === 'y' ? 'front' : 'side',
      horizontalLength: yLength,
      verticalLength: height,
    },
    {
      x: placement.x,
      y: placement.y + yLength / 2,
      face: 'r',
      height: height / 2,
      role: placement.orientation === 'x' ? 'front' : 'side',
      horizontalLength: xLength,
      verticalLength: height,
    },
  ];
}

export function createLabVerticalFace(
  placement: LabFurniturePlacement,
  length: number,
  height: number,
  bottomHeight = 0,
): LabIsoFaceGeometry {
  return {
    ...placement,
    face: placement.orientation === 'x' ? 'r' : 'l',
    height: bottomHeight + height / 2,
    role: 'front',
    horizontalLength: length,
    verticalLength: height,
  };
}

export function projectLabIsoFace(
  face: LabIsoFaceGeometry,
  layerOffset = 0,
): CSSProperties {
  const baseStyle = projectLabGridPoint(face, face.height, layerOffset);
  if (face.face === 't') {
    const xLength = face.xLength ?? 1;
    const yLength = face.yLength ?? 1;
    const total = xLength + yLength;
    const xShare = (xLength / total) * 100;
    const yShare = (yLength / total) * 100;
    return {
      ...baseStyle,
      width: `${total * LAB_HALF_TILE_X}%`,
      height: `${total * LAB_HALF_TILE_Y}%`,
      clipPath: `polygon(${yShare}% 0, 100% ${xShare}%, ${xShare}% 100%, 0 ${yShare}%)`,
      transform: 'translate(-50%, -50%)',
    };
  }

  const horizontalLength = face.horizontalLength ?? 1;
  const verticalLength = face.verticalLength ?? 1;
  const horizontalHeight = horizontalLength * LAB_HALF_TILE_Y;
  const verticalHeight = verticalLength * LAB_HEIGHT_STEP;
  const totalHeight = horizontalHeight + verticalHeight;
  const horizontalShare = (horizontalHeight / totalHeight) * 100;
  const verticalShare = (verticalHeight / totalHeight) * 100;
  const clipPath = face.face === 'r'
    ? `polygon(0 0, 100% ${horizontalShare}%, 100% 100%, 0 ${verticalShare}%)`
    : `polygon(100% 0, 100% ${verticalShare}%, 0 100%, 0 ${horizontalShare}%)`;
  return {
    ...baseStyle,
    width: `${horizontalLength * LAB_HALF_TILE_X}%`,
    height: `${totalHeight}%`,
    clipPath,
    transform: 'translate(-50%, -50%)',
  };
}

export function createLabWorkstationGeometry(
  placement: LabWorkstationPlacement,
): LabWorkstationGeometry {
  const point = (x: number, y: number) => transformLocalPoint(placement, x, y);
  const localXAxis: LabWorkstationOrientation = placement.orientation;
  const localYAxis: LabWorkstationOrientation = placement.orientation === 'x' ? 'y' : 'x';
  const createDivider = (
    dividerPoint: LabGridPoint,
    axis: LabWorkstationOrientation,
    kind: LabWorkstationDivider['kind'],
    length: LabWorkstationDivider['length'],
  ): LabWorkstationDivider => ({
    ...dividerPoint,
    face: axis === 'x' ? 'r' : 'l',
    kind,
    length,
    height: 1,
  });
  const faceForAxis = (axis: LabWorkstationOrientation) => (
    axis === 'x' ? 'r' as const : 'l' as const
  );
  const createTopFace = (
    localX: number,
    localY: number,
    localWidth: number,
    localDepth: number,
    height: number,
  ): LabIsoFaceGeometry => ({
    ...point(localX, localY),
    face: 't',
    height,
    role: 'top',
    xLength: placement.orientation === 'x' ? localWidth : localDepth,
    yLength: placement.orientation === 'x' ? localDepth : localWidth,
  });
  const towerX = -0.05;
  const towerY = 0.55;

  return {
    deskCenter: point(1, 0.5),
    playerHint: point(1, 1),
    seat: point(1, 2),
    monitor: point(1, 0.65),
    monitorFace: localXAxis === 'x' ? 'r' : 'l',
    keyboard: createTopFace(1, 1.16, 0.9, 0.38, 1.06),
    keyboardRows: [1.05, 1.16, 1.27].map((localY) => (
      createTopFace(1, localY, 0.72, 0.035, 1.075)
    )),
    computerTower: [
      {
        ...point(towerX, towerY),
        face: 't',
        height: 1.8,
        kind: 'top',
        size: 'top',
      },
      {
        ...point(towerX + 0.25, towerY),
        face: faceForAxis(localYAxis),
        height: 1.4,
        kind: 'side',
        size: 'long',
      },
      {
        ...point(towerX, towerY + 0.4),
        face: faceForAxis(localXAxis),
        height: 1.4,
        kind: 'front',
        size: 'short',
      },
    ],
    seatSupports: [
      {
        ...point(1.125, 2),
        face: placement.orientation === 'x' ? 'l' : 'r',
        height: 0.25,
      },
      {
        ...point(1, 2.125),
        face: placement.orientation === 'x' ? 'r' : 'l',
        height: 0.25,
      },
    ],
    dividers: [
      createDivider(
        point(1, -0.5),
        localXAxis,
        'back',
        3,
      ),
      createDivider(
        point(-0.5, 0.5),
        localYAxis,
        'side',
        2,
      ),
      ...(placement.indexInGroup === placement.groupLength - 1
        ? [createDivider(point(2.5, 0.5), localYAxis, 'side', 2)]
        : []),
      {
        ...point(1, 1.5),
        face: faceForAxis(localXAxis),
        kind: 'front',
        length: 3,
        height: 0.5,
      },
    ],
  };
}

function transformLocalPoint(
  placement: LabWorkstationPlacement,
  localX: number,
  localY: number,
) {
  return placement.orientation === 'x'
    ? { x: placement.x + localX, y: placement.y + localY }
    : { x: placement.x + localY, y: placement.y + localX };
}
