import {
  createSeededRandom,
  randomInt,
  sampleNormal,
  shuffle,
  type Random,
} from './random';
import type {
  DependencyEdge,
  InterferenceEdge,
  KnowledgeGraph,
  KnowledgeNode,
  NodeId,
  SubstituteEdge,
} from './types';

export type KnowledgeGraphGenerationOptions = {
  minNodes?: number;
  maxNodes?: number;
  seed?: string;
};

type Point = { x: number; y: number };
type Pair = {
  source: NodeId;
  target: NodeId;
  distance: number;
};
type RelationKind = 'dependency' | 'substitute' | 'interference';

const NODE_COLORS = [
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
  '#f43f5e',
];

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 900;
const CANVAS_MARGIN = 90;
const IDEAL_NODE_DISTANCE = 190;
const MIN_NODE_DISTANCE = 145;
const AXIS_CLEARANCE = 70;
const COLLINEAR_CLEARANCE = 42;
const EDGE_NODE_CLEARANCE = 70;
const POSITION_CANDIDATES = 96;

export function generateRandomKnowledgeGraph(
  options: KnowledgeGraphGenerationOptions = {},
): KnowledgeGraph {
  const random = options.seed?.trim()
    ? createSeededRandom(options.seed.trim())
    : Math.random;
  const minNodes = Math.max(2, Math.floor(options.minNodes ?? 12));
  const maxNodes = Math.max(minNodes, Math.floor(options.maxNodes ?? 16));
  const nodeCount = randomInt(random, minNodes, maxNodes);
  const nodes = createNodes(nodeCount, random);
  const nodeIds = Object.keys(nodes);
  const pairCount = nodeCount * (nodeCount - 1) / 2;
  const edgeCount = Math.min(pairCount, Math.round(nodeCount * 1.7));
  const selectedPairs = selectGeometricPairs(nodes, edgeCount, random);
  const assignments = shuffle(selectedPairs, random).map((pair, index) => ({
    ...pair,
    kind: relationKind(index),
  }));
  const dependencyOrder = new Map(
    shuffle(nodeIds, random).map((id, index) => [id, index]),
  );
  const depEdges: DependencyEdge[] = [];
  const subEdges: SubstituteEdge[] = [];
  const interEdges: InterferenceEdge[] = [];

  assignments.forEach((pair) => {
    if (pair.kind === 'dependency') {
      const source = (dependencyOrder.get(pair.source) ?? 0)
        < (dependencyOrder.get(pair.target) ?? 0)
        ? pair.source
        : pair.target;
      const target = source === pair.source ? pair.target : pair.source;
      depEdges.push({
        kind: 'dependency',
        id: `dep_${depEdges.length + 1}`,
        source: nodes[source],
        target: nodes[target],
        stats: createEdgeStats(random, 9, 18, 13.5, 1.5),
      });
    } else if (pair.kind === 'substitute') {
      const [source, target] = random() < 0.5
        ? [pair.source, pair.target]
        : [pair.target, pair.source];
      subEdges.push({
        kind: 'substitute',
        id: `sub_${subEdges.length + 1}`,
        source: nodes[source],
        target: nodes[target],
        stats: createEdgeStats(random, 9, 18, 13.5, 1.5),
      });
    } else {
      interEdges.push({
        kind: 'interference',
        id: `inter_${interEdges.length + 1}`,
        source: nodes[pair.source],
        target: nodes[pair.target],
        stats: createEdgeStats(random, 6, 12, 9, 1),
      });
    }
  });

  return {
    nodes,
    depEdges,
    subEdges,
    interEdges,
  };
}

function createNodes(
  nodeCount: number,
  random: Random,
): Record<NodeId, KnowledgeNode> {
  const positions = createGeometricPositions(nodeCount, random);
  const colors = shuffle(
    Array.from(
      { length: nodeCount },
      (_, index) => NODE_COLORS[index % NODE_COLORS.length],
    ),
    random,
  );

  return Object.fromEntries(
    positions.map((position, index) => {
      const id = `knowledge_${index + 1}`;
      const lossMin = Math.exp(sampleNormal(random, -3, 0.8));
      const lossMax = Math.max(
        lossMin * 2,
        Math.exp(sampleNormal(random, 3, 0.8)),
      );
      return [id, {
        kind: 'node',
        id,
        label: `K${index + 1}`,
        dataAmount: clippedNormalInt(random, 90, 10, 1, 120),
        requiredMemory: clippedNormalInt(random, 30, 2, 24, 36),
        overfitCoefficient: coefficient(random),
        lossMin: Number(lossMin.toFixed(5)),
        lossMax: Number(lossMax.toFixed(5)),
        color: colors[index],
        position,
      }];
    }),
  );
}

