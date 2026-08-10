import { memo, useMemo, type CSSProperties } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { LabDeskDecorations } from './decorations/LabDeskDecorations';
import { createDeskDecorations } from './decorations/decorationPlacement';
import { projectLabDepthGroup } from './labDepth';
import {
  createComputerFaceStyles,
  resolveFaceStyle,
  WORKSTATION_FACE_STYLES,
} from './labFaceStyles';
import {
  createLabCuboidFaces,
  projectLabGridPoint,
  projectLabIsoFace,
  type LabIsoFaceGeometry,
} from './labIsometric';
import type { LabWorkstationPlacement } from './labSceneLayout';
import type { LabNpcDefinition } from './labTypes';
import { LabNpcAvatar } from './LabNpcAvatar';
import { createLabWorkstationDepthMap } from './labWorkstationDepth';
import { createLabWorkstationGeometry } from './labWorkstationGeometry';

interface LabWorkstationProps {
  canTalk: boolean;
  generationSeed: string;
  hasClaimedWorkstation: boolean;
  isPlayer: boolean;
  npc?: LabNpcDefinition;
  placement: LabWorkstationPlacement;
  present: boolean;
  onChoose: (workstationId: string) => void;
  onOpenDesktop: () => void;
  onSelectNpc: (npcId: string) => void;
}

type NpcScreenVariant = 'code' | 'chart' | 'graph';

const NPC_SCREEN_VARIANTS: NpcScreenVariant[] = ['code', 'chart', 'graph'];

