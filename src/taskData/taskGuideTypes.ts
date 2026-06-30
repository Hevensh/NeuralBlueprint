import type { ReactNode } from 'react';
import type { PageType } from '../blueprint/PageTypes';
import type { ModuleBaseNodeKind } from '../blueprint/neuralBlueprint/ModuleBaseNodeTypes';

export interface TaskGuideConfig {
  id: string;
  title: string;
  completionInfo?: TaskGuideStepInfo;
  steps: TaskGuideStepConfig[];
}

export interface TaskGuideStepConfig {
  id: string;
  workspace: PageType;
  title: string;
  description?: string;
  hint: string;
  info?: TaskGuideStepInfo;
  animation?: TaskGuideStepAnimation | TaskGuideStepAnimation[];
  completeWhen: TaskGuideCondition;
}

export interface TaskGuideStepInfo {
  title: string;
  body: string;
  illustration?: () => ReactNode;
}

export interface TaskGuideStepAnimation {
  title?: string;
  hint?: string;
  target?: string;
  selector?: string;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  demo?: TaskGuideAnimationDemo;
  skipWhen?: TaskGuideCondition;
  completeWhen?: TaskGuideCondition;
}

export type TaskGuideAnimationDemo =
  | {
    type: 'drag';
    fromTarget?: string;
    fromSelector?: string;
    toTarget?: string;
    toSelector?: string;
    toOffset?: TaskGuideDragOffset;
    label?: string;
    path?: 'straight' | 'curve';
  }
  | {
    type: 'connect';
    segments: TaskGuideConnectionSegment[];
  };

export type TaskGuideDragOffset =
  | number
  | {
    x?: number;
    y?: number;
  };

export interface TaskGuideConnectionSegment {
  fromTarget?: string;
  fromSelector?: string;
  toTarget?: string;
  toSelector?: string;
}

export type TaskGuideCondition =
  | {
    type: 'all';
    conditions: TaskGuideCondition[];
  }
  | {
    type: 'any';
    conditions: TaskGuideCondition[];
  }
  | {
    type: 'not';
    condition: TaskGuideCondition;
  }
  | {
    type: 'activeWorkspace';
    workspace: PageType;
  }
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
    type: 'moduleCount';
    kind: ModuleBaseNodeKind;
    min?: number;
    max?: number;
    equals?: number;
  }
  | {
    type: 'selectedModuleNode';
    selector: ModuleNodeSelector;
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
  predecessorId?: string;
  successorId?: string;
  predecessorKind?: ModuleBaseNodeKind;
  successorKind?: ModuleBaseNodeKind;
  props?: Record<string, string | number | boolean>;
  minProps?: Record<string, number>;
  stats?: Record<string, string | number | boolean>;
}

export type BlueprintTaskStatName =
  | 'nodeCount'
  | 'edgeCount'
  | 'totalMemoryPoint'
  | 'totalInferencePoint'
  | 'maxInferenceStage';

export type TrainingTaskFlagName = 'modelInitialized';

export type TrainingTaskStatName =
  | 'epoch'
  | 'trainSteps'
  | 'savedCurveCount'
  | 'bestValLoss'
  | 'savedBestValLoss';