function createGeometricPositions(
  nodeCount: number,
  random: Random,
): Point[] {
  const positions: Point[] = [{
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
  }];

  while (positions.length < nodeCount) {
    const candidates = Array.from(
      { length: POSITION_CANDIDATES },
      () => createPositionCandidate(positions, random),
    );
    const best = candidates
      .map((point) => ({ point, score: positionScore(point, positions) }))
      .reduce((currentBest, candidate) => (
        candidate.score > currentBest.score ? candidate : currentBest
      )).point;
    positions.push({
      x: Math.round(best.x),
      y: Math.round(best.y),
    });
  }
  return positions;
}

function createPositionCandidate(
  positions: Point[],
  random: Random,
): Point {
  if (random() < 0.78) {
    const anchor = positions[randomInt(random, 0, positions.length - 1)];
    const angle = random() * Math.PI * 2;
    const radius = IDEAL_NODE_DISTANCE * (0.82 + random() * 0.5);
    return clampToCanvas({
      x: anchor.x + Math.cos(angle) * radius,
      y: anchor.y + Math.sin(angle) * radius,
    });
  }
  return {
    x: randomInt(random, CANVAS_MARGIN, CANVAS_WIDTH - CANVAS_MARGIN),
    y: randomInt(random, CANVAS_MARGIN, CANVAS_HEIGHT - CANVAS_MARGIN),
  };
}

function positionScore(candidate: Point, positions: Point[]): number {
  const distances = positions.map((point) => distance(candidate, point));
  const nearest = Math.min(...distances);
  const separationReward = Math.min(
    nearest / IDEAL_NODE_DISTANCE,
    1.35,
  ) * 4;
  const collisionPenalty = nearest < MIN_NODE_DISTANCE
    ? Math.pow((MIN_NODE_DISTANCE - nearest) / MIN_NODE_DISTANCE, 2) * 18
    : 0;
  const axisPenalty = positions.reduce((penalty, point) => {
    const dx = Math.abs(candidate.x - point.x);
    const dy = Math.abs(candidate.y - point.y);
    const xAlignment = dx < AXIS_CLEARANCE && dy < IDEAL_NODE_DISTANCE * 1.5
      ? (AXIS_CLEARANCE - dx) / AXIS_CLEARANCE
      : 0;
    const yAlignment = dy < AXIS_CLEARANCE && dx < IDEAL_NODE_DISTANCE * 1.5
      ? (AXIS_CLEARANCE - dy) / AXIS_CLEARANCE
      : 0;
    return penalty + Math.max(xAlignment, yAlignment);
  }, 0) * 2.2;
  const collinearPenalty = collinearityPenalty(candidate, positions) * 3;
  const center = centroid(positions);
  const compactnessPenalty = distance(candidate, center)
    / Math.hypot(CANVAS_WIDTH, CANVAS_HEIGHT);

  return separationReward
    - collisionPenalty
    - axisPenalty
    - collinearPenalty
    - compactnessPenalty;
}

function collinearityPenalty(candidate: Point, positions: Point[]): number {
  let penalty = 0;
  positions.forEach((start, startIndex) => {
    positions.slice(startIndex + 1).forEach((end) => {
      if (distance(start, end) < IDEAL_NODE_DISTANCE * 1.15) return;
      const clearance = distancePointToSegment(candidate, start, end);
      if (clearance < COLLINEAR_CLEARANCE) {
        penalty = Math.max(
          penalty,
          (COLLINEAR_CLEARANCE - clearance) / COLLINEAR_CLEARANCE,
        );
      }
    });
  });
  return penalty;
}

function selectGeometricPairs(
  nodes: Record<NodeId, KnowledgeNode>,
  edgeCount: number,
  random: Random,
): Pair[] {
  const nodeIds = Object.keys(nodes);
  const pairs = allPairs(nodes);
  const selected: Pair[] = [];
  const used = new Set<string>();
  const degrees = Object.fromEntries(nodeIds.map((id) => [id, 0]));
  const graphCenter = centroid(
    Object.values(nodes).map((node) => node.position),
  );
  const connected = new Set<NodeId>([
    nodeIds.reduce((closest, id) => (
      distance(nodes[id].position, graphCenter)
        < distance(nodes[closest].position, graphCenter)
        ? id
        : closest
    ), nodeIds[0]),
  ]);

  while (connected.size < nodeIds.length) {
    const candidates = pairs.filter((pair) => (
      connected.has(pair.source) !== connected.has(pair.target)
    ));
    const best = lowestScoredPair(
      candidates,
      nodes,
      selected,
      degrees,
      random,
    );
    addPair(best);
    connected.add(best.source);
    connected.add(best.target);
  }

  while (selected.length < edgeCount) {
    const candidates = pairs.filter((pair) => !used.has(pairKey(pair)));
    if (candidates.length === 0) break;
    addPair(lowestScoredPair(
      candidates,
      nodes,
      selected,
      degrees,
      random,
    ));
  }

  return selected;

  function addPair(pair: Pair) {
    selected.push(pair);
    used.add(pairKey(pair));
    degrees[pair.source] += 1;
    degrees[pair.target] += 1;
  }
}

