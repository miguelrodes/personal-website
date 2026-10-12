import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
import { useMapContext } from "react-simple-maps";
import { bindChartGestures, type ChartPointer } from "@demo/lib/chartGestures";

export type MapView = { coordinates: [number, number]; zoom: number };

export function MapNavigation({ containerRef, position, setPosition, clampCoordinates, onReset }: {
  containerRef: RefObject<HTMLDivElement | null>;
  position: MapView;
  setPosition: Dispatch<SetStateAction<MapView>>;
  clampCoordinates: (coordinates: [number, number]) => [number, number];
  onReset: () => void;
}) {
  const { projection, width, height } = useMapContext();
  const positionRef = useRef(position);
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => {
    const element = containerRef.current;
    const svg = element?.querySelector("svg");
    if (!element || !svg || !projection.invert) return;
    const invert = projection.invert;
    const svgPoint = (point: ChartPointer) => {
      const bounds = element.getBoundingClientRect();
      const svgBounds = svg.getBoundingClientRect();
      const scale = Math.min(svgBounds.width / width, svgBounds.height / height);
      if (scale <= 0) return null;
      // Account for SVG letterboxing and the demo's CSS zoom in screen pixels.
      const screenX = bounds.left + point.x * bounds.width / Math.max(element.clientWidth, 1);
      const screenY = bounds.top + point.y * bounds.height / Math.max(element.clientHeight, 1);
      return {
        x: (screenX - svgBounds.left - (svgBounds.width - width * scale) / 2) / scale,
        y: (screenY - svgBounds.top - (svgBounds.height - height * scale) / 2) / scale,
      };
    };
    const update = (center: [number, number], zoom: number) => {
      const coordinates = invert(center);
      if (!coordinates || coordinates.some(value => !Number.isFinite(value))) return;
      const next = { coordinates: clampCoordinates(coordinates), zoom };
      positionRef.current = next;
      setPosition(next);
    };
    return bindChartGestures(element, {
      onPan: (dx, dy) => {
        const current = positionRef.current;
        const center = projection(current.coordinates);
        const origin = svgPoint({ x: 0, y: 0 }), delta = svgPoint({ x: dx, y: dy });
        if (!center || !origin || !delta) return;
        update([center[0] + (delta.x - origin.x) / current.zoom, center[1] + (delta.y - origin.y) / current.zoom], current.zoom);
      },
      onZoom: (factor, pointer) => {
        const current = positionRef.current;
        const center = projection(current.coordinates), anchor = svgPoint(pointer);
        if (!center || !anchor) return;
        const zoom = Math.max(1.8, Math.min(6, current.zoom * factor));
        // Keep the geography beneath the pointer fixed as the scale changes.
        update([
          center[0] + (anchor.x - width / 2) * (1 / current.zoom - 1 / zoom),
          center[1] + (anchor.y - height / 2) * (1 / current.zoom - 1 / zoom),
        ], zoom);
      },
      onReset,
    });
  }, [containerRef, projection, width, height, setPosition, clampCoordinates, onReset]);
  return null;
}
