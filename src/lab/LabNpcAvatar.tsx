import { memo, useMemo, type CSSProperties } from 'react';
import { createLabNpcAppearance } from './labNpcAppearance';
import type { LabNpcDefinition } from './labTypes';

interface LabNpcAvatarProps {
  canTalk: boolean;
  label: string;
  npc: LabNpcDefinition;
  onClick: () => void;
}

export const LabNpcAvatar = memo(function LabNpcAvatar({
  canTalk,
  label,
  npc,
  onClick,
}: LabNpcAvatarProps) {
  const appearance = useMemo(() => createLabNpcAppearance(npc), [npc]);
  const style = {
    '--npc-color': npc.color,
    '--npc-shell': appearance.shellColor,
    '--npc-module': appearance.moduleColor,
    '--npc-signal': appearance.signalColor,
    '--npc-eye-left-y': `${appearance.eyeLeftY}%`,
    '--npc-eye-right-y': `${appearance.eyeRightY}%`,
    '--npc-eye-left-x': `${appearance.eyeLeftX}%`,
    '--npc-eye-right-x': `${appearance.eyeRightX}%`,
    '--npc-eye-left-scale': appearance.eyeLeftScale,
    '--npc-eye-right-scale': appearance.eyeRightScale,
    '--npc-mouth-x': `${appearance.mouthX}%`,
    '--npc-mouth-y': `${appearance.mouthY}%`,
    '--npc-mouth-scale': appearance.mouthScale,
    '--npc-head-tilt': `${appearance.headTilt}deg`,
    '--npc-head-skew': `${appearance.headSkew}deg`,
    '--npc-head-apex': `${appearance.headApex}%`,
    '--npc-head-left-base': `${appearance.headLeftBase}%`,
    '--npc-head-right-base': `${appearance.headRightBase}%`,
    '--npc-head-top-left-x': `${appearance.headTopLeftX}%`,
    '--npc-head-top-right-x': `${appearance.headTopRightX}%`,
    '--npc-head-right-y': `${appearance.headRightY}%`,
    '--npc-head-bottom-right-x': `${appearance.headBottomRightX}%`,
    '--npc-head-bottom-left-x': `${appearance.headBottomLeftX}%`,
    '--npc-head-left-y': `${appearance.headLeftY}%`,
    '--npc-eye-left-tilt': `${appearance.eyeLeftTilt}deg`,
    '--npc-eye-right-tilt': `${appearance.eyeRightTilt}deg`,
    '--npc-mouth-tilt': `${appearance.mouthTilt}deg`,
    '--npc-body-tilt': `${appearance.bodyTilt}deg`,
    '--npc-body-skew': `${appearance.bodySkew}deg`,
    '--npc-body-width': `${appearance.bodyWidth}%`,
    '--npc-body-height': `${appearance.bodyHeight}%`,
    '--npc-body-x': `${appearance.bodyX}%`,
    '--npc-body-apex': `${appearance.bodyApex}%`,
    '--npc-body-left-shoulder': `${appearance.bodyLeftShoulder}%`,
    '--npc-body-right-shoulder': `${appearance.bodyRightShoulder}%`,
    '--npc-body-left-foot': `${appearance.bodyLeftFoot}%`,
    '--npc-body-right-foot': `${appearance.bodyRightFoot}%`,
  } as CSSProperties;

  return (
    <button
      aria-label={label}
      className={`lab-npc head-${appearance.head} module-${appearance.module} eyes-${appearance.eyes} mouth-${appearance.mouth} body-${appearance.body}`}
      onClick={onClick}
      style={style}
      type="button"
    >
      <span aria-hidden="true" className="lab-npc-head">
        <span className="lab-npc-head-shape">
          <span className="lab-npc-face">
            <i className="lab-npc-eye left" />
            <i className="lab-npc-eye right" />
            <span className="lab-npc-mouth"><i /><i /><i /></span>
          </span>
        </span>
        <span className="lab-npc-module"><i /><i /><i /></span>
      </span>
      <span aria-hidden="true" className="lab-npc-body">
        <span className="lab-npc-torso">
          <i className="top" /><i className="light" /><i className="dark" />
        </span>
        <span className="lab-npc-core" />
        <span className="lab-npc-base"><i /><i /></span>
      </span>
      {canTalk && <span aria-hidden="true" className="lab-npc-talk-marker">?</span>}
    </button>
  );
});
