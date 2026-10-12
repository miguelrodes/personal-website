export type ChartPointer = { x: number; y: number };

type ChartGestures = {
  onPan: (deltaX: number, deltaY: number) => void;
  onZoom: (factor: number, pointer: ChartPointer) => void;
  onReset: () => void;
};

// Shared with the underlying-company MOIC plot: wheel pans, pinch zooms.
const PINCH_SENSITIVITY = 0.0075;
const PINCH_ACCELERATION = 3;

export function bindChartGestures(element: HTMLElement, handlers: ChartGestures) {
  let pinchDistance: number | null = null;
  let gestureScale = 1;
  let gestureActive = false;
  const localPoint = (clientX: number, clientY: number): ChartPointer => {
    const bounds = element.getBoundingClientRect();
    return {
      x: (clientX - bounds.left) * element.clientWidth / Math.max(bounds.width, 1),
      y: (clientY - bounds.top) * element.clientHeight / Math.max(bounds.height, 1),
    };
  };
  const consume = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const wheel = (event: WheelEvent) => {
    const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
    const dx = Number.isFinite(event.deltaX) ? event.deltaX * multiplier : 0;
    const dy = Number.isFinite(event.deltaY) ? event.deltaY * multiplier : 0;
    if (Math.abs(dx) < .01 && Math.abs(dy) < .01) return;
    consume(event);
    if (gestureActive || pinchDistance !== null) return;
    if (event.ctrlKey) {
      const exponent = Math.max(-.7, Math.min(.7, -dy * PINCH_SENSITIVITY));
      handlers.onZoom(Math.exp(exponent), localPoint(event.clientX, event.clientY));
    } else {
      const bounds = element.getBoundingClientRect();
      const x = event.shiftKey && dx === 0 ? dy : dx;
      const y = event.shiftKey && dx === 0 ? 0 : dy;
      handlers.onPan(x * element.clientWidth / Math.max(bounds.width, 1), y * element.clientHeight / Math.max(bounds.height, 1));
    }
  };
  const distance = (touches: TouchList) => Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  );
  const touchStart = (event: TouchEvent) => {
    if (event.touches.length !== 2) return;
    consume(event);
    pinchDistance = distance(event.touches);
  };
  const touchMove = (event: TouchEvent) => {
    if (event.touches.length !== 2 || pinchDistance === null) return;
    consume(event);
    const nextDistance = distance(event.touches);
    if (pinchDistance > 0 && nextDistance > 0) {
      handlers.onZoom(Math.pow(nextDistance / pinchDistance, PINCH_ACCELERATION), localPoint(
        (event.touches[0].clientX + event.touches[1].clientX) / 2,
        (event.touches[0].clientY + event.touches[1].clientY) / 2,
      ));
    }
    pinchDistance = nextDistance;
  };
  const touchEnd = () => { pinchDistance = null; };
  type GestureEvent = Event & { clientX: number; clientY: number; scale: number };
  const gestureStart = (event: Event) => {
    consume(event);
    if (pinchDistance !== null) return;
    gestureActive = true;
    gestureScale = 1;
  };
  const gestureChange = (event: Event) => {
    consume(event);
    if (!gestureActive || pinchDistance !== null) return;
    const gesture = event as GestureEvent;
    if (!Number.isFinite(gesture.scale) || gesture.scale <= 0) return;
    handlers.onZoom(Math.pow(gesture.scale / gestureScale, PINCH_ACCELERATION), localPoint(gesture.clientX, gesture.clientY));
    gestureScale = gesture.scale;
  };
  const gestureEnd = () => { gestureActive = false; };
  const doubleClick = (event: MouseEvent) => { consume(event); handlers.onReset(); };
  // Capture prevents the map/plot library from also handling the same gesture.
  element.addEventListener("wheel", wheel, { passive: false, capture: true });
  element.addEventListener("touchstart", touchStart, { passive: false, capture: true });
  element.addEventListener("touchmove", touchMove, { passive: false, capture: true });
  element.addEventListener("touchend", touchEnd, true);
  element.addEventListener("touchcancel", touchEnd, true);
  element.addEventListener("gesturestart", gestureStart, { passive: false, capture: true });
  element.addEventListener("gesturechange", gestureChange, { passive: false, capture: true });
  element.addEventListener("gestureend", gestureEnd, true);
  element.addEventListener("dblclick", doubleClick, true);
  return () => {
    element.removeEventListener("wheel", wheel, true);
    element.removeEventListener("touchstart", touchStart, true);
    element.removeEventListener("touchmove", touchMove, true);
    element.removeEventListener("touchend", touchEnd, true);
    element.removeEventListener("touchcancel", touchEnd, true);
    element.removeEventListener("gesturestart", gestureStart, true);
    element.removeEventListener("gesturechange", gestureChange, true);
    element.removeEventListener("gestureend", gestureEnd, true);
    element.removeEventListener("dblclick", doubleClick, true);
  };
}
