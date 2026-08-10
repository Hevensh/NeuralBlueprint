import type { CSSProperties } from 'react';
import {
  LAB_ROOM_DEPTH,
  LAB_ROOM_WIDTH,
  type LabGridPoint,
  type LabFurniturePlacement,
  type LabWorkstationOrientation,
} from './labSceneLayout';

export const LAB_SCENE_WIDTH = 1280;
export const LAB_SCENE_HEIGHT = 648;

const LAB_HALF_TILE_X = 24.32;
const LAB_HALF_TILE_Y = 11.34;
const LAB_HEIGHT_STEP = 26.568;
const LAB_ORIGIN_X = LAB_SCENE_WIDTH / 2;
const LAB_ORIGIN_Y = 103.68;
const LAB_DEPTH_BASE = 100_000;

export interface LabSpatialPoint extends LabGridPoint {
  z: number;
}

export interface LabBounds3D {
  min: LabSpatialPoint;
  max: LabSpatialPoint;
}

export interface LabIsoFaceGeometry {
  bounds: LabBounds3D;
  face: 't' | 'l' | 'r';
  role: 'top' | 'front' | 'side';
  vertices?: LabSpatialPoint[];
}

export interface LabCuboidGeometry {
  bounds: LabBounds3D;
  orientation: LabWorkstationOrientation;
}

export interface LabFloorTile extends LabIsoFaceGeometry {
  id: string;
  variant: number;
}

export function createLabFloorTiles(): LabFloorTile[] {
  return Array.from({ length: LAB_ROOM_DEPTH }, (_, y) => (
    Array.from({ length: LAB_ROOM_WIDTH }, (_, x) => ({
      ...createLabFaceAtCenter('t', { x, y, z: 0 }, 1, 1, 'top'),
      id: `floor-${x}-${y}`,
      variant: (x + y) % 2,
    }))
  )).flat();
}

export function projectLabGridPoint(
  point: LabGridPoint,
  z = 0,
): CSSProperties {
  return {
    left: `${LAB_ORIGIN_X + (point.x - point.y) * LAB_HALF_TILE_X}px`,
    top: `${LAB_ORIGIN_Y + (point.x + point.y) * LAB_HALF_TILE_Y - z * LAB_HEIGHT_STEP}px`,
    zIndex: getLabDepthIndex(point, z),
  };
}

export function getLabDepthIndex(point: LabGridPoint, z = 0) {
  return LAB_DEPTH_BASE + Math.round((point.x + point.y + z) * 100);
}

export function createLabCuboid(
  placement: LabFurniturePlacement,
  width: number,
  depth: number,
  height: number,
  bottomZ = 0,
): LabCuboidGeometry {
  const xLength = placement.orientation === 'x' ? width : depth;
  const yLength = placement.orientation === 'x' ? depth : width;
  return {
    bounds: {
      min: {
        x: placement.x - xLength / 2,
        y: placement.y - yLength / 2,
        z: bottomZ,
      },
      max: {
        x: placement.x + xLength / 2,
        y: placement.y + yLength / 2,
        z: bottomZ + height,
      },
    },
    orientation: placement.orientation,
  };
}

export function createLabCuboidFaces(
  cuboid: LabCuboidGeometry,
): LabIsoFaceGeometry[] {
  const { min, max } = cuboid.bounds;
  return [
    {
      bounds: {
        min: { x: min.x, y: min.y, z: max.z },
        max: { x: max.x, y: max.y, z: max.z },
      },
      face: 't',
      role: 'top',
    },
    {
      bounds: {
        min: { x: max.x, y: min.y, z: min.z },
        max: { x: max.x, y: max.y, z: max.z },
      },
      face: 'l',
      role: cuboid.orientation === 'y' ? 'front' : 'side',
    },
    {
      bounds: {
        min: { x: min.x, y: max.y, z: min.z },
        max: { x: max.x, y: max.y, z: max.z },
      },
      face: 'r',
      role: cuboid.orientation === 'x' ? 'front' : 'side',
    },
  ];
}

export function createLabVerticalFace(
  placement: LabFurniturePlacement,
  length: number,
  height: number,
  centerZ = height / 2,
): LabIsoFaceGeometry {
  return createLabFaceAtCenter(
    placement.orientation === 'x' ? 'r' : 'l',
    { x: placement.x, y: placement.y, z: centerZ },
    length,
    height,
    'front',
  );
}

