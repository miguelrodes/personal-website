import { useMemo, useState, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { Globe } from "lucide-react";
import { MapNavigation, type MapView } from "./MapNavigation";

// European countries for the index
const europeanCountries = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
  "Iceland", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta",
  "Netherlands", "Norway", "Poland", "Portugal", "Romania", "Serbia", "Slovakia",
  "Slovenia", "Spain", "Sweden", "Switzerland", "Turkey", "Ukraine", "United Kingdom"
];

// World map TopoJSON
import geoUrl from "world-atlas/countries-110m.json";

// Country coordinates (lon, lat) for major countries
export const countryCoordinates: Record<string, [number, number]> = {
  // North America
  "United States": [-95.7, 37.1],
  "Canada": [-106.3, 56.1],
  "Mexico": [-102.5, 23.6],
  // South America
  "Brazil": [-51.9, -14.2],
  "Argentina": [-63.6, -38.4],
  "Chile": [-71.5, -35.7],
  "Colombia": [-74.3, 4.6],
  "Peru": [-75.0, -9.2],
  "Uruguay": [-55.8, -32.5],
  "Ecuador": [-78.2, -1.8],
  "Venezuela": [-66.6, 6.4],
  // Europe
  "United Kingdom": [-1.2, 52.2],
  "Germany": [10.4, 51.2],
  "France": [2.2, 46.2],
  "Spain": [-3.7, 40.5],
  "Italy": [12.6, 41.9],
  "Netherlands": [5.3, 52.1],
  "Belgium": [4.5, 50.5],
  "Switzerland": [8.2, 46.8],
  "Austria": [14.6, 47.5],
  "Sweden": [18.6, 60.1],
  "Norway": [8.5, 60.5],
  "Denmark": [9.5, 56.3],
  "Finland": [25.7, 61.9],
  "Poland": [19.1, 51.9],
  "Portugal": [-8.2, 39.4],
  "Ireland": [-8.2, 53.4],
  "Czech Republic": [15.5, 49.8],
  "Estonia": [25.0, 58.6],
  "Latvia": [24.6, 56.9],
  "Lithuania": [23.9, 55.2],
  "Romania": [25.0, 46.0],
  "Hungary": [19.5, 47.2],
  "Greece": [21.8, 39.1],
  "Luxembourg": [6.1, 49.8],
  "Iceland": [-19.0, 65.0],
  "Malta": [14.4, 35.9],
  "Cyprus": [33.4, 35.1],
  "Croatia": [15.2, 45.1],
  "Slovenia": [14.6, 46.2],
  "Slovakia": [19.7, 48.7],
  "Bulgaria": [25.5, 42.7],
  "Serbia": [21.0, 44.0],
  "Ukraine": [31.2, 48.4],
  "Turkey": [35.2, 38.9],
  // Asia & Middle East
  "Israel": [34.9, 31.0],
  "Japan": [138.3, 36.2],
  "South Korea": [128.0, 35.9],
  "China": [104.2, 35.9],
  "India": [78.9, 20.6],
  "Singapore": [103.8, 1.4],
  "UAE": [53.8, 23.4],
  "Russia": [105.3, 61.5],
  "Taiwan": [121.0, 23.7],
  "Hong Kong": [114.2, 22.3],
  "Thailand": [100.5, 15.9],
  "Vietnam": [108.3, 14.1],
  "Indonesia": [113.9, -0.8],
  "Malaysia": [101.7, 4.2],
  "Philippines": [121.8, 12.9],
  "Pakistan": [69.3, 30.4],
  "Bangladesh": [90.4, 23.7],
  "Saudi Arabia": [45.1, 23.9],
  "Qatar": [51.2, 25.3],
  "Bahrain": [50.6, 26.0],
  "Kuwait": [47.5, 29.3],
  "Jordan": [36.2, 30.6],
  "Lebanon": [35.9, 33.9],
  // Africa
  "South Africa": [22.9, -30.6],
  "Kenya": [37.9, -0.02],
  "Nigeria": [8.7, 9.1],
  "Egypt": [30.8, 26.8],
  "Morocco": [-7.1, 31.8],
  "Ghana": [-1.0, 7.9],
  "Ethiopia": [40.5, 9.1],
  "Tanzania": [34.9, -6.4],
  "Rwanda": [29.9, -1.9],
  "Uganda": [32.3, 1.4],
  "Tunisia": [9.5, 33.9],
  "Senegal": [-14.5, 14.5],
  "Ivory Coast": [-5.5, 7.5],
  // Oceania
  "Australia": [133.8, -25.3],
  "New Zealand": [174.9, -40.9],
};

