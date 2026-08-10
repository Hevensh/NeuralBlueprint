import type { CSSProperties } from 'react';
import type { LabGridPoint } from './labSceneLayout';
import type { LabBounds3D, LabIsoFaceGeometry } from './labIsometric';

const DEPTH_BASE = 100_000;
const DEPTH_EPSILON = 0.0001;

export function projectLabDepthGroup(point: LabGridPoint): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    zIndex: Math.round((point.x + point.y) * 100),
  };
}

export function createLabFaceDepthMap(
  faces: LabIsoFaceGeometry[],
  base = DEPTH_BASE,
): Map<LabIsoFaceGeometry, number> {
  const outgoing = faces.map(() => new Set<number>());
  const incoming = faces.map(() => 0);

  for (let first = 0; first < faces.length; first += 1) {
    for (let second = first + 1; second < faces.length; second += 1) {
      const relation = compareBounds(faces[first].bounds, faces[second].bounds);
      if (relation < 0) addEdge(first, second, outgoing, incoming);
      if (relation > 0) addEdge(second, first, outgoing, incoming);
    }
  }

  const remaining = new Set(faces.map((_, index) => index));
  const ordered: number[] = [];
  while (remaining.size > 0) {
    const ready = [...remaining].filter((index) => incoming[index] === 0);
    const next = pickFarthest(ready.length > 0 ? ready : [...remaining], faces);
    remaining.delete(next);
    ordered.push(next);
    outgoing[next].forEach((target) => {
      incoming[target] -= 1;
    });
  }

  return new Map(ordered.map((faceIndex, order) => [
    faces[faceIndex],
    base + order,
  ]));
}

function compareBounds(first: LabBounds3D, second: LabBounds3D) {
  const firstBehind = isEntirelyBehind(first, second);
  const secondBehind = isEntirelyBehind(second, first);
  if (firstBehind !== secondBehind) return firstBehind ? -1 : 1;
  return 0;
}

function isEntirelyBehind(first: LabBounds3D, second: LabBounds3D) {
  return first.max.x <= second.min.x + DEPTH_EPSILON
    || first.max.y <= second.min.y + DEPTH_EPSILON
    || first.max.z <= second.min.z + DEPTH_EPSILON;
}

function addEdge(
  from: number,
  to: number,
  outgoing: Set<number>[],
  incoming: number[],
) {
  if (outgoing[from].has(to)) return;
  outgoing[from].add(to);
  incoming[to] += 1;
}

function pickFarthest(
  candidates: number[],
  faces: LabIsoFaceGeometry[],
) {
  return candidates.reduce((farthest, candidate) => (
    fallbackDepth(faces[candidate]) < fallbackDepth(faces[farthest])
      ? candidate
      : farthest
  ));
}

function fallbackDepth(face: LabIsoFaceGeometry) {
  const { min, max } = face.bounds;
  return min.x + min.y + min.z
    + (max.x + max.y + max.z) * 0.001;
}
