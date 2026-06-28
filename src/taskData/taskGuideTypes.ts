import type { PageType } from '../blueprint/PageTypes';
import type { ModuleBaseNodeKind } from '../blueprint/neuralBlueprint/ModuleBaseNodeTypes';

export interface TaskGuideConfig {
  id: string;
  title: string;
  steps: TaskGuideStepConfig[];
}

export interface TaskGuideStepConfig {
  id: string;
  workspace: PageType;
  title: string;
  description?: string;
  hint: string;
  completeWhen: TaskGuideCondition;
}

export type TaskGuideCondition =
  | {
    type: 'workspaceVisited';
    workspace: PageType;
  }
  | {
    type: 'moduleNodeExists';
    selector: ModuleNodeSelector;
  }
  | {
    type: 'modulePathExists';
    chain: ModuleNodeSelector[];
  }
  | {
    type: 'moduleReachabilityExists';
    from: ModuleNodeSelector;
    to: ModuleNodeSelector;
    via?: ModuleNodeSelector;
  }
  | {
    type: 'blueprintStat';
    stat: BlueprintTaskStatName;
    min?: number;
    max?: number;
    equals?: number;
  }
  | {
    type: 'trainingFlag';
    flag: TrainingTaskFlagName;
    value?: boolean;
  }
  | {
    type: 'trainingStat';
    stat: TrainingTaskStatName;
    min?: number;
    max?: number;
    equals?: number;
  };

export interface ModuleNodeSelector {
  id?: string;
  kind?: ModuleBaseNodeKind;
  name?: string;
  props?: Record<string, string | number | boolean>;
  stats?: Record<string, string | number | boolean>;
}

export type BlueprintTaskStatName =
  | 'nodeCount'
  | 'edgeCount'
  | 'totalMemoryPoint'
  | 'totalInferencePoint'
  | 'maxInferenceStage';

export type TrainingTaskFlagName = 'modelInitialized';

export type TrainingTaskStatName = 'epoch';
