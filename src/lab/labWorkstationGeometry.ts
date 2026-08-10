import {
  createLabCuboid,
  createLabFaceAtCenter,
  createLabQuadFace,
  type LabCuboidGeometry,
  type LabIsoFaceGeometry,
} from './labIsometric';
import type {
  LabFurniturePlacement,
  LabGridPoint,
  LabWorkstationOrientation,
  LabWorkstationPlacement,
} from './labSceneLayout';

const DESK_ITEM_LAYOUT = {
  tower: {
    start: { x: -0.5, y: 0, z: 1 },
    width: 0.5,
    depth: 0.8,
    height: 0.8,
  },
  monitor: {
    start: { x: 0.5, y: 0, z: 1 },
    width: 1,
    depth: 0.2,
    height: 0.74,
    bottomOffset: 0.18,
    forwardOffset: 0.12,
  },
  keyboard: {
    start: { x: 0.5, y: 0.7, z: 1 },
    width: 0.9,
    depth: 0.38,
  },
  mousePad: {
    start: { x: 1.5, y: 0.7, z: 1 },
    width: 0.52,
    depth: 0.34,
  },
} as const;

export interface LabWorkstationDivider extends LabIsoFaceGeometry {
  face: 'l' | 'r';
  kind: 'back' | 'side' | 'end';
  length: 2 | 3;
}

export interface LabWorkstationGeometry {
  deskShadow: LabIsoFaceGeometry;
  deskSurface: LabIsoFaceGeometry;
  playerHint: LabGridPoint;
  seat: LabGridPoint;
  seatSurface: LabIsoFaceGeometry;
  monitor: LabIsoFaceGeometry;
  monitorStand: LabIsoFaceGeometry;
  monitorBase: LabIsoFaceGeometry;
  computerTowerTop: LabGridPoint;
  keyboard: LabIsoFaceGeometry;
  keyboardRows: LabIsoFaceGeometry[];
  mousePad: LabIsoFaceGeometry;
  computerTower: LabCuboidGeometry;
  itemAnchors: Record<'tower' | 'monitor' | 'keyboard' | 'mousePad', LabGridPoint>;
  seatSupports: LabIsoFaceGeometry[];
  dividers: LabWorkstationDivider[];
}

