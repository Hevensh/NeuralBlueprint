import { memo } from 'react';
import {
  createLabCuboid,
  createLabCuboidFaces,
  createLabFaceAtCenter,
  projectLabIsoFace,
  type LabIsoFaceGeometry,
} from './labIsometric';
import { transformLabDeskItemPoint } from './labWorkstationGeometry';
import { createLabFaceDepthMap } from './labDepth';
import type { LabFurniturePlacement } from './labSceneLayout';
import type { LabDeskDecoration } from './labDeskDecorationModel';
import { getDecorationFaceStyle } from './labFaceStyles';
import {
  getDeskSlotLayer,
  getWorkstationLayerBase,
  WORKSTATION_LAYER,
} from './labWorkstationDepth';

interface LabDeskDecorationsProps {
  decorations: LabDeskDecoration[];
  placement: LabFurniturePlacement;
  towerTop?: { x: number; y: number };
  surface?: 'workstation' | 'commonTable';
}

const SURFACES = {
  workstation: { columns: 3, rows: 2, height: 1, offsetX: 0, offsetY: 0 },
  commonTable: { columns: 5, rows: 3, height: 0.92, offsetX: -2, offsetY: -1 },
} as const;

interface DecorationPart {
  face: LabIsoFaceGeometry;
  className: string;
}

export const LabDeskDecorations = memo(function LabDeskDecorations({
  decorations,
  placement,
  towerTop,
  surface = 'workstation',
}: LabDeskDecorationsProps) {
  const surfaceConfig = SURFACES[surface];
  const renderParts = decorations.flatMap((decoration) => (
    createDecorationParts(
      decoration,
      placement,
      towerTop,
      surface,
      surfaceConfig,
    ).map((part, partIndex) => ({
      decoration,
      part,
      partIndex,
    }))
  ));
  const depthMap = new Map<LabIsoFaceGeometry, number>();
  if (surface === 'commonTable') {
    createLabFaceDepthMap(
      renderParts.map(({ part }) => part.face),
      100_100,
    ).forEach((depth, face) => depthMap.set(face, depth));
  } else decorations.forEach((decoration) => {
    const faces = renderParts
      .filter((renderPart) => renderPart.decoration === decoration)
      .map(({ part }) => part.face);
    const center = getDecorationCenter(decoration, surfaceConfig);
    const layer = decoration.surface === 'towerTop'
      ? WORKSTATION_LAYER.slotNear
      : getDeskSlotLayer(placement.orientation, center.x, center.y);
    createLabFaceDepthMap(faces, getWorkstationLayerBase(layer)).forEach(
      (depth, face) => depthMap.set(face, depth),
    );
  });

  return renderParts.map(({ decoration, part, partIndex }) => (
    <span
      aria-hidden="true"
      className={`lab-desk-decoration kind-${decoration.kind} variant-${decoration.variant} ${part.className} face-${part.face.face} role-${part.face.role}`}
      key={`${decoration.id}-${partIndex}`}
      style={{
        ...projectLabIsoFace(part.face, depthMap.get(part.face)!),
        ...getDecorationFaceStyle(decoration, part.face, part.className),
      }}
    />
  ));
});

function createDecorationParts(
  decoration: LabDeskDecoration,
  placement: LabFurniturePlacement,
  towerTop: { x: number; y: number } | undefined,
  surface: keyof typeof SURFACES,
  surfaceConfig: (typeof SURFACES)[keyof typeof SURFACES],
) {
  const center = getDecorationCenter(decoration, surfaceConfig);
  const point = decoration.surface === 'towerTop' && towerTop
    ? towerTop
    : transformSurfacePoint(placement, center.x, center.y, surface);
  const baseHeight = decoration.surface === 'towerTop'
    ? 1.8
    : surfaceConfig.height;
  const width = Math.max(0.24, decoration.width - 0.2);
  const depth = Math.max(0.24, decoration.depth - 0.2);

  switch (decoration.kind) {
    case 'mug':
      return createCuboidParts(placement, point, 0.28, 0.28, 0.32, baseHeight, 'body');
    case 'penCup':
      return createCuboidParts(placement, point, 0.26, 0.26, 0.38, baseHeight, 'body');
    case 'plant':
      return [
        ...createCuboidParts(placement, point, 0.34, 0.34, 0.24, baseHeight, 'pot'),
        ...createCuboidParts(placement, point, 0.46, 0.46, 0.2, baseHeight + 0.38, 'leaves'),
      ];
    case 'books':
      return Array.from({ length: 3 }, (_, layer) => (
        createCuboidParts(
          placement,
          transformSurfacePoint(
            placement,
            center.x + layer * 0.025,
            center.y - layer * 0.015,
            surface,
          ),
          width - layer * 0.05,
          depth - layer * 0.04,
          0.07,
          baseHeight + layer * 0.07,
          `book-layer layer-${layer}`,
        )
      )).flat();
    case 'papers':
      return [
        ...createFlatFace(placement, center.x, center.y, width, depth, baseHeight + 0.025, 'sheet', surface),
        ...[-0.17, 0, 0.17].map((offset) => (
          createFlatFace(
            placement,
            center.x,
            center.y + offset,
            width * 0.58,
            0.025,
            baseHeight + 0.03,
            'paper-line',
            surface,
          )[0]
        )),
      ];
    case 'documentTray':
      return [
        ...createCuboidParts(placement, point, width, depth, 0.12, baseHeight, 'tray'),
        ...createFlatFace(
          placement,
          center.x,
          center.y,
          width * 0.78,
          depth * 0.68,
          baseHeight + 0.125,
          'tray-paper',
          surface,
        ),
      ];
    case 'equipmentCrate':
      return createCuboidParts(placement, point, width, depth, 0.42, baseHeight, 'crate');
  }
}

function createCuboidParts(
  placement: LabFurniturePlacement,
  point: { x: number; y: number },
  width: number,
  depth: number,
  height: number,
  baseHeight: number,
  className: string,
): DecorationPart[] {
  return createLabCuboidFaces(
    createLabCuboid(
      { ...point, orientation: placement.orientation },
      width,
      depth,
      height,
      baseHeight,
    ),
  ).map((face) => ({
    face,
    className,
  }));
}

function createFlatFace(
  placement: LabFurniturePlacement,
  localX: number,
  localY: number,
  width: number,
  depth: number,
  height: number,
  className: string,
  surface: keyof typeof SURFACES,
): DecorationPart[] {
  const point = transformSurfacePoint(placement, localX, localY, surface);
  return [{
    face: createLabFaceAtCenter(
      't',
      { ...point, z: height },
      placement.orientation === 'x' ? width : depth,
      placement.orientation === 'x' ? depth : width,
      'top',
    ),
    className,
  }];
}

function getDecorationCenter(
  decoration: LabDeskDecoration,
  surface: (typeof SURFACES)[keyof typeof SURFACES],
) {
  return {
    x: decoration.column + (decoration.width - 1) / 2
      + surface.offsetX,
    y: decoration.row + (decoration.depth - 1) / 2
      + surface.offsetY,
  };
}

function transformSurfacePoint(
  placement: LabFurniturePlacement,
  localX: number,
  localY: number,
  surface: keyof typeof SURFACES,
) {
  if (surface === 'workstation') {
    return transformLabDeskItemPoint(placement, localX, localY);
  }
  return placement.orientation === 'x'
    ? { x: placement.x + localX, y: placement.y + localY }
    : { x: placement.x + localY, y: placement.y + localX };
}
