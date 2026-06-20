import type { Dispatch, SetStateAction } from 'react';
import type { ModuleBaseNode } from '../ModuleBaseNodeTypes';

const ARRANGE_ANIMATION_DURATION = 420;

export type CancelNodePositionAnimation = () => void;

export function getArrangeAnimationDuration() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 0
    : ARRANGE_ANIMATION_DURATION;
}

export function easeArrangeAnimation(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

export function animateNodePositions(
  nodes: ModuleBaseNode[],
  targetNodes: ModuleBaseNode[],
  setNodes: Dispatch<SetStateAction<ModuleBaseNode[]>>,
  duration: number,
): CancelNodePositionAnimation {
  if (duration === 0) {
    setNodes(targetNodes);
    return () => undefined;
  }

  const startPositions = new Map(nodes.map((node) => [node.id, node.position]));
  const targetById = new Map(targetNodes.map((node) => [node.id, node]));
  const startedAt = performance.now();
  let animationFrame = 0;
  let cancelled = false;

  setNodes((currentNodes) => currentNodes.map((currentNode) => {
    const targetNode = targetById.get(currentNode.id);
    if (!targetNode) return currentNode;

    return {
      ...targetNode,
      position: currentNode.position,
      data: {
        ...targetNode.data,
        position: currentNode.position,
      },
    };
  }));

  const animate = (now: number) => {
    if (cancelled) return;

    const progress = Math.min((now - startedAt) / duration, 1);
    const easedProgress = easeArrangeAnimation(progress);

    setNodes((currentNodes) => currentNodes.map((currentNode) => {
      const startPosition = startPositions.get(currentNode.id);
      const targetNode = targetById.get(currentNode.id);
      if (!startPosition || !targetNode) return currentNode;

      const position = {
        x: interpolate(startPosition.x, targetNode.position.x, easedProgress),
        y: interpolate(startPosition.y, targetNode.position.y, easedProgress),
      };

      return {
        ...currentNode,
        position,
        data: {
          ...currentNode.data,
          position,
        },
      };
    }));

    if (progress < 1) {
      animationFrame = window.requestAnimationFrame(animate);
    }
  };

  animationFrame = window.requestAnimationFrame(animate);

  return () => {
    cancelled = true;
    window.cancelAnimationFrame(animationFrame);
  };
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

export function getTargetNodeBounds(nodes: ModuleBaseNode[]) {
  const visibleNodes = nodes.filter((node) => !node.hidden);
  if (visibleNodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  visibleNodes.forEach((node) => {
    const width = node.measured?.width ?? node.width ?? node.initialWidth ?? 1;
    const height = node.measured?.height ?? node.height ?? node.initialHeight ?? 1;
    const origin = node.origin ?? [0, 0];
    const x = node.position.x - width * origin[0];
    const y = node.position.y - height * origin[1];

    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + width);
    bottom = Math.max(bottom, y + height);
  });

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}
