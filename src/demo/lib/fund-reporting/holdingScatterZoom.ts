export type ScatterYRange = [number, number];

export const HOLDING_SCATTER_MIN_Y_SPAN_RATIO = 1 / 64;
export const HOLDING_SCATTER_MAX_Y_SPAN_RATIO = 8;
export const HOLDING_SCATTER_PAN_PADDING_RATIO = 0.25;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function getScatterYValueAtPointer({
  range,
  pointerY,
  scrollTop,
  plotTop,
  plotHeight,
}: {
  range: ScatterYRange;
  pointerY: number;
  scrollTop: number;
  plotTop: number;
  plotHeight: number;
}) {
  const [start, end] = range;
  const span = end - start;
  if (!Number.isFinite(span) || span <= 0 || !Number.isFinite(plotHeight) || plotHeight <= 0) {
    return (start + end) / 2;
  }

  const canvasY = scrollTop + pointerY;
  const ratioFromTop = clamp((canvasY - plotTop) / plotHeight, 0, 1);
  return end - ratioFromTop * span;
}

export function zoomScatterYRange({
  range,
  originalRange,
  anchorValue,
  zoomFactor,
}: {
  range: ScatterYRange;
  originalRange: ScatterYRange;
  anchorValue: number;
  zoomFactor: number;
}): ScatterYRange {
  const [start, end] = range;
  const currentSpan = end - start;
  const originalSpan = originalRange[1] - originalRange[0];

  if (
    !Number.isFinite(currentSpan) ||
    currentSpan <= 0 ||
    !Number.isFinite(originalSpan) ||
    originalSpan <= 0 ||
    !Number.isFinite(anchorValue) ||
    !Number.isFinite(zoomFactor) ||
    zoomFactor <= 0
  ) {
    return range;
  }

  const minimumSpan = originalSpan * HOLDING_SCATTER_MIN_Y_SPAN_RATIO;
  const maximumSpan = originalSpan * HOLDING_SCATTER_MAX_Y_SPAN_RATIO;
  const nextSpan = clamp(currentSpan / zoomFactor, minimumSpan, maximumSpan);
  const anchorRatio = clamp((anchorValue - start) / currentSpan, 0, 1);
  const nextStart = anchorValue - anchorRatio * nextSpan;
  const nextEnd = nextStart + nextSpan;

  if (!Number.isFinite(nextStart) || !Number.isFinite(nextEnd) || nextEnd <= nextStart) {
    return range;
  }

  return [nextStart, nextEnd];
}

export function panScatterRange({
  range,
  originalRange,
  delta,
  paddingRatio = HOLDING_SCATTER_PAN_PADDING_RATIO,
}: {
  range: ScatterYRange;
  originalRange: ScatterYRange;
  delta: number;
  paddingRatio?: number;
}): ScatterYRange {
  const [start, end] = range;
  const currentSpan = end - start;
  const originalSpan = originalRange[1] - originalRange[0];

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    !Number.isFinite(currentSpan) ||
    currentSpan <= 0 ||
    !Number.isFinite(originalSpan) ||
    originalSpan <= 0 ||
    !Number.isFinite(delta) ||
    !Number.isFinite(paddingRatio) ||
    paddingRatio < 0
  ) {
    return range;
  }

  const padding = originalSpan * paddingRatio;
  const boundaryStart = originalRange[0] - padding;
  const boundaryEnd = originalRange[1] + padding;
  const boundarySpan = boundaryEnd - boundaryStart;

  // A zoomed-out range that already covers the complete bounded area has no
  // meaningful place to pan without exposing additional empty chart space.
  if (currentSpan >= boundarySpan) return range;

  const nextStart = clamp(start + delta, boundaryStart, boundaryEnd - currentSpan);
  const nextEnd = nextStart + currentSpan;

  if (!Number.isFinite(nextStart) || !Number.isFinite(nextEnd) || nextEnd <= nextStart) {
    return range;
  }

  return [nextStart, nextEnd];
}

export function scatterYRangesEqual(left: ScatterYRange, right: ScatterYRange, epsilon = 1e-6) {
  return Math.abs(left[0] - right[0]) <= epsilon && Math.abs(left[1] - right[1]) <= epsilon;
}