export function projectLabIsoFace(
  face: LabIsoFaceGeometry,
  zIndex: number,
): CSSProperties {
  const points = getLabFaceVertices(face).map(projectLabPoint);
  const left = Math.min(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const right = Math.max(...points.map((point) => point.x));
  const bottom = Math.max(...points.map((point) => point.y));
  return {
    position: 'absolute',
    boxSizing: 'border-box',
    left: `${left}px`,
    top: `${top}px`,
    width: `${Math.max(right - left, 0.01)}px`,
    height: `${Math.max(bottom - top, 0.01)}px`,
    clipPath: `polygon(${points.map((point) => `${point.x - left}px ${point.y - top}px`).join(', ')})`,
    transform: 'none',
    zIndex,
  };
}

export function createLabFaceAtCenter<F extends LabIsoFaceGeometry['face']>(
  face: F,
  center: LabSpatialPoint,
  width: number,
  height: number,
  role: LabIsoFaceGeometry['role'],
): LabIsoFaceGeometry & { face: F } {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  if (face === 't') {
    return {
      face,
      role,
      bounds: {
        min: { x: center.x - halfWidth, y: center.y - halfHeight, z: center.z },
        max: { x: center.x + halfWidth, y: center.y + halfHeight, z: center.z },
      },
    };
  }
  if (face === 'l') {
    return {
      face,
      role,
      bounds: {
        min: { x: center.x, y: center.y - halfWidth, z: center.z - halfHeight },
        max: { x: center.x, y: center.y + halfWidth, z: center.z + halfHeight },
      },
    };
  }
  return {
    face,
    role,
    bounds: {
      min: { x: center.x - halfWidth, y: center.y, z: center.z - halfHeight },
      max: { x: center.x + halfWidth, y: center.y, z: center.z + halfHeight },
    },
  };
}

export function getLabFaceCenter(face: LabIsoFaceGeometry): LabSpatialPoint {
  const { min, max } = face.bounds;
  return {
    x: (min.x + max.x) / 2,
    y: (min.y + max.y) / 2,
    z: (min.z + max.z) / 2,
  };
}

export function translateLabFace(
  face: LabIsoFaceGeometry,
  offset: LabSpatialPoint,
): LabIsoFaceGeometry {
  const move = (point: LabSpatialPoint) => ({
    x: point.x + offset.x,
    y: point.y + offset.y,
    z: point.z + offset.z,
  });
  return {
    ...face,
    vertices: face.vertices?.map(move),
    bounds: {
      min: move(face.bounds.min),
      max: move(face.bounds.max),
    },
  };
}

function getLabFaceVertices(face: LabIsoFaceGeometry): LabSpatialPoint[] {
  if (face.vertices) return face.vertices;
  const { min, max } = face.bounds;
  if (face.face === 't') {
    return [
      { x: min.x, y: min.y, z: min.z },
      { x: max.x, y: min.y, z: min.z },
      { x: max.x, y: max.y, z: max.z },
      { x: min.x, y: max.y, z: max.z },
    ];
  }
  if (face.face === 'l') {
    return [
      { x: min.x, y: min.y, z: min.z },
      { x: max.x, y: max.y, z: min.z },
      { x: min.x, y: max.y, z: max.z },
      { x: min.x, y: min.y, z: max.z },
    ];
  }
  return [
    { x: min.x, y: min.y, z: min.z },
    { x: max.x, y: max.y, z: min.z },
    { x: max.x, y: max.y, z: max.z },
    { x: min.x, y: min.y, z: max.z },
  ];
}

export function createLabQuadFace(
  vertices: LabSpatialPoint[],
  face: LabIsoFaceGeometry['face'],
  role: LabIsoFaceGeometry['role'],
): LabIsoFaceGeometry {
  return {
    face,
    role,
    vertices,
    bounds: {
      min: {
        x: Math.min(...vertices.map((point) => point.x)),
        y: Math.min(...vertices.map((point) => point.y)),
        z: Math.min(...vertices.map((point) => point.z)),
      },
      max: {
        x: Math.max(...vertices.map((point) => point.x)),
        y: Math.max(...vertices.map((point) => point.y)),
        z: Math.max(...vertices.map((point) => point.z)),
      },
    },
  };
}

function projectLabPoint(point: LabSpatialPoint) {
  return {
    x: LAB_ORIGIN_X + (point.x - point.y) * LAB_HALF_TILE_X,
    y: LAB_ORIGIN_Y + (point.x + point.y) * LAB_HALF_TILE_Y - point.z * LAB_HEIGHT_STEP,
  };
}