function lowestScoredPair(
  pairs: Pair[],
  nodes: Record<NodeId, KnowledgeNode>,
  selected: Pair[],
  degrees: Record<NodeId, number>,
  random: Random,
) {
  return pairs
    .map((pair) => ({
      pair,
      score: edgeScore(pair, nodes, selected, degrees, random),
    }))
    .reduce((best, candidate) => (
      candidate.score < best.score ? candidate : best
    )).pair;
}

function edgeScore(
  pair: Pair,
  nodes: Record<NodeId, KnowledgeNode>,
  selected: Pair[],
  degrees: Record<NodeId, number>,
  random: Random,
) {
  const source = nodes[pair.source].position;
  const target = nodes[pair.target].position;
  const lengthCost = pair.distance / IDEAL_NODE_DISTANCE;
  const nodeOcclusionCost = Object.values(nodes).reduce((cost, node) => {
    if (node.id === pair.source || node.id === pair.target) return cost;
    const clearance = distancePointToSegment(node.position, source, target);
    return clearance < EDGE_NODE_CLEARANCE
      ? cost + Math.pow(
        (EDGE_NODE_CLEARANCE - clearance) / EDGE_NODE_CLEARANCE,
        2,
      ) * 7
      : cost;
  }, 0);
  const crossingCost = selected.reduce((cost, selectedPair) => (
    edgesCross(pair, selectedPair, nodes) ? cost + 5 : cost
  ), 0);
  const degreeCost = (
    degrees[pair.source]
    + degrees[pair.target]
    + Math.max(degrees[pair.source], degrees[pair.target])
  ) * 0.32;

  return lengthCost
    + nodeOcclusionCost
    + crossingCost
    + degreeCost
    + random() * 0.08;
}

function allPairs(nodes: Record<NodeId, KnowledgeNode>): Pair[] {
  const values = Object.values(nodes);
  return values.flatMap((source, sourceIndex) => (
    values.slice(sourceIndex + 1).map((target) => ({
      source: source.id,
      target: target.id,
      distance: distance(source.position, target.position),
    }))
  ));
}

function edgesCross(
  first: Pair,
  second: Pair,
  nodes: Record<NodeId, KnowledgeNode>,
) {
  if (
    first.source === second.source
    || first.source === second.target
    || first.target === second.source
    || first.target === second.target
  ) return false;

  const a = nodes[first.source].position;
  const b = nodes[first.target].position;
  const c = nodes[second.source].position;
  const d = nodes[second.target].position;
  return orientation(a, b, c) * orientation(a, b, d) < 0
    && orientation(c, d, a) * orientation(c, d, b) < 0;
}

function orientation(a: Point, b: Point, c: Point) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function distancePointToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(point, start);
  const progress = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    ),
  );
  return distance(point, {
    x: start.x + progress * dx,
    y: start.y + progress * dy,
  });
}

function centroid(points: Point[]): Point {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function clampToCanvas(point: Point): Point {
  return {
    x: Math.max(CANVAS_MARGIN, Math.min(CANVAS_WIDTH - CANVAS_MARGIN, point.x)),
    y: Math.max(CANVAS_MARGIN, Math.min(CANVAS_HEIGHT - CANVAS_MARGIN, point.y)),
  };
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function relationKind(index: number): RelationKind {
  return (
    ['dependency', 'substitute', 'dependency', 'interference'][index % 4]
  ) as RelationKind;
}

function createEdgeStats(
  random: Random,
  min: number,
  max: number,
  mean: number,
  standardDeviation: number,
) {
  return {
    requiredMemory: clippedNormalInt(random, mean, standardDeviation, min, max),
    overfitCoefficient: coefficient(random),
    lambda: coefficient(random),
  };
}

function clippedNormalInt(
  random: Random,
  mean: number,
  standardDeviation: number,
  min: number,
  max: number,
) {
  return Math.round(Math.max(
    min,
    Math.min(max, sampleNormal(random, mean, standardDeviation)),
  ));
}

function coefficient(random: Random) {
  return Number(Math.max(
    0.7,
    Math.min(1.3, sampleNormal(random, 1, 0.1)),
  ).toFixed(3));
}

function pairKey(pair: Pair) {
  return [pair.source, pair.target].sort().join(':');
}
