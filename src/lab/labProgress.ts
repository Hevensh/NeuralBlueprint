import type {
  LabDayConfig,
  LabNpcTopic,
  LabProgress,
  LabRewardCandidate,
} from './labTypes';
import { createSeededRandom, shuffleWith } from './labRandom';
import { createLabSceneLayout } from './labSceneLayout';

export function createInitialLabProgress(
  config: LabDayConfig,
  seed: string,
  day: number,
): LabProgress {
  const workstationIds = getWorkstationIds(config, seed);
  const workstations = selectRoster(config, seed, workstationIds);
  return {
    generationSeed: seed,
    workstations,
    playerWorkstationId: null,
    presentNpcIds: selectAttendance(config, workstations, `${seed}:day:${day}`),
    completedTopicIds: [],
    rewards: [],
  };
}

export function claimLabWorkstation(
  progress: LabProgress,
  config: LabDayConfig,
  workstationId: string,
): LabProgress {
  if (progress.playerWorkstationId) return progress;
  if (progress.workstations.some((desk) => desk.workstationId === workstationId)) {
    return progress;
  }

  const workstationIds = new Set(getWorkstationIds(config, progress.generationSeed));
  if (!workstationIds.has(workstationId)) return progress;

  return { ...progress, playerWorkstationId: workstationId };
}

export function advanceLabDay(
  progress: LabProgress,
  config: LabDayConfig,
  day: number,
): LabProgress {
  return {
    ...progress,
    presentNpcIds: selectAttendance(
      config,
      progress.workstations,
      `${progress.generationSeed}:day:${day}`,
    ),
  };
}

export function graduateLabSenior(
  progress: LabProgress,
  config: LabDayConfig,
  day: number,
  npcId: string,
): LabProgress {
  const graduatingNpc = config.npcPool.find((npc) => npc.id === npcId);
  if (graduatingNpc?.role !== 'senior') return progress;

  const occupiedIds = new Set(progress.workstations.map((desk) => desk.npcId));
  const candidates = config.npcPool.filter((npc) => !occupiedIds.has(npc.id));
  if (candidates.length === 0) return progress;

  const random = createSeededRandom(
    `${progress.generationSeed}:graduate:${day}:${npcId}`,
  );
  const replacement = candidates[Math.floor(random() * candidates.length)];
  const workstations = progress.workstations.map((desk) => (
    desk.npcId === npcId ? { ...desk, npcId: replacement.id } : desk
  ));

  return {
    ...progress,
    workstations,
    presentNpcIds: selectAttendance(
      config,
      workstations,
      `${progress.generationSeed}:day:${day}:replacement:${replacement.id}`,
    ),
  };
}

export function completeLabTopic(
  progress: LabProgress,
  day: number,
  npcId: string,
  topic: LabNpcTopic,
): LabProgress {
  const encounterId = `${day}:${npcId}:${topic.id}`;
  if (progress.completedTopicIds.includes(encounterId)) return progress;

  const reward = pickWeighted(
    topic.rewards ?? [],
    `${progress.generationSeed}:${encounterId}`,
  );

  return {
    ...progress,
    completedTopicIds: [...progress.completedTopicIds, encounterId],
    rewards: reward
      ? [...progress.rewards, { encounterId, reward: reward.reward }]
      : progress.rewards,
  };
}

export function getTopicEncounterId(
  day: number,
  npcId: string,
  topicId: string,
) {
  return `${day}:${npcId}:${topicId}`;
}

function selectRoster(
  config: LabDayConfig,
  seed: string,
  workstationIds: string[],
) {
  const random = createSeededRandom(seed);
  const ids = config.npcPool.map((npc) => npc.id);

  shuffleWith(ids, random);
  shuffleWith(workstationIds, random);

  return ids.slice(0, config.npcCount).map((npcId, index) => ({
    workstationId: workstationIds[index],
    npcId,
  }));
}

function getWorkstationIds(config: LabDayConfig, seed: string) {
  return createLabSceneLayout(seed, config.workstationLayout)
    .workstations.map((workstation) => workstation.workstationId);
}

function selectAttendance(
  config: LabDayConfig,
  workstations: LabProgress['workstations'],
  seed: string,
) {
  const random = createSeededRandom(seed);
  const maximum = Math.min(config.maxAttendance, workstations.length);
  const minimum = Math.min(config.minAttendance, maximum);
  const count = minimum + Math.floor(random() * (maximum - minimum + 1));
  const npcIds = workstations.map((desk) => desk.npcId);

  shuffleWith(npcIds, random);

  return npcIds.slice(0, count);
}

function pickWeighted(
  candidates: LabRewardCandidate[],
  seed: string,
): LabRewardCandidate | undefined {
  const totalWeight = candidates.reduce(
    (total, candidate) => total + Math.max(0, candidate.weight),
    0,
  );
  if (totalWeight <= 0) return undefined;

  let cursor = createSeededRandom(seed)() * totalWeight;
  for (const candidate of candidates) {
    cursor -= Math.max(0, candidate.weight);
    if (cursor <= 0) return candidate;
  }
  return candidates.at(-1);
}
