import {
  createLabCuboid,
  createLabCuboidFaces,
  createLabFaceAtCenter,
  createLabVerticalFace,
  getLabFaceCenter,
  projectLabGridPoint,
  projectLabIsoFace,
  translateLabFace,
  type LabIsoFaceGeometry,
} from './labIsometric';
import { createLabFaceDepthMap, projectLabDepthGroup } from './labDepth';
import type { LabFurniturePlacement } from './labSceneLayout';
import {
  BOOKSHELF_FACE_STYLES,
  COMMON_TABLE_FACE_STYLES,
  COMMON_TABLE_LEG_FACE_STYLES,
  FURNITURE_DETAIL_STYLES,
  resolveFaceStyle,
  SERVER_FACE_STYLES,
  WHITEBOARD_FACE_STYLE,
  WHITEBOARD_SUPPORT_FACE_STYLES,
} from './labFaceStyles';
import { LabDeskDecorations } from './LabDeskDecorations';
import type { LabDeskDecoration } from './labDeskDecorationModel';

interface LabFurnitureProps {
  label: string;
  placement: LabFurniturePlacement;
  onClick: () => void;
}

interface LabCommonTableProps {
  placement: LabFurniturePlacement;
  decorations: LabDeskDecoration[];
}

export function LabCommonTable({
  placement,
  decorations,
}: LabCommonTableProps) {
  const surface = createLabCuboidFaces(
    createLabCuboid(placement, 5, 3, 0.14, 0.78),
  );
  const legFaces = [
    [-2.05, -1.05],
    [2.05, -1.05],
    [-2.05, 1.05],
    [2.05, 1.05],
  ].flatMap(([localX, localY]) => {
    const point = offsetFurniturePoint(placement, localX, localY);
    return createLabCuboidFaces(createLabCuboid(
      { ...point, orientation: placement.orientation },
      0.24,
      0.24,
      0.78,
    ));
  });
  const depthMap = createLabFaceDepthMap([...legFaces, ...surface]);
  const project = (face: LabIsoFaceGeometry) => (
    projectLabIsoFace(face, depthMap.get(face)!)
  );

  return (
    <div className="lab-furniture" style={projectLabDepthGroup(placement)}>
      {legFaces.map((face, index) => (
        <span
          aria-hidden="true"
          className={`lab-common-table-leg face-${face.face}`}
          key={`leg-${index}`}
          style={{
            ...project(face),
            ...resolveFaceStyle(COMMON_TABLE_LEG_FACE_STYLES, face),
          }}
        />
      ))}
      {surface.map((face) => (
        <span
          aria-hidden="true"
          className={`lab-common-table-face ${face.role} face-${face.face}`}
          key={face.face}
          style={{
            ...project(face),
            ...resolveFaceStyle(COMMON_TABLE_FACE_STYLES, face),
          }}
        />
      ))}
      <LabDeskDecorations
        decorations={decorations}
        placement={placement}
        surface="commonTable"
      />
    </div>
  );
}

export function LabWhiteboard({ label, placement, onClick }: LabFurnitureProps) {
  const face = createLabVerticalFace(placement, 4, 2, 1.95);
  const supports = [-1.55, 1.55].flatMap((offset) => {
    const point = offsetFurniturePoint(placement, offset, 0);
    return createLabCuboidFaces(createLabCuboid(
      { ...point, orientation: placement.orientation },
      0.12,
      0.12,
      1,
    ));
  });
  const depthMap = createLabFaceDepthMap([...supports, face]);
  return (
    <div className="lab-furniture" style={projectLabDepthGroup(placement)}>
      {supports.map((support, index) => (
        <span
          aria-hidden="true"
          className={`lab-whiteboard-support face-${support.face}`}
          key={`support-${index}`}
          style={{
            ...projectLabIsoFace(support, depthMap.get(support)!),
            ...resolveFaceStyle(WHITEBOARD_SUPPORT_FACE_STYLES, support),
          }}
        />
      ))}
      <button
        aria-label={label}
        className={`lab-furniture-face lab-whiteboard-face face-${face.face}`}
        onClick={onClick}
        style={{ ...projectLabIsoFace(face, depthMap.get(face)!), ...WHITEBOARD_FACE_STYLE }}
        type="button"
      >
        <i /><i /><i />
      </button>
    </div>
  );
}