export function createLabWorkstationGeometry(
  placement: LabWorkstationPlacement,
): LabWorkstationGeometry {
  const point = (x: number, y: number) => (
    transformLabWorkstationPoint(placement, x, y)
  );
  const itemPoint = (x: number, y: number) => (
    transformLabDeskItemPoint(placement, x, y)
  );
  const localXAxis = placement.orientation;
  const localYAxis = placement.orientation === 'x' ? 'y' : 'x';
  const createTopFace = createTopFaceFactory(
    placement,
    transformLabWorkstationPoint,
  );
  const createItemTopFace = createTopFaceFactory(
    placement,
    transformLabDeskItemPoint,
  );
  const createDivider = (
    dividerPoint: LabGridPoint,
    axis: LabWorkstationOrientation,
    kind: LabWorkstationDivider['kind'],
    length: LabWorkstationDivider['length'],
  ): LabWorkstationDivider => ({
    ...createLabFaceAtCenter(
      axis === 'x' ? 'r' : 'l',
      { ...dividerPoint, z: 1 },
      length,
      2,
      'side',
    ),
    kind,
    length,
  });
  const tower = DESK_ITEM_LAYOUT.tower;
  const monitor = DESK_ITEM_LAYOUT.monitor;
  const keyboard = DESK_ITEM_LAYOUT.keyboard;
  const mousePad = DESK_ITEM_LAYOUT.mousePad;
  const towerCenter = centerOf(tower);
  const keyboardCenter = centerOf(keyboard);
  const mousePadCenter = centerOf(mousePad);
  const monitorCenter = {
    x: monitor.start.x + monitor.width / 2,
    y: monitor.start.y,
  };

  return {
    deskShadow: createLabQuadFace(
      [
        { ...point(-0.5, 1.5), z: 0.98 },
        { ...point(2.5, 1.5), z: 0.98 },
        { ...point(2.5, 1), z: 0.08 },
        { ...point(-0.5, 1), z: 0.08 },
      ],
      placement.orientation === 'x' ? 'r' : 'l',
      'side',
    ),
    deskSurface: createTopFace(1, 0.5, 3, 2, 1),
    playerHint: point(1, 1),
    seat: point(1, 2),
    seatSurface: createTopFace(1, 2, 0.95, 0.95, 0.5),
    monitor: createLabFaceAtCenter(
      localXAxis === 'x' ? 'r' : 'l',
      {
        ...itemPoint(monitorCenter.x, monitorCenter.y + monitor.forwardOffset),
        z: monitor.start.z + monitor.bottomOffset + monitor.height / 2,
      },
      monitor.width,
      monitor.height,
      'front',
    ),
    monitorStand: createLabFaceAtCenter(
      localXAxis === 'x' ? 'r' : 'l',
      {
        ...itemPoint(monitorCenter.x, monitor.start.y + monitor.depth / 2),
        z: monitor.start.z + 0.16,
      },
      0.18,
      0.25,
      'front',
    ),
    monitorBase: createItemTopFace(
      monitorCenter.x,
      monitor.start.y + monitor.depth / 2,
      0.4,
      monitor.depth,
      monitor.start.z + 0.035,
    ),
    computerTowerTop: itemPoint(towerCenter.x, towerCenter.y),
    keyboard: createItemTopFace(
      keyboardCenter.x,
      keyboardCenter.y,
      keyboard.width,
      keyboard.depth,
      keyboard.start.z + 0.06,
    ),
    keyboardRows: [0.08, 0.19, 0.3].map((offsetY) => createItemTopFace(
      keyboardCenter.x,
      keyboard.start.y + offsetY,
      0.72,
      0.035,
      keyboard.start.z + 0.075,
    )),
    mousePad: createItemTopFace(
      mousePadCenter.x,
      mousePadCenter.y,
      mousePad.width,
      mousePad.depth,
      mousePad.start.z + 0.045,
    ),
    computerTower: createLabCuboid(
      {
        ...itemPoint(towerCenter.x, towerCenter.y),
        orientation: placement.orientation,
      },
      tower.width,
      tower.depth,
      tower.height,
      tower.start.z,
    ),
    itemAnchors: {
      tower: towerCenter,
      monitor: {
        x: monitorCenter.x,
        y: monitorCenter.y + monitor.forwardOffset,
      },
      keyboard: keyboardCenter,
      mousePad: mousePadCenter,
    },
    seatSupports: [
      createLabFaceAtCenter(
        placement.orientation === 'x' ? 'l' : 'r',
        { ...point(1.125, 2), z: 0.25 },
        0.25,
        0.5,
        'side',
      ),
      createLabFaceAtCenter(
        placement.orientation === 'x' ? 'r' : 'l',
        { ...point(1, 2.125), z: 0.25 },
        0.25,
        0.5,
        'side',
      ),
    ],
    dividers: [
      createDivider(point(1, -0.5), localXAxis, 'back', 3),
      createDivider(point(-0.5, 0.5), localYAxis, 'side', 2),
      ...(placement.indexInGroup === placement.groupLength - 1
        ? [createDivider(point(2.5, 0.5), localYAxis, 'end', 2)]
        : []),
    ],
  };
}

export function transformLabDeskItemPoint(
  placement: LabFurniturePlacement,
  localX: number,
  localY: number,
) {
  return placement.orientation === 'x'
    ? { x: placement.x + localX, y: placement.y + localY }
    : { x: placement.x + localY, y: placement.y + 2 - localX };
}

function transformLabWorkstationPoint(
  placement: LabWorkstationPlacement,
  localX: number,
  localY: number,
) {
  return placement.orientation === 'x'
    ? { x: placement.x + localX, y: placement.y + localY }
    : { x: placement.x + localY, y: placement.y + localX };
}

function createTopFaceFactory(
  placement: LabWorkstationPlacement,
  transform: (
    placement: LabWorkstationPlacement,
    localX: number,
    localY: number,
  ) => LabGridPoint,
) {
  return (
    localX: number,
    localY: number,
    localWidth: number,
    localDepth: number,
    z: number,
  ) => createLabFaceAtCenter(
    't',
    { ...transform(placement, localX, localY), z },
    placement.orientation === 'x' ? localWidth : localDepth,
    placement.orientation === 'x' ? localDepth : localWidth,
    'top',
  );
}

function centerOf(item: {
  start: LabGridPoint;
  width: number;
  depth: number;
}) {
  return {
    x: item.start.x + item.width / 2,
    y: item.start.y + item.depth / 2,
  };
}
