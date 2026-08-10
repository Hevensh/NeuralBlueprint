import { memo } from 'react';
import { createLabFaceDepthMap } from '../labDepth';
import { getDecorationFaceStyle } from '../labFaceStyles';
import {
  createLabCuboid,
  createLabCuboidFaces,
  createLabFaceAtCenter,
  createLabQuadFace,
  projectLabGridPoint,
  projectLabIsoFace,
  type LabIsoFaceGeometry,
} from '../labIsometric';
import type { LabFurniturePlacement } from '../labSceneLayout';
import {
  getDeskSlotLayer,
  getWorkstationLayerBase,
  WORKSTATION_LAYER,
} from '../labWorkstationDepth';
import { transformLabDeskItemPoint } from '../labWorkstationGeometry';
import {
  getDecorationRecipe,
  type DecorationRecipePart,
} from './decorationRecipes';
import type { LabDeskDecoration } from './decorationTypes';

interface LabDeskDecorationsProps {
  decorations: LabDeskDecoration[];
  placement: LabFurniturePlacement;
  towerTop?: { x: number; y: number };
  towerTopDepthBase?: number;
  surface?: DecorationSurface;
  getLabel?: (decoration: LabDeskDecoration) => string;
}

type DecorationSurface = 'workstation' | 'commonTable';

const SURFACES = {
  workstation: { height: 1, offsetX: 0, offsetY: 0 },
  commonTable: { height: 0.92, offsetX: -2, offsetY: -1 },
} as const;

interface DecorationPart {
  face: LabIsoFaceGeometry;
  className: string;
}

export const LabDeskDecorations = memo(function LabDeskDecorations({
  decorations,
  placement,
  towerTop,
  towerTopDepthBase,
  surface = 'workstation',
  getLabel,
}: LabDeskDecorationsProps) {
  const surfaceConfig = SURFACES[surface];
  const renderParts = decorations.flatMap((decoration) => (
    createDecorationParts(
      decoration,
      placement,
      towerTop,
      surface,
      surfaceConfig,
    ).map((part, partIndex) => ({ decoration, part, partIndex }))
  ));
  const depthMap = createDecorationDepthMap(
    decorations,
    renderParts,
    placement,
    surface,
    surfaceConfig,
    towerTopDepthBase,
  );

  return (
    <>
      {renderParts.map(({ decoration, part, partIndex }) => (
        <span
          aria-hidden="true"
          className={`lab-desk-decoration kind-${decoration.kind} variant-${decoration.variant} ${part.className} face-${part.face.face} role-${part.face.role}`}
          key={`${decoration.id}-${partIndex}`}
          style={{
            ...projectLabIsoFace(part.face, depthMap.get(part.face)!),
            ...getDecorationFaceStyle(decoration, part.face, part.className),
          }}
        />
      ))}
      {getLabel && decorations.map((decoration) => {
        const center = getDecorationCenter(decoration, surfaceConfig);
        const point = transformSurfacePoint(
          placement,
          center.x,
          center.y,
          surface,
        );
        return (
          <span
            className="lab-decoration-label"
            key={`${decoration.id}-label`}
            style={projectLabGridPoint(point, surfaceConfig.height + 0.9)}
          >
            {getLabel(decoration)}
          </span>
        );
      })}
    </>
  );
});

function createDecorationParts(
  decoration: LabDeskDecoration,
  placement: LabFurniturePlacement,
  towerTop: { x: number; y: number } | undefined,
  surface: DecorationSurface,
  surfaceConfig: (typeof SURFACES)[DecorationSurface],
) {
  const center = getDecorationCenter(decoration, surfaceConfig);
  const baseHeight = decoration.surface === 'towerTop'
    ? 1.8
    : surfaceConfig.height;
  const recipe = getDecorationRecipe(decoration.kind, {
    width: Math.max(0.24, decoration.width - 0.2),
    depth: Math.max(0.24, decoration.depth - 0.2),
    variant: decoration.variant,
  });

  return recipe.flatMap((part) => createRecipePart(
    part,
    placement,
    center,
    baseHeight,
    decoration.surface === 'towerTop' ? towerTop : undefined,
    surface,
  ));
}