export function LabBookshelf({ label, placement, onClick }: LabFurnitureProps) {
  const faces = createLabCuboidFaces(createLabCuboid(placement, 2, 0.8, 2.5));
  const frontFace = faces.find((face) => face.role === 'front');
  const openings = frontFace ? createBookshelfOpenings(frontFace) : [];
  const shelves = frontFace ? createBookshelfShelves(frontFace) : [];
  const books = frontFace ? createBookshelfBooks(frontFace) : [];
  const depthMap = createLabFaceDepthMap([...faces, ...openings, ...shelves, ...books]);
  const project = (face: LabIsoFaceGeometry) => (
    projectLabIsoFace(face, depthMap.get(face)!)
  );
  return (
    <div className="lab-furniture" style={projectLabDepthGroup(placement)}>
      {faces.map((face) => {
        const className = `lab-furniture-face lab-bookshelf-face ${face.role} face-${face.face}`;
        return face.role === 'front' ? (
          <button
            aria-label={label}
            className={className}
            key={face.face}
            onClick={onClick}
            style={{ ...project(face), ...resolveFaceStyle(BOOKSHELF_FACE_STYLES, face) }}
            type="button"
          />
        ) : (
          <span
            aria-hidden="true"
            className={className}
            key={face.face}
            style={{ ...project(face), ...resolveFaceStyle(BOOKSHELF_FACE_STYLES, face) }}
          />
        );
      })}
      {openings.map((opening, index) => (
        <span
          aria-hidden="true"
          className="lab-bookshelf-opening"
          key={`opening-${index}`}
          style={{ ...project(opening), ...FURNITURE_DETAIL_STYLES.bookshelfOpening }}
        />
      ))}
      {shelves.map((shelf, index) => (
        <span
          aria-hidden="true"
          className="lab-bookshelf-shelf"
          key={`shelf-${index}`}
          style={{ ...project(shelf), ...FURNITURE_DETAIL_STYLES.bookshelfShelf }}
        />
      ))}
      {books.map((book, index) => (
        <span
          aria-hidden="true"
          className={`lab-bookshelf-book color-${index % 4}`}
          key={`book-${index}`}
          style={{
            ...project(book),
            ...FURNITURE_DETAIL_STYLES.bookshelfBooks[index % 4],
          }}
        />
      ))}
    </div>
  );
}

