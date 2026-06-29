import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type {
  TaskGuideAnimationDemo,
  TaskGuideConnectionSegment,
} from '../../taskData/taskGuideTypes';
import type { EvaluatedTaskGuide } from './evaluateTaskGuide';
import './taskGuideLayer.css';

type GuideRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type BubblePlacement = 'top' | 'right' | 'bottom' | 'left';

type GuidePoint = {
  x: number;
  y: number;
};

type GuideDemoRender =
  | {
    type: 'drag';
    from: GuidePoint;
    to: GuidePoint;
    label?: string;
    path: 'straight' | 'curve';
  }
  | {
    type: 'connect';
    segments: Array<{
      from: GuidePoint;
      to: GuidePoint;
    }>;
  };

interface TaskGuideLayerProps {
  guide: EvaluatedTaskGuide;
}

export function TaskGuideLayer({ guide }: TaskGuideLayerProps) {
  const activeStep = guide.activeStep;
  const animation = activeStep?.completed ? undefined : activeStep?.animation;
  const [rect, setRect] = useState<GuideRect | null>(null);
  const [demo, setDemo] = useState<GuideDemoRender | null>(null);

  useEffect(() => {
    if (!animation?.target && !animation?.selector && !animation?.demo) {
      return undefined;
    }

    let active = true;

    const getTarget = () => findGuideTarget(animation);
    const updateRect = () => {
      const target = getTarget();
      if (!active || !target) {
        setRect(null);
        setDemo(null);
        return;
      }
      target.classList.add('guide-target-active');
      setRect(toGuideRect(target.getBoundingClientRect()));
      setDemo(animation.demo ? buildGuideDemo(animation.demo) : null);
    };
    const addTargetClass = () => getTarget()?.classList.add('guide-target-active');
    const removeTargetClass = () => getTarget()?.classList.remove('guide-target-active');

    addTargetClass();
    const frame = window.requestAnimationFrame(updateRect);
    const delayed = window.setTimeout(updateRect, 120);
    const interval = window.setInterval(updateRect, 280);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      active = false;
      removeTargetClass();
      setDemo(null);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(delayed);
      window.clearInterval(interval);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [animation]);

  const placement = animation?.placement ?? 'top';
  const bubbleStyle = useMemo(
    () => (rect ? bubblePosition(rect, placement) : undefined),
    [placement, rect],
  );

  if (!activeStep || !animation || !rect) return null;

  return (
    <div className="task-guide-layer" aria-hidden="true">
      <GuideSpotlight rect={rect} />
      {demo && <GuideDemo demo={demo} />}
      <div
        className={`task-guide-bubble ${placement}`}
        style={bubbleStyle}
      >
        <div className="task-guide-bubble-title">
          {animation.title ?? activeStep.title}
        </div>
        <div className="task-guide-bubble-hint">
          {animation.hint ?? activeStep.hint}
        </div>
      </div>
    </div>
  );
}

function GuideDemo({ demo }: { demo: GuideDemoRender }) {
  if (demo.type === 'drag') {
    const path = demo.path === 'straight'
      ? straightPath(demo.from, demo.to)
      : curvedPath(demo.from, demo.to);
    const ghostStyle = {
      '--guide-drag-x': `${demo.to.x - demo.from.x}px`,
      '--guide-drag-y': `${demo.to.y - demo.from.y}px`,
      left: demo.from.x,
      top: demo.from.y,
    } as CSSProperties;

    return (
      <>
        <svg className="task-guide-demo-svg">
          <path className="task-guide-demo-path drag" d={path} />
        </svg>
        <div className="task-guide-drag-ghost" style={ghostStyle}>
          {demo.label ?? 'Node'}
        </div>
      </>
    );
  }

  return (
    <svg className="task-guide-demo-svg">
      <defs>
        <marker
          id="task-guide-arrow"
          markerHeight="7"
          markerWidth="7"
          orient="auto"
          refX="6"
          refY="3.5"
        >
          <path d="M 0 0 L 7 3.5 L 0 7 z" />
        </marker>
      </defs>
      {demo.segments.map((segment, index) => (
        <g key={`${segment.from.x}:${segment.from.y}:${segment.to.x}:${segment.to.y}`}>
          <path
            className="task-guide-demo-path connect"
            d={curvedPath(segment.from, segment.to)}
            markerEnd="url(#task-guide-arrow)"
            style={{ animationDelay: `${index * 0.28}s` }}
          />
          <circle
            className="task-guide-handle-ring start"
            cx={segment.from.x}
            cy={segment.from.y}
            r="6"
          />
          <circle
            className="task-guide-handle-ring end"
            cx={segment.to.x}
            cy={segment.to.y}
            r="6"
          />
        </g>
      ))}
    </svg>
  );
}

function GuideSpotlight({ rect }: { rect: GuideRect }) {
  const padding = 8;
  return (
    <div
      className="task-guide-spotlight"
      style={{
        height: rect.height + padding * 2,
        left: rect.left - padding,
        top: rect.top - padding,
        width: rect.width + padding * 2,
      }}
    />
  );
}

function findGuideTarget(
  animation: NonNullable<NonNullable<EvaluatedTaskGuide['activeStep']>['animation']>,
) {
  if (animation.selector) {
    return document.querySelector<HTMLElement>(animation.selector);
  }
  if (!animation.target) return null;
  return document.querySelector<HTMLElement>(
    `[data-guide-target="${animation.target}"]`,
  );
}

function buildGuideDemo(
  demo: TaskGuideAnimationDemo,
): GuideDemoRender | null {
  if (demo.type === 'drag') {
    const from = guidePoint(resolveGuideElement({
      target: demo.fromTarget,
      selector: demo.fromSelector,
    }));
    const to = guidePoint(resolveGuideElement({
      target: demo.toTarget,
      selector: demo.toSelector,
    }));

    return from && to
      ? {
          type: 'drag',
          from,
          to,
          label: demo.label,
          path: demo.path ?? 'curve',
        }
      : null;
  }

  const segments = demo.segments
    .map(toGuideSegment)
    .filter((segment): segment is NonNullable<typeof segment> => (
      segment !== null
    ));

  return segments.length > 0
    ? { type: 'connect', segments }
    : null;
}

function toGuideSegment(segment: TaskGuideConnectionSegment) {
  const from = guidePoint(resolveGuideElement({
    target: segment.fromTarget,
    selector: segment.fromSelector,
  }));
  const to = guidePoint(resolveGuideElement({
    target: segment.toTarget,
    selector: segment.toSelector,
  }));

  return from && to ? { from, to } : null;
}

function resolveGuideElement({
  target,
  selector,
}: {
  target?: string;
  selector?: string;
}) {
  if (selector) return document.querySelector<HTMLElement>(selector);
  if (!target) return null;
  return document.querySelector<HTMLElement>(
    `[data-guide-target="${target}"]`,
  );
}

function guidePoint(element: HTMLElement | null): GuidePoint | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function curvedPath(from: GuidePoint, to: GuidePoint) {
  const dx = Math.max(52, Math.abs(to.x - from.x) * 0.48);
  const fromControlX = from.x + Math.sign(to.x - from.x || 1) * dx;
  const toControlX = to.x - Math.sign(to.x - from.x || 1) * dx;
  return [
    `M ${from.x.toFixed(1)} ${from.y.toFixed(1)}`,
    `C ${fromControlX.toFixed(1)} ${from.y.toFixed(1)}`,
    `${toControlX.toFixed(1)} ${to.y.toFixed(1)}`,
    `${to.x.toFixed(1)} ${to.y.toFixed(1)}`,
  ].join(' ');
}

function straightPath(from: GuidePoint, to: GuidePoint) {
  return [
    `M ${from.x.toFixed(1)} ${from.y.toFixed(1)}`,
    `L ${to.x.toFixed(1)} ${to.y.toFixed(1)}`,
  ].join(' ');
}

function toGuideRect(rect: DOMRect): GuideRect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function bubblePosition(rect: GuideRect, placement: BubblePlacement) {
  const gap = 14;
  if (placement === 'right') {
    return {
      left: rect.left + rect.width + gap,
      top: rect.top + rect.height / 2,
      transform: 'translateY(-50%)',
    };
  }
  if (placement === 'left') {
    return {
      left: rect.left - gap,
      top: rect.top + rect.height / 2,
      transform: 'translate(-100%, -50%)',
    };
  }
  if (placement === 'bottom') {
    return {
      left: rect.left + rect.width / 2,
      top: rect.top + rect.height + gap,
      transform: 'translateX(-50%)',
    };
  }
  return {
    left: rect.left + rect.width / 2,
    top: rect.top - gap,
    transform: 'translate(-50%, -100%)',
  };
}
