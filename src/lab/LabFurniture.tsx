import {
  createLabCuboidFaces,
  createLabVerticalFace,
  projectLabGridPoint,
  projectLabIsoFace,
  type LabIsoFaceGeometry,
} from './labIsometric';
import type { LabFurniturePlacement } from './labSceneLayout';

interface LabFurnitureProps {
  label: string;
  placement: LabFurniturePlacement;
  onClick: () => void;
}

export function LabWhiteboard({ label, placement, onClick }: LabFurnitureProps) {
  const face = createLabVerticalFace(placement, 4, 2, 0.45);
  return (
    <button
      aria-label={label}
      className={`lab-furniture-face lab-whiteboard-face face-${face.face}`}
      onClick={onClick}
      style={projectLabIsoFace(face)}
      type="button"
    >
      <i /><i /><i />
    </button>
  );
}

export function LabBookshelf({ label, placement, onClick }: LabFurnitureProps) {
  const faces = createLabCuboidFaces(placement, 2, 0.8, 2.5);
  const frontFace = faces.find((face) => face.role === 'front');
  return (
    <div className="lab-furniture">
      {faces.map((face) => {
        const className = `lab-furniture-face lab-bookshelf-face ${face.role} face-${face.face}`;
        return face.role === 'front' ? (
          <button
            aria-label={label}
            className={className}
            key={face.face}
            onClick={onClick}
            style={projectLabIsoFace(face)}
            type="button"
          />
        ) : (
          <span
            aria-hidden="true"
            className={className}
            key={face.face}
            style={projectLabIsoFace(face)}
          />
        );
      })}
      {frontFace && createBookshelfOpenings(frontFace).map((opening, index) => (
        <span
          aria-hidden="true"
          className="lab-bookshelf-opening"
          key={`opening-${index}`}
          style={projectFurnitureDetail(opening, 301)}
        />
      ))}
      {frontFace && createBookshelfBooks(frontFace).map((book, index) => (
        <span
          aria-hidden="true"
          className={`lab-bookshelf-book color-${index % 4}`}
          key={`book-${index}`}
          style={projectFurnitureDetail(book, 500)}
        />
      ))}
    </div>
  );
}

export function LabServerRack({ label, placement, onClick }: LabFurnitureProps) {
  const faces = createLabCuboidFaces(placement, 1.6, 2, 2.5);
  const frontFace = faces.find((face) => face.role === 'front');
  return (
    <div className="lab-furniture">
      {faces.map((face) => {
        const className = `lab-furniture-face lab-server-face ${face.role} face-${face.face}`;
        return face.role === 'front' ? (
          <button
            aria-label={label}
            className={className}
            key={face.face}
            onClick={onClick}
            style={projectLabIsoFace(face)}
            type="button"
          />
        ) : (
          <span
            aria-hidden="true"
            className={className}
            key={face.face}
            style={projectLabIsoFace(face)}
          />
        );
      })}
      {frontFace && createServerPanels(frontFace).map((panel, index) => (
        <div className="lab-server-panel-group" key={`panel-${index}`}>
          <span
            aria-hidden="true"
            className={`lab-server-panel face-${panel.face}`}
            style={projectFurnitureDetail(panel)}
          />
          {createServerVents(panel).map((vent, ventIndex) => (
            <span
              aria-hidden="true"
              className="lab-server-vent"
              key={`vent-${ventIndex}`}
              style={projectFurnitureDetail(vent, 301)}
            />
          ))}
          {createServerLights(panel).map((light, lightIndex) => (
            <span
              aria-hidden="true"
              className={`lab-server-light light-${lightIndex}`}
              key={`light-${lightIndex}`}
              style={projectFurniturePoint(light, panel.height)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function createServerPanels(face: LabIsoFaceGeometry): LabIsoFaceGeometry[] {
  return [0.45, 1, 1.55, 2.1].map((height) => ({
    ...face,
    height,
    horizontalLength: 1.28,
    verticalLength: 0.24,
  }));
}

function createBookshelfOpenings(face: LabIsoFaceGeometry): LabIsoFaceGeometry[] {
  return [0.48, 1.22, 1.96].map((height) => ({
    ...face,
    height,
    horizontalLength: 1.6,
    verticalLength: 0.5,
  }));
}

function createBookshelfBooks(face: LabIsoFaceGeometry): LabIsoFaceGeometry[] {
  const shelfBottoms = [0.25, 0.99, 1.73];
  const heights = [0.32, 0.42, 0.36, 0.46];
  const offsets = [-0.58, -0.4, -0.22, -0.04];
  return shelfBottoms.flatMap((bottom, shelfIndex) => (
    offsets.map((offset, bookIndex) => {
      const verticalLength = heights[(bookIndex + shelfIndex) % heights.length];
      return {
        ...face,
        ...offsetOnFace(face, offset),
        height: bottom + verticalLength / 2,
        horizontalLength: 0.13,
        verticalLength,
      };
    })
  ));
}

function createServerVents(face: LabIsoFaceGeometry): LabIsoFaceGeometry[] {
  return [-0.46, -0.36, -0.26, -0.16, -0.06].map((offset) => ({
    ...face,
    ...offsetOnFace(face, offset),
    horizontalLength: 0.045,
    verticalLength: 0.13,
  }));
}

function createServerLights(face: LabIsoFaceGeometry) {
  return [0.22, 0.34, 0.46].map((offset) => offsetOnFace(face, offset));
}

function offsetOnFace(face: LabIsoFaceGeometry, offset: number) {
  return face.face === 'r'
    ? { x: face.x + offset, y: face.y }
    : { x: face.x, y: face.y + offset };
}

function projectFurnitureDetail(face: LabIsoFaceGeometry, layerOffset = 300) {
  const style = projectLabIsoFace(face);
  return { ...style, zIndex: Number(style.zIndex) + layerOffset };
}

function projectFurniturePoint(point: { x: number; y: number }, height: number) {
  return projectLabGridPoint(point, height, 402);
}
