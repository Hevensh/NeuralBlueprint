import type { LabDeskDecorationKind } from './decorationTypes';

export type DecorationRecipePart = {
  shape: 'cuboid' | 'flat' | 'vertical' | 'quad';
  className: string;
  offsetX?: number;
  offsetY?: number;
  width: number;
  depth?: number;
  height?: number;
  bottomOffset: number;
  plane?: 'top' | 'front' | 'side';
  vertices?: Array<{ x: number; y: number; z: number }>;
};

interface DecorationRecipeContext {
  width: number;
  depth: number;
  variant: number;
}

type DecorationRecipe = (
  context: DecorationRecipeContext,
) => DecorationRecipePart[];

const RECIPES: Record<LabDeskDecorationKind, DecorationRecipe> = {
  mug: () => [cuboid('body', 0.28, 0.28, 0.32)],
  penCup: () => [cuboid('body', 0.26, 0.26, 0.38)],
  plant: () => [
    cuboid('pot', 0.34, 0.34, 0.24),
    cuboid('leaves', 0.46, 0.46, 0.2, 0.38),
  ],
  deskLamp: ({ variant }) => [
    cuboid('lamp-base', 0.5, 0.38, 0.06),
    cuboid('lamp-stem', 0.11, 0.11, 0.42, 0.06, variant % 2 ? -0.08 : 0.08),
    cuboid('lamp-shade', 0.46, 0.32, 0.18, 0.43, variant % 2 ? -0.15 : 0.15),
  ],
  cactus: ({ variant }) => [
    cuboid('pot', 0.38, 0.38, 0.24),
    cuboid('cactus-body', 0.2, 0.2, 0.44, 0.22),
    cuboid('cactus-arm', 0.16, 0.14, 0.22, 0.34, variant % 2 ? -0.16 : 0.16),
    cuboid('cactus-arm', 0.14, 0.14, 0.18, 0.27, variant % 2 ? 0.16 : -0.16),
  ],
  figurine: ({ variant }) => [
    cuboid('figure-base', 0.4, 0.34, 0.07),
    cuboid('figure-body', 0.2, 0.16, 0.28, 0.07),
    cuboid('figure-head', 0.27, 0.24, 0.22, 0.35),
    cuboid('figure-accent', 0.1, 0.28, 0.16, 0.19, variant % 2 ? -0.15 : 0.15),
  ],
  headphones: ({ variant }) => [
    cuboid('headphone-pad', 0.22, 0.34, 0.12, 0, -0.23),
    cuboid('headphone-pad', 0.22, 0.34, 0.12, 0, 0.23),
    cuboid('headphone-band', 0.52, 0.1, 0.08, 0.03, 0, variant % 2 ? -0.2 : 0.2),
    cuboid('headphone-arm', 0.1, 0.22, 0.08, 0.04, -0.23, variant % 2 ? -0.1 : 0.1),
    cuboid('headphone-arm', 0.1, 0.22, 0.08, 0.04, 0.23, variant % 2 ? -0.1 : 0.1),
  ],
  books: ({ width, depth, variant }) => {
    const counts = pickBookCounts(variant);
    return [-width * 0.32, 0, width * 0.32].flatMap((centerX, stack) => {
      const random = createNumberRandom(variant * 31 + stack * 101);
      const baseAngle = (random() * 12 - 6) * Math.PI / 180;
      let bottomOffset = 0;
      return Array.from({ length: counts[stack] }, (_, layer) => {
        const thickness = pickBookThickness(random);
        const book = createBook(
          stack,
          layer,
          width * 0.17,
          depth * 0.68,
          bottomOffset,
          centerX + (random() - 0.5) * 0.04,
          (stack - 1) * 0.045 + (random() - 0.5) * 0.03,
          baseAngle + (random() * 4 - 2) * Math.PI / 180,
          thickness,
        );
        bottomOffset += 0.042 * thickness + 0.005;
        return book;
      }).flat();
    });
  },
  papers: ({ width, depth, variant }) => [
    flat('sheet', width, depth, 0.025),
    ...createPaperContent(width, depth, variant),
  ],
  printer: () => [
    cuboid('printer-base', 1.55, 0.72, 0.12),
    cuboid('printer-body', 1.18, 0.62, 0.34, 0.12, 0, -0.08),
    ramp('printer-paper', 0.82, 0.42, 0.28, 0.42, 0, -0.26),
    flat('printer-output', 0.92, 0.3, 0.14, 0, 0.35),
  ],
  oscilloscope: ({ variant }) => [
    cuboid('scope-base', 1.45, 0.74, 0.12),
    cuboid('scope-body', 1.14, 0.58, 0.5, 0.12),
    leaningPanel('scope-display', 0.64, 0.32, 0.12, 0.28, -0.16, 0.3),
    vertical('scope-control', 0.1, 0.1, 0.24, variant % 2 ? 0.34 : 0.42, 0.305),
    vertical('scope-control', 0.1, 0.1, 0.4, variant % 2 ? 0.42 : 0.34, 0.305),
  ],
  networkSwitch: ({ variant }) => [
    cuboid('switch-body', 1.58, 0.68, 0.2),
    ...[-0.54, -0.32, -0.1, 0.12, 0.34, 0.56].map((offsetX, index) => (
      vertical(
        `switch-port port-${index}`,
        0.14,
        0.08,
        0.06,
        offsetX,
        0.345,
      )
    )),
    vertical('switch-light', 0.06, 0.06, 0.12, variant % 2 ? -0.72 : 0.72, 0.348),
  ],
  documentTray: ({ width, depth }) => [
    cuboid('tray-base', width * 0.9, depth * 0.84, 0.05),
    cuboid('tray-back', width * 0.9, 0.08, 0.18, 0.05, 0, -depth * 0.38),
    cuboid('tray-side', 0.08, depth * 0.84, 0.14, 0.05, -width * 0.43),
    cuboid('tray-side', 0.08, depth * 0.84, 0.14, 0.05, width * 0.43),
    ...[-width * 0.27, 0, width * 0.27].flatMap((centerX, stack) => (
      Array.from({ length: stack === 1 ? 3 : 2 }, (_, layer) => rotatedCuboid(
        `tray-paper paper-stack-${stack}`,
        width * 0.22,
        depth * 0.52,
        0.007,
        0.055 + layer * 0.009,
        centerX + (layer - 1) * 0.012,
        (stack - 1) * 0.018 - layer * 0.006,
        ((stack - 1) * 3 + layer) * Math.PI / 180,
      )).flat()
    )),
  ],
  equipmentCrate: ({ width, depth }) => [
    cuboid('crate', width * 0.7, depth * 0.7, 0.3),
    cuboid('crate-band', width * 0.74, 0.11, 0.32, 0, 0, -depth * 0.2),
    cuboid('crate-band', width * 0.74, 0.11, 0.32, 0, 0, depth * 0.2),
    flat('crate-label', width * 0.28, depth * 0.2, 0.325, width * 0.12, 0),
  ],
  gpuTestBench: ({ variant }) => [
    flat('bench-mat', 1.5, 1.36, 0.02),
    cuboid('bench-board', 0.92, 0.72, 0.06, 0.025, -0.16, 0.04),
    ...rotatedCuboid(
      'bench-gpu',
      0.76,
      0.22,
      0.18,
      0.03,
      0.3,
      -0.34,
      (variant % 2 ? -5 : 5) * Math.PI / 180,
    ),
    cuboid('bench-heatsink', 0.32, 0.32, 0.16, 0.03, -0.48, 0.3),
    cuboid('bench-chip', 0.18, 0.18, 0.05, 0.03, -0.05, 0.18),
    ...rotatedCuboid('bench-memory', 0.1, 0.42, 0.09, 0.03, 0.3, 0.22, Math.PI / 24),
    ...rotatedCuboid('bench-memory', 0.1, 0.42, 0.09, 0.03, 0.48, 0.3, Math.PI / 18),
    topSegment('bench-wire', -0.48, -0.18, -0.2, -0.32, 0.035),
    topSegment('bench-wire', -0.2, -0.32, 0.02, -0.22, 0.035),
    flat('bench-light', 0.07, 0.07, 0.092, variant % 2 ? -0.42 : 0.18, 0.28),
  ],
};

