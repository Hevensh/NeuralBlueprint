import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { exitApplication } from '../appActions';
import { DesktopSettingsDialog } from '../desktop/DesktopSettingsDialog';
import type { GameProgress } from '../game/gameTypes';
import { useLanguage } from '../i18n/LanguageContext';
import { AcademicTimeIndicator } from '../time/AcademicTimeIndicator';
import { createCommonTableDecorations } from './decorations/decorationPlacement';
import {
  LabDecorationShowcase,
  LabDecorationShowcaseLegend,
} from './LabDecorationShowcase';
import { FLOOR_FACE_STYLES } from './labFaceStyles';
import {
  LabBookshelf,
  LabCommonTable,
  LabServerRack,
  LabWhiteboard,
} from './LabFurniture';
import {
  createLabFloorTiles,
  projectLabIsoFace,
  projectLabPoint,
} from './labIsometric';
import { LabLeftPanel } from './LabLeftPanel';
import { LabNpcDialog } from './LabNpcDialog';
import { DEFAULT_LAB_DAY_CONFIG } from './labNpcRegistry';
import {
  claimLabWorkstation,
  completeLabTopic,
  createInitialLabProgress,
} from './labProgress';
import { createLabSceneLayout } from './labSceneLayout';
import type { LabNpcTopic } from './labTypes';
import { LabWorkstation } from './LabWorkstation';
import { createLabWorkstationGeometry } from './labWorkstationGeometry';
import { useLabSceneViewport } from './useLabSceneViewport';

interface LabWorkspaceProps {
  gameProgress: GameProgress;
  setGameProgress: Dispatch<SetStateAction<GameProgress>>;
  onOpenDesktop: () => void;
}

type LabNotice = 'whiteboard' | 'server' | 'bookshelf' | null;