export const LabWorkstation = memo(function LabWorkstation({
  canTalk,
  generationSeed,
  hasClaimedWorkstation,
  isPlayer,
  npc,
  placement,
  present,
  onChoose,
  onOpenDesktop,
  onSelectNpc,
}: LabWorkstationProps) {
  const { labels, language } = useLanguage();
  const workstationId = placement.workstationId;
  const hasComputer = Boolean(npc || isPlayer);
  const accent = npc?.color ?? '#22d3ee';
  const geometry = useMemo(
    () => createLabWorkstationGeometry(placement),
    [placement],
  );
  const towerFaces = useMemo(
    () => createLabCuboidFaces(geometry.computerTower),
    [geometry],
  );
  const depthMap = useMemo(
    () => createLabWorkstationDepthMap(
      geometry,
      towerFaces,
      placement.orientation,
    ),
    [geometry, placement.orientation, towerFaces],
  );
  const towerTopDepthBase = Math.max(
    ...towerFaces.map((face) => depthMap.get(face)!),
  ) + 1;
  const decorations = useMemo(() => createDeskDecorations({
    seed: generationSeed,
    workstationId,
    occupant: npc ? 'npc' : isPlayer ? 'player' : 'empty',
    identity: npc?.id ?? (isPlayer ? 'player' : workstationId),
    accent,
    orientation: placement.orientation,
    hasEndDivider: placement.indexInGroup === placement.groupLength - 1,
  }), [
    accent,
    generationSeed,
    isPlayer,
    npc,
    placement,
    workstationId,
  ]);
  const computerStyles = useMemo(
    () => createComputerFaceStyles(accent),
    [accent],
  );
  const projectFace = (face: LabIsoFaceGeometry) => (
    projectLabIsoFace(face, depthMap.get(face)!)
  );
  const useWorkstation = () => {
    if (npc) onSelectNpc(npc.id);
    else if (isPlayer) onOpenDesktop();
    else onChoose(workstationId);
  };
  const screenOff = Boolean(npc && !present);
  const screenVariant = isPlayer ? 'desktop' : getNpcScreenVariant(npc?.id ?? '');
  const workstationDisabled = npc
    ? !present
    : !isPlayer && hasClaimedWorkstation;
  const style = {
    ...projectLabDepthGroup(placement),
    '--computer-accent': accent,
  } as CSSProperties;

  return (
    <div className="lab-workstation" style={style}>
      <span
        aria-hidden="true"
        className="lab-workstation-desk-shadow"
        style={{
          ...projectFace(geometry.deskShadow),
          ...WORKSTATION_FACE_STYLES.shadow,
        }}
      />
      <span
        aria-hidden="true"
        className="lab-workstation-desk-surface"
        style={{
          ...projectFace(geometry.deskSurface),
          ...WORKSTATION_FACE_STYLES.desk,
        }}
      />
      <span
        aria-hidden="true"
        className="lab-workstation-desk-thickness"
        style={{
          ...projectFace(geometry.deskThickness),
          ...WORKSTATION_FACE_STYLES.deskThickness,
        }}
      />
      {geometry.dividers.map((divider, index) => (
        <span
          aria-hidden="true"
          className={`lab-workstation-divider face-${divider.face} ${divider.kind} length-${divider.length}`}
          key={`divider-${index}`}
          style={{
            ...projectFace(divider),
            ...WORKSTATION_FACE_STYLES.divider[divider.kind],
          }}
        />
      ))}
      {geometry.seatSupports.map((support, index) => (
        <span
          aria-hidden="true"
          className={`lab-workstation-seat-support face-${support.face}`}
          key={`seat-support-${index}`}
          style={{
            ...projectFace(support),
            ...WORKSTATION_FACE_STYLES.seatSupport[
              support.face === 'l' ? 'l' : 'r'
            ],
          }}
        />
      ))}
      <span
        aria-hidden="true"
        className="lab-workstation-seat"
        style={{
          ...projectFace(geometry.seatSurface),
          ...WORKSTATION_FACE_STYLES.seat,
        }}
      />

      {hasComputer && (
        <>
          <span
            aria-hidden="true"
            className="lab-workstation-monitor-base"
            style={{
              ...projectFace(geometry.monitorBase),
              ...computerStyles.monitorBase,
            }}
          />
          <span
            aria-hidden="true"
            className={`lab-workstation-monitor-stand face-${geometry.monitorStand.face}`}
            style={{
              ...projectFace(geometry.monitorStand),
              ...computerStyles.monitorStand,
            }}
          />
          <span
            aria-hidden="true"
            className="lab-workstation-keyboard"
            style={{
              ...projectFace(geometry.keyboard),
              ...computerStyles.keyboard,
            }}
          />
          {geometry.keyboardRows.map((row, index) => (
            <span
              aria-hidden="true"
              className="lab-workstation-keyboard-row"
              key={`keyboard-row-${index}`}
              style={{
                ...projectFace(row),
                ...computerStyles.keyboardRow,
              }}
            />
          ))}
          <span
            aria-hidden="true"
            className="lab-workstation-mouse-pad"
            style={{
              ...projectFace(geometry.mousePad),
              ...computerStyles.mousePad,
            }}
          />
          <button
            aria-label={npc?.name[language] ?? labels.lab.enterDesktop}
            className={`lab-workstation-screen face-${geometry.monitor.face} ${isPlayer ? 'active' : ''} ${screenOff ? 'off' : ''}`}
            disabled={workstationDisabled}
            onClick={useWorkstation}
            style={projectFace(geometry.monitor)}
            type="button"
          >
            {!screenOff && (
              <span aria-hidden="true" className={`lab-screen-ui ${screenVariant}`}>
                <i /><i /><i />
              </span>
            )}
          </button>
          {towerFaces.map((face, index) => (
            <span
              aria-hidden="true"
              className={`lab-computer-tower-face face-${face.face} ${face.role}`}
              key={`tower-${index}`}
              style={{
                ...projectFace(face),
                ...resolveFaceStyle(computerStyles.tower, face),
              }}
            >
              {face.role === 'front' && (
                <>
                  <i /><i /><i />
                  <b />
                </>
              )}
            </span>
          ))}
        </>
      )}

      <LabDeskDecorations
        decorations={decorations}
        placement={placement}
        towerTop={geometry.computerTowerTop}
        towerTopDepthBase={towerTopDepthBase}
      />

      <div
        className={`lab-cubicle orientation-${placement.orientation} ${npc ? 'npc-cubicle' : isPlayer ? 'player-cubicle' : 'available-cubicle'}`}
        style={projectLabGridPoint(geometry.seat, npc ? 0.75 : 0)}
      >
        {npc ? (
          <div className={`lab-npc-station ${present ? 'present' : 'absent'}`}>
            {present ? (
              <LabNpcAvatar
                canTalk={canTalk}
                label={npc.name[language]}
                npc={npc}
                onClick={() => onSelectNpc(npc.id)}
              />
            ) : (
              <div aria-hidden="true" className="lab-empty-chair" />
            )}
          </div>
        ) : isPlayer ? (
          <button
            aria-label={labels.lab.enterDesktop}
            className="lab-computer"
            onClick={onOpenDesktop}
            type="button"
          />
        ) : (
          <button
            className="lab-empty-workstation"
            disabled={hasClaimedWorkstation}
            onClick={() => onChoose(workstationId)}
            type="button"
          />
        )}
      </div>
    </div>
  );
});

function getNpcScreenVariant(npcId: string): NpcScreenVariant {
  const index = [...npcId].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  ) % NPC_SCREEN_VARIANTS.length;
  return NPC_SCREEN_VARIANTS[index];
}