function createRecipePart(
  part: DecorationRecipePart,
  placement: LabFurniturePlacement,
  center: { x: number; y: number },
  baseHeight: number,
  towerTop: { x: number; y: number } | undefined,
  surface: DecorationSurface,
): DecorationPart[] {
  const point = towerTop
    ? offsetDeskPoint(
        towerTop,
        placement,
        part.offsetX ?? 0,
        part.offsetY ?? 0,
      )
    : transformSurfacePoint(
        placement,
        center.x + (part.offsetX ?? 0),
        center.y + (part.offsetY ?? 0),
        surface,
      );
  const z = baseHeight + part.bottomOffset;

  if (part.shape === 'quad') {
    const vertices = part.vertices!.map((vertex) => {
      const vertexPoint = towerTop
        ? offsetDeskPoint(
            towerTop,
            placement,
            (part.offsetX ?? 0) + vertex.x,
            (part.offsetY ?? 0) + vertex.y,
          )
        : transformSurfacePoint(
            placement,
            center.x + (part.offsetX ?? 0) + vertex.x,
            center.y + (part.offsetY ?? 0) + vertex.y,
            surface,
          );
      return { ...vertexPoint, z: z + vertex.z };
    });
    const face = part.plane === 'top'
      ? 't'
      : part.plane === 'front'
        ? placement.orientation === 'x' ? 'r' : 'l'
        : placement.orientation === 'x' ? 'l' : 'r';
    return [{
      face: createLabQuadFace(
        vertices,
        face,
        part.plane ?? 'top',
      ),
      className: part.className,
    }];
  }

  if (part.shape === 'cuboid') {
    return createLabCuboidFaces(createLabCuboid(
      { ...point, orientation: placement.orientation },
      part.width,
      part.depth!,
      part.height!,
      z,
    )).map((face) => ({ face, className: part.className }));
  }

  const face = part.shape === 'flat'
    ? createLabFaceAtCenter(
        't',
        { ...point, z },
        placement.orientation === 'x' ? part.width : part.depth!,
        placement.orientation === 'x' ? part.depth! : part.width,
        'top',
      )
    : createLabFaceAtCenter(
        placement.orientation === 'x' ? 'r' : 'l',
        { ...point, z: z + part.height! / 2 },
        part.width,
        part.height!,
        'front',
      );
  return [{ face, className: part.className }];
}

function createDecorationDepthMap(
  decorations: LabDeskDecoration[],
  renderParts: Array<{
    decoration: LabDeskDecoration;
    part: DecorationPart;
  }>,
  placement: LabFurniturePlacement,
  surface: DecorationSurface,
  surfaceConfig: (typeof SURFACES)[DecorationSurface],
  towerTopDepthBase?: number,
) {
  const depthMap = new Map<LabIsoFaceGeometry, number>();
  if (surface === 'commonTable') {
    createLabFaceDepthMap(
      renderParts.map(({ part }) => part.face),
      100_100,
    ).forEach((depth, face) => depthMap.set(face, depth));
    return depthMap;
  }

  decorations.forEach((decoration) => {
    const faces = renderParts
      .filter((renderPart) => renderPart.decoration === decoration)
      .map(({ part }) => part.face);
    const center = getDecorationCenter(decoration, surfaceConfig);
    const depthBase = decoration.surface === 'towerTop'
      ? towerTopDepthBase ?? getWorkstationLayerBase(WORKSTATION_LAYER.slotNear)
      : getWorkstationLayerBase(
          getDeskSlotLayer(placement.orientation, center.x, center.y),
        );
    createLabFaceDepthMap(faces, depthBase).forEach(
      (depth, face) => depthMap.set(face, depth),
    );
  });
  return depthMap;
}

function getDecorationCenter(
  decoration: LabDeskDecoration,
  surface: (typeof SURFACES)[DecorationSurface],
) {
  return {
    x: decoration.column + (decoration.width - 1) / 2 + surface.offsetX,
    y: decoration.row + (decoration.depth - 1) / 2 + surface.offsetY,
  };
}

function transformSurfacePoint(
  placement: LabFurniturePlacement,
  localX: number,
  localY: number,
  surface: DecorationSurface,
) {
  if (surface === 'workstation') {
    return transformLabDeskItemPoint(placement, localX, localY);
  }
  return placement.orientation === 'x'
    ? { x: placement.x + localX, y: placement.y + localY }
    : { x: placement.x + localY, y: placement.y + localX };
}

function offsetDeskPoint(
  point: { x: number; y: number },
  placement: LabFurniturePlacement,
  offsetX: number,
  offsetY: number,
) {
  return placement.orientation === 'x'
    ? { x: point.x + offsetX, y: point.y + offsetY }
    : { x: point.x + offsetY, y: point.y - offsetX };
}