export function LabWorkspace({
  gameProgress,
  setGameProgress,
  onOpenDesktop,
}: LabWorkspaceProps) {
  const { labels } = useLanguage();
  const progress = gameProgress.lab;
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [notice, setNotice] = useState<LabNotice>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showDecorationShowcase, setShowDecorationShowcase] = useState(false);
  const {
    viewportRef,
    view,
    dragging,
    resetView,
    zoomBy,
    viewportEvents,
  } = useLabSceneViewport();
  const npcById = useMemo(
    () => new Map(DEFAULT_LAB_DAY_CONFIG.npcPool.map((npc) => [npc.id, npc])),
    [],
  );
  const selectedNpc = selectedNpcId ? npcById.get(selectedNpcId) : undefined;
  const sceneLayout = useMemo(
    () => createLabSceneLayout(
      progress.generationSeed,
      DEFAULT_LAB_DAY_CONFIG.workstationLayout,
    ),
    [progress.generationSeed],
  );
  const floorTiles = useMemo(createLabFloorTiles, []);
  const commonTableDecorations = useMemo(
    () => createCommonTableDecorations(progress.generationSeed),
    [progress.generationSeed],
  );
  const npcByWorkstationId = useMemo(
    () => new Map(progress.workstations.map((assignment) => [
      assignment.workstationId,
      npcById.get(assignment.npcId),
    ])),
    [npcById, progress.workstations],
  );
  const presentNpcIds = useMemo(
    () => new Set(progress.presentNpcIds),
    [progress.presentNpcIds],
  );
  const completedTopicIds = useMemo(
    () => new Set(progress.completedTopicIds),
    [progress.completedTopicIds],
  );
  const playerHintStyle = useMemo(() => {
    const placement = sceneLayout.workstations.find(
      (workstation) => workstation.workstationId === progress.playerWorkstationId,
    );
    if (!placement || showDecorationShowcase) return undefined;
    const point = projectLabPoint({
      ...createLabWorkstationGeometry(placement).playerHint,
      z: 2.7,
    });
    return {
      left: view.x + point.x * view.zoom,
      top: view.y + point.y * view.zoom,
      '--lab-hint-scale': view.zoom,
    } as CSSProperties;
  }, [progress.playerWorkstationId, sceneLayout, showDecorationShowcase, view]);

  const completeTopicHandler = useCallback((npcId: string, topic: LabNpcTopic) => {
    setGameProgress((current) => ({
      ...current,
      lab: completeLabTopic(current.lab, current.time.day, npcId, topic),
    }));
  }, [setGameProgress]);

  const chooseWorkstation = useCallback((workstationId: string) => {
    setGameProgress((current) => ({
      ...current,
      lab: claimLabWorkstation(
        current.lab,
        DEFAULT_LAB_DAY_CONFIG,
        workstationId,
      ),
    }));
  }, [setGameProgress]);

  const resetLaboratory = useCallback(() => {
    const generationSeed = `${Date.now()}`;
    setGameProgress((current) => ({
      ...current,
      lab: createInitialLabProgress(
        DEFAULT_LAB_DAY_CONFIG,
        `${current.seed}:lab:${generationSeed}`,
        current.time.day,
      ),
    }));
    setSelectedNpcId(null);
    setNotice(null);
    setSettingsOpen(false);
  }, [setGameProgress]);

  const toggleDecorationShowcase = useCallback(() => {
    setShowDecorationShowcase((visible) => !visible);
    setSelectedNpcId(null);
    setNotice(null);
    setSettingsOpen(false);
  }, []);

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
        <AcademicTimeIndicator time={gameProgress.time} />
      </header>

      <section className="lab-room">
        <LabLeftPanel onOpenSettings={() => setSettingsOpen(true)} />

        <div
          className={`lab-scene-viewport ${dragging ? 'dragging' : ''}`}
          ref={viewportRef}
          {...viewportEvents}
        >
          <div
            className="lab-scene"
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            }}
          >
            <div aria-hidden="true" className="lab-isometric-floor">
              {floorTiles.map((tile) => (
                <span
                  className={`lab-floor-tile variant-${tile.variant}`}
                  key={tile.id}
                  style={{
                    ...projectLabIsoFace(tile, 0),
                    ...FLOOR_FACE_STYLES[tile.variant],
                  }}
                />
              ))}
            </div>

            {showDecorationShowcase ? (
              <LabDecorationShowcase />
            ) : (
              <>
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
                <LabCommonTable
                  decorations={commonTableDecorations}
                  placement={sceneLayout.commonTable}
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
                  {sceneLayout.workstations.map((placement) => {
                    const npc = npcByWorkstationId.get(placement.workstationId);
                    const canTalk = Boolean(npc?.topics.some((topic) => (
                      !completedTopicIds.has(
                        `${gameProgress.time.day}:${npc.id}:${topic.id}`,
                      )
                    )));
                    return (
                      <LabWorkstation
                        canTalk={canTalk}
                        generationSeed={progress.generationSeed}
                        hasClaimedWorkstation={Boolean(progress.playerWorkstationId)}
                        isPlayer={progress.playerWorkstationId === placement.workstationId}
                        key={placement.workstationId}
                        npc={npc}
                        placement={placement}
                        present={Boolean(npc && presentNpcIds.has(npc.id))}
                        onChoose={chooseWorkstation}
                        onOpenDesktop={onOpenDesktop}
                        onSelectNpc={setSelectedNpcId}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
          {playerHintStyle && (
            <span
              className="lab-player-workstation-hint"
              style={playerHintStyle}
            >
              {labels.lab.enterDesktop}
            </span>
          )}
        </div>

        <div className="lab-view-controls">
          <button onClick={() => zoomBy(0.84)} type="button">−</button>
          <button
            aria-label={labels.desktop.leftPanel.centerView}
            className="lab-view-reset"
            onClick={resetView}
            type="button"
          >
            {Math.round(view.zoom * 100)}%
          </button>
          <button onClick={() => zoomBy(1.19)} type="button">+</button>
        </div>

        {showDecorationShowcase && <LabDecorationShowcaseLegend />}

        {noticeContent && (
          <button className="lab-notice" onClick={() => setNotice(null)} type="button">
            <strong>{noticeContent[0]}</strong>
            <span>{noticeContent[1]}</span>
          </button>
        )}
      </section>

      {selectedNpc && (
        <LabNpcDialog
          day={gameProgress.time.day}
          key={selectedNpc.id}
          npc={selectedNpc}
          progress={progress}
          onClose={() => setSelectedNpcId(null)}
          onCompleteTopic={completeTopicHandler}
        />
      )}

      {settingsOpen && (
        <DesktopSettingsDialog
          developerActionDescription={labels.lab.decorationShowcaseNote}
          developerActionLabel={showDecorationShowcase
            ? labels.lab.hideDecorationShowcase
            : labels.lab.showDecorationShowcase}
          onClose={() => setSettingsOpen(false)}
          onDeveloperAction={toggleDecorationShowcase}
          onExit={exitApplication}
          onResetCurrent={resetLaboratory}
          resetDescription={labels.desktop.settingsDialog.resetLabDescription}
          resetLabel={labels.desktop.settingsDialog.resetLab}
        />
      )}
    </main>
  );
}