export function getDecorationRecipe(
  kind: LabDeskDecorationKind,
  context: DecorationRecipeContext,
) {
  return RECIPES[kind](context);
}

function cuboid(
  className: string,
  width: number,
  depth: number,
  height: number,
  bottomOffset = 0,
  offsetX = 0,
  offsetY = 0,
): DecorationRecipePart {
  return {
    shape: 'cuboid',
    className,
    width,
    depth,
    height,
    bottomOffset,
    offsetX,
    offsetY,
  };
}

function flat(
  className: string,
  width: number,
  depth: number,
  bottomOffset: number,
  offsetX = 0,
  offsetY = 0,
): DecorationRecipePart {
  return {
    shape: 'flat',
    className,
    width,
    depth,
    bottomOffset,
    offsetX,
    offsetY,
  };
}

function vertical(
  className: string,
  width: number,
  height: number,
  bottomOffset: number,
  offsetX = 0,
  offsetY = 0,
): DecorationRecipePart {
  return {
    shape: 'vertical',
    className,
    width,
    height,
    bottomOffset,
    offsetX,
    offsetY,
  };
}

function ramp(
  className: string,
  width: number,
  depth: number,
  rise: number,
  bottomOffset: number,
  offsetX = 0,
  offsetY = 0,
): DecorationRecipePart {
  return quad(className, width, bottomOffset, offsetX, offsetY, 'top', [
    { x: -width / 2, y: -depth / 2, z: rise },
    { x: width / 2, y: -depth / 2, z: rise },
    { x: width / 2, y: depth / 2, z: 0 },
    { x: -width / 2, y: depth / 2, z: 0 },
  ]);
}