// Preset zoom positions for regions
const regionZooms: Record<string, { center: [number, number]; zoom: number }> = {
  world: { center: [15, 20], zoom: 1.8 },
  europe: { center: [15, 54], zoom: 3.5 },
  northAmerica: { center: [-100, 45], zoom: 2.5 },
  southAmerica: { center: [-60, -15], zoom: 2 },
  asia: { center: [85, 28], zoom: 2.2 },
  oceania: { center: [145, -28], zoom: 3 },
  africa: { center: [20, 0], zoom: 2.2 },
};

const countryToRegion: Record<string, keyof typeof regionZooms> = {
  "United States": "northAmerica",
  "Canada": "northAmerica",
  "Mexico": "northAmerica",
  "United Kingdom": "europe",
  "Germany": "europe",
  "France": "europe",
  "Spain": "europe",
  "Italy": "europe",
  "Netherlands": "europe",
  "Belgium": "europe",
  "Switzerland": "europe",
  "Austria": "europe",
  "Sweden": "europe",
  "Norway": "europe",
  "Denmark": "europe",
  "Finland": "europe",
  "Poland": "europe",
  "Portugal": "europe",
  "Ireland": "europe",
  "Czech Republic": "europe",
  "Estonia": "europe",
  "Latvia": "europe",
  "Lithuania": "europe",
  "Romania": "europe",
  "Hungary": "europe",
  "Greece": "europe",
  "Luxembourg": "europe",
  "Malta": "europe",
  "Cyprus": "europe",
  "Croatia": "europe",
  "Slovenia": "europe",
  "Slovakia": "europe",
  "Bulgaria": "europe",
  "Serbia": "europe",
  "Ukraine": "europe",
  "Turkey": "europe",
  "Israel": "asia",
  "Japan": "asia",
  "South Korea": "asia",
  "China": "asia",
  "India": "asia",
  "Singapore": "asia",
  "UAE": "asia",
  "Russia": "asia",
  "Taiwan": "asia",
  "Hong Kong": "asia",
  "Thailand": "asia",
  "Vietnam": "asia",
  "Indonesia": "asia",
  "Malaysia": "asia",
  "Philippines": "asia",
  "Pakistan": "asia",
  "Bangladesh": "asia",
  "Saudi Arabia": "asia",
  "Qatar": "asia",
  "Bahrain": "asia",
  "Kuwait": "asia",
  "Jordan": "asia",
  "Lebanon": "asia",
  "Brazil": "southAmerica",
  "Argentina": "southAmerica",
  "Chile": "southAmerica",
  "Colombia": "southAmerica",
  "Peru": "southAmerica",
  "Uruguay": "southAmerica",
  "Ecuador": "southAmerica",
  "Venezuela": "southAmerica",
  "South Africa": "africa",
  "Kenya": "africa",
  "Nigeria": "africa",
  "Egypt": "africa",
  "Morocco": "africa",
  "Ghana": "africa",
  "Ethiopia": "africa",
  "Tanzania": "africa",
  "Rwanda": "africa",
  "Uganda": "africa",
  "Tunisia": "africa",
  "Senegal": "africa",
  "Ivory Coast": "africa",
  "Australia": "oceania",
  "New Zealand": "oceania",
};

const ALDEA_MAP_BUBBLE_COLOR = "#001E28";
const MAP_SEA_COLOR = "#DCEFFA";
const MAP_LAND_COLOR = "#B7C6AE";
const MAP_LAND_HOVER_COLOR = "#AABBA0";
const MAP_LAND_STROKE_COLOR = "#7E9174";
const MAP_LAND_FILTERED_COLOR = "#A7B79F";
const MAP_LAND_FILTERED_HOVER_COLOR = "#9AA991";
const MAP_LAND_FILTERED_STROKE_COLOR = "#708367";

function getAldeaMapBubbleColor() {
  return ALDEA_MAP_BUBBLE_COLOR;
}

function getAldeaMapBubbleTextColor() {
  return "#FFFFFF";
}

export interface PortfolioMapHandle {
  flyTo: (coordinates: [number, number], zoom?: number) => void;
  resetView: () => void;
  zoomToRegion: (region: string) => void;
}

