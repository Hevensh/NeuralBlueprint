import { createLabFaceDepthMap } from './labDepth';
import type {
  LabIsoFaceGeometry,
} from './labIsometric';
import type { LabWorkstationGeometry } from './labWorkstationGeometry';
import type { LabWorkstationOrientation } from './labSceneLayout';

const DEPTH_BASE = 100_000;
const LAYER_STEP = 10;

export const WORKSTATION_LAYER = {
  shadow: 3,
  supports: 1,
  rearDividers: 2,
  desk: 3,
  slotFar: 4,
  slotNear: 7,
  endDivider: 8,
} as const;

export function createLabWorkstationDepthMap(
  geometry: LabWorkstationGeometry,
  towerFaces: LabIsoFaceGeometry[],
  orientation: LabWorkstationOrientation,
) {
  const depthMap = new Map<LabIsoFaceGeometry, number>();
  addFaces(depthMap, geometry.seatSupports, WORKSTATION_LAYER.supports);
  addFaces(
    depthMap,
    geometry.dividers.filter((divider) => divider.kind !== 'end'),
    WORKSTATION_LAYER.rearDividers,
  );
  addFaces(
    depthMap,
    [geometry.deskShadow, geometry.deskThickness, geometry.deskSurface],
    WORKSTATION_LAYER.desk,
  );
  addFaces(depthMap, towerFaces, getDeskSlotLayer(
    orientation,
    geometry.itemAnchors.tower.x,
    geometry.itemAnchors.tower.y,
  ));
  addFaces(
    depthMap,
    [geometry.monitorBase, geometry.monitorStand, geometry.monitor],
    getDeskSlotLayer(
      orientation,
      geometry.itemAnchors.monitor.x,
      geometry.itemAnchors.monitor.y,
    ),
  );
  addFaces(
    depthMap,
    [geometry.keyboard, ...geometry.keyboardRows],
    getDeskSlotLayer(
      orientation,
      geometry.itemAnchors.keyboard.x,
      geometry.itemAnchors.keyboard.y,
    ),
  );
  addFaces(depthMap, [geometry.mousePad], getDeskSlotLayer(
    orientation,
    geometry.itemAnchors.mousePad.x,
    geometry.itemAnchors.mousePad.y,
  ));
  addFaces(depthMap, [geometry.seatSurface], WORKSTATION_LAYER.slotNear);
  addFaces(
    depthMap,
    geometry.dividers.filter((divider) => divider.kind === 'end'),
    WORKSTATION_LAYER.endDivider,
  );
  return depthMap;
}

export function getDeskSlotLayer(
  orientation: LabWorkstationOrientation,
  x: number,
  y: number,
) {
  const projectedDepth = orientation === 'x' ? x + y : 2 - x + y;
  return WORKSTATION_LAYER.slotFar
    + Math.max(0, Math.min(3, Math.round(projectedDepth)));
}

export function getWorkstationLayerBase(layer: number) {
  return DEPTH_BASE + layer * LAYER_STEP;
}

function addFaces(
  target: Map<LabIsoFaceGeometry, number>,
  faces: LabIsoFaceGeometry[],
  layer: number,
) {
  createLabFaceDepthMap(faces, getWorkstationLayerBase(layer)).forEach(
    (depth, face) => target.set(face, depth),
  );
}