function leaningPanel(
  className: string,
  width: number,
  height: number,
  lean: number,
  bottomOffset: number,
  offsetX = 0,
  offsetY = 0,
): DecorationRecipePart {
  return quad(className, width, bottomOffset, offsetX, offsetY, 'front', [
    { x: -width / 2, y: lean / 2, z: 0 },
    { x: width / 2, y: lean / 2, z: 0 },
    { x: width / 2, y: -lean / 2, z: height },
    { x: -width / 2, y: -lean / 2, z: height },
  ]);
}

function quad(
  className: string,
  width: number,
  bottomOffset: number,
  offsetX: number,
  offsetY: number,
  plane: 'top' | 'front' | 'side',
  vertices: Array<{ x: number; y: number; z: number }>,
): DecorationRecipePart {
  return {
    shape: 'quad',
    className,
    width,
    bottomOffset,
    offsetX,
    offsetY,
    plane,
    vertices,
  };
}

function rotatedCuboid(
  className: string,
  width: number,
  depth: number,
  height: number,
  bottomOffset: number,
  offsetX: number,
  offsetY: number,
  angle: number,
) {
  const corners = [
    rotatePoint(-width / 2, -depth / 2, angle),
    rotatePoint(width / 2, -depth / 2, angle),
    rotatePoint(width / 2, depth / 2, angle),
    rotatePoint(-width / 2, depth / 2, angle),
  ];
  const point = (index: number, z: number) => ({ ...corners[index], z });
  return [
    quad(className, width, bottomOffset, offsetX, offsetY, 'top', [
      point(0, height), point(1, height), point(2, height), point(3, height),
    ]),
    quad(className, width, bottomOffset, offsetX, offsetY, 'front', [
      point(3, 0), point(2, 0), point(2, height), point(3, height),
    ]),
    quad(className, depth, bottomOffset, offsetX, offsetY, 'side', [
      point(1, 0), point(2, 0), point(2, height), point(1, height),
    ]),
  ];
}

function createBook(
  stack: number,
  layer: number,
  width: number,
  depth: number,
  bottomOffset: number,
  offsetX: number,
  offsetY: number,
  angle: number,
  thickness: number,
) {
  const identity = `stack-${stack} layer-${layer}`;
  const coverHeight = 0.008 * thickness;
  const pageHeight = 0.026 * thickness;
  return [
    ...rotatedCuboid(
      `book-cover ${identity}`,
      width,
      depth,
      coverHeight,
      bottomOffset,
      offsetX,
      offsetY,
      angle,
    ),
    ...rotatedCuboid(
      `book-pages ${identity}`,
      width * 0.9,
      depth * 0.92,
      pageHeight,
      bottomOffset + coverHeight,
      offsetX,
      offsetY,
      angle,
    ),
    ...rotatedCuboid(
      `book-cover ${identity}`,
      width,
      depth,
      coverHeight,
      bottomOffset + coverHeight + pageHeight,
      offsetX,
      offsetY,
      angle,
    ),
  ];
}

function rotatePoint(x: number, y: number, angle: number) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: x * cosine - y * sine,
    y: x * sine + y * cosine,
  };
}

function pickBookThickness(random: () => number) {
  const draw = random() * 7;
  if (draw < 4) return 1.5;
  if (draw < 6) return 2.25;
  return 3;
}

function pickBookCounts(variant: number) {
  const random = createNumberRandom(variant);
  const counts = [2, 3, 4, 5];
  for (let index = counts.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [counts[index], counts[swapIndex]] = [counts[swapIndex], counts[index]];
  }
  return counts.slice(0, 3);
}

function createNumberRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function createPaperContent(
  width: number,
  depth: number,
  variant: number,
): DecorationRecipePart[] {
  const landscape = createLandscapePaperContent(
    Math.max(width, depth),
    Math.min(width, depth),
    variant,
  );
  return width >= depth
    ? landscape
    : landscape.map(rotatePaperPart);
}

