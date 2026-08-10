export type LabNpcRole = 'senior' | 'peer';

export interface LocalizedLabText {
  en: string;
  zh: string;
}

export interface LabReward {
  id: string;
  kind: string;
  targetId?: string;
  amount?: number;
  data?: Record<string, string | number | boolean>;
}

export interface LabRewardCandidate {
  weight: number;
  reward: LabReward;
  label: LocalizedLabText;
}

export interface LabNpcTopic {
  id: string;
  question: LocalizedLabText;
  response: LocalizedLabText;
  rewards?: LabRewardCandidate[];
}

export interface LabNpcDefinition {
  id: string;
  role: LabNpcRole;
  name: LocalizedLabText;
  color: string;
  topics: LabNpcTopic[];
}

export interface LabRewardReceipt {
  encounterId: string;
  reward: LabReward;
}

export interface LabWorkstationAssignment {
  workstationId: string;
  npcId: string;
}

export interface LabProgress {
  generationSeed: string;
  workstations: LabWorkstationAssignment[];
  playerWorkstationId: string | null;
  presentNpcIds: string[];
  completedTopicIds: string[];
  rewards: LabRewardReceipt[];
}

export interface LabWorkstationLayoutConfig {
  allowedGroupLengths: number[];
  minTotalWorkstations: number;
  maxTotalWorkstations: number;
}

export interface LabDayConfig {
  workstationLayout: LabWorkstationLayoutConfig;
  npcCount: number;
  minAttendance: number;
  maxAttendance: number;
  npcPool: LabNpcDefinition[];
}