export function LabServerRack({ label, placement, onClick }: LabFurnitureProps) {
  const faces = createLabCuboidFaces(createLabCuboid(placement, 1.6, 2, 2.5));
  const frontFace = faces.find((face) => face.role === 'front');
  const panels = frontFace ? createServerPanels(frontFace) : [];
  const vents = panels.map(createServerVents);
  const depthMap = createLabFaceDepthMap([...faces, ...panels, ...vents.flat()]);
  const project = (face: LabIsoFaceGeometry) => (
    projectLabIsoFace(face, depthMap.get(face)!)
  );
  return (
    <div className="lab-furniture" style={projectLabDepthGroup(placement)}>
      {faces.map((face) => {
        const className = `lab-furniture-face lab-server-face ${face.role} face-${face.face}`;
        return face.role === 'front' ? (
          <button
            aria-label={label}
            className={className}
            key={face.face}
            onClick={onClick}
            style={{ ...project(face), ...resolveFaceStyle(SERVER_FACE_STYLES, face) }}
            type="button"
          />
        ) : (
          <span
            aria-hidden="true"
            className={className}
            key={face.face}
            style={{ ...project(face), ...resolveFaceStyle(SERVER_FACE_STYLES, face) }}
          />
        );
      })}
      {panels.map((panel, index) => (
        <div className="lab-server-panel-group" key={`panel-${index}`}>
          <span
            aria-hidden="true"
            className={`lab-server-panel face-${panel.face}`}
            style={{ ...project(panel), ...FURNITURE_DETAIL_STYLES.serverPanel }}
          />
          {vents[index].map((vent, ventIndex) => (
            <span
            aria-hidden="true"
            className="lab-server-vent"
            key={`vent-${ventIndex}`}
            style={{ ...project(vent), ...FURNITURE_DETAIL_STYLES.serverVent }}
            />
          ))}
          {createServerLights(panel).map((light, lightIndex) => (
            <span
              aria-hidden="true"
              className={`lab-server-light light-${lightIndex}`}
              key={`light-${lightIndex}`}
              style={projectFurniturePoint(light)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function createServerPanels(face: LabIsoFaceGeometry): LabIsoFaceGeometry[] {
  const center = getLabFaceCenter(face);
  return [0.45, 1, 1.55, 2.1].map((z) => moveFaceTowardViewer(
    createLabFaceAtCenter(face.face, { ...center, z }, 1.28, 0.24, face.role),
    0.02,
  ));
}

function createBookshelfOpenings(face: LabIsoFaceGeometry): LabIsoFaceGeometry[] {
  const center = getLabFaceCenter(face);
  return [0.48, 1.22, 1.96].map((z) => moveFaceTowardViewer(
    createLabFaceAtCenter(face.face, { ...center, z }, 1.6, 0.5, face.role),
    0.02,
  ));
}

function createBookshelfShelves(face: LabIsoFaceGeometry): LabIsoFaceGeometry[] {
  const center = getLabFaceCenter(face);
  return [0.21, 0.95, 1.69].map((z) => moveFaceTowardViewer(
    createLabFaceAtCenter(face.face, { ...center, z }, 1.68, 0.1, face.role),
    0.04,
  ));
}

function createBookshelfBooks(face: LabIsoFaceGeometry): LabIsoFaceGeometry[] {
  const shelfBottoms = [0.25, 0.99, 1.73];
  const heights = [0.32, 0.42, 0.36, 0.46];
  const offsets = [-0.58, -0.4, -0.22, -0.04];
  const center = getLabFaceCenter(face);
  return shelfBottoms.flatMap((bottom, shelfIndex) => (
    offsets.map((offset, bookIndex) => {
      const verticalLength = heights[(bookIndex + shelfIndex) % heights.length];
      return moveFaceTowardViewer(
        createLabFaceAtCenter(
          face.face,
          {
            ...offsetOnFace(face.face, center, offset),
            z: bottom + verticalLength / 2,
          },
          0.13,
          verticalLength,
          face.role,
        ),
        0.35,
      );
    })
  ));
}

function createServerVents(face: LabIsoFaceGeometry): LabIsoFaceGeometry[] {
  const center = getLabFaceCenter(face);
  return [-0.46, -0.36, -0.26, -0.16, -0.06].map((offset) => (
    moveFaceTowardViewer(
      createLabFaceAtCenter(
        face.face,
        offsetOnFace(face.face, center, offset),
        0.045,
        0.13,
        face.role,
      ),
      0.25,
    )
  ));
}

function createServerLights(face: LabIsoFaceGeometry) {
  const center = getLabFaceCenter(face);
  return [0.22, 0.34, 0.46].map((offset) => (
    movePointTowardViewer(
      offsetOnFace(face.face, center, offset),
      0.05,
    )
  ));
}

function offsetOnFace(
  face: LabIsoFaceGeometry['face'],
  center: { x: number; y: number; z: number },
  offset: number,
) {
  return face === 'r'
    ? { ...center, x: center.x + offset }
    : { ...center, y: center.y + offset };
}

function moveFaceTowardViewer(face: LabIsoFaceGeometry, distance: number) {
  return translateLabFace(face, {
    x: distance,
    y: distance,
    z: distance * 0.8536585366,
  });
}

function movePointTowardViewer(
  point: { x: number; y: number; z: number },
  distance: number,
) {
  return {
    ...point,
    x: point.x + distance,
    y: point.y + distance,
    z: point.z + distance * 0.8536585366,
  };
}

function projectFurniturePoint(point: { x: number; y: number; z: number }) {
  return projectLabGridPoint(point, point.z);
}

function offsetFurniturePoint(
  placement: LabFurniturePlacement,
  localX: number,
  localY: number,
) {
  return placement.orientation === 'x'
    ? { x: placement.x + localX, y: placement.y + localY }
    : { x: placement.x + localY, y: placement.y + localX };
}