function createLandscapePaperContent(
  width: number,
  depth: number,
  variant: number,
): DecorationRecipePart[] {
  const z = 0.03;
  const columnWidth = width * 0.27;
  const centers = [-width * 0.31, 0, width * 0.31];
  const imageColumn = variant % centers.length;
  const secondImageColumn = variant === 3 ? (imageColumn + 2) % centers.length : -1;
  return [
    ...[-width * 0.155, width * 0.155].map((offsetX) => (
      flat('paper-divider', 0.015, depth * 0.76, z, offsetX, 0)
    )),
    ...centers.flatMap((centerX, columnIndex) => {
      if (columnIndex === imageColumn) {
        return createPaperGraphic(
          variant % 3,
          centerX,
          columnWidth,
          depth,
          z,
        );
      }
      if (columnIndex === secondImageColumn) {
        return createPaperGraphic(
          (variant + 1) % 3,
          centerX,
          columnWidth,
          depth,
          z,
        );
      }
      return createPaperTextColumn(
        centerX,
        columnWidth,
        depth,
        z,
        variant + columnIndex,
      );
    }),
  ];
}

function rotatePaperPart(part: DecorationRecipePart): DecorationRecipePart {
  const offsetX = part.offsetX ?? 0;
  const offsetY = part.offsetY ?? 0;
  if (part.shape === 'flat') {
    return {
      ...part,
      width: part.depth!,
      depth: part.width,
      offsetX: offsetY,
      offsetY: -offsetX,
    };
  }
  return {
    ...part,
    offsetX: offsetY,
    offsetY: -offsetX,
    vertices: part.vertices?.map((vertex) => ({
      x: vertex.y,
      y: -vertex.x,
      z: vertex.z,
    })),
  };
}

function createPaperTextColumn(
  centerX: number,
  width: number,
  depth: number,
  z: number,
  variant: number,
) {
  const lengths = [0.86, 0.62, 0.74, 0.48];
  return [-0.28, -0.09, 0.1, 0.29].map((row, index) => {
    const lineWidth = width * lengths[(variant + index) % lengths.length];
    return flat(
      index === 0 ? 'paper-title' : 'paper-text',
      lineWidth,
      index === 0 ? 0.04 : 0.025,
      z,
      centerX - (width - lineWidth) / 2,
      depth * row,
    );
  });
}

function createPaperGraphic(
  kind: number,
  centerX: number,
  width: number,
  depth: number,
  z: number,
): DecorationRecipePart[] {
  const left = centerX - width * 0.42;
  const right = centerX + width * 0.42;
  const baseline = depth * 0.28;
  const axes = [
    flat('paper-axis', width * 0.86, 0.02, z, centerX, baseline),
    flat('paper-axis', 0.02, depth * 0.62, z, left, 0),
  ];
  if (kind === 0) {
    return [
      ...axes,
      ...[0.22, 0.46, 0.32].map((height, index) => (
        flat(
          `paper-bar bar-${index}`,
          width * 0.16,
          depth * height,
          z,
          left + width * (0.22 + index * 0.25),
          baseline - depth * height / 2,
        )
      )),
    ];
  }
  if (kind === 1) {
    const points = [
      { x: left + width * 0.08, y: depth * 0.14 },
      { x: centerX - width * 0.08, y: -depth * 0.08 },
      { x: centerX + width * 0.12, y: depth * 0.05 },
      { x: right - width * 0.05, y: -depth * 0.22 },
    ];
    return [
      ...axes,
      ...points.slice(1).map((point, index) => (
        topSegment('paper-plot', points[index].x, points[index].y, point.x, point.y, z)
      )),
    ];
  }
  const nodeX = [left + width * 0.12, centerX, right - width * 0.12];
  return [
    ...nodeX.map((offsetX, index) => (
      flat(`paper-node node-${index}`, width * 0.18, depth * 0.17, z, offsetX, index === 1 ? -depth * 0.14 : depth * 0.1)
    )),
    topSegment('paper-link', nodeX[0], depth * 0.1, nodeX[1], -depth * 0.14, z),
    topSegment('paper-link', nodeX[1], -depth * 0.14, nodeX[2], depth * 0.1, z),
  ];
}

function topSegment(
  className: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  bottomOffset: number,
): DecorationRecipePart {
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy) || 1;
  const halfThickness = 0.018;
  const normalX = -dy / length * halfThickness;
  const normalY = dx / length * halfThickness;
  return quad(className, length, bottomOffset, 0, 0, 'top', [
    { x: startX + normalX, y: startY + normalY, z: 0 },
    { x: endX + normalX, y: endY + normalY, z: 0 },
    { x: endX - normalX, y: endY - normalY, z: 0 },
    { x: startX - normalX, y: startY - normalY, z: 0 },
  ]);
}
