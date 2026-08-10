import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { LAB_SCENE_HEIGHT, LAB_SCENE_WIDTH } from './labIsometric';

interface LabSceneView {
  x: number;
  y: number;
  zoom: number;
}

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;
const VIEW_PADDING = 20;

export function useLabSceneViewport() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    view: LabSceneView;
  } | null>(null);
  const [view, setView] = useState<LabSceneView>({ x: 0, y: 0, zoom: 1 });
  const [dragging, setDragging] = useState(false);

  const resetView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { width, height } = viewport.getBoundingClientRect();
    const zoom = Math.min(
      (width - VIEW_PADDING * 2) / LAB_SCENE_WIDTH,
      (height - VIEW_PADDING * 2) / LAB_SCENE_HEIGHT,
    );
    setView({
      x: (width - LAB_SCENE_WIDTH * zoom) / 2,
      y: (height - LAB_SCENE_HEIGHT * zoom) / 2 + 0.05 * height,
      zoom,
    });
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(resetView);
    observer.observe(viewport);
    resetView();
    return () => observer.disconnect();
  }, [resetView]);

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const bounds = viewport.getBoundingClientRect();
    const pointerX = clientX - bounds.left;
    const pointerY = clientY - bounds.top;
    setView((current) => {
      const zoom = clamp(current.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const ratio = zoom / current.zoom;
      return {
        x: pointerX - (pointerX - current.x) * ratio,
        y: pointerY - (pointerY - current.y) * ratio,
        zoom,
      };
    });
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const bounds = viewport.getBoundingClientRect();
    zoomAt(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, factor);
  }, [zoomAt]);

  const onWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, Math.exp(-event.deltaY * 0.0012));
  }, [zoomAt]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      event.button !== 0
      || (event.target as Element).closest('button, input, select, textarea')
    ) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      view,
    };
    setDragging(true);
  }, [view]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setView({
      ...drag.view,
      x: drag.view.x + event.clientX - drag.startX,
      y: drag.view.y + event.clientY - drag.startY,
    });
  }, []);

  const stopDragging = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  }, []);

  return {
    viewportRef,
    view,
    dragging,
    resetView,
    zoomBy,
    viewportEvents: {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp: stopDragging,
      onPointerCancel: stopDragging,
    },
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
