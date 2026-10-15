import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from "react";

export type ScatterTooltipData = {
  pointKey: string;
  title: string;
  rows: [string, string][];
};
type HoveredPoint = { data: ScatterTooltipData; left: number; right: number; top: number };

// Plotly's SVG hover coordinates/text measurements do not account for ancestor CSS zoom.
// Hit-test the rendered bubbles and use normal HTML layout for their labels instead.
export function useScatterPointer(
  plotRef: RefObject<HTMLDivElement | null>,
  frameRef: RefObject<HTMLDivElement | null>,
  traces: { meta?: { tooltip?: ScatterTooltipData } }[],
  onSelect?: (pointKey: string) => void,
) {
  const press = useRef<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState<HoveredPoint | null>(null);
  const clear = () => setHovered(null);
  useEffect(() => {
    window.addEventListener("scroll", clear, true);
    window.addEventListener("resize", clear);
    window.addEventListener("wheel", clear, true);
    return () => {
      window.removeEventListener("scroll", clear, true);
      window.removeEventListener("resize", clear);
      window.removeEventListener("wheel", clear, true);
    };
  }, []);

  const pointAt = (event: MouseEvent<HTMLDivElement>): HoveredPoint | null => {
    const frame = frameRef.current;
    if (!frame) return null;
    const bounds = frame.getBoundingClientRect();
    const scaleX = bounds.width / frame.clientWidth;
    const scaleY = bounds.height / frame.clientHeight;
    const renderedTraces = plotRef.current?.querySelectorAll<SVGGElement>(".scatterlayer .trace");
    if (!renderedTraces) return null;
    // Last trace is drawn on top, so overlapping bubbles follow the visible stacking order.
    for (let index = renderedTraces.length - 1; index >= 0; index--) {
      const data = traces[index]?.meta?.tooltip;
      if (!data) continue;
      const marker = renderedTraces[index].querySelector<SVGPathElement>(".points .point");
      const box = marker?.getBoundingClientRect();
      if (!box || box.width === 0 || box.height === 0) continue;
      const dx = (event.clientX - box.left - box.width / 2) / (box.width / 2);
      const dy = (event.clientY - box.top - box.height / 2) / (box.height / 2);
      if (dx * dx + dy * dy > 1) continue;
      return { data, left: (box.left - bounds.left) / scaleX,
        right: (box.right - bounds.left) / scaleX, top: (box.top - bounds.top) / scaleY };
    }
    return null;
  };
  return {
    pointerHandlers: {
      onMouseMoveCapture: (event: MouseEvent<HTMLDivElement>) => {
        const next = pointAt(event);
        setHovered(current => current?.data.pointKey === next?.data.pointKey && current?.left === next?.left && current?.top === next?.top ? current : next);
      },
      onMouseLeave: clear,
      onPointerDownCapture: (event: PointerEvent<HTMLDivElement>) => {
        clear();
        press.current = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
      },
      onPointerCancel: () => { press.current = null; clear(); },
      onPointerUpCapture: (event: PointerEvent<HTMLDivElement>) => {
        const start = press.current;
        press.current = null;
        if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) return;
        const next = pointAt(event);
        setHovered(next);
        if (next) onSelect?.(next.data.pointKey);
      },
    },
    tooltip: hovered ? <ScatterTooltip point={hovered} frameRef={frameRef} /> : null,
  };
}

function ScatterTooltip({ point, frameRef }: { point: HoveredPoint; frameRef: RefObject<HTMLDivElement | null> }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const tooltip = ref.current, frame = frameRef.current;
    if (!tooltip || !frame) return;
    const gap = 10;
    const preferredLeft = point.right + gap + tooltip.offsetWidth <= frame.clientWidth
      ? point.right + gap : point.left - gap - tooltip.offsetWidth;
    tooltip.style.left = `${Math.max(8, Math.min(preferredLeft, frame.clientWidth - tooltip.offsetWidth - 8))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(point.top, frame.clientHeight - tooltip.offsetHeight - 8))}px`;
  }, [point, frameRef]);
  return <div ref={ref} role="tooltip" className="scatter-tooltip">
    <strong>{point.data.title}</strong>
    <dl>{point.data.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </div>;
}