interface PortfolioMapProps {
  countryData: Record<string, number>;
  onCountryClick?: (country: string | null) => void;
  selectedCountry?: string | null;
  highlightedCountry?: string | null;
}

// D3 retains mouse dragging and one-finger panning; the shared handler owns zoom.
function allowMapDrag(event: unknown) {
  const source = event as Event & { button?: number; ctrlKey?: boolean; touches?: TouchList };
  return source.type === "mousedown" && !source.button && !source.ctrlKey ||
    source.type === "touchstart" && source.touches?.length === 1;
}

const PortfolioMap = forwardRef<PortfolioMapHandle, PortfolioMapProps>(
  ({ countryData, onCountryClick, selectedCountry, highlightedCountry }, ref) => {
    const [position, setPosition] = useState<MapView>({
      coordinates: regionZooms.world.center,
      zoom: regionZooms.world.zoom,
    });
    const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
    const [activeRegion, setActiveRegion] = useState<keyof typeof regionZooms>("world");
    const containerRef = useRef<HTMLDivElement>(null);

    // Expose imperative flyTo/resetView
    useImperativeHandle(ref, () => ({
      flyTo: (coordinates: [number, number], zoom = 4) => {
        setPosition({ coordinates, zoom });
      },
      resetView: () => {
        setPosition({ coordinates: regionZooms.world.center, zoom: regionZooms.world.zoom });
        setActiveRegion("world");
        onCountryClick?.(null);
      },
      zoomToRegion: (region: string) => {
        const preset = regionZooms[region];
        if (preset) {
          setPosition({ coordinates: preset.center, zoom: preset.zoom });
          setActiveRegion(region as keyof typeof regionZooms);
        }
      },
    }));

    // Geographic bounds for the viewable center
    const GEO_BOUNDS = { minLon: -160, maxLon: 180, minLat: -55, maxLat: 72 };
    const clampCoordinates = useCallback(
      (coords: [number, number]): [number, number] => [
        Math.min(GEO_BOUNDS.maxLon, Math.max(GEO_BOUNDS.minLon, coords[0])),
        Math.min(GEO_BOUNDS.maxLat, Math.max(GEO_BOUNDS.minLat, coords[1])),
      ],
      []
    );

    const resetNavigation = useCallback(() => {
      setPosition({ coordinates: regionZooms.world.center, zoom: regionZooms.world.zoom });
      setActiveRegion("world");
      setHoveredCountry(null);
      setTooltipPosition(null);
    }, []);
    const hasInteractiveView = Math.abs(position.zoom - regionZooms.world.zoom) > 1e-6 ||
      position.coordinates.some((value, index) => Math.abs(value - regionZooms.world.center[index]) > 1e-6);

    const markers = useMemo(() => {
      return Object.entries(countryData)
        .filter(([country]) => countryCoordinates[country])
        .map(([country, count]) => ({
          name: country,
          coordinates: countryCoordinates[country],
          count,
          baseSize: Math.min(16, Math.max(5, 4 + Math.sqrt(count) * 1.5)),
        }))
        .sort((a, b) => a.count - b.count);
    }, [countryData]);

    const topCountries = useMemo(() => {
      const sorted = Object.entries(countryData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8);
      if (selectedCountry && countryData[selectedCountry] && !sorted.find(([c]) => c === selectedCountry)) {
        sorted.push([selectedCountry, countryData[selectedCountry]]);
      }
      return sorted;
    }, [countryData, selectedCountry]);

    const europeanCountriesInData = useMemo(() => {
      return europeanCountries
        .filter(country => countryData[country])
        .sort((a, b) => a.localeCompare(b));
    }, [countryData]);

    const handleMoveEnd = useCallback((pos: { coordinates: [number, number]; zoom: number }) => {
      setPosition({
        coordinates: clampCoordinates(pos.coordinates),
        zoom: Math.min(6, Math.max(1.8, pos.zoom)),
      });
    }, [clampCoordinates]);

    const handleMarkerClick = useCallback((country: string) => {
      if (selectedCountry === country) {
        onCountryClick?.(null);
      } else {
        onCountryClick?.(country);
        const region = countryToRegion[country] || "world";
        const preset = regionZooms[region];
        setPosition({ coordinates: preset.center, zoom: preset.zoom });
        setActiveRegion(region);
      }
    }, [selectedCountry, onCountryClick]);

    const handleCountryChipClick = useCallback((country: string) => {
      if (selectedCountry === country) {
        onCountryClick?.(null);
      } else {
        onCountryClick?.(country);
        const region = countryToRegion[country] || "world";
        const preset = regionZooms[region];
        setPosition({ coordinates: preset.center, zoom: preset.zoom });
        setActiveRegion(region);
      }
    }, [selectedCountry, onCountryClick]);

    const zoomToRegion = useCallback((region: keyof typeof regionZooms) => {
      const preset = regionZooms[region];
      setPosition({ coordinates: preset.center, zoom: preset.zoom });
      setActiveRegion(region);
    }, []);

    const isFilterActive = !!selectedCountry;

    return (
      <div className="h-full flex flex-col">
        {/* Map Container - takes remaining height */}
        <div
          ref={containerRef}
          className="relative flex-1 outline-none touch-none"
          data-testid="geographic-map-viewport"
          data-zoom={position.zoom}
          data-center={position.coordinates.join(",")}
          tabIndex={-1}
        >
          <div
            className="h-full w-full overflow-hidden transition-all duration-300"
            style={{ backgroundColor: MAP_SEA_COLOR }}
          >
            <ComposableMap
              projectionConfig={{
                rotate: [-10, 0, 0],
                scale: 160,
              }}
              style={{ width: "100%", height: "100%", backgroundColor: MAP_SEA_COLOR }}
            >
              <MapNavigation containerRef={containerRef} position={position} setPosition={setPosition} clampCoordinates={clampCoordinates} onReset={resetNavigation} />
              <ZoomableGroup
                center={position.coordinates}
                zoom={position.zoom}
                onMoveEnd={handleMoveEnd}
                filterZoomEvent={allowMapDrag}
                minZoom={1.8}
                maxZoom={6}
                translateExtent={[[-200, -100], [1200, 600]]}
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={isFilterActive ? MAP_LAND_FILTERED_COLOR : MAP_LAND_COLOR}
                        stroke={isFilterActive ? MAP_LAND_FILTERED_STROKE_COLOR : MAP_LAND_STROKE_COLOR}
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: {
                            outline: "none",
                            fill: isFilterActive ? MAP_LAND_FILTERED_HOVER_COLOR : MAP_LAND_HOVER_COLOR,
                          },
                          pressed: { outline: "none" },
                        }}
                      />
                    ))
                  }
                </Geographies>
                {markers.map(({ name, coordinates, count, baseSize }) => {
                  const isSelected = selectedCountry === name;
                  const isHovered = hoveredCountry === name;
                  const isHighlighted = highlightedCountry === name;
                  const isDimmed = isFilterActive && !isSelected;
                  const bubbleFill = getAldeaMapBubbleColor();
                  const bubbleTextColor = getAldeaMapBubbleTextColor();

                  const zoomFactor = Math.max(0.5, 1 / Math.pow(position.zoom, 0.4));
                  const adjustedSize = Math.max(5, baseSize * zoomFactor);
                  const strokeWidth = Math.max(0.4, 1.2 / position.zoom);
                  const fontSize = Math.max(4, Math.min(7, adjustedSize * 0.55));

                  return (
                    <Marker key={name} coordinates={coordinates}>
                      {/* Keyboard nav highlight ring */}
                      {isHighlighted && !isSelected && (
                        <circle
                          r={adjustedSize + 3}
                          fill="none"
                          stroke="#D886FF"
                          strokeWidth={strokeWidth * 2.5}
                          opacity={0.8}
                          className="animate-pulse"
                        />
                      )}
                      {isSelected && (
                        <circle
                          r={adjustedSize + 2}
                          fill="none"
                          stroke="#3D0028"
                          strokeWidth={strokeWidth * 2}
                          opacity={1}
                        />
                      )}
                      <circle
                        r={adjustedSize}
                        fill={bubbleFill}
                        fillOpacity={isDimmed ? 0.34 : isHovered || isHighlighted || isSelected ? 1 : 0.92}
                        stroke={isSelected ? "#3D0028" : isHighlighted ? "#D886FF" : "hsl(38 29% 94%)"}
                        strokeWidth={strokeWidth}
                        className="cursor-pointer"
                        onClick={() => handleMarkerClick(name)}
                        onMouseEnter={(e) => {
                          setHoveredCountry(name);
                          const rect = (e.target as SVGElement).getBoundingClientRect();
                          const mapContainer = containerRef.current;
                          if (mapContainer) {
                            const containerRect = mapContainer.getBoundingClientRect();
                            setTooltipPosition({
                              x: (rect.left + rect.width / 2 - containerRect.left) * mapContainer.clientWidth / containerRect.width,
                              y: (rect.top - containerRect.top) * mapContainer.clientHeight / containerRect.height - 8,
                            });
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredCountry(null);
                          setTooltipPosition(null);
                        }}
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                          fontFamily: "system-ui",
                          fill: bubbleTextColor,
                          fontSize: `${fontSize}px`,
                          fontWeight: 600,
                          pointerEvents: "none",
                          textShadow: bubbleTextColor === "#000000" ? "none" : "0 0 2px rgba(0,0,0,0.3)",
                        }}
                        opacity={isDimmed ? 0.7 : 1}
                      >
                        {count}
                      </text>
                    </Marker>
                  );
                })}
              </ZoomableGroup>
            </ComposableMap>

            {/* Filter label - inside map */}
            <div className="absolute top-3 left-3 h-8">
              <span className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs text-charcoal/50">
                <Globe className="h-3.5 w-3.5" />
                {selectedCountry ?? "All countries"}
              </span>
            </div>

            {hasInteractiveView && <button type="button" onClick={resetNavigation} className="absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-medium text-charcoal/60 hover:bg-black/[0.035] hover:text-charcoal">Reset view</button>}

            {/* Hover tooltip */}
            {hoveredCountry && tooltipPosition && (
              <div
                className="absolute z-50 bg-charcoal text-white px-2.5 py-1.5 rounded-md shadow-lg text-xs pointer-events-none whitespace-nowrap -translate-x-1/2 -translate-y-full"
                style={{
                  left: tooltipPosition.x,
                  top: tooltipPosition.y,
                }}
              >
                <span className="font-medium">{hoveredCountry}</span>
                <span className="opacity-70 ml-1.5">
                  {countryData[hoveredCountry]?.toLocaleString()} {countryData[hoveredCountry] === 1 ? 'company' : 'companies'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="flex-shrink-0 px-4 py-3 space-y-2 bg-background border-t border-border/20">
          {/* Region Navigation */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-charcoal/50 text-xs uppercase tracking-wide font-medium mr-2">Region:</span>
            <div className="flex flex-wrap gap-1">
              {[
                { key: 'world', label: 'World' },
                { key: 'europe', label: 'Europe' },
                { key: 'northAmerica', label: 'North America' },
                { key: 'southAmerica', label: 'South America' },
                { key: 'asia', label: 'Asia' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => zoomToRegion(key as keyof typeof regionZooms)}
                  className={`h-7 px-3 text-xs rounded-md transition-colors ${
                    activeRegion === key
                      ? "bg-charcoal text-white"
                      : "bg-transparent text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {activeRegion === "europe" && (
              <span className="text-charcoal/40 text-xs italic ml-2">European reference frame</span>
            )}
          </div>

          {/* Top Countries */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-charcoal/50 text-xs uppercase tracking-wide font-medium mr-2">Top:</span>
            <div className="flex flex-wrap gap-1">
              {topCountries.map(([country]) => (
                <button
                  key={country}
                  onClick={() => handleCountryChipClick(country)}
                  className={`h-6 px-2.5 text-xs rounded-full transition-colors ${
                    selectedCountry === country
                      ? "bg-orange text-white"
                      : "bg-charcoal/5 text-charcoal/70 hover:bg-charcoal/10"
                  }`}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>

          {/* Europe Index - only when Europe region is active */}
          {activeRegion === "europe" && europeanCountriesInData.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-charcoal/40 text-xs uppercase tracking-wide font-medium mr-2">Europe (all):</span>
              <div className="flex flex-wrap gap-1">
                {europeanCountriesInData.map((country) => (
                  <button
                    key={country}
                    onClick={() => handleCountryChipClick(country)}
                    className={`h-5 px-2 text-[10px] rounded-full transition-colors ${
                      selectedCountry === country
                        ? "bg-orange text-white"
                        : "bg-charcoal/5 text-charcoal/50 hover:bg-charcoal/10 hover:text-charcoal/70"
                    }`}
                  >
                    {country}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

PortfolioMap.displayName = "PortfolioMap";

export default PortfolioMap;
