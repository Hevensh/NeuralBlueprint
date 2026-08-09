import { useMemo, useState } from 'react';
import { exitApplication } from '../appActions';
import { resetAllFileStorage } from '../dataStorage/fileReset';
import { loadLabProgress, saveLabProgress } from '../dataStorage/labStorage';
import { DesktopSettingsDialog } from '../desktop/DesktopSettingsDialog';
import { useLanguage } from '../i18n/LanguageContext';
import {
  createLabFloorTiles,
  createLabWorkstationGeometry,
  projectLabGridPoint,
  projectLabIsoFace,
} from './labIsometric';
import { DEFAULT_LAB_DAY_CONFIG } from './labNpcRegistry';
import { claimLabWorkstation, completeLabTopic } from './labProgress';
import { createLabSceneLayout } from './labSceneLayout';
import type { LabNpcTopic } from './labTypes';
import { LabBookshelf, LabServerRack, LabWhiteboard } from './LabFurniture';
import { LabLeftPanel } from './LabLeftPanel';
import { LabNpcDialog } from './LabNpcDialog';

interface LabWorkspaceProps {
  onOpenDesktop: () => void;
}

type LabNotice = 'whiteboard' | 'server' | 'bookshelf' | null;
type NpcScreenVariant = 'code' | 'chart' | 'graph';

const NPC_SCREEN_VARIANTS: NpcScreenVariant[] = ['code', 'chart', 'graph'];

