import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Config, Data as PlotlyData, Layout } from "plotly.js";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@demo/components/ui/select";
import { formatCurrency } from "@demo/lib/fund-reporting/format";
import { buildCompanyVintageAverageScatterRows, buildPeerAverageScatterRows, } from "@demo/lib/fund-reporting/fundScatter";
import type { InvestorPortalViewMode } from "@demo/lib/fund-reporting/portalView";
import { useReportingDataSource } from "@demo/lib/fund-reporting/reportingDataSource";
import type { FundScatterPoint, ReportingUnderlyingCompany, } from "@demo/lib/fund-reporting/types";
import { cn } from "@demo/lib/utils";
import { bindChartGestures } from "@demo/lib/chartGestures";
import { getScatterYValueAtPointer, panScatterRange, scatterYRangesEqual, zoomScatterYRange } from "@demo/lib/fund-reporting/holdingScatterZoom";
import { useScatterPointer, type ScatterTooltipData } from "./ScatterTooltip";
type Data = PlotlyData & { meta?: { interactive: string; tooltip?: ScatterTooltipData } };
type FundScatterChartMode = "main" | "compare";
type FundScatterGrouping = "fund" | "vintage_year" | "company_vintage" | "sector" | "region";
type FundScatterMomentum = "today" | "1y" | "2y";
type ScatterFundMetadata = {
    name: string;
    sector?: string | null;
    country?: string | null;
};
type ScatterEntityType = FundScatterPoint["entity_type"] | "sector_average" | "region_average";
type ScatterRow = Omit<FundScatterPoint, "entity_type"> & {
    entity_type: ScatterEntityType;
    sector?: string | null;
    country?: string | null;
};
type ScatterFundMetadataCandidate = {
    metadata: ScatterFundMetadata;
    looseTokens: string[];
};
type ScatterFundMetadataMatcher = {
    candidates: ScatterFundMetadataCandidate[];
    metadataByKey: Map<string, ScatterFundMetadata | null>;
};
type FundScatterChartProps = {
    mode: FundScatterChartMode;
    initialReportPeriod?: string | null;
    focusId?: string | null;
    focusName?: string | null;
    aldeaFundCode?: string | null;
    fundMetadata?: ScatterFundMetadata[];
    underlyingCompanies?: ReportingUnderlyingCompany[];
    localPreviewRows?: FundScatterPoint[];
    comparisonFundLabel?: string | null;
    viewMode?: InvestorPortalViewMode;
    forceLocalPreviewRows?: boolean;
    presentationVariant?: "default" | "mango-company";
};
type PlotlyStatic = typeof import("plotly.js-basic-dist-min").default;
type AxisRange = [
    number,
    number
];
type TrajectoryGroup = {
    key: string;
    points: ScatterRow[];
};
const BRAND_VINTAGE_COLORS = [
    "#3D0028",
    "#D886FF",
    "#FF6A49",
    "#FFDE68",
    "#7BF5B3",
    "#001E28",
    "#000000"
] as const;
const COMPANY_VINTAGE_COLORS = [
    "#7BF5B3",
    "#B6E66E",
    "#FFDE68",
    "#FFB866",
    "#FF8D59",
    "#F06E86",
    "#D886FF",
    "#9C93FF",
    "#69C7F3",
    "#46B8B0",
    "#3D7B84",
    "#7A4C61"
] as const;
const VINTAGE_COLOR_OVERRIDES: Record<string, string> = {
    "2019": "#7BF5B3",
};
const PEER_AVERAGE_COLOR = "#6B6258";
const GRAPH_TEXT_COLOR = "#3D0028";
const AXIS_GUTTER_WIDTH_PX = 62;
const AXIS_GUTTER_HEIGHT_PX = 52;
const PLOT_MARGINS = { l: 18, r: 18, t: 18, b: 18 } as const;
const DIMMED_BUBBLE_OPACITY = 0.18;
const DIMMED_LINE_ALPHA = 0.48;
const DIMMED_TEXT_ALPHA = 0.36;
const MAIN_SCATTER_DEFAULT_CENTER = { x: 5, y: 2 } as const;
const MAIN_SCATTER_DEFAULT_X_AXIS_RANGE: AxisRange = [3, 7];
const MANGO_SCATTER_DEFAULT_CENTER = { x: 2.5, y: 2 } as const;
const MANGO_SCATTER_DEFAULT_X_AXIS_RANGE: AxisRange = [0, 8];
const MANGO_SCATTER_DEFAULT_Y_AXIS_RANGE: AxisRange = [0, 7];
const COMPANY_VINTAGE_DEFAULT_Y_AXIS_RANGE: AxisRange = [0.5, 2.2];
const FUND_NAME_MATCH_STRICT_STOPWORDS = new Set([
    "and",
    "co",
    "company",
    "fcr",
    "fcre",
    "gmbh",
    "kg",
    "ks",
    "llc",
    "lp",
    "ltd",
    "plc",
    "sa",
    "scsp",
    "slp"
]);
const FUND_NAME_MATCH_LOOSE_STOPWORDS = new Set([
    ...FUND_NAME_MATCH_STRICT_STOPWORDS,
    "fund",
    "vc"
]);
const FUND_NAME_MATCH_BROAD_STOPWORDS = new Set([
    ...FUND_NAME_MATCH_LOOSE_STOPWORDS,
    "capital",
    "venture",
    "ventures"
]);
const FUND_NAME_TOKEN_ALIASES: Record<string, string> = {
    first: "i",
    one: "i",
    second: "ii",
    two: "ii",
    third: "iii",
    three: "iii",
    fourth: "iv",
    four: "iv",
    fifth: "v",
    five: "v",
};
const HARD_SERIES_TOKEN_PATTERN = /^(?:\d+|[ivx]+)$/;
const SOFT_SERIES_TOKEN_PATTERN = /^[a-z]\d+$/;
let plotlyPromise: Promise<PlotlyStatic> | null = null;
function getPlotly() {
    if (!plotlyPromise) {
        plotlyPromise = import("plotly.js-basic-dist-min").then((module) => module.default);
    }
    return plotlyPromise;
}
function formatReportPeriodLabel(value: string | null | undefined) {
    if (!value)
        return "Latest quarter";
    const match = /^(\d{4})_Q([1-4])$/.exec(value);
    if (!match)
        return value.replaceAll("_", " ");
    const [, year, quarter] = match;
    return `Q${quarter} ${year}`;
}
function formatMultipleLabel(value: number | null) {
    return value != null ? `${value.toFixed(2)}x` : "—";
}
function normalizeVintageKey(vintage: number | null) {
    if (vintage == null || !Number.isFinite(vintage))
        return "unknown";
    return String(Math.round(vintage));
}
function isCompareAverageSeries(point: Pick<ScatterRow, "entity_type" | "id">, prefix: string) {
    return point.entity_type === "peer_average" && point.id.startsWith(prefix);
}
function isAllFundsAverageSeries(point: Pick<ScatterRow, "entity_type" | "id">) {
    return isCompareAverageSeries(point, "all-funds-average:");
}
function isCompanyVintageAverageSeries(point: Pick<ScatterRow, "entity_type" | "id">) {
    return isCompareAverageSeries(point, "company-vintage-average:");
}
function isVintageAverageSeries(point: Pick<ScatterRow, "entity_type" | "id" | "vintage">) {
    return ((point.entity_type === "vintage_average" && point.vintage != null) ||
        isCompareAverageSeries(point, "same-vintage-average:") ||
        isCompareAverageSeries(point, "company-vintage-average:"));
}
function getCompareSeriesColor(point: Pick<ScatterRow, "entity_type" | "id" | "vintage">, vintageColorMap: Map<string, string>) {
    if (isAllFundsAverageSeries(point))
        return PEER_AVERAGE_COLOR;
    if (isVintageAverageSeries(point)) {
        return vintageColorMap.get(normalizeVintageKey(point.vintage)) ?? "#D886FF";
    }
    if (point.entity_type === "peer_average")
        return PEER_AVERAGE_COLOR;
    return vintageColorMap.get(normalizeVintageKey(point.vintage)) ?? "#D886FF";
}
function isFiniteNumber(value: number | null | undefined): value is number {
    return typeof value === "number" && Number.isFinite(value);
}
function normalizeScatterText(value: string | null | undefined) {
    if (typeof value !== "string")
        return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function normalizeScatterKey(value: string | null | undefined) {
    const normalized = normalizeScatterText(value);
    if (!normalized)
        return "unknown";
    return normalized.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
}
function tokenizeFundNameForMatch(value: string | null | undefined, stopwords: ReadonlySet<string>) {
    const normalized = normalizeScatterText(value);
    if (!normalized)
        return [];
    const compact = normalized
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/f\.?\s*c\.?\s*r\.?\s*e\.?/g, " fcre ")
        .replace(/l\.?\s*p\.?\b/g, " lp ")
        .replace(/s\.?\s*c\.?\s*s\.?\s*p\.?/g, " scsp ")
        .replace(/\bk\s*\/\s*s\b/g, " ks ")
        .replace(/&/g, " and ");
    return compact
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .map((token) => FUND_NAME_TOKEN_ALIASES[token] ?? token)
        .filter((token) => !stopwords.has(token));
}
function buildFundNameMatchKey(tokens: string[]) {
    return tokens.length > 0 ? tokens.join("-") : null;
}
function stripTrailingHardSeriesToken(tokens: string[]) {
    if (tokens.length <= 1)
        return tokens;
    return HARD_SERIES_TOKEN_PATTERN.test(tokens[tokens.length - 1] ?? "")
        ? tokens.slice(0, -1)
        : tokens;
}
function stripSoftSeriesTokens(tokens: string[]) {
    return tokens.filter((token) => !SOFT_SERIES_TOKEN_PATTERN.test(token));
}
function buildFundNameMetadataKeys(value: string | null | undefined) {
    const strictTokens = tokenizeFundNameForMatch(value, FUND_NAME_MATCH_STRICT_STOPWORDS);
    const looseTokens = tokenizeFundNameForMatch(value, FUND_NAME_MATCH_LOOSE_STOPWORDS);
    const broadTokens = tokenizeFundNameForMatch(value, FUND_NAME_MATCH_BROAD_STOPWORDS);
    return [
        normalizeScatterKey(value),
        buildFundNameMatchKey(strictTokens),
        buildFundNameMatchKey(looseTokens),
        buildFundNameMatchKey(broadTokens)
    ].filter((key, index, keys): key is string => Boolean(key) && keys.indexOf(key) === index);
}
function buildFundNameLookupKeys(value: string | null | undefined) {
    const strictTokens = tokenizeFundNameForMatch(value, FUND_NAME_MATCH_STRICT_STOPWORDS);
    const looseTokens = tokenizeFundNameForMatch(value, FUND_NAME_MATCH_LOOSE_STOPWORDS);
    const broadTokens = tokenizeFundNameForMatch(value, FUND_NAME_MATCH_BROAD_STOPWORDS);
    return [
        normalizeScatterKey(value),
        buildFundNameMatchKey(strictTokens),
        buildFundNameMatchKey(looseTokens),
        buildFundNameMatchKey(stripTrailingHardSeriesToken(looseTokens)),
        buildFundNameMatchKey(broadTokens),
        buildFundNameMatchKey(stripTrailingHardSeriesToken(broadTokens)),
        buildFundNameMatchKey(stripSoftSeriesTokens(broadTokens))
    ].filter((key, index, keys): key is string => Boolean(key) && keys.indexOf(key) === index);
}
function resolveScatterFundMetadata(value: string | null | undefined, matcher: ScatterFundMetadataMatcher) {
    for (const key of buildFundNameLookupKeys(value)) {
        const metadata = matcher.metadataByKey.get(key);
        if (metadata) {
            return metadata;
        }
    }
    const rowLooseTokens = tokenizeFundNameForMatch(value, FUND_NAME_MATCH_LOOSE_STOPWORDS);
    if (rowLooseTokens.length < 2)
        return null;
    // Airtable scatter fund names often append legal suffixes or descriptive tail text
    // that the published holdings taxonomy does not keep.
    const subsetMatches = matcher.candidates
        .filter((candidate) => candidate.looseTokens.length >= 2)
        .filter((candidate) => candidate.looseTokens.every((token) => rowLooseTokens.includes(token)))
        .sort((left, right) => right.looseTokens.length - left.looseTokens.length);
    if (subsetMatches.length === 0)
        return null;
    if ((subsetMatches[0]?.looseTokens.length ?? 0) === (subsetMatches[1]?.looseTokens.length ?? -1)) {
        return null;
    }
    return subsetMatches[0]?.metadata ?? null;
}
function averageNullableNumbers(values: Array<number | null | undefined>) {
    const present = values.filter((value): value is number => isFiniteNumber(value));
    if (present.length === 0)
        return null;
    const average = present.reduce((sum, value) => sum + value, 0) / present.length;
    return Number(average.toFixed(2));
}
function sumNullableNumbers(values: Array<number | null | undefined>) {
    const present = values.filter((value): value is number => isFiniteNumber(value));
    if (present.length === 0)
        return null;
    return Number(present.reduce((sum, value) => sum + value, 0).toFixed(2));
}
function sumNullableIntegers(values: Array<number | null | undefined>) {
    const present = values.filter((value): value is number => isFiniteNumber(value));
    if (present.length === 0)
        return null;
    return Math.round(present.reduce((sum, value) => sum + value, 0));
}
function weightedAverageNullableNumbers(entries: Array<{
    value: number | null | undefined;
    weight: number | null | undefined;
}>) {
    const weightedEntries = entries.filter((entry): entry is {
        value: number;
        weight: number;
    } => isFiniteNumber(entry.value) && isFiniteNumber(entry.weight) && entry.weight > 0);
    if (weightedEntries.length > 0) {
        const totalWeight = weightedEntries.reduce((sum, entry) => sum + entry.weight, 0);
        if (totalWeight > 0) {
            const weightedTotal = weightedEntries.reduce((sum, entry) => sum + entry.value * entry.weight, 0);
            return Number((weightedTotal / totalWeight).toFixed(2));
        }
    }
    return averageNullableNumbers(entries.map((entry) => entry.value));
}
function resolveAggregateMetric(points: ScatterRow[]): ScatterRow["metric"] {
    const metrics = Array.from(new Set(points.map((point) => point.metric)));
    if (metrics.length === 1) {
        return metrics[0]!;
    }
    return "MIXED";
}
function resolveRepresentativeVintage(points: ScatterRow[]) {
    const weightedAverageVintage = weightedAverageNullableNumbers(points.map((point) => ({
        value: point.vintage,
        weight: point.commitment_eur,
    })));
    if (weightedAverageVintage != null) {
        return Math.round(weightedAverageVintage);
    }
    const counts = new Map<number, number>();
    for (const point of points) {
        if (!isFiniteNumber(point.vintage))
            continue;
        const roundedVintage = Math.round(point.vintage);
        counts.set(roundedVintage, (counts.get(roundedVintage) ?? 0) + 1);
    }
    if (counts.size === 0)
        return null;
    return [...counts.entries()]
        .sort((left, right) => {
        if (right[1] !== left[1])
            return right[1] - left[1];
        return left[0] - right[0];
    })[0]?.[0] ?? null;
}
function getBubbleSizeReference(points: ScatterRow[], maxSizePx: number, sizeSelector: (point: ScatterRow) => number | null = (point) => point.commitment_eur) {
    const largestMetric = Math.max(...points
        .map(sizeSelector)
        .filter((value): value is number => isFiniteNumber(value) && value > 0), 1);
    return (2 * largestMetric) / (maxSizePx ** 2);
}
function hexToRgba(hex: string, alpha: number) {
    const normalized = hex.replace("#", "");
    const expanded = normalized.length === 3
        ? normalized
            .split("")
            .map((value) => value + value)
            .join("")
        : normalized;
    const red = Number.parseInt(expanded.slice(0, 2), 16);
    const green = Number.parseInt(expanded.slice(2, 4), 16);
    const blue = Number.parseInt(expanded.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function sortVintageKeys(left: string, right: string) {
    if (left === "unknown" && right === "unknown")
        return 0;
    if (left === "unknown")
        return 1;
    if (right === "unknown")
        return -1;
    return Number(left) - Number(right);
}
function formatAxisTick(value: number, maximumFractionDigits: number) {
    return value.toLocaleString("en-GB", {
        minimumFractionDigits: 0,
        maximumFractionDigits,
    });
}
function getNiceTickStep(span: number, targetTickCount: number) {
    if (!Number.isFinite(span) || span <= 0)
        return 1;
    const roughStep = span / Math.max(targetTickCount - 1, 1);
    const magnitude = 10 ** Math.floor(Math.log10(roughStep));
    const normalized = roughStep / magnitude;
    if (normalized <= 1)
        return magnitude;
    if (normalized <= 2)
        return 2 * magnitude;
    if (normalized <= 2.5)
        return 2.5 * magnitude;
    if (normalized <= 5)
        return 5 * magnitude;
    return 10 * magnitude;
}
function buildAxisTicks(range: AxisRange, targetTickCount: number, formatter: (value: number) => string) {
    const [start, end] = range;
    const span = Math.max(end - start, 1e-6);
    const step = getNiceTickStep(span, targetTickCount);
    const values: number[] = [];
    const firstTick = Math.ceil(start / step) * step;
    for (let value = firstTick; value <= end + step * 0.5; value += step) {
        values.push(Number(value.toFixed(6)));
    }
    return {
        values,
        labels: values.map((value) => formatter(Math.abs(value) < 1e-6 ? 0 : value)),
    };
}
function buildUnitAxisTicks(range: AxisRange, formatter: (value: number) => string) {
    const [start, end] = range;
    const values: number[] = [];
    if (start <= 0 && end >= 0) {
        values.push(0);
    }
    const firstWholeYear = Math.max(1, Math.ceil(start));
    const lastWholeYear = Math.floor(end);
    for (let value = firstWholeYear; value <= lastWholeYear; value += 1) {
        values.push(value);
    }
    if (values.length === 0) {
        values.push(Math.max(0, Math.round(start)));
    }
    return {
        values,
        labels: values.map((value) => formatter(value)),
    };
}
function getAxisRange(values: number[], { minSpan, paddingRatio, floorAtZero = false, }: {
    minSpan: number;
    paddingRatio: number;
    floorAtZero?: boolean;
}): AxisRange {
    if (values.length === 0) {
        return floorAtZero ? [0, minSpan] : [-minSpan / 2, minSpan / 2];
    }
    let minValue = Math.min(...values);
    let maxValue = Math.max(...values);
    if (minValue === maxValue) {
        const halfSpan = Math.max(minSpan / 2, Math.abs(minValue) * 0.2, 0.5);
        minValue -= halfSpan;
        maxValue += halfSpan;
    }
    const currentSpan = maxValue - minValue;
    if (currentSpan < minSpan) {
        const extra = (minSpan - currentSpan) / 2;
        minValue -= extra;
        maxValue += extra;
    }
    const paddedSpan = maxValue - minValue;
    const padding = paddedSpan * paddingRatio;
    minValue -= padding;
    maxValue += padding;
    if (floorAtZero) {
        minValue = Math.max(0, minValue);
    }
    if (minValue === maxValue) {
        maxValue = minValue + minSpan;
    }
    return [Number(minValue.toFixed(6)), Number(maxValue.toFixed(6))];
}
function ensureRangeContainsValue(range: AxisRange, value: number, floorAtZero = false): AxisRange {
    let [start, end] = range;
    if (value < start) {
        start = floorAtZero ? Math.max(0, value) : value;
    }
    if (value > end) {
        end = value;
    }
    return [Number(start.toFixed(6)), Number(end.toFixed(6))];
}
function ensureRangeContainsBounds(range: AxisRange, bounds: AxisRange, floorAtZero = false): AxisRange {
    const [boundStart, boundEnd] = bounds;
    return ensureRangeContainsValue(ensureRangeContainsValue(range, boundStart, floorAtZero), boundEnd, floorAtZero);
}
function getCompareTextPosition(point: ScatterRow) {
    return point.entity_type === "peer_average" ? "bottom center" : "top center";
}
function matchesScatterFocus(point: ScatterRow, focusId?: string | null, focusName?: string | null) {
    if (focusId && point.id === focusId)
        return true;
    if (focusName && point.name === focusName)
        return true;
    return false;
}
function getQuarterIndex(quarterKey: string) {
    const match = /^(\d{4})[_-]Q([1-4])$/.exec(quarterKey);
    if (!match)
        return null;
    return Number(match[1]) * 4 + (Number(match[2]) - 1);
}
function getMangoScatterCenterX(quarterKey: string) {
    const quarterIndex = getQuarterIndex(quarterKey);
    const baselineQuarterIndex = getQuarterIndex("2027-Q1");
    if (quarterIndex == null || baselineQuarterIndex == null) {
        return MANGO_SCATTER_DEFAULT_CENTER.x;
    }
    return MANGO_SCATTER_DEFAULT_CENTER.x + (quarterIndex - baselineQuarterIndex) / 4;
}
function compareReportPeriodsDesc(left: string, right: string) {
    const leftIndex = getQuarterIndex(left);
    const rightIndex = getQuarterIndex(right);
    if (leftIndex != null && rightIndex != null) {
        return rightIndex - leftIndex;
    }
    return right.localeCompare(left);
}
function isQuarterAtOrBefore(quarterKey: string, ceilingQuarterKey: string) {
    const quarterIndex = getQuarterIndex(quarterKey);
    const ceilingIndex = getQuarterIndex(ceilingQuarterKey);
    if (quarterIndex == null || ceilingIndex == null)
        return true;
    return quarterIndex <= ceilingIndex;
}
function sortScatterPointsByQuarterAsc(left: ScatterRow, right: ScatterRow) {
    const leftIndex = getQuarterIndex(left.report_period);
    const rightIndex = getQuarterIndex(right.report_period);
    if (leftIndex != null && rightIndex != null) {
        return leftIndex - rightIndex;
    }
    return left.report_period.localeCompare(right.report_period);
}
function getScatterPointKey(point: ScatterRow) {
    if (point.entity_type === "vintage_average") {
        return `vintage:${normalizeVintageKey(point.vintage)}`;
    }
    return `${point.entity_type}:${point.id}`;
}
function getGroupDescriptor(point: ScatterRow, grouping: Exclude<FundScatterGrouping, "fund">) {
    if (grouping === "vintage_year") {
        const vintageKey = normalizeVintageKey(point.vintage);
        return {
            id: `vintage:${vintageKey}`,
            label: vintageKey === "unknown" ? "Vintage unknown" : `Vintage ${vintageKey}`,
            sector: null,
            country: null,
        };
    }
    if (grouping === "sector") {
        const sector = normalizeScatterText(point.sector);
        return {
            id: `sector:${normalizeScatterKey(sector)}`,
            label: sector ?? "Sector unknown",
            sector: sector ?? null,
            country: null,
        };
    }
    const country = normalizeScatterText(point.country);
    return {
        id: `country:${normalizeScatterKey(country)}`,
        label: country ?? "Country unknown",
        sector: null,
        country: country ?? null,
    };
}
function aggregateScatterRows(rows: ScatterRow[], grouping: FundScatterGrouping, underlyingCompanies: ReportingUnderlyingCompany[]) {
    const fundRows = rows.filter((row) => row.entity_type === "fund");
    if (grouping === "company_vintage") {
        return buildCompanyVintageAverageScatterRows(fundRows, underlyingCompanies).map((row) => ({
            ...row,
            sector: null,
            country: null,
        })) satisfies ScatterRow[];
    }
    if (grouping === "fund") {
        return [...fundRows].sort((left, right) => {
            const periodCompare = compareReportPeriodsDesc(left.report_period, right.report_period);
            if (periodCompare !== 0)
                return periodCompare;
            return left.name.localeCompare(right.name);
        });
    }
    const groupedRows = new Map<string, ScatterRow[]>();
    for (const row of fundRows) {
        const descriptor = getGroupDescriptor(row, grouping);
        const key = `${row.report_period}:${descriptor.id}`;
        const existing = groupedRows.get(key) ?? [];
        existing.push(row);
        groupedRows.set(key, existing);
    }
    return [...groupedRows.entries()]
        .map(([groupKey, points]) => {
        const [reportPeriod] = groupKey.split(":");
        const descriptor = getGroupDescriptor(points[0]!, grouping);
        return {
            id: descriptor.id,
            name: descriptor.label,
            entity_type: grouping === "vintage_year"
                ? "vintage_average"
                : grouping === "sector"
                    ? "sector_average"
                    : "region_average",
            fund_count: points.length,
            company_count: sumNullableIntegers(points.map((point) => point.company_count)),
            vintage: grouping === "vintage_year" ? points[0]?.vintage ?? null : resolveRepresentativeVintage(points),
            aldea_fund: points[0]?.aldea_fund ?? null,
            commitment_eur: sumNullableNumbers(points.map((point) => point.commitment_eur)),
            fair_value_eur: sumNullableNumbers(points.map((point) => point.fair_value_eur)),
            value_created_eur: sumNullableNumbers(points.map((point) => point.value_created_eur)),
            tvpi: weightedAverageNullableNumbers(points.map((point) => ({
                value: point.tvpi,
                weight: point.commitment_eur,
            }))),
            metric: resolveAggregateMetric(points),
            age_years: weightedAverageNullableNumbers(points.map((point) => ({
                value: point.age_years,
                weight: point.commitment_eur,
            }))),
            tvpi_1y: weightedAverageNullableNumbers(points.map((point) => ({
                value: point.tvpi_1y,
                weight: point.commitment_eur,
            }))),
            tvpi_2y: weightedAverageNullableNumbers(points.map((point) => ({
                value: point.tvpi_2y,
                weight: point.commitment_eur,
            }))),
            report_period: reportPeriod,
            sector: descriptor.sector,
            country: descriptor.country,
        } satisfies ScatterRow;
    })
        .sort((left, right) => {
        const periodCompare = compareReportPeriodsDesc(left.report_period, right.report_period);
        if (periodCompare !== 0)
            return periodCompare;
        return left.name.localeCompare(right.name);
    });
}
export default function FundScatterChart({ mode, initialReportPeriod, focusId, focusName, fundMetadata = [], underlyingCompanies = [], localPreviewRows = [], comparisonFundLabel, viewMode = "default", presentationVariant = "default", }: FundScatterChartProps) {
    const reportingDataSource = useReportingDataSource();
    const isMangoCompanyScatter = presentationVariant === "mango-company";
    const scatterDefaultXAxisRange = isMangoCompanyScatter
        ? MANGO_SCATTER_DEFAULT_X_AXIS_RANGE
        : MAIN_SCATTER_DEFAULT_X_AXIS_RANGE;
    const isExpoView = viewMode === "expo";
    const plotRef = useRef<HTMLDivElement | null>(null);
    const viewportFrameRef = useRef<HTMLDivElement | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const xRangeRef = useRef<AxisRange>([0, 1]);
    const yRangeRef = useRef<AxisRange>([0, 1]);
    const [grouping, setGrouping] = useState<FundScatterGrouping>("fund");
    const [momentum] = useState<FundScatterMomentum>("today");
    const [showTrajectories, setShowTrajectories] = useState(false);
    const [periods, setPeriods] = useState<string[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState("");
    const [rows, setRows] = useState<ScatterRow[]>([]);
    const [allFundRows, setAllFundRows] = useState<ScatterRow[]>([]);
    const [historicalCompanyVintageRows, setHistoricalCompanyVintageRows] = useState<ReportingUnderlyingCompany[]>([]);
    const [selectedPointKeys, setSelectedPointKeys] = useState<string[]>([]);
    const [viewportWidth, setViewportWidth] = useState(0);
    const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 });
    const [interactiveXRange, setInteractiveXRange] = useState<AxisRange | null>(null);
    const [interactiveYRange, setInteractiveYRange] = useState<AxisRange | null>(null);
    const [isLoadingPeriods, setIsLoadingPeriods] = useState(true);
    const [isLoadingRows, setIsLoadingRows] = useState(false);
    const [isLoadingReferenceRows, setIsLoadingReferenceRows] = useState(mode === "compare");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const localPreviewPeriods = useMemo(() => [...new Set(localPreviewRows.map((row) => row.report_period))].sort(compareReportPeriodsDesc), [localPreviewRows]);
    useEffect(() => {
        if (mode !== "main") {
            setSelectedPointKeys([]);
        }
    }, [mode]);
    useEffect(() => {
        setPeriods(mode === "main" ? [] : localPreviewPeriods);
        setIsLoadingPeriods(false);
        setAllFundRows(mode === "compare" ? localPreviewRows as ScatterRow[] : []);
        setIsLoadingReferenceRows(false);
        setErrorMessage(null);
    }, [mode, localPreviewPeriods, localPreviewRows]);
    useEffect(() => {
        if (mode !== "main" || grouping !== "company_vintage" || !showTrajectories)
            return;
        setHistoricalCompanyVintageRows(reportingDataSource.historyPackages.flatMap((reportPackage) => (reportPackage.underlying_companies ?? []).map((company) => ({
            ...company,
            report_period: company.report_period || reportPackage.report_meta.quarter_key,
        }))));
    }, [grouping, mode, reportingDataSource, showTrajectories]);
    const focusAvailablePeriods = useMemo(() => {
        if (mode !== "compare")
            return periods;
        if ((!focusId && !focusName) || allFundRows.length === 0)
            return [];
        return periods.filter((period) => allFundRows.some((row) => row.report_period === period && matchesScatterFocus(row, focusId, focusName)));
    }, [allFundRows, focusId, focusName, mode, periods]);
    const selectablePeriods = mode === "compare" ? focusAvailablePeriods : periods;
    useEffect(() => {
        if (mode !== "compare")
            return;
        if (selectablePeriods.length === 0)
            return;
        setSelectedPeriod((current) => {
            if (current && selectablePeriods.includes(current))
                return current;
            if (initialReportPeriod && selectablePeriods.includes(initialReportPeriod))
                return initialReportPeriod;
            return selectablePeriods[0] ?? "";
        });
    }, [initialReportPeriod, mode, selectablePeriods]);
    const activePeriod = useMemo(() => {
        if (mode === "compare") {
            if (selectedPeriod && focusAvailablePeriods.includes(selectedPeriod))
                return selectedPeriod;
            if (initialReportPeriod && focusAvailablePeriods.includes(initialReportPeriod))
                return initialReportPeriod;
            return focusAvailablePeriods[0] ?? "";
        }
        if (initialReportPeriod && rows.some((row) => row.report_period === initialReportPeriod)) {
            return initialReportPeriod;
        }
        return rows[0]?.report_period || periods[0] || initialReportPeriod || "";
    }, [focusAvailablePeriods, initialReportPeriod, mode, periods, rows, selectedPeriod]);
    const scatterDefaultCenter = useMemo(() => isMangoCompanyScatter
        ? {
            x: getMangoScatterCenterX(activePeriod),
            y: MANGO_SCATTER_DEFAULT_CENTER.y,
        }
        : MAIN_SCATTER_DEFAULT_CENTER, [activePeriod, isMangoCompanyScatter]);
    useEffect(() => {
        if (mode !== "main")
            return;
        setRows(localPreviewRows as ScatterRow[]);
        setIsLoadingRows(false);
    }, [mode, localPreviewRows]);
    const fundMetadataMatcher = useMemo<ScatterFundMetadataMatcher>(() => {
        const metadataByKey = new Map<string, ScatterFundMetadata | null>();
        const candidates: ScatterFundMetadataCandidate[] = [];
        for (const item of fundMetadata) {
            const metadata = {
                name: item.name,
                sector: normalizeScatterText(item.sector),
                country: normalizeScatterText(item.country),
            } satisfies ScatterFundMetadata;
            candidates.push({
                metadata,
                looseTokens: tokenizeFundNameForMatch(item.name, FUND_NAME_MATCH_LOOSE_STOPWORDS),
            });
            for (const key of buildFundNameMetadataKeys(item.name)) {
                const existing = metadataByKey.get(key);
                if (existing === undefined) {
                    metadataByKey.set(key, metadata);
                    continue;
                }
                if (existing && existing.name !== metadata.name) {
                    metadataByKey.set(key, null);
                }
            }
        }
        return { candidates, metadataByKey };
    }, [fundMetadata]);
    const mergedMainRows = rows;
    const mainFundRows = useMemo(() => mode === "main"
        ? mergedMainRows.map((row) => {
            const metadata = resolveScatterFundMetadata(row.name, fundMetadataMatcher);
            return {
                ...row,
                sector: metadata?.sector ?? null,
                country: metadata?.country ?? null,
            } satisfies ScatterRow;
        })
        : [], [fundMetadataMatcher, mergedMainRows, mode]);
    const companyVintageUnderlyingCompanies = useMemo(() => historicalCompanyVintageRows.length > 0
        ? [...historicalCompanyVintageRows, ...underlyingCompanies]
        : underlyingCompanies, [historicalCompanyVintageRows, underlyingCompanies]);
    const groupedMainRows = useMemo(() => mode === "main"
        ? aggregateScatterRows(mainFundRows, grouping, grouping === "company_vintage" ? companyVintageUnderlyingCompanies : underlyingCompanies)
        : [], [companyVintageUnderlyingCompanies, grouping, mainFundRows, mode, underlyingCompanies]);
    const comparisonRows = useMemo(() => {
        if (mode !== "compare" || !activePeriod || (!focusId && !focusName))
            return [];
        try {
            return buildPeerAverageScatterRows(allFundRows, {
                focusId,
                focusName,
                reportPeriod: activePeriod,
                comparisonFundLabel,
                underlyingCompanies,
            }) as ScatterRow[];
        }
        catch {
            return [];
        }
    }, [activePeriod, allFundRows, comparisonFundLabel, focusId, focusName, mode, underlyingCompanies]);
    const visibleRows = useMemo(() => {
        if (mode === "main") {
            if (!activePeriod)
                return [];
            return groupedMainRows.filter((row) => row.report_period === activePeriod);
        }
        return comparisonRows;
    }, [activePeriod, comparisonRows, groupedMainRows, mode]);
    const colorReferenceRows = useMemo(() => (mode === "compare" && activePeriod ? allFundRows.filter((row) => row.report_period === activePeriod) : []), [activePeriod, allFundRows, mode]);
    const chartRows = useMemo(() => visibleRows.filter((row) => isFiniteNumber(row.age_years) && isFiniteNumber(row.tvpi)), [visibleRows]);
    const mainTrajectoryRows = useMemo(() => mode === "main" && activePeriod
        ? groupedMainRows.filter((row) => isFiniteNumber(row.age_years) &&
            isFiniteNumber(row.tvpi) &&
            isQuarterAtOrBefore(row.report_period, activePeriod))
        : [], [activePeriod, groupedMainRows, mode]);
    const mainTrajectoryGroups = useMemo<TrajectoryGroup[]>(() => {
        if (mode !== "main" || !showTrajectories)
            return [];
        const groups = new Map<string, FundScatterPoint[]>();
        for (const row of mainTrajectoryRows) {
            const key = getScatterPointKey(row);
            const existing = groups.get(key) ?? [];
            existing.push(row);
            groups.set(key, existing);
        }
        return [...groups.entries()]
            .map(([key, points]) => ({
            key,
            points: [...points].sort(sortScatterPointsByQuarterAsc),
        }))
            .filter((group) => group.points.length > 1);
    }, [mainTrajectoryRows, mode, showTrajectories]);
    const compareTrajectoryRows = useMemo(() => mode === "compare" && showTrajectories && activePeriod && (focusId || focusName)
        ? focusAvailablePeriods
            .filter((period) => isQuarterAtOrBefore(period, activePeriod))
            .flatMap((period) => {
            try {
                return buildPeerAverageScatterRows(allFundRows, {
                    focusId,
                    focusName,
                    reportPeriod: period,
                    comparisonFundLabel,
                    underlyingCompanies,
                }) as ScatterRow[];
            }
            catch {
                return [];
            }
        })
            .filter((row) => isFiniteNumber(row.age_years) && isFiniteNumber(row.tvpi))
        : [], [activePeriod, allFundRows, comparisonFundLabel, focusAvailablePeriods, focusId, focusName, mode, showTrajectories, underlyingCompanies]);
    const compareTrajectoryGroups = useMemo<TrajectoryGroup[]>(() => {
        if (mode !== "compare" || !showTrajectories)
            return [];
        const groups = new Map<string, ScatterRow[]>();
        for (const row of compareTrajectoryRows) {
            const key = getScatterPointKey(row);
            const existing = groups.get(key) ?? [];
            existing.push(row);
            groups.set(key, existing);
        }
        return [...groups.entries()]
            .map(([key, points]) => ({
            key,
            points: [...points].sort(sortScatterPointsByQuarterAsc),
        }))
            .filter((group) => group.points.length > 1);
    }, [compareTrajectoryRows, mode, showTrajectories]);
    const chartViewportHeightPx = mode === "main" ? 504 : 360;
    const chartScrollViewportHeightPx = chartViewportHeightPx - AXIS_GUTTER_HEIGHT_PX;
    const baseChartCanvasHeightPx = chartScrollViewportHeightPx;
    const isCompanyVintageGrouping = mode === "main" && grouping === "company_vintage";
    const plotCoordinateRows = chartRows;
    const horizontalCoordinates = useMemo(() => {
        return plotCoordinateRows.flatMap((row) => (isFiniteNumber(row.age_years) ? [row.age_years] : []));
    }, [plotCoordinateRows]);
    const verticalCoordinates = useMemo(() => {
        return plotCoordinateRows.flatMap((row) => (isFiniteNumber(row.tvpi) ? [row.tvpi] : []));
    }, [plotCoordinateRows]);
    const defaultXAxisRange = useMemo<AxisRange>(() => {
        if (isMangoCompanyScatter) {
            return MANGO_SCATTER_DEFAULT_X_AXIS_RANGE;
        }
        const range = getAxisRange(horizontalCoordinates, {
            minSpan: mode === "main" ? 4.5 : 2.6,
            paddingRatio: isCompanyVintageGrouping ? 0.09 : 0.08,
            floorAtZero: true,
        });
        if (mode !== "main") {
            return range;
        }
        const centeredRange = ensureRangeContainsValue(range, scatterDefaultCenter.x, true);
        return isCompanyVintageGrouping
            ? centeredRange
            : ensureRangeContainsBounds(centeredRange, scatterDefaultXAxisRange, true);
    }, [horizontalCoordinates, isCompanyVintageGrouping, isMangoCompanyScatter, mode, scatterDefaultCenter.x, scatterDefaultXAxisRange]);
    // Keep the plot inside its frame; navigation changes the data domains.
    const effectiveChartCanvasWidth = Math.max(viewportWidth || (mode === "main" ? 1040 : 760), 1);
    const effectiveChartCanvasHeightPx = baseChartCanvasHeightPx;
    const defaultYAxisRange = useMemo<AxisRange>(() => {
        if (isMangoCompanyScatter) {
            return MANGO_SCATTER_DEFAULT_Y_AXIS_RANGE;
        }
        if (mode === "main" && isCompanyVintageGrouping) {
            return COMPANY_VINTAGE_DEFAULT_Y_AXIS_RANGE;
        }
        const range = getAxisRange(verticalCoordinates, {
            minSpan: mode === "main" ? 1.4 : 0.9,
            paddingRatio: 0.12,
            floorAtZero: true,
        });
        return mode === "main"
            ? ensureRangeContainsValue(range, scatterDefaultCenter.y, true)
            : range;
    }, [isCompanyVintageGrouping, isMangoCompanyScatter, mode, scatterDefaultCenter.y, verticalCoordinates]);
    const xAxisRange = interactiveXRange ?? defaultXAxisRange;
    const yAxisRange = interactiveYRange ?? defaultYAxisRange;
    const hasInteractiveView = !scatterYRangesEqual(xAxisRange, defaultXAxisRange) || !scatterYRangesEqual(yAxisRange, defaultYAxisRange);
    useEffect(() => {
        xRangeRef.current = xAxisRange;
        yRangeRef.current = yAxisRange;
    }, [xAxisRange, yAxisRange]);
    const xAxisTicks = useMemo(() => isCompanyVintageGrouping || isMangoCompanyScatter
        ? buildUnitAxisTicks(xAxisRange, (value) => formatAxisTick(value, 0))
        : buildAxisTicks(xAxisRange, mode === "main" ? 7 : 6, (value) => formatAxisTick(value, 1)), [xAxisRange, isCompanyVintageGrouping, isMangoCompanyScatter, mode]);
    const yAxisTicks = useMemo(() => isMangoCompanyScatter
        ? buildUnitAxisTicks(yAxisRange, (value) => `${formatAxisTick(value, 0)}x`)
        : buildAxisTicks(yAxisRange, mode === "main" ? 6 : 5, (value) => formatAxisTick(value, 2)), [yAxisRange, isMangoCompanyScatter, mode]);
    const plotAreaWidth = Math.max(effectiveChartCanvasWidth - PLOT_MARGINS.l - PLOT_MARGINS.r, 1);
    const plotAreaHeight = Math.max(effectiveChartCanvasHeightPx - PLOT_MARGINS.t - PLOT_MARGINS.b, 1);
    const resetViewportZoom = useCallback(() => {
        xRangeRef.current = defaultXAxisRange;
        yRangeRef.current = defaultYAxisRange;
        setInteractiveXRange(null);
        setInteractiveYRange(null);
        viewportRef.current?.scrollTo({ left: 0, top: 0 });
        setScrollPosition({ left: 0, top: 0 });
    }, [defaultXAxisRange, defaultYAxisRange]);
    useEffect(() => {
        const element = viewportRef.current;
        if (!element)
            return;
        const updateSize = () => {
            setViewportWidth(element.clientWidth);
        };
        updateSize();
        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", updateSize);
            return () => window.removeEventListener("resize", updateSize);
        }
        const observer = new ResizeObserver(updateSize);
        observer.observe(element);
        return () => observer.disconnect();
    }, [chartRows.length, errorMessage, isLoadingPeriods, isLoadingRows]);
    useEffect(() => {
        const element = viewportRef.current;
        if (!element)
            return;
        let frameId = 0;
        const updateScrollPosition = () => {
            frameId = 0;
            setScrollPosition({
                left: element.scrollLeft,
                top: element.scrollTop,
            });
        };
        updateScrollPosition();
        const handleScroll = () => {
            if (frameId !== 0)
                return;
            frameId = window.requestAnimationFrame(updateScrollPosition);
        };
        element.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            element.removeEventListener("scroll", handleScroll);
            if (frameId !== 0) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [chartRows.length, errorMessage, isLoadingPeriods, isLoadingRows]);
    useEffect(() => {
        setSelectedPointKeys([]);
        resetViewportZoom();
    }, [activePeriod, focusId, focusName, grouping, mode, resetViewportZoom]);
    useEffect(() => {
        if (selectedPointKeys.length === 0)
            return;
        const availableKeys = new Set(chartRows.map((row) => getScatterPointKey(row)));
        setSelectedPointKeys((current) => {
            const next = current.filter((key) => availableKeys.has(key));
            return next.length === current.length ? current : next;
        });
    }, [chartRows, selectedPointKeys.length]);
    const vintageColorMap = useMemo(() => {
        const colorSourceRows = mode === "compare" && colorReferenceRows.length > 0
            ? colorReferenceRows
            : chartRows;
        const palette = isCompanyVintageGrouping ? COMPANY_VINTAGE_COLORS : BRAND_VINTAGE_COLORS;
        const uniqueVintageKeys = Array.from(new Set(colorSourceRows.map((row) => normalizeVintageKey(row.vintage))))
            .sort(sortVintageKeys);
        const colors = new Map<string, string>();
        let colorIndex = 0;
        uniqueVintageKeys.forEach((key) => {
            if (key === "unknown") {
                colors.set(key, "#F4F4F4");
                return;
            }
            const overriddenColor = isCompanyVintageGrouping ? undefined : VINTAGE_COLOR_OVERRIDES[key];
            if (overriddenColor) {
                colors.set(key, overriddenColor);
                colorIndex += 1;
                return;
            }
            colors.set(key, palette[colorIndex % palette.length]);
            colorIndex += 1;
        });
        return colors;
    }, [chartRows, colorReferenceRows, isCompanyVintageGrouping, mode]);
    const vintageLegend = useMemo(() => {
        if (mode !== "main")
            return [];
        return Array.from(vintageColorMap.entries())
            .map(([key, color]) => ({
            key,
            color,
            label: key === "unknown" ? "Vintage unknown" : key,
        }))
            .sort((left, right) => sortVintageKeys(left.key, right.key));
    }, [mode, vintageColorMap]);
    const selectedPointKeySet = useMemo(() => new Set(selectedPointKeys), [selectedPointKeys]);
    const xAxisLabel = isCompanyVintageGrouping || isMangoCompanyScatter
        ? isMangoCompanyScatter ? "Years since initial investment" : "Years since first investment"
        : "Years since first closing";
    const yAxisLabel = isMangoCompanyScatter ? "MOIC" : "TVPI";
    const mainBubbleMaxSizePx = mode === "main" ? (isCompanyVintageGrouping ? 64 : 52) : 46;
    const mainBubbleSizeSelector = useCallback((point: ScatterRow) => {
        if (isCompanyVintageGrouping) {
            return isFiniteNumber(point.fair_value_eur) && point.fair_value_eur > 0
                ? point.fair_value_eur
                : point.commitment_eur;
        }
        return point.commitment_eur;
    }, [isCompanyVintageGrouping]);
    const mainBubbleSizeReference = useMemo(() => getBubbleSizeReference(chartRows, mainBubbleMaxSizePx, mainBubbleSizeSelector), [chartRows, isExpoView, mainBubbleMaxSizePx, mainBubbleSizeSelector]);
    const plotData = useMemo<Data[]>(() => {
        if (chartRows.length === 0)
            return [];
        if (mode === "main") {
            const orderedRows = [...chartRows].sort((left, right) => (mainBubbleSizeSelector(right) ?? 0) - (mainBubbleSizeSelector(left) ?? 0));
            const hasSelectedTrajectoryPoints = showTrajectories && selectedPointKeys.length > 0;
            const lineTraces = showTrajectories
                ? mainTrajectoryGroups.map((group) => {
                    const latestPoint = orderedRows.find((row) => getScatterPointKey(row) === group.key) ??
                        group.points[group.points.length - 1]!;
                    const bubbleColor = vintageColorMap.get(normalizeVintageKey(latestPoint.vintage)) ?? "#D886FF";
                    const isSelected = selectedPointKeySet.has(group.key);
                    const lineAlpha = hasSelectedTrajectoryPoints
                        ? (isSelected ? 1 : DIMMED_LINE_ALPHA)
                        : 0.62;
                    const markerAlpha = hasSelectedTrajectoryPoints
                        ? (isSelected ? 0.24 : 0.08)
                        : 0.16;
                    return {
                        type: "scatter",
                        mode: "lines+markers",
                        x: group.points.map((point) => point.age_years),
                        y: group.points.map((point) => point.tvpi),
                        meta: { interactive: "trajectory" },
                        line: {
                            color: hexToRgba(bubbleColor, lineAlpha),
                            width: 1.6,
                            dash: "dash",
                        },
                        marker: {
                            size: group.points.map((_, index) => (index === group.points.length - 1 ? 0 : 6)),
                            color: group.points.map(() => hexToRgba(bubbleColor, markerAlpha)),
                            line: {
                                color: group.points.map(() => "#F4F1EB"),
                                width: 1,
                            },
                        },
                        hoverinfo: "skip",
                        showlegend: false,
                    } satisfies Data;
                })
                : [];
            const bubbleTraces = orderedRows.map((row) => {
                const bubbleColor = vintageColorMap.get(normalizeVintageKey(row.vintage)) ?? "#D886FF";
                const pointKey = getScatterPointKey(row);
                const isSelected = selectedPointKeySet.has(pointKey);
                const isDimmed = hasSelectedTrajectoryPoints && !isSelected;
                const companyCountLabel = row.company_count != null ? row.company_count.toLocaleString("en-GB") : "—";
                const companyVintageExposure = isFiniteNumber(row.fair_value_eur) && row.fair_value_eur > 0
                    ? row.fair_value_eur
                    : isFiniteNumber(row.commitment_eur) && row.commitment_eur > 0
                        ? row.commitment_eur
                        : null;
                const customdata = isCompanyVintageGrouping
                    ? [[
                            companyVintageExposure != null ? formatCurrency(companyVintageExposure) : "—",
                            formatMultipleLabel(row.tvpi),
                            companyCountLabel
                        ]]
                    : [[
                            row.fair_value_eur != null ? formatCurrency(row.fair_value_eur) : "—",
                            row.value_created_eur != null ? formatCurrency(row.value_created_eur) : "—",
                            formatMultipleLabel(row.tvpi),
                            companyCountLabel
                        ]];
                const tooltip: ScatterTooltipData = {
                    pointKey: getScatterPointKey(row), title: row.name,
                    rows: (isCompanyVintageGrouping
                        ? ["Aldea exposure:", "Avg linked fund TVPI:", "Underlying companies:"]
                        : ["Fair value:", "Value created:", "TVPI:", "Companies:"])
                        .map((label, index) => [label, customdata[0][index]]),
                };
                const markerSize = isCompanyVintageGrouping
                    ? companyVintageExposure != null
                        ? companyVintageExposure
                        : Math.max(row.company_count ?? 1, 1)
                    :
                        mainBubbleSizeSelector(row) ?? 1;
                return {
                    type: "scatter",
                    mode: "text+markers",
                    x: [row.age_years],
                    y: [row.tvpi],
                    ids: [pointKey],
                    meta: { interactive: "bubble", tooltip },
                    text: [row.name],
                    textposition: "top center",
                    cliponaxis: false,
                    textfont: {
                        color: isDimmed ? hexToRgba(GRAPH_TEXT_COLOR, DIMMED_TEXT_ALPHA) : GRAPH_TEXT_COLOR,
                        size: 10,
                    },
                    hoverinfo: "skip",
                    customdata,
                    marker: {
                        size: [markerSize],
                        sizemode: "area",
                        sizeref: mainBubbleSizeReference ?? undefined,
                        sizemin: isCompanyVintageGrouping ? 0 : 18,
                        color: [bubbleColor],
                        line: {
                            color: isSelected
                                ? "rgba(61, 0, 40, 0.48)"
                                : isDimmed
                                    ? hexToRgba("#3D0028", 0.12)
                                    : "rgba(61, 0, 40, 0.26)",
                            width: isSelected ? 2.2 : 1.8,
                        },
                        opacity: isSelected ? 1 : isDimmed ? DIMMED_BUBBLE_OPACITY : 0.94,
                    },
                    showlegend: false,
                } satisfies Data;
            });
            return [...lineTraces, ...bubbleTraces];
        }
        const orderedRows = [...chartRows].sort((left, right) => {
            if (left.entity_type === right.entity_type) {
                return (left.commitment_eur ?? 0) - (right.commitment_eur ?? 0);
            }
            return left.entity_type === "peer_average" ? -1 : 1;
        });
        const lineTraces = showTrajectories
            ? compareTrajectoryGroups.map((group) => {
                const latestPoint = orderedRows.find((row) => getScatterPointKey(row) === group.key) ??
                    group.points[group.points.length - 1]!;
                const bubbleColor = getCompareSeriesColor(latestPoint, vintageColorMap);
                const isAverageSeries = latestPoint.entity_type === "peer_average";
                return {
                    type: "scatter",
                    mode: "lines+markers",
                    x: group.points.map((point) => point.age_years),
                    y: group.points.map((point) => point.tvpi),
                    line: {
                        color: hexToRgba(bubbleColor, isAverageSeries ? 0.72 : 0.86),
                        width: isAverageSeries ? 1.3 : 1.6,
                        dash: "dash",
                    },
                    marker: {
                        size: group.points.map((_, index) => (index === group.points.length - 1 ? 0 : 6)),
                        color: group.points.map(() => hexToRgba(bubbleColor, isAverageSeries ? 0.18 : 0.24)),
                        line: {
                            color: group.points.map(() => "#F4F1EB"),
                            width: 1,
                        },
                    },
                    hoverinfo: "skip",
                    showlegend: false,
                } satisfies Data;
            })
            : [];
        const bubbleTraces = orderedRows.map((row) => {
            const bubbleColor = getCompareSeriesColor(row, vintageColorMap);
            const isPeerAverage = row.entity_type === "peer_average";
            const isCompanyVintageAverage = isCompanyVintageAverageSeries(row);
            const companyCountLabel = row.company_count != null ? row.company_count.toLocaleString("en-GB") : "—";
            const customdata = isCompanyVintageAverage
                ? [[
                        row.fair_value_eur != null ? formatCurrency(row.fair_value_eur) : "—",
                        formatMultipleLabel(row.tvpi),
                        companyCountLabel
                    ]]
                : [[
                        row.fair_value_eur != null ? formatCurrency(row.fair_value_eur) : "—",
                        row.value_created_eur != null ? formatCurrency(row.value_created_eur) : "—",
                        formatMultipleLabel(row.tvpi),
                        companyCountLabel
                    ]];
            const tooltip: ScatterTooltipData = {
                    pointKey: getScatterPointKey(row), title: row.name,
                    rows: (isCompanyVintageAverage
                        ? ["Aldea exposure:", "Avg linked fund TVPI:", "Underlying companies:"]
                        : ["Fair value:", "Value created:", "TVPI:", "Companies:"])
                        .map((label, index) => [label, customdata[0][index]]),
                };
            return {
                type: "scatter",
                mode: "text+markers",
                x: [row.age_years],
                y: [row.tvpi],
                ids: [getScatterPointKey(row)],
                meta: { interactive: "bubble", tooltip },
                text: [row.name],
                textposition: getCompareTextPosition(row),
                cliponaxis: false,
                textfont: {
                    color: GRAPH_TEXT_COLOR,
                    size: 10,
                },
                hoverinfo: "skip",
                customdata,
                marker: {
                    size: [isFiniteNumber(row.commitment_eur) && row.commitment_eur > 0 ? row.commitment_eur : 1],
                    sizemode: "area",
                    sizeref: mainBubbleSizeReference ?? undefined,
                    sizemin: 18,
                    color: [bubbleColor],
                    line: {
                        color: isPeerAverage ? "rgba(61, 0, 40, 0.14)" : "rgba(61, 0, 40, 0.26)",
                        width: isPeerAverage ? 1.2 : 1.8,
                    },
                    opacity: isPeerAverage ? 0.8 : 0.94,
                },
                showlegend: false,
            } satisfies Data;
        });
        return [...lineTraces, ...bubbleTraces];
    }, [
        chartRows,
        compareTrajectoryGroups,
        mainTrajectoryGroups,
        mode,
        momentum,
        isExpoView,
        selectedPointKeySet,
        selectedPointKeys.length,
        showTrajectories,
        vintageColorMap,
        isCompanyVintageGrouping,
        mainBubbleSizeReference,
        mainBubbleSizeSelector
    ]);
    const { pointerHandlers, tooltip } = useScatterPointer(plotRef, viewportFrameRef, plotData,
        mode === "main" ? (pointKey) => setSelectedPointKeys(current => current.includes(pointKey)
            ? current.filter(key => key !== pointKey) : [...current, pointKey]) : undefined);
    const plotLayout = useMemo<Partial<Layout>>(() => ({
        autosize: true,
        dragmode: false,
        margin: PLOT_MARGINS,
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        showlegend: false,
        xaxis: {
            range: xAxisRange,
            tickmode: "array",
            tickvals: xAxisTicks.values,
            ticktext: xAxisTicks.labels,
            title: { text: "" },
            fixedrange: true,
            zeroline: false,
            showline: false,
            showticklabels: false,
            tickfont: { color: GRAPH_TEXT_COLOR, size: 11 },
            gridcolor: "rgba(0,0,0,0.08)",
        },
        yaxis: {
            range: yAxisRange,
            tickmode: "array",
            tickvals: yAxisTicks.values,
            ticktext: yAxisTicks.labels,
            title: { text: "" },
            fixedrange: true,
            zeroline: false,
            showline: false,
            showticklabels: false,
            tickfont: { color: GRAPH_TEXT_COLOR, size: 11 },
            gridcolor: "rgba(0,0,0,0.08)",
        },
        font: {
            color: GRAPH_TEXT_COLOR,
        },
    }), [xAxisRange, yAxisRange, xAxisTicks.labels, xAxisTicks.values, yAxisTicks.labels, yAxisTicks.values]);
    const visibleXAxisTicks = useMemo(() => {
        const [start, end] = xAxisRange;
        const span = Math.max(end - start, 1e-6);
        return xAxisTicks.values.map((value, index) => {
            const offsetWithinPlot = ((value - start) / span) * plotAreaWidth;
            return {
                key: `${value}`,
                label: xAxisTicks.labels[index] ?? formatAxisTick(value, 1),
                left: PLOT_MARGINS.l + offsetWithinPlot - scrollPosition.left,
            };
        });
    }, [xAxisRange, plotAreaWidth, scrollPosition.left, xAxisTicks.labels, xAxisTicks.values]);
    const visibleYAxisTicks = useMemo(() => {
        const [start, end] = yAxisRange;
        const span = Math.max(end - start, 1e-6);
        return yAxisTicks.values.map((value, index) => {
            const offsetWithinPlot = (1 - (value - start) / span) * plotAreaHeight;
            return {
                key: `${value}`,
                label: yAxisTicks.labels[index] ?? formatAxisTick(value, 2),
                top: PLOT_MARGINS.t + offsetWithinPlot - scrollPosition.top,
            };
        });
    }, [yAxisRange, plotAreaHeight, scrollPosition.top, yAxisTicks.labels, yAxisTicks.values]);
    const chartInstanceKey = useMemo(() => [mode, activePeriod || "none", grouping, focusId ?? "", focusName ?? ""].join(":"), [activePeriod, focusId, focusName, grouping, mode]);
    useEffect(() => {
        let isCancelled = false;
        let resizeObserver: ResizeObserver | null = null;
        let cleanupWindowResize = () => { };
        const mountedPlot = plotRef.current;
        let plotly: PlotlyStatic | null = null;
        async function renderPlot() {
            if (!mountedPlot)
                return;
            plotly = await getPlotly();
            if (isCancelled || !mountedPlot)
                return;
            if (plotData.length === 0) {
                plotly.purge(mountedPlot);
                return;
            }
            await plotly.react(mountedPlot, plotData, plotLayout, {
                displayModeBar: false,
                responsive: true,
                scrollZoom: false,
                doubleClick: false,
            } satisfies Partial<Config>);
            if (isCancelled || !mountedPlot) {
                if (!mountedPlot.isConnected) plotly.purge(mountedPlot);
                return;
            }
            const handleResize = () => {
                if (mountedPlot) {
                    plotly?.Plots.resize(mountedPlot);
                }
            };
            window.addEventListener("resize", handleResize);
            cleanupWindowResize = () => window.removeEventListener("resize", handleResize);
            if (typeof ResizeObserver !== "undefined") {
                resizeObserver = new ResizeObserver(handleResize);
                resizeObserver.observe(mountedPlot);
            }

        }
        renderPlot().catch(() => {
            if (!isCancelled) {
                setErrorMessage("Unable to render the fund scatter chart.");
            }
        });
        return () => {
            isCancelled = true;
            resizeObserver?.disconnect();
            cleanupWindowResize();
            if (mountedPlot && plotly) {
                if (!mountedPlot.isConnected) plotly.purge(mountedPlot);
            }
        };
    }, [mode, plotData, plotLayout]);
    useEffect(() => {
        const element = viewportRef.current;
        if (!element || chartRows.length === 0) return;
        return bindChartGestures(element, {
            onPan: (deltaX, deltaY) => {
                const currentX = xRangeRef.current, currentY = yRangeRef.current;
                const nextX = panScatterRange({ range: currentX, originalRange: defaultXAxisRange, delta: deltaX / plotAreaWidth * (currentX[1] - currentX[0]) });
                const nextY = panScatterRange({ range: currentY, originalRange: defaultYAxisRange, delta: -deltaY / plotAreaHeight * (currentY[1] - currentY[0]) });
                xRangeRef.current = nextX;
                yRangeRef.current = nextY;
                if (!scatterYRangesEqual(currentX, nextX)) setInteractiveXRange(nextX);
                if (!scatterYRangesEqual(currentY, nextY)) setInteractiveYRange(nextY);
            },
            onZoom: (factor, pointer) => {
                const current = yRangeRef.current;
                const anchor = getScatterYValueAtPointer({ range: current, pointerY: pointer.y, scrollTop: element.scrollTop, plotTop: PLOT_MARGINS.t, plotHeight: plotAreaHeight });
                const next = zoomScatterYRange({ range: current, originalRange: defaultYAxisRange, anchorValue: anchor, zoomFactor: factor });
                yRangeRef.current = next;
                if (!scatterYRangesEqual(current, next)) setInteractiveYRange(next);
            },
            onReset: resetViewportZoom,
        });
    }, [chartRows.length, defaultXAxisRange, defaultYAxisRange, errorMessage, isLoadingPeriods, isLoadingRows, plotAreaWidth, plotAreaHeight, resetViewportZoom]);
    const isLoadingScatter = mode === "main"
        ? isLoadingRows
        : isLoadingPeriods || isLoadingReferenceRows;
    if (mode === "compare" && !focusId && !focusName) {
        return null;
    }
    return (<div className={cn(mode === "main"
            ? cn("space-y-0 rounded-xl border border-black/8 bg-white/20 px-5 pt-4", vintageLegend.length > 0 ? "pb-0" : "pb-4")
            : "rounded-xl border border-black/8 bg-white/60 px-5 py-4")}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal/58">
              {mode === "main"
            ? isMangoCompanyScatter ? "Companies Scatter" : "Fund-of-funds scatter"
            : `${comparisonFundLabel?.trim() || "Fund"} comparison`}
            </div>
            <div className={cn("text-sm text-charcoal/58", mode === "main" && "pb-3")}>
              {isCompanyVintageGrouping
            ? "Bubble size reflects Aldea exposure to each investment vintage. Bubble color reflects first investment year."
            :
                `Bubble size reflects ${isMangoCompanyScatter ? "Mango" : "Aldea"} commitment. Bubble color reflects vintage year.`}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:justify-end">
            {hasInteractiveView && <button type="button" onClick={resetViewportZoom} className="inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium text-charcoal/48 hover:bg-black/[0.035] hover:text-charcoal/72">Reset view</button>}
            {mode === "main" ? (<>
                <div className="inline-flex shrink-0 items-center gap-2 px-1">
                  <span className="shrink-0 text-xs font-medium text-charcoal/58">Group by:</span>
                  <Select value={grouping} onValueChange={(value) => setGrouping(value as FundScatterGrouping)}>
                    <SelectTrigger aria-label={`Group scatter by ${grouping.replaceAll("_", " ")}`} className="!w-auto h-auto min-w-0 shrink-0 justify-end gap-1.5 border-0 bg-transparent px-0 py-1.5 text-xs font-medium text-charcoal/68 shadow-none ring-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>span]:text-right">
                      <span className="text-right">
                        {(isMangoCompanyScatter
                ? {
                    fund: "Company",
                    vintage_year: "Vintage",
                    company_vintage: "Vintage",
                    sector: "Sector",
                    region: "Sector",
                }
                : {
                    fund: "Funds",
                    vintage_year: "Vinage (Fund)",
                    company_vintage: "Vintage (Company)",
                    sector: "Sector",
                    region: "Country",
                })[grouping]}
                      </span>
                    </SelectTrigger>
                    <SelectContent align="end" side="bottom" sideOffset={8} className="z-30">
                      {(isMangoCompanyScatter
                ? [
                    { value: "fund", label: "Company" },
                    { value: "vintage_year", label: "Vintage" },
                    { value: "sector", label: "Sector" }
                ]
                : [
                    { value: "fund", label: "Funds" },
                    { value: "vintage_year", label: "Vinage (Fund)" },
                    { value: "company_vintage", label: "Vintage (Company)" },
                    { value: "sector", label: "Sector" },
                    { value: "region", label: "Country" }
                ]).map((option) => (<SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.label}
                        </SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <button type="button" aria-pressed={showTrajectories} onClick={() => setShowTrajectories((current) => !current)} className={cn("inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs transition-colors", showTrajectories
                ? "font-semibold text-[#3D0028] underline underline-offset-4 decoration-[1.5px]"
                : "bg-transparent font-medium text-charcoal/48 hover:bg-black/[0.035] hover:text-charcoal/72")}>
                  {showTrajectories ? "Hide Trajectory" : "View Trajectory"}
                </button>
              </>) : (<button type="button" aria-pressed={showTrajectories} onClick={() => setShowTrajectories((current) => !current)} className={cn("inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs transition-colors", showTrajectories
                ? "font-semibold text-[#3D0028] underline underline-offset-4 decoration-[1.5px]"
                : "bg-transparent font-medium text-charcoal/48 hover:bg-black/[0.035] hover:text-charcoal/72")}>
                {showTrajectories ? "Hide Trajectory" : "View Trajectory"}
              </button>)}
          </div>
        </div>

      </div>

      <div className={cn(mode === "main" ? "mt-1" : "mt-4")} style={{ height: `${chartViewportHeightPx}px` }}>
        {errorMessage ? (<div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-[#3D0028]/14 bg-[#faf3ff] px-6 text-center">
            <div className="flex max-w-sm flex-col items-center gap-2 text-sm text-charcoal/64">
              <AlertTriangle className="h-4 w-4 text-[#3D0028]/48"/>
              <span>{errorMessage}</span>
            </div>
          </div>) : isLoadingScatter ? (<div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-[#3D0028]/14 bg-[#faf3ff] text-sm text-charcoal/50">
            Loading fund scatter…
          </div>) : mode === "compare" && focusAvailablePeriods.length === 0 ? (<div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-[#3D0028]/14 bg-[#faf3ff] px-6 text-center text-sm text-charcoal/56">
            No scatter data is available for this fund yet.
          </div>) : chartRows.length === 0 ? (<div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-[#3D0028]/14 bg-[#faf3ff] px-6 text-center text-sm text-charcoal/56">
            No scatter data is available for {activePeriod ? formatReportPeriodLabel(activePeriod) : "the selected quarter"}.
          </div>) : (<div key={chartInstanceKey} className="grid h-full w-full overflow-hidden rounded-[20px] border border-[#3D0028]/10 bg-white/20" style={{
                gridTemplateColumns: `${AXIS_GUTTER_WIDTH_PX}px minmax(0, 1fr)`,
                gridTemplateRows: `minmax(0, 1fr) ${AXIS_GUTTER_HEIGHT_PX}px`,
            }}>
            <div className="relative overflow-hidden border-r border-[#3D0028]/10 bg-[#F4F1EB]/88">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal/48">
                {yAxisLabel}
              </div>
              {visibleYAxisTicks.map((tick) => (<div key={tick.key} className="absolute right-2 z-10 -translate-y-1/2 text-[10px] font-semibold tabular-nums text-charcoal/62" style={{ top: `${tick.top}px` }}>
                  {tick.label}
                </div>))}
            </div>
            <div ref={viewportFrameRef} className={cn("relative min-h-0 min-w-0 overflow-hidden bg-white/10", false)} style={{ height: `${chartScrollViewportHeightPx}px` }}>
              <div ref={viewportRef} {...pointerHandlers} data-testid={`fund-scatter-${mode}-viewport`} data-x-domain={xAxisRange.join(",")} data-y-domain={yAxisRange.join(",")} tabIndex={0} role="region" aria-label="Scrollable investment scatter chart" className="min-h-0 min-w-0 overflow-x-auto overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ height: `${chartScrollViewportHeightPx}px`, touchAction: "pan-x pan-y" }}>
                <div style={{ width: `${effectiveChartCanvasWidth}px`, height: `${effectiveChartCanvasHeightPx}px` }}>
                  <div ref={plotRef} className="h-full w-full"/>
                </div>
              </div>
              {tooltip}
            </div>
            <div className="border-r border-t border-[#3D0028]/10 bg-[#F4F1EB]/88"/>
            <div className="relative overflow-hidden border-t border-[#3D0028]/10 bg-[#F4F1EB]/88">
              {visibleXAxisTicks.map((tick) => (<div key={tick.key} className="absolute top-2 z-10 -translate-x-1/2 text-[10px] font-semibold tabular-nums text-charcoal/62" style={{ left: `${tick.left}px` }}>
                  {tick.label}
                </div>))}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal/48">
                {xAxisLabel}
              </div>
            </div>
          </div>)}
      </div>

      {mode === "main" && vintageLegend.length > 0 ? (<div className="flex h-8 items-center justify-end">
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-[11px] font-medium text-charcoal/68">
            {vintageLegend.map((item) => (<div key={item.key} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ backgroundColor: item.color }}/>
                <span>{item.label}</span>
              </div>))}
          </div>
        </div>) : null}
    </div>);
}