export function LabWorkspace({ onOpenDesktop }: LabWorkspaceProps) {
  const { labels, language } = useLanguage();
  const [progress, setProgress] = useState(loadLabProgress);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [notice, setNotice] = useState<LabNotice>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const npcById = useMemo(
    () => new Map(DEFAULT_LAB_DAY_CONFIG.npcPool.map((npc) => [npc.id, npc])),
    [],
  );
  const selectedNpc = selectedNpcId ? npcById.get(selectedNpcId) : undefined;
  const sceneLayout = useMemo(
    () => createLabSceneLayout(
      progress.seed,
      DEFAULT_LAB_DAY_CONFIG.workstationLayout,
    ),
    [progress.seed],
  );
  const floorTiles = useMemo(createLabFloorTiles, []);
  const placementByWorkstationId = useMemo(
    () => new Map(
      sceneLayout.workstations.map((placement) => [placement.workstationId, placement]),
    ),
    [sceneLayout],
  );
  const workstationIds = useMemo(
    () => sceneLayout.workstations.map((placement) => placement.workstationId),
    [sceneLayout],
  );

  const completeTopic = (npcId: string, topic: LabNpcTopic) => {
    setProgress((current) => {
      const next = completeLabTopic(current, npcId, topic);
      saveLabProgress(next);
      return next;
    });
  };

  const chooseWorkstation = (workstationId: string) => {
    setProgress((current) => {
      const next = claimLabWorkstation(
        current,
        DEFAULT_LAB_DAY_CONFIG,
        workstationId,
      );
      saveLabProgress(next);
      return next;
    });
  };

  const noticeContent = notice ? {
    whiteboard: [labels.lab.whiteboard, labels.lab.whiteboardNote],
    server: [labels.lab.server, labels.lab.serverNote],
    bookshelf: [labels.lab.bookshelf, labels.lab.bookshelfNote],
  }[notice] : null;

  return (
    <main className="lab-workspace">
      <header className="lab-top-bar">
        <div>
          <div className="lab-subtitle">{labels.lab.subtitle}</div>
          <h1>{labels.lab.title}</h1>
        </div>
        <div className="lab-day-indicator">
          {labels.lab.day} {progress.day}
        </div>
      </header>

      <section className="lab-room">
        <div aria-label={labels.lab.clock} className="lab-clock">
          <span />
          <span />
        </div>

        <LabLeftPanel
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <div className="lab-scene">
          <div aria-hidden="true" className="lab-isometric-floor">
          {floorTiles.map((tile) => (
            <span
              className={`lab-floor-tile variant-${tile.variant}`}
              key={tile.id}
              style={{ ...projectLabGridPoint(tile), zIndex: tile.x + tile.y }}
            />
          ))}
        </div>

          <LabWhiteboard
          label={labels.lab.whiteboard}
          placement={sceneLayout.whiteboard}
          onClick={() => setNotice('whiteboard')}
        />
          <LabBookshelf
          label={labels.lab.bookshelf}
          placement={sceneLayout.bookshelf}
          onClick={() => setNotice('bookshelf')}
        />
          {sceneLayout.servers.map((placement, index) => (
          <LabServerRack
            key={`server-${index}`}
            label={labels.lab.server}
            placement={placement}
            onClick={() => setNotice('server')}
          />
        ))}

          <div className="lab-office-grid">
          {workstationIds.map((workstationId) => {
            const placement = placementByWorkstationId.get(workstationId);
            if (!placement) return null;
            const geometry = createLabWorkstationGeometry(placement);
            const assignment = progress.workstations.find(
              (desk) => desk.workstationId === workstationId,
            );
            const npc = assignment ? npcById.get(assignment.npcId) : undefined;
            const isPlayerWorkstation = progress.playerWorkstationId === workstationId;
            const hasComputer = Boolean(npc || isPlayerWorkstation);
            const present = npc ? progress.presentNpcIds.includes(npc.id) : false;
            const screenOff = Boolean(npc && !present);
            const screenVariant = isPlayerWorkstation
              ? 'desktop'
              : getNpcScreenVariant(npc?.id ?? '');
            const workstationDisabled = npc
              ? !present
              : !isPlayerWorkstation && Boolean(progress.playerWorkstationId);
            const useWorkstation = () => {
              if (npc) setSelectedNpcId(npc.id);
              else if (isPlayerWorkstation) onOpenDesktop();
              else chooseWorkstation(workstationId);
            };

            const structure = (
              <>
                <span
                  aria-hidden="true"
                  className={`lab-workstation-desk-surface orientation-${placement.orientation}`}
                  style={projectLabGridPoint(geometry.deskCenter, 1)}
                />
                {geometry.dividers.map((divider, dividerIndex) => (
                  <span
                    aria-hidden="true"
                    className={`lab-workstation-divider face-${divider.face} ${divider.kind} length-${divider.length}`}
                    key={`${workstationId}-divider-${dividerIndex}`}
                    style={projectLabGridPoint(divider, divider.height)}
                  />
                ))}
                {geometry.seatSupports.map((support, supportIndex) => (
                  <span
                    aria-hidden="true"
                    className={`lab-workstation-seat-support face-${support.face}`}
                    key={`${workstationId}-seat-support-${supportIndex}`}
                    style={projectLabGridPoint(support, support.height)}
                  />
                ))}
                <span
                  aria-hidden="true"
                  className="lab-workstation-seat"
                  style={projectLabGridPoint(geometry.seat, 0.5)}
                />
                {isPlayerWorkstation && (
                  <span
                    className="lab-player-workstation-hint"
                    style={projectLabGridPoint(geometry.playerHint, 2.7, 300)}
                  >
                    {labels.lab.enterDesktop}
                  </span>
                )}
                {hasComputer && (
                  <>
                    <span
                      aria-hidden="true"
                      className="lab-workstation-keyboard"
                      style={projectLabIsoFace(geometry.keyboard, 100)}
                    />
                    {geometry.keyboardRows.map((row, rowIndex) => (
                      <span
                        aria-hidden="true"
                        className="lab-workstation-keyboard-row"
                        key={`${workstationId}-keyboard-row-${rowIndex}`}
                        style={projectLabIsoFace(row, 101)}
                      />
                    ))}
                    <button
                      aria-label={npc?.name[language] ?? labels.lab.enterDesktop}
                      className={`lab-workstation-screen face-${geometry.monitorFace} ${isPlayerWorkstation ? 'active' : ''} ${screenOff ? 'off' : ''}`}
                      disabled={workstationDisabled}
                      onClick={useWorkstation}
                      style={projectLabGridPoint(geometry.monitor, 1.5, 100)}
                      type="button"
                    >
                      {!screenOff && (
                        <span
                          aria-hidden="true"
                          className={`lab-screen-ui ${screenVariant}`}
                        >
                          <i /><i /><i />
                        </span>
                      )}
                    </button>
                    {geometry.computerTower.map((face, faceIndex) => (
                      <span
                        aria-hidden="true"
                        className={`lab-computer-tower-face face-${face.face} size-${face.size} ${face.kind} orientation-${placement.orientation}`}
                        key={`${workstationId}-tower-${faceIndex}`}
                        style={projectLabGridPoint(face, face.height, 100)}
                      >
                        {face.kind === 'front' && (
                          <>
                            <i /><i /><i />
                            <b />
                          </>
                        )}
                      </span>
                    ))}
                  </>
                )}
              </>
            );

            if (npc) {
              const canTalk = npc.topics.some((topic) => (
                !progress.completedTopicIds.includes(
                  `${progress.day}:${npc.id}:${topic.id}`,
                )
              ));

              return (
                <div className="lab-workstation" key={workstationId}>
                  {structure}
                  <div
                    className={`lab-cubicle npc-cubicle orientation-${placement.orientation}`}
                    style={projectLabGridPoint(geometry.seat, 0.75, 120)}
                  >
                    <div className={`lab-npc-station ${present ? 'present' : 'absent'}`}>
                      {present ? (
                        <button
                          className="lab-npc"
                          onClick={() => setSelectedNpcId(npc.id)}
                          style={{ '--npc-color': npc.color } as React.CSSProperties}
                          type="button"
                        >
                          <span className="lab-npc-head">{npc.name[language].slice(0, 1)}</span>
                          <span className="lab-npc-body" />
                          {canTalk && <span className="lab-npc-talk-marker">?</span>}
                        </button>
                      ) : (
                        <div aria-hidden="true" className="lab-empty-chair" />
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="lab-workstation" key={workstationId}>
                {structure}
                <div
                  className={`lab-cubicle orientation-${placement.orientation} ${isPlayerWorkstation ? 'player-cubicle' : 'available-cubicle'}`}
                  style={projectLabGridPoint(geometry.seat)}
                >
                  {isPlayerWorkstation ? (
                    <button
                      aria-label={labels.lab.enterDesktop}
                      className="lab-computer"
                      onClick={onOpenDesktop}
                      type="button"
                    />
                  ) : (
                    <button
                      className="lab-empty-workstation"
                      disabled={Boolean(progress.playerWorkstationId)}
                      onClick={() => chooseWorkstation(workstationId)}
                      type="button"
                    >
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {noticeContent && (
          <button
            className="lab-notice"
            onClick={() => setNotice(null)}
            type="button"
          >
            <strong>{noticeContent[0]}</strong>
            <span>{noticeContent[1]}</span>
          </button>
        )}
      </section>

      {selectedNpc && (
        <LabNpcDialog
          key={selectedNpc.id}
          npc={selectedNpc}
          progress={progress}
          onClose={() => setSelectedNpcId(null)}
          onCompleteTopic={completeTopic}
        />
      )}

      {settingsOpen && (
        <DesktopSettingsDialog
          onClose={() => setSettingsOpen(false)}
          onExit={exitApplication}
          onResetAllFiles={() => {
            resetAllFileStorage();
            setSettingsOpen(false);
          }}
        />
      )}
    </main>
  );
}

function getNpcScreenVariant(npcId: string): NpcScreenVariant {
  const variantIndex = [...npcId].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  ) % NPC_SCREEN_VARIANTS.length;
  return NPC_SCREEN_VARIANTS[variantIndex];
}
