import { Component, Fragment, createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ErrorInfo, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { ArrowDownRight, ArrowUpRight, Building2, ChevronDown, FileText, Globe2, Info, Landmark, Minus, Search, ShieldAlert, } from "lucide-react";
import PortfolioMap from "@demo/components/PortfolioMap";
import { bindChartGestures } from "@demo/lib/chartGestures";
import FundScatterChart from "@demo/components/fund-reporting/FundScatterChart";
import { Checkbox } from "@demo/components/ui/checkbox";
import { Input } from "@demo/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@demo/components/ui/popover";
import { ScrollArea, ScrollBar } from "@demo/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@demo/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@demo/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@demo/components/ui/tooltip";
import { formatCompactCurrency, formatCurrency, formatMaybePercent, formatMetricValue, formatMultiple, } from "@demo/lib/fund-reporting/format";
import { buildLocalPreviewFundScatterHistoryRows, } from "@demo/lib/fund-reporting/fundScatter";
import { getScatterYValueAtPointer, panScatterRange, scatterYRangesEqual, zoomScatterYRange, } from "@demo/lib/fund-reporting/holdingScatterZoom";
import type { InvestorPortalViewMode } from "@demo/lib/fund-reporting/portalView";
import { ReportingDataSourceContext, useReportingDataSource, type ReportingDataSource, } from "@demo/lib/fund-reporting/reportingDataSource";
import type { FundScatterPoint, ReportingBreakdownItem, ReportingFinancialSection, ReportingHolding, ReportingMetric, ReportingPackage, ReportingUnderlyingCompany, } from "@demo/lib/fund-reporting/types";
import { getCountryByName } from "@demo/lib/countries";
import { cn } from "@demo/lib/utils";
import { normalizeWebsiteUrl } from "@demo/lib/websiteValidation";
export const sectionLinks = [
    { id: "overview", label: "Overview" },
    { id: "portfolio", label: "Portfolio" },
    { id: "exposure", label: "Exposure" }
] as const;
const overviewMetricOrder = [
    "tvpi_to_investors",
    "net_asset_value",
    "net_irr",
    "dpi_to_investors",
    "rvpi_to_investors",
    "cumulative_paid_in_capital",
    "cumulative_distributions_to_fund",
    "total_commitments_to_fund",
    "total_commitment_available_for_drawdown",
    "fair_value_of_current_portfolio",
    "cash_borrowings_and_other_assets_liabilities",
    "residual_value",
    "distributed_to_investors",
    "paid_in_to_commitment_ratio",
    "gross_irr",
    "gross_multiple_to_cost",
    "carried_interest",
    "nav_before_accruals",
    "total_net_invested_in_portfolio_companies",
    "total_additional_commitment_to_portfolio_companies"
] as const;
const PORTAL_TOOLTIP_PANEL_CLASSNAME = "rounded-lg border border-black bg-[#F4F1EB] px-3.5 py-2 text-[13px] leading-relaxed tracking-normal text-black shadow-[0_10px_30px_rgba(0,0,0,0.12)]";
const glossaryDefinitionsByMetricKey: Record<string, string> = {
    tvpi_to_investors: "TVPI is total value to paid-in capital: residual value plus distributions divided by paid-in capital.",
    net_asset_value: "NAV is net asset value: total assets minus total liabilities at the reporting date.",
    net_irr: "Net IRR is the annualized internal rate of return to investors after fees, expenses, and carried interest, based on the timing of net cash flows.",
    dpi_to_investors: "DPI is distributions to paid-in capital: cash returned to investors divided by paid-in capital.",
    rvpi_to_investors: "RVPI is residual value to paid-in capital: unrealized value divided by paid-in capital.",
    gross_irr: "Gross IRR is the annualized internal rate of return before fund-level fees, expenses, and carried interest.",
    gross_multiple_to_cost: "Gross multiple to cost is total gross value divided by gross invested capital before fund-level fees and carry.",
    fair_value_of_current_portfolio: "Portfolio fair value is the current estimated value of the fund's active portfolio holdings under the valuation policy.",
    total_commitments_to_fund: "Total commitments is the aggregate capital investors have committed to the fund.",
    cumulative_paid_in_capital: "Cumulative paid-in capital is the total capital that has been called from investors to date.",
    paid_in_to_commitment_ratio: "% called is the share of total committed capital that has been drawn from investors.",
    total_net_invested_in_portfolio_companies: "Total net invested is the capital deployed into portfolio companies after realized proceeds, repayments, or offsets.",
    total_commitment_available_for_drawdown: "Available for drawdown is the remaining investor commitment that has not yet been called.",
    cumulative_distributions_to_fund: "Cumulative distributions to the fund is the total cash or stock proceeds returned from underlying investments to the fund.",
    distributed_to_investors: "Distributed to investors is the total capital and proceeds returned by the fund to LPs.",
    residual_value: "Residual value is the remaining unrealized value of the portfolio at the reporting date.",
    cash_borrowings_and_other_assets_liabilities: "Cash, borrowings, and other assets or liabilities is the balance-sheet adjustment that reconciles residual value to NAV.",
    carried_interest: "Carried interest is the GP's performance participation accrued or realized under the fund terms.",
    nav_before_accruals: "NAV before accruals is net asset value before deducting accrued items such as carry or other liabilities.",
    total_additional_commitment_to_portfolio_companies: "Additional commitment to portfolio companies is reserved or committed capital for follow-on portfolio investments that has not yet been deployed.",
    memo_fv_plus_cash_over_nav_before_accruals: "FV plus cash over NAV before accruals is a reconciliation memo comparing fair value plus cash balances against NAV before accruals.",
};
const portfolioSnapshotDefinitionsByLabel: Record<string, string> = {
    Positions: "Distinct portfolio positions currently represented in the fund, including fund positions and direct investment positions.",
    "Underlying companies": "Unique portfolio companies represented across the published portfolio, deduplicated so the same company is only counted once.",
    "Current unicorns": "Underlying portfolio companies with a reported post-money valuation of at least $1B.",
    "Above cost": "Underlying portfolio companies currently marked at or above cost on a MOIC basis, deduplicated at the company level.",
    "Average MOIC": "Average multiple on invested capital across portfolio companies with a reported MOIC value.",
};
const glossaryEntries = [
    {
        matchers: ["tvpi"],
        definition: "TVPI is total value to paid-in capital: residual value plus distributions divided by paid-in capital.",
    },
    {
        matchers: ["dpi"],
        definition: "DPI is distributions to paid-in capital: cash returned to investors divided by paid-in capital.",
    },
    {
        matchers: ["rvpi", "residual value"],
        definition: "RVPI is residual value to paid-in capital: unrealized value divided by paid-in capital.",
    },
    {
        matchers: ["irr"],
        definition: "IRR is the annualized internal rate of return implied by the timing of cash flows.",
    },
    {
        matchers: ["nav"],
        definition: "NAV is net asset value: total assets minus total liabilities at the reporting date.",
    },
    {
        matchers: ["paid-in capital"],
        definition: "Paid-in capital is the cumulative capital actually called from investors.",
    },
    {
        matchers: ["fair value"],
        definition: "Fair value is the current estimated value of a holding under the fund valuation policy.",
    },
    {
        matchers: ["drawdown", "drawn"],
        definition: "Drawdown is capital called from commitments and deployed into the fund or portfolio.",
    },
    {
        matchers: ["net invested"],
        definition: "Net invested is capital deployed into a position after returned proceeds or offsets.",
    },
    {
        matchers: ["called"],
        definition: "% called is the share of committed capital that has already been drawn from the position.",
    }
] as const;
const metricKeysWithDirectionalMeaning = new Set([
    "net_asset_value",
    "fair_value_of_current_portfolio",
    "net_irr",
    "gross_irr",
    "tvpi_to_investors",
    "gross_multiple_to_cost",
    "dpi_to_investors",
    "rvpi_to_investors",
    "residual_value"
]);
const EXPO_PLACEHOLDER = "—";
const EXPO_MASKED_METRIC_KEYS = new Set([
    "tvpi_to_investors",
    "net_asset_value",
    "net_irr",
    "dpi_to_investors",
    "rvpi_to_investors",
    "gross_irr",
    "gross_multiple_to_cost",
    "fair_value_of_current_portfolio",
    "total_commitments_to_fund",
    "cumulative_paid_in_capital",
    "paid_in_to_commitment_ratio",
    "total_net_invested_in_portfolio_companies",
    "total_commitment_available_for_drawdown",
    "cumulative_distributions_to_fund",
    "distributed_to_investors",
    "cash_borrowings_and_other_assets_liabilities",
    "residual_value",
    "carried_interest",
    "nav_before_accruals"
]);
const ReportingViewModeContext = createContext<InvestorPortalViewMode>("default");
export type SectionId = (typeof sectionLinks)[number]["id"];
type SleeveType = "fund_of_funds" | "direct_co_investment";
type HoldingScope = "all" | SleeveType;
type HoldingSortKey = "fair_value" | "tvpi" | "committed" | "drawdown" | "name";
type ExposureCompanySortKey = "alphabetical" | "vintage" | "fair_value" | "tvpi" | "moic";
const HOLDING_SCATTER_AXIS_GUTTER_WIDTH_PX = 62;
const HOLDING_SCATTER_AXIS_GUTTER_HEIGHT_PX = 52;
const HOLDING_SCATTER_PLOT_MARGINS = { l: 18, r: 18, t: 18, b: 18 } as const;
const HOLDING_SCATTER_DEFAULT_CENTER = { x: 4, y: 2 } as const;
const HOLDING_COMPANY_SCATTER_DEFAULT_Y_RANGE: HoldingScatterRange = [-2, 11];
const HOLDING_SCATTER_DIMMED_BUBBLE_OPACITY = 0.18;
const HOLDING_SCATTER_DIMMED_LINE_ALPHA = 0.24;
const HOLDING_SCATTER_DIMMED_TEXT_ALPHA = 0.34;
function sectionDomId(id: SectionId) {
    return `report-section-${id}`;
}
function clampNumber(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}
function formatShortDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}
function formatSignedCompactCurrency(value: number) {
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}${formatCompactCurrency(Math.abs(value))}`;
}
function useInvestorPortalViewMode() {
    return useContext(ReportingViewModeContext);
}
function useIsExpoView() {
    return useInvestorPortalViewMode() === "expo";
}
function useIsLpView() {
    return useInvestorPortalViewMode() === "lp";
}
function useShouldMaskUnderlyingCompanyMetrics() {
    const viewMode = useInvestorPortalViewMode();
    return viewMode === "expo" || viewMode === "lp";
}
function shouldMaskMetricInExpo(metricKey: string) {
    return EXPO_MASKED_METRIC_KEYS.has(metricKey);
}
function formatTextDisplay(value: string | null | undefined, options?: {
    mask?: boolean;
    fallback?: string;
}) {
    const { mask = false, fallback = EXPO_PLACEHOLDER } = options ?? {};
    if (mask)
        return EXPO_PLACEHOLDER;
    if (typeof value !== "string")
        return fallback;
    const trimmedValue = value.trim();
    return trimmedValue || fallback;
}
function formatCurrencyDisplay(value: number | null | undefined, options?: {
    mask?: boolean;
    compact?: boolean;
    signed?: boolean;
    fallback?: string;
}) {
    const { mask = false, compact = false, signed = false, fallback = EXPO_PLACEHOLDER } = options ?? {};
    if (mask)
        return EXPO_PLACEHOLDER;
    if (typeof value !== "number" || !Number.isFinite(value))
        return fallback;
    if (signed)
        return formatSignedCompactCurrency(value);
    return compact ? formatCompactCurrency(value) : formatCurrency(value);
}
function formatMultipleDisplay(value: number | null | undefined, options?: {
    mask?: boolean;
    fallback?: string;
}) {
    const { mask = false, fallback = EXPO_PLACEHOLDER } = options ?? {};
    if (mask)
        return EXPO_PLACEHOLDER;
    if (typeof value !== "number" || !Number.isFinite(value))
        return fallback;
    return formatMultiple(value);
}
function formatPercentDisplay(value: number | null | undefined, options?: {
    mask?: boolean;
    fallback?: string;
}) {
    const { mask = false, fallback = EXPO_PLACEHOLDER } = options ?? {};
    if (mask)
        return EXPO_PLACEHOLDER;
    return formatMaybePercent(value) || fallback;
}
function formatIntegerDisplay(value: number | null | undefined, options?: {
    mask?: boolean;
    fallback?: string;
}) {
    const { mask = false, fallback = EXPO_PLACEHOLDER } = options ?? {};
    if (mask)
        return EXPO_PLACEHOLDER;
    if (typeof value !== "number" || !Number.isFinite(value))
        return fallback;
    return value.toLocaleString("en-GB");
}
function formatOwnershipDisplay(value: number | string | null | undefined, options?: {
    mask?: boolean;
    fallback?: string;
}) {
    const { mask = false, fallback = EXPO_PLACEHOLDER } = options ?? {};
    if (mask)
        return EXPO_PLACEHOLDER;
    return formatOwnershipPct(value) ?? fallback;
}
function formatDateDisplay(value: string | null | undefined, options?: {
    mask?: boolean;
    fallback?: string;
}) {
    const { mask = false, fallback = EXPO_PLACEHOLDER } = options ?? {};
    if (mask)
        return EXPO_PLACEHOLDER;
    if (!value)
        return fallback;
    return formatShortDate(value);
}
function formatMetricValueForView(metric: ReportingMetric, viewMode: InvestorPortalViewMode, target: "current" | "comparison" = "current") {
    if (viewMode === "expo" && shouldMaskMetricInExpo(metric.metric_key)) {
        return EXPO_PLACEHOLDER;
    }
    const value = target === "comparison" ? metric.comparison_value : metric.value;
    return formatMetricValue(value, metric.value_type);
}
function formatMetricDeltaForView(metric: ReportingMetric, viewMode: InvestorPortalViewMode) {
    if (viewMode === "expo" && shouldMaskMetricInExpo(metric.metric_key)) {
        return EXPO_PLACEHOLDER;
    }
    return formatMetricDelta(metric) ?? EXPO_PLACEHOLDER;
}
function getMetricDeltaToneForView(metric: ReportingMetric, viewMode: InvestorPortalViewMode) {
    if (viewMode === "expo" && shouldMaskMetricInExpo(metric.metric_key)) {
        return "neutral" as const;
    }
    return getMetricDeltaTone(metric);
}
function formatMetricDelta(metric: ReportingMetric) {
    if (typeof metric.value !== "number" || typeof metric.comparison_value !== "number") {
        return null;
    }
    const delta = metric.value - metric.comparison_value;
    switch (metric.value_type) {
        case "currency":
            return formatSignedCompactCurrency(delta);
        case "percent":
            return `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${Math.abs(delta * 100).toFixed(1)} pts`;
        case "multiple":
            return `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${Math.abs(delta).toFixed(2)}x`;
        case "integer":
            return `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${Math.abs(delta).toFixed(0)}`;
        default:
            return `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${Math.abs(delta).toFixed(2)}`;
    }
}
function getMetricDeltaTone(metric: ReportingMetric) {
    if (typeof metric.value !== "number" ||
        typeof metric.comparison_value !== "number" ||
        !metricKeysWithDirectionalMeaning.has(metric.metric_key)) {
        return "neutral" as const;
    }
    if (metric.value > metric.comparison_value)
        return "positive" as const;
    if (metric.value < metric.comparison_value)
        return "negative" as const;
    return "neutral" as const;
}
function getDeltaIcon(tone: "positive" | "negative" | "neutral") {
    if (tone === "positive")
        return ArrowUpRight;
    if (tone === "negative")
        return ArrowDownRight;
    return Minus;
}
function formatHoldingScopeLabel(value: HoldingScope) {
    switch (value) {
        case "all":
            return "All";
        case "fund_of_funds":
            return "FoF";
        case "direct_co_investment":
            return "Direct";
    }
}
function formatHoldingSortLabel(value: HoldingSortKey) {
    switch (value) {
        case "tvpi":
            return "TVPI";
        case "committed":
            return "Committed";
        case "drawdown":
            return "Drawdown";
        case "name":
            return "Name";
        case "fair_value":
        default:
            return "Fair value";
    }
}
function formatExposureCompanySortLabel(value: ExposureCompanySortKey) {
    switch (value) {
        case "vintage":
            return "Vintage";
        case "fair_value":
            return "Fair value";
        case "tvpi":
            return "TVPI";
        case "moic":
            return "MOIC";
        case "alphabetical":
        default:
            return "Alphabetical";
    }
}
function compareOptionalNumberDescending(left: number | null | undefined, right: number | null | undefined) {
    const safeLeft = typeof left === "number" && Number.isFinite(left) ? left : Number.NEGATIVE_INFINITY;
    const safeRight = typeof right === "number" && Number.isFinite(right) ? right : Number.NEGATIVE_INFINITY;
    return safeRight - safeLeft;
}
function comparePriorityNames(left: string | null | undefined, right: string | null | undefined, priorityNames: string[] = []) {
    const getRank = (value: string | null | undefined) => {
        const normalized = value?.trim().toLowerCase() ?? "";
        const index = priorityNames.findIndex((priority) => normalized.includes(priority.toLowerCase()));
        return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    const rankDifference = getRank(left) - getRank(right);
    return rankDifference || (left ?? "").localeCompare(right ?? "", "en");
}
function compareCompanyNames(left: ReportingUnderlyingCompany, right: ReportingUnderlyingCompany, priorityNames: string[] = []) {
    return comparePriorityNames(left.company_name, right.company_name, priorityNames);
}
function getCompanyTvpiFromHoldings(company: ReportingUnderlyingCompany, holdingsByAssetCode: Map<string, ReportingHolding>) {
    const assetCode = company.linked_portfolio_holding_asset_code?.trim();
    if (!assetCode)
        return null;
    return holdingsByAssetCode.get(assetCode)?.tvpi ?? null;
}
function sortExposureCompanies(companies: ReportingUnderlyingCompany[], sortKey: ExposureCompanySortKey, holdingsByAssetCode: Map<string, ReportingHolding>, priorityNames: string[] = []) {
    return [...companies].sort((left, right) => {
        const priorityDifference = comparePriorityNames(left.company_name, right.company_name, priorityNames);
        const leftIsPriority = priorityNames.some((priority) => (left.company_name ?? "").toLowerCase().includes(priority.toLowerCase()));
        const rightIsPriority = priorityNames.some((priority) => (right.company_name ?? "").toLowerCase().includes(priority.toLowerCase()));
        if (leftIsPriority || rightIsPriority)
            return priorityDifference;
        switch (sortKey) {
            case "vintage": {
                const diff = compareOptionalNumberDescending(left.linked_fund_vintage_year, right.linked_fund_vintage_year);
                return diff !== 0 ? diff : compareCompanyNames(left, right, priorityNames);
            }
            case "fair_value": {
                const diff = compareOptionalNumberDescending(left.fair_value_eur, right.fair_value_eur);
                return diff !== 0 ? diff : compareCompanyNames(left, right, priorityNames);
            }
            case "tvpi": {
                const diff = compareOptionalNumberDescending(getCompanyTvpiFromHoldings(left, holdingsByAssetCode), getCompanyTvpiFromHoldings(right, holdingsByAssetCode));
                return diff !== 0 ? diff : compareCompanyNames(left, right, priorityNames);
            }
            case "moic": {
                const diff = compareOptionalNumberDescending(left.moic, right.moic);
                return diff !== 0 ? diff : compareCompanyNames(left, right, priorityNames);
            }
            case "alphabetical":
            default:
                return compareCompanyNames(left, right, priorityNames);
        }
    });
}
function getGlossaryDefinition(label: string, metricKey?: string | null) {
    if (metricKey && glossaryDefinitionsByMetricKey[metricKey]) {
        return glossaryDefinitionsByMetricKey[metricKey];
    }
    const lowered = label.toLowerCase();
    return glossaryEntries.find((entry) => entry.matchers.some((matcher) => lowered.includes(matcher)))?.definition ?? null;
}
const METRIC_LABEL_OVERRIDES: Record<string, string> = {
    net_asset_value: "NAV",
    tvpi_to_investors: "TVPI",
    dpi_to_investors: "DPI",
    rvpi_to_investors: "RVPI",
    fair_value_of_current_portfolio: "Portfolio Fair Value",
};
function findMetric(metrics: ReportingMetric[], ...keys: string[]) {
    const keySet = new Set(keys);
    return metrics.find((metric) => keySet.has(metric.metric_key)) ?? null;
}
function LabelWithTooltip({ label, metricKey, className, extraContent, }: {
    label: string;
    metricKey?: string | null;
    className?: string;
    extraContent?: string | null;
}) {
    const definition = getGlossaryDefinition(label, metricKey);
    const tooltipContent = [definition, extraContent].filter(Boolean).join(" · ");
    if (!tooltipContent) {
        return <span className={className}>{label}</span>;
    }
    return (<Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("cursor-help", className)}>{label}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className={cn(PORTAL_TOOLTIP_PANEL_CLASSNAME, "max-w-[220px] normal-case")}>
        {tooltipContent}
      </TooltipContent>
    </Tooltip>);
}
const KPI_GROUPS: {
    label: string;
    keys: string[];
}[] = [
    {
        label: "Performance",
        keys: [
            "tvpi_to_investors",
            "net_asset_value",
            "net_irr",
            "dpi_to_investors",
            "rvpi_to_investors",
            "gross_irr",
            "gross_multiple_to_cost",
            "fair_value_of_current_portfolio"
        ],
    },
    {
        label: "Capital Account",
        keys: [
            "total_commitments_to_fund",
            "cumulative_paid_in_capital",
            "paid_in_to_commitment_ratio",
            "total_net_invested_in_portfolio_companies",
            "total_commitment_available_for_drawdown",
            "cumulative_distributions_to_fund",
            "distributed_to_investors"
        ],
    }
];
function AllMetricsTable({ metrics }: {
    metrics: ReportingMetric[];
}) {
    const viewMode = useInvestorPortalViewMode();
    const byKey = new Map(metrics.map((m) => [m.metric_key, m]));
    let renderedGroupCount = 0;
    return (<div>
      {KPI_GROUPS.map((group) => {
            const rows = group.keys.map((k) => byKey.get(k)).filter((m): m is ReportingMetric => !!m);
            if (rows.length === 0)
                return null;
            const isFirst = renderedGroupCount++ === 0;
            return (<div key={group.label} className={cn(!isFirst && "mt-10 border-t-2 border-black/10 pt-8")}>
            <div className="mb-2.5 flex items-center gap-2.5">
              <div className="h-[14px] w-[3px] flex-none rounded-full bg-[#3D0028]/60"/>
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-charcoal">{group.label}</div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[260px]">Metric</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="min-w-[160px] text-right">Previous Quarter</TableHead>
                  <TableHead className="min-w-[120px] text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((metric) => (<TableRow key={metric.metric_key}>
                    <TableCell className="whitespace-normal">
                      <div className="font-medium text-charcoal">
                        <LabelWithTooltip label={metric.label} metricKey={metric.metric_key}/>
                      </div>
                      {metric.note ? <div className="mt-1 text-sm text-charcoal/56">{metric.note}</div> : null}
                    </TableCell>
                    <TableCell className="text-right font-medium text-charcoal">
                      {formatMetricValueForView(metric, viewMode)}
                    </TableCell>
                    <TableCell className="text-right text-charcoal/60">
                      {metric.comparison_value != null ? formatMetricValueForView(metric, viewMode, "comparison") : EXPO_PLACEHOLDER}
                    </TableCell>
                    <TableCell className="text-right text-charcoal/60">{formatMetricDeltaForView(metric, viewMode)}</TableCell>
                  </TableRow>))}
              </TableBody>
            </Table>
          </div>);
        })}
    </div>);
}
function BreakdownExplorer({ title, description, items, selectedKey, onSelect, defaultVisibleCount, expandLabel, flushList, barColor = "#3D0028", companyRows = [], companyBucketResolver, detailEyebrow = "Selected region", detailExpandLabel = "companies", detailPanelClassName, hideTitle = false, holdingRows = [], }: {
    title: string;
    description: string;
    items: ReportingBreakdownItem[];
    selectedKey: string;
    onSelect: (bucketKey: string) => void;
    defaultVisibleCount?: number;
    expandLabel?: string;
    flushList?: boolean;
    barColor?: string;
    companyRows?: ReportingUnderlyingCompany[];
    companyBucketResolver?: (company: ReportingUnderlyingCompany) => string | null;
    detailEyebrow?: string;
    detailExpandLabel?: string;
    detailPanelClassName?: string;
    hideTitle?: boolean;
    holdingRows?: ReportingHolding[];
}) {
    const reportingDataSource = useReportingDataSource();
    const priorityCompanyNames = reportingDataSource.priorityCompanyNames;
    const [showAll, setShowAll] = useState(false);
    const [showAllCompanies, setShowAllCompanies] = useState(false);
    const [selectedCompanyKey, setSelectedCompanyKey] = useState<string | null>(null);
    const [companySort, setCompanySort] = useState<ExposureCompanySortKey>("alphabetical");
    const validItems = items
        .filter((item) => item.bucket_key !== "total" && item.exposure_eur > 0)
        .sort((a, b) => b.exposure_eur - a.exposure_eur);
    const visibleItems = defaultVisibleCount && !showAll
        ? validItems.slice(0, defaultVisibleCount)
        : validItems;
    const totalExposure = validItems.reduce((sum, item) => sum + item.exposure_eur, 0);
    const maxExposure = validItems[0]?.exposure_eur ?? 1;
    const selectedItem = validItems.find((item) => item.bucket_key === selectedKey) ?? validItems[0];
    const resolvedDetailEyebrow = detailEyebrow ??
        (title.toLowerCase().includes("industry") ? "Selected industry" : "Selected region");
    const fullCompanyListDomId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-full-company-list`;
    const selectedCompanies = useMemo(() => {
        if (!selectedItem || !companyBucketResolver || companyRows.length === 0)
            return [];
        const bestByKey = new Map<string, ReportingUnderlyingCompany>();
        const matches = companyRows.filter((company) => companyBucketResolver(company) === selectedItem.label);
        for (const company of matches) {
            const key = company.company_id || company.company_name || "";
            if (!key)
                continue;
            const existing = bestByKey.get(key);
            if (!existing) {
                bestByKey.set(key, company);
                continue;
            }
            const existingPostMoney = existing.post_money_eur_current ?? -1;
            const companyPostMoney = company.post_money_eur_current ?? -1;
            if (companyPostMoney > existingPostMoney) {
                bestByKey.set(key, company);
            }
        }
        return [...bestByKey.values()].sort((a, b) => {
            const priorityDifference = comparePriorityNames(a.company_name, b.company_name, priorityCompanyNames);
            const hasPriority = priorityCompanyNames.some((priority) => [a.company_name, b.company_name].some((name) => (name ?? "").toLowerCase().includes(priority.toLowerCase())));
            if (hasPriority)
                return priorityDifference;
            const postMoneyDiff = (b.post_money_eur_current ?? -1) - (a.post_money_eur_current ?? -1);
            if (postMoneyDiff !== 0)
                return postMoneyDiff;
            return (a.company_name ?? "").localeCompare(b.company_name ?? "", "en");
        });
    }, [companyBucketResolver, companyRows, priorityCompanyNames, selectedItem]);
    const companyRowsByKey = useMemo(() => buildUnderlyingCompanyRowsByKey(companyRows), [companyRows]);
    const holdingsByAssetCode = useMemo(() => new Map(holdingRows
        .filter((holding) => holding.asset_code)
        .map((holding) => [holding.asset_code, holding] as const)), [holdingRows]);
    const sortedSelectedCompanies = useMemo(() => sortExposureCompanies(selectedCompanies, companySort, holdingsByAssetCode, priorityCompanyNames), [companySort, holdingsByAssetCode, priorityCompanyNames, selectedCompanies]);
    const selectedCompanyDetail = useMemo(() => {
        if (!selectedCompanyKey)
            return null;
        const detailRows = companyRowsByKey.get(selectedCompanyKey);
        if (!detailRows || detailRows.length === 0)
            return null;
        return {
            company: detailRows[0]!,
            companyRows: detailRows,
        };
    }, [companyRowsByKey, selectedCompanyKey]);
    const previewCompanies = selectedCompanies.slice(0, 8);
    useEffect(() => {
        setShowAllCompanies(false);
        setSelectedCompanyKey(null);
        setCompanySort("alphabetical");
    }, [selectedItem?.bucket_key]);
    useEffect(() => {
        if (!showAllCompanies || selectedCompanies.length === 0)
            return;
        const scrollToList = () => {
            document.getElementById(fullCompanyListDomId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        };
        if (typeof window !== "undefined") {
            const frame = window.requestAnimationFrame(scrollToList);
            return () => window.cancelAnimationFrame(frame);
        }
        else {
            scrollToList();
        }
    }, [fullCompanyListDomId, selectedCompanies.length, showAllCompanies]);
    return (<div className="space-y-0">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_0.5fr] xl:items-start">
      {/* Ranked list */}
      <div className={cn("px-5 py-5", flushList
            ? "bg-transparent"
            : "rounded-[28px] border border-[#3D0028]/10 bg-[#fdfafd] shadow-[0_20px_60px_rgba(16,18,20,0.06)]")}>
        <div className={cn("mb-5 space-y-1.5", hideTitle && "mb-3")}>
          {!hideTitle ? <h3 className="font-reporting text-2xl font-semibold text-charcoal">{title}</h3> : null}
          <p className="text-sm text-charcoal/58">{description}</p>
        </div>
        {/* Column headers */}
        <div className="mb-1 flex items-center gap-3 px-3 text-[10px] uppercase tracking-[0.14em] text-charcoal/35">
          <div className="w-[110px] shrink-0">Region</div>
          <div className="flex-1"/>
          <div className="w-[62px] shrink-0 text-right">Exposure</div>
          <div className="w-[38px] shrink-0 text-right">Share</div>
          <div className="w-[80px] shrink-0 text-right">Companies</div>
        </div>
        <div className="space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = item.bucket_key === selectedKey;
            const barPct = (item.exposure_eur / maxExposure) * 100;
            const sharePct = totalExposure ? (item.exposure_eur / totalExposure) * 100 : 0;
            const hasCompanyData = item.company_count > 0;
            return (<button key={item.bucket_key} type="button" onClick={() => onSelect(item.bucket_key)} className={cn("group w-full rounded-xl px-3 py-2.5 text-left transition-colors", isActive ? "bg-[#3D0028]/6" : "hover:bg-black/4")}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-[110px] shrink-0 text-sm font-medium", isActive ? "text-[#3D0028]" : "text-charcoal")}>
                    {item.label}
                  </div>
                  <div className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-black/6">
                    <div className="h-full rounded-full transition-all duration-500" style={{ backgroundColor: isActive ? barColor : `${barColor}99`, width: `${barPct}%` }}/>
                  </div>
                  <div className="w-[62px] shrink-0 text-right text-sm font-semibold text-charcoal">
                    {formatCompactCurrency(item.exposure_eur)}
                  </div>
                  <div className="w-[38px] shrink-0 text-right text-xs text-charcoal/48">
                    {formatFixedPercent(sharePct)}%
                  </div>
                  <div className="w-[80px] shrink-0 text-right text-xs text-charcoal/48">
                    {hasCompanyData ? `${item.company_count.toLocaleString("en-GB")} co.` : <span className="text-amber-500/80">—</span>}
                  </div>
                </div>
              </button>);
        })}
        </div>
        {defaultVisibleCount && validItems.length > defaultVisibleCount ? (<button type="button" onClick={() => setShowAll((value) => !value)} className="mt-4 text-xs text-[#3D0028]/55 transition-colors hover:text-[#3D0028]">
            {showAll
                ? `Show top ${defaultVisibleCount} only`
                : `View all ${validItems.length} ${expandLabel ?? "exposures"}`}
          </button>) : null}
      </div>

      {/* Selected region detail */}
      {selectedItem && (<div className={cn("self-start rounded-[28px] bg-[#3D0028] p-6 text-white shadow-[0_24px_70px_rgba(61,0,40,0.18)]", detailPanelClassName)}>
          <div className={cn("text-[11px] uppercase tracking-[0.18em]", resolvedDetailEyebrow.toLowerCase() === "selected industry" ? "text-[#D886FF]" : "text-white/55")}>
            {resolvedDetailEyebrow}
          </div>
          <div className={cn("mt-2 font-reporting font-semibold leading-tight text-[#D886FF]", resolvedDetailEyebrow.toLowerCase() === "selected industry" ? "text-2xl" : "text-[1.9rem]")}>
            {selectedItem.label}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-4 border-t border-white/12 pt-4">
            <div className="min-w-[110px]">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/55">Exposure</div>
              <div className="mt-1.5 text-[1.02rem] font-medium text-white">{formatCurrency(selectedItem.exposure_eur)}</div>
            </div>
            <div className="min-w-[80px]">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/55">Share</div>
              <div className="mt-1.5 text-[1.02rem] font-medium text-white">
                {totalExposure ? formatFixedPercent((selectedItem.exposure_eur / totalExposure) * 100) : "0.0"}%
              </div>
            </div>
            <div className="min-w-[120px]">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/55">Reported companies</div>
              <div className="mt-1.5 text-[1.02rem] font-medium text-white">
                {selectedItem.company_count > 0
                ? selectedItem.company_count.toLocaleString("en-GB")
                : <span className="text-white/40 text-sm">Not available</span>}
              </div>
            </div>
          </div>
          {selectedCompanies.length > 0 && (<div className="mt-5 border-t border-white/12 pt-4">
              <div className="flex flex-wrap gap-2">
                {previewCompanies.map((company, index) => (<span key={`preview-${company.company_id ?? company.company_name ?? index}`} className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium leading-none text-white/92">
                    {company.company_name ?? "Unknown"}
                  </span>))}
              </div>
              {selectedCompanies.length > previewCompanies.length && (<button type="button" onClick={() => setShowAllCompanies(true)} className="mt-4 text-xs text-[#D886FF] transition-colors hover:text-white">
                  View all {selectedCompanies.length} {detailExpandLabel}
                </button>)}
            </div>)}
        </div>)}
      </div>

      {selectedItem && showAllCompanies && selectedCompanies.length > 0 && (<div className="space-y-4">
          <div id={fullCompanyListDomId} className="rounded-[24px] border border-black/8 bg-white/60 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3D0028]/70">
                {selectedItem.label} companies
              </div>
              <div className="flex items-center gap-3">
                <Select value={companySort} onValueChange={(value) => setCompanySort(value as ExposureCompanySortKey)}>
                  <SelectTrigger aria-label={`Sort companies: ${formatExposureCompanySortLabel(companySort)}`} className="h-7 w-auto gap-2 rounded-[10px] border-0 bg-transparent px-2.5 text-[11px] font-medium text-[#D886FF] shadow-none ring-0 hover:bg-[#3D0028]/[0.04] hover:text-[#D886FF] focus:ring-0 focus:ring-offset-0">
                    <span>Sort: {formatExposureCompanySortLabel(companySort)}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alphabetical" className="text-xs">Alphabetical</SelectItem>
                    <SelectItem value="vintage" className="text-xs">Vintage</SelectItem>
                    <SelectItem value="fair_value" className="text-xs">Fair value</SelectItem>
                    <SelectItem value="tvpi" className="text-xs">TVPI</SelectItem>
                    <SelectItem value="moic" className="text-xs">MOIC</SelectItem>
                  </SelectContent>
                </Select>
                <button type="button" onClick={() => {
                setShowAllCompanies(false);
                setSelectedCompanyKey(null);
            }} className="text-xs text-[#3D0028]/55 transition-colors hover:text-[#3D0028]">
                  Collapse
                </button>
              </div>
            </div>
            <div className="mt-4 max-h-[260px] overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
              {sortedSelectedCompanies.map((company, index) => {
                const companyKey = getUnderlyingCompanySelectionKey(company);
                const isSelected = companyKey != null && companyKey === selectedCompanyKey;
                return (<button key={`expanded-${company.company_id ?? company.company_name ?? index}`} type="button" onClick={() => setSelectedCompanyKey((current) => (current === companyKey ? null : companyKey))} className={isSelected
                        ? "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none text-black transition-colors"
                        : "inline-flex items-center rounded-full border bg-white px-2.5 py-1 text-[11px] font-medium leading-none text-charcoal/82 transition-colors hover:border-[#3D0028]/18 hover:text-[#3D0028]"} style={isSelected
                        ? {
                            backgroundColor: "rgba(216, 134, 255, 0.34)",
                            borderColor: "rgba(216, 134, 255, 0.5)",
                            color: "#000000",
                        }
                        : undefined}>
                    {company.company_name ?? "Unknown"}
                  </button>);
            })}
              </div>
            </div>
          </div>

          {selectedCompanyDetail ? (<div className="overflow-hidden">
              <div className="ml-5 border-l border-black/45">
                <UnderlyingCompanyExpandPanel company={selectedCompanyDetail.company} companyRows={selectedCompanyDetail.companyRows} showTopBorder={false}/>
              </div>
            </div>) : null}
        </div>)}
    </div>);
}
function HeroMetricInline({ metric }: {
    metric: ReportingMetric;
}) {
    const viewMode = useInvestorPortalViewMode();
    const displayLabel = METRIC_LABEL_OVERRIDES[metric.metric_key] ?? metric.label;
    const delta = formatMetricDeltaForView(metric, viewMode);
    const tone = getMetricDeltaToneForView(metric, viewMode);
    const DeltaIcon = delta !== EXPO_PLACEHOLDER ? getDeltaIcon(tone) : null;
    return (<div>
      <div className="min-h-[2.2rem]">
        <LabelWithTooltip label={displayLabel} metricKey={metric.metric_key} extraContent={metric.note ?? null} className="text-[13px] font-medium uppercase tracking-[0.18em] text-charcoal/42 md:text-[15px]"/>
      </div>
      <div className="mt-2 font-reporting text-[clamp(20px,6vw,28px)] font-semibold leading-none text-charcoal">
        {formatMetricValueForView(metric, viewMode)}
      </div>
      {metric.comparison_value != null && (<div className="mt-5 text-sm text-charcoal/42">
          Prev. quarter: {formatMetricValueForView(metric, viewMode, "comparison")}
        </div>)}
      {DeltaIcon && (<div className={cn("mt-1 flex items-center gap-0.5 text-xs font-semibold", tone === "positive" && "text-emerald-700", tone === "negative" && "text-rose-700", tone === "neutral" && "text-charcoal/42")}>
          <DeltaIcon className="h-3 w-3"/>{delta} vs prior quarter
        </div>)}
    </div>);
}
function CompactBridge({ startRow, endRow, movementRows, }: {
    startRow: ReportingFinancialRow | null;
    endRow: ReportingFinancialRow | null;
    movementRows: ReportingFinancialRow[];
}) {
    const isExpoView = useIsExpoView();
    if (!startRow && !endRow && movementRows.length === 0) {
        return (<div className="rounded-[20px] border border-dashed border-[#3D0028]/14 bg-[#faf3ff] p-5 text-sm text-charcoal/60">
        NAV bridge not yet published.
      </div>);
    }
    const startValue = typeof startRow?.values.amount === "number" ? startRow.values.amount : null;
    const endValue = typeof endRow?.values.amount === "number" ? endRow.values.amount : null;
    return (<div>
      {startRow && startValue !== null && (<div className="flex items-center justify-between gap-4 border-b border-black/8 py-3.5">
          <span className="text-sm text-charcoal/60">{startRow.label}</span>
          <span className="font-medium text-charcoal">{formatCurrencyDisplay(startValue, { compact: true, mask: isExpoView })}</span>
        </div>)}
      {movementRows.map((row) => {
            const amount = typeof row.values.amount === "number" ? row.values.amount : null;
            const isPositive = amount !== null && amount > 0;
            const isNegative = amount !== null && amount < 0;
            return (<div key={row.row_key} className="flex items-center justify-between gap-4 border-b border-black/8 py-3">
            <span className="pl-4 text-sm text-charcoal/60">{row.label}</span>
            <span className={cn("text-sm font-medium", isPositive && "text-emerald-700", isNegative && "text-rose-700", !isPositive && !isNegative && "text-charcoal/60")}>
              {amount !== null ? formatCurrencyDisplay(amount, { mask: isExpoView, signed: true }) : EXPO_PLACEHOLDER}
            </span>
          </div>);
        })}
      {endRow && endValue !== null && (<div className="flex items-center justify-between gap-4 py-3.5">
          <span className="text-sm font-medium text-charcoal">{endRow.label}</span>
          <span className="font-reporting text-lg font-semibold text-charcoal">{formatCurrencyDisplay(endValue, { compact: true, mask: isExpoView })}</span>
        </div>)}
    </div>);
}
type ReportingFinancialRow = ReportingFinancialSection["rows"][number];
function OverviewContent({ heroMetrics, bridgeStartRow, bridgeEndRow, bridgeMovementRows, allMetrics, heroMetricsWrapperRef, }: {
    reportPackage: ReportingPackage;
    heroMetrics: ReportingMetric[];
    fofStrategy: ReportingPackage["strategy_summary"][number] | null;
    directStrategy: ReportingPackage["strategy_summary"][number] | null;
    bridgeStartRow: ReportingFinancialRow | null;
    bridgeEndRow: ReportingFinancialRow | null;
    bridgeMovementRows: ReportingFinancialRow[];
    navBridgeSection: ReportingFinancialSection | null;
    bridgeMetrics: ReportingMetric[];
    returnsMetrics: ReportingMetric[];
    fundValueMetrics: ReportingMetric[];
    capitalMetrics: ReportingMetric[];
    allMetrics: ReportingMetric[];
    quarterLabel: string;
    strategyItems: ReportingPackage["strategy_summary"];
    heroMetricsWrapperRef?: RefObject<HTMLDivElement | null>;
}) {
    return (<div className="space-y-0">
      {/* Section 0: Headline metrics — each expands inline below */}
      <div className="space-y-2">
        <div ref={heroMetricsWrapperRef} className={cn("relative pt-4 pb-5 transition-transform duration-200 ease-out")} style={undefined}>
          {null}
          {heroMetrics.length > 0 ? (<div className="grid grid-cols-2 gap-x-10 gap-y-7 md:grid-cols-4">
              {heroMetrics.map((metric) => (<HeroMetricInline key={metric.metric_key} metric={metric}/>))}
            </div>) : (<div className="rounded-[22px] border border-dashed border-black/10 bg-white/52 px-5 py-6 text-sm leading-relaxed text-charcoal/56">
              Overview KPIs are not published in this fund-quarter package yet.
            </div>)}
        </div>
        <div className="pb-1">
          <DrilldownPanel value="kpi-list" title="View full KPI list">
            {allMetrics.length > 0 ? (<AllMetricsTable metrics={allMetrics}/>) : (<div className="rounded-[22px] border border-dashed border-black/10 bg-white/52 px-5 py-6 text-sm leading-relaxed text-charcoal/56">
                The full KPI list is not published in this fund-quarter package yet.
              </div>)}
          </DrilldownPanel>
        </div>
      </div>

      {/* Section 2: Compact bridge */}
      <div className="space-y-4 border-t border-black/10 pt-6">
        <div>
          <div className="font-reporting text-2xl font-semibold leading-tight text-charcoal">
            Quarter movement
          </div>
        </div>
        <CompactBridge startRow={bridgeStartRow} endRow={bridgeEndRow} movementRows={bridgeMovementRows}/>
      </div>

    </div>);
}
function StrategyCard({ strategy, title, }: {
    strategy: ReportingPackage["strategy_summary"][number];
    title?: string;
}) {
    const isExpoView = useIsExpoView();
    const sleeve = title ?? (strategy.strategy_key === "fund_of_funds" ? "Fund of Funds" : "Direct Investment");
    return (<div className="flex flex-col gap-4 py-1 pl-4">
      <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#3D0028]/60">{sleeve}</div>
      <div className="grid w-fit grid-cols-[auto_auto] items-baseline gap-x-6 gap-y-3 pl-3">
        <span className="text-sm text-charcoal">TVPI</span>
        <span className="text-base font-semibold text-charcoal">{formatMultipleDisplay(strategy.tvpi, { mask: isExpoView })}</span>

        <span className="text-sm text-charcoal/48">DPI</span>
        <span className="text-base font-medium text-charcoal/66">{formatMultipleDisplay(strategy.dpi, { mask: isExpoView })}</span>

        <span className="text-sm text-charcoal/48">RVPI</span>
        <span className="text-base font-medium text-charcoal/66">{formatMultipleDisplay(strategy.rvpi, { mask: isExpoView })}</span>

        <span className="pt-2.5 text-sm text-charcoal">Fair Value</span>
        <span className="border-t border-black/6 pt-2.5 text-base font-medium text-charcoal">
          {formatCurrencyDisplay(strategy.fair_value_eur, { compact: true, mask: isExpoView })}
        </span>
      </div>
    </div>);
}
function DrilldownPanel({ title, openTitle, defaultOpen = false, children, }: {
    value?: string;
    title: string;
    openTitle?: string;
    defaultOpen?: boolean;
    summary?: string;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (<div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 text-sm text-charcoal/48 transition-colors hover:text-charcoal">
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}/>
        {open ? openTitle ?? title : title}
      </button>
      {open && <div className="mt-8">{children}</div>}
    </div>);
}
function MultiSelectFilter({ label, allLabel, options, selected, onChange, }: {
    label: string;
    allLabel: string;
    options: string[];
    selected: string[];
    onChange: (values: string[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const triggerLabel = selected.length === 0
        ? allLabel
        : selected.length === 1
            ? `${label}: ${selected[0]}`
            : `${label}: ${selected.length} selected`;
    const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    return (<Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="text-xs font-medium text-charcoal/58 transition-colors hover:text-charcoal/80">
          {triggerLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="space-y-0.5">
          {options.map((option) => (<label key={option} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-xs hover:bg-black/4">
              <Checkbox checked={selected.includes(option)} onCheckedChange={() => toggle(option)} className="h-3.5 w-3.5 shrink-0"/>
              <span>{option}</span>
            </label>))}
        </div>
        {selected.length > 0 && (<button type="button" onClick={() => onChange([])} className="mt-2 w-full text-center text-[10px] text-charcoal/40 hover:text-charcoal/60">
            Clear all
          </button>)}
      </PopoverContent>
    </Popover>);
}
function getExplorerMetricCols(_showDrawdown = false) {
    return [
        { label: "Fund / company", width: "minmax(240px, 2.4fr)", align: "left" as const },
        { label: "Committed", width: "minmax(112px, 0.78fr)", align: "right" as const },
        ...([]),
        { label: "Fair value", width: "minmax(112px, 0.74fr)", align: "right" as const },
        { label: "Value created", width: "minmax(124px, 0.8fr)", align: "right" as const },
        { label: "TVPI", width: "minmax(88px, 0.54fr)", align: "right" as const },
        { label: "Companies", width: "minmax(84px, 0.48fr)", align: "right" as const }
    ] as const;
}
function getExplorerGridTemplate(showDrawdown = false) {
    return getExplorerMetricCols(showDrawdown)
        .map((column) => column.width)
        .join(" ");
}
function getExplorerOpenGridTemplate(showDrawdown = false) {
    return `minmax(0,1fr) ${new Array(getExplorerMetricCols(showDrawdown).length - 1).fill("0px").join(" ")}`;
}
const TOP_VALUE_DRIVER_METRIC_COLS = [
    { label: "", width: "28px", align: "left" as const },
    { label: "Company", width: "minmax(0, 2.35fr)", align: "left" as const },
    { label: "Sector", width: "minmax(0, 1.45fr)", align: "left" as const },
    { label: "Country", width: "minmax(0, 0.95fr)", align: "left" as const },
    { label: "Stage", width: "minmax(0, 0.85fr)", align: "left" as const },
    { label: "Fair value", width: "minmax(0, 0.92fr)", align: "right" as const },
    { label: "MOIC", width: "minmax(0, 0.72fr)", align: "right" as const },
    { label: "Post-money", width: "minmax(0, 0.96fr)", align: "right" as const }
] as const;
const TOP_VALUE_DRIVER_GRID_TEMPLATE = TOP_VALUE_DRIVER_METRIC_COLS.map((column) => column.width).join(" ");
const TOP_VALUE_DRIVER_OPEN_GRID_TEMPLATE = "28px 0px 0px 0px 0px 0px 0px 0px";
type AboveCostMetric = NonNullable<import("@demo/lib/fund-reporting/types").ReportingPackage["above_cost_metric"]>;
function HoldingsDetailExplorer({ holdings, underlyingCompanies, aboveCostMetric, reportPeriod, fundCodeLabel, aldeaFundCode, localPreviewScatterRows, disableExpansion = false, showDrawdown = false }: {
    holdings: ReportingHolding[];
    underlyingCompanies: ReportingUnderlyingCompany[];
    aboveCostMetric?: AboveCostMetric | null;
    reportPeriod: string;
    fundCodeLabel: string;
    aldeaFundCode?: string | null;
    localPreviewScatterRows?: import("@demo/lib/fund-reporting/types").FundScatterPoint[];
    disableExpansion?: boolean;
    showDrawdown?: boolean;
}) {
    const explorerMetricCols = getExplorerMetricCols(showDrawdown);
    const explorerGridTemplate = getExplorerGridTemplate(showDrawdown);
    return (<div className="overflow-hidden">
      <ScrollArea className="w-full">
        <div className="w-full min-w-0">
          <div className="grid border-b border-black/8 text-[#3D0028]/62" style={{ gridTemplateColumns: explorerGridTemplate }}>
            {explorerMetricCols.map(({ label, align }) => (<div key={label} className={cn("py-2 text-[10px] font-semibold uppercase tracking-[0.12em]", align === "right" ? "pl-4 pr-6 text-right" : "px-4 text-left")}>
                {label}
              </div>))}
          </div>
          <div>
            {holdings.map((holding) => (<HoldingDetailRow key={holding.asset_code} holding={holding} fundCompanies={underlyingCompanies.filter(u => u.linked_portfolio_holding_asset_code === holding.asset_code)} allUnderlyingCompanies={underlyingCompanies} aboveCostMetric={aboveCostMetric} reportPeriod={reportPeriod} fundCodeLabel={fundCodeLabel} aldeaFundCode={aldeaFundCode} localPreviewScatterRows={localPreviewScatterRows} disableExpansion={disableExpansion} showDrawdown={showDrawdown}/>))}
          </div>
        </div>
        <ScrollBar orientation="horizontal"/>
      </ScrollArea>
    </div>);
}
const EXIT_RE = /^exit/i;
const NON_STAGE_VALUES = new Set(["Fund", "IPO"]);
type DistributionItem = {
    label: string;
    count: number;
    pct: number;
    matchValues: string[];
};
type FootprintDimension = "country" | "continent" | "city" | "region";
type ExposureDrilldownKind = "sector" | "stage" | FootprintDimension;
const FOOTPRINT_DIMENSION_OPTIONS: Array<{
    value: FootprintDimension;
    label: string;
}> = [
    { value: "continent", label: "Continent" },
    { value: "region", label: "Region" },
    { value: "country", label: "Country" },
    { value: "city", label: "City" }
];
const COUNTRY_BUCKET_ALIASES: Record<string, string> = {
    Leichenstein: "Liechtenstein",
    Lausanne: "Switzerland",
};
function distributionOf(values: (string | null | undefined)[], opts?: {
    filter?: (raw: string) => boolean;
    normalize?: (raw: string) => string;
    topN?: number;
}): DistributionItem[] {
    const { filter, normalize, topN = 5 } = opts ?? {};
    const counts = new Map<string, {
        count: number;
        matchValues: Set<string>;
    }>();
    for (const v of values) {
        if (!v)
            continue;
        const raw = v.trim();
        if (filter && !filter(raw))
            continue;
        const label = normalize ? normalize(raw) : raw;
        const existing = counts.get(label);
        if (existing) {
            existing.count += 1;
            existing.matchValues.add(raw);
        }
        else {
            counts.set(label, { count: 1, matchValues: new Set([raw]) });
        }
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1].count - a[1].count);
    const total = sorted.reduce((s, [, entry]) => s + entry.count, 0);
    const top = sorted.slice(0, topN);
    const otherEntries = sorted.slice(topN);
    const otherCount = otherEntries.reduce((s, [, entry]) => s + entry.count, 0);
    const rows = top.map(([label, entry]) => ({
        label,
        count: entry.count,
        pct: total ? (entry.count / total) * 100 : 0,
        matchValues: [...entry.matchValues].sort(),
    }));
    if (otherCount > 0) {
        const otherValues = new Set<string>();
        for (const [, entry] of otherEntries) {
            for (const value of entry.matchValues)
                otherValues.add(value);
        }
        rows.push({
            label: "Other",
            count: otherCount,
            pct: total ? (otherCount / total) * 100 : 0,
            matchValues: [...otherValues].sort(),
        });
    }
    return rows;
}
function hasExitedOrWrittenOffStatus(company: ReportingUnderlyingCompany) {
    const status = company.current_status?.trim();
    if (status?.startsWith("EXIT"))
        return true;
    const stage = (company.company_stage_current ?? company.company_stage_reported)?.trim();
    return Boolean(stage && EXIT_RE.test(stage));
}
function getActiveStageValue(company: ReportingUnderlyingCompany) {
    if (hasExitedOrWrittenOffStatus(company))
        return null;
    const stage = (company.company_stage_current ?? company.company_stage_reported)?.trim();
    if (!stage || EXIT_RE.test(stage) || NON_STAGE_VALUES.has(stage))
        return null;
    return stage;
}
function getCountryExposureValue(company: ReportingUnderlyingCompany) {
    const raw = company.country?.trim();
    if (!raw)
        return null;
    return COUNTRY_BUCKET_ALIASES[raw] ?? raw;
}
const HOLDING_COUNTRY_ALIASES: Record<string, string> = {
    UK: "United Kingdom",
    USA: "United States",
    US: "United States",
    UAE: "United Arab Emirates",
};
function normalizeHoldingCountryLabel(value: string | null | undefined) {
    const raw = value?.trim();
    if (!raw)
        return null;
    return HOLDING_COUNTRY_ALIASES[raw] ?? raw;
}
function getHoldingCountryForScatter(holding: Pick<ReportingHolding, "country_label" | "location">) {
    const locationParts = (holding.location ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    const locationCountry = normalizeHoldingCountryLabel(locationParts.at(-1) ?? null);
    return normalizeHoldingCountryLabel(holding.country_label ?? locationCountry);
}
function deriveReferenceRegionFromCountry(country: string | null) {
    if (!country)
        return null;
    if (["United Kingdom", "Ireland"].includes(country))
        return "UK & IRELAND";
    if (["Germany", "Austria", "Switzerland"].includes(country))
        return "DACH";
    if (country === "France")
        return "FRANCE";
    if (["Belgium", "Netherlands", "Luxembourg"].includes(country))
        return "BENELUX";
    if (["Denmark", "Sweden", "Finland", "Norway", "Iceland"].includes(country))
        return "NORDICS";
    if (["Spain", "Italy", "Portugal", "Greece", "Cyprus", "Malta"].includes(country))
        return "SOUTH EUROPE";
    if (["Estonia", "Latvia", "Lithuania"].includes(country))
        return "BALTICS";
    if (["Poland", "Czech Republic", "Slovakia", "Hungary", "Romania", "Bulgaria", "Slovenia", "Croatia", "Serbia", "Ukraine"].includes(country))
        return "CEE";
    if (country === "Israel")
        return "ISRAEL";
    if (["United States", "Canada"].includes(country))
        return "USA";
    return country.toUpperCase();
}
function mapHoldingToExposureCompany(holding: ReportingHolding): ReportingUnderlyingCompany {
    const locationParts = (holding.location ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    const locationCountry = normalizeHoldingCountryLabel(locationParts.at(-1) ?? null);
    const country = normalizeHoldingCountryLabel(holding.country_label ?? locationCountry);
    const city = locationParts.length > 1 ? locationParts[0] ?? null : null;
    return {
        relationship_type: "direct_portfolio_company",
        company_id: `direct-${holding.asset_code}`,
        company_name: holding.asset_name,
        linked_fund_name: "",
        linked_portfolio_holding_asset_code: holding.asset_code,
        linked_portfolio_holding_asset_name: holding.asset_name,
        sector: holding.theme || null,
        industry: null,
        city,
        country,
        region: deriveReferenceRegionFromCountry(country),
        investment_type: "Direct",
    };
}
function getContinentExposureValue(company: ReportingUnderlyingCompany) {
    const country = getCountryExposureValue(company);
    if (!country)
        return null;
    return getCountryByName(country)?.region ?? null;
}
function getRegionExposureValue(company: ReportingUnderlyingCompany) {
    return company.region?.trim() || null;
}
function getCityExposureValue(company: ReportingUnderlyingCompany) {
    return company.city?.trim() || null;
}
function getExposureValue(company: ReportingUnderlyingCompany, kind: ExposureDrilldownKind) {
    if (kind === "sector")
        return company.sector?.trim() || null;
    if (kind === "stage")
        return getActiveStageValue(company);
    if (kind === "country")
        return getCountryExposureValue(company);
    if (kind === "continent")
        return getContinentExposureValue(company);
    if (kind === "city")
        return getCityExposureValue(company);
    return getRegionExposureValue(company);
}
function CCMiniBarList({ title, items, secondary = false, barColor, titleClassName, hideTitle = false, otherLabelCount = 5, drilldown }: {
    title: string;
    items: DistributionItem[];
    secondary?: boolean;
    barColor?: string;
    titleClassName?: string;
    hideTitle?: boolean;
    otherLabelCount?: number;
    drilldown?: {
        activeLabel: string | null;
        onSelect: (item: DistributionItem) => void;
    };
}) {
    if (items.length === 0)
        return null;
    const maxCount = Math.max(...items.map((i) => i.count));
    const fillColor = barColor ?? (secondary ? "#3D0028" : "#FF6A49");
    return (<div className={cn("px-1", drilldown?.activeLabel && "")}>
      {!hideTitle ? (<div className={cn("mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-charcoal", titleClassName)}>{title}</div>) : null}
      <div className="space-y-1.5">
        {items.map((item) => {
            const { label, count, pct } = item;
            const isActive = drilldown?.activeLabel === label;
            const content = (<>
              <div className="mb-1 flex items-center gap-1.5">
                <div className={cn("min-w-0 truncate text-[11px] font-medium leading-none", isActive ? "text-charcoal" : "text-charcoal/75")}>
                  {label}
                </div>
                {label === "Other" && (<Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 shrink-0 text-charcoal/30"/>
                      </TooltipTrigger>
                    <TooltipContent side="top" className={cn(PORTAL_TOOLTIP_PANEL_CLASSNAME, "max-w-[240px]")}>
                      Other includes remaining categories outside the top {otherLabelCount}.
                    </TooltipContent>
                  </Tooltip>)}
                <span className="text-charcoal/25">-</span>
                <div className="shrink-0 text-[10px] text-charcoal/45 tabular-nums leading-none">
                  {count === 1 ? "1 company" : `${count} companies`} · {Math.round(pct)}%
                </div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.07]">
                <div className="h-full rounded-full transition-all duration-500" style={{
                    width: `${(count / maxCount) * 100}%`,
                    backgroundColor: fillColor,
                }}/>
              </div>
            </>);
            return (<div key={label}>
              {drilldown ? (<button type="button" onClick={() => drilldown.onSelect(item)} aria-pressed={isActive} className={cn("w-full rounded-xl border px-3 py-1.5 text-left transition-all", isActive
                        ? "border-[rgba(123,245,179,0.92)] bg-[rgba(123,245,179,0.34)] shadow-sm"
                        : "border-transparent hover:border-black/8 hover:bg-black/[0.03]")}>
                  {content}
                </button>) : (<div className="rounded-xl border border-transparent px-3 py-1.5">{content}</div>)}
            </div>);
        })}
      </div>
    </div>);
}
const STAGE_MIX_COLORS = ["#FF6A49", "#FFDE68", "#7BF5B3", "#3D0028"] as const;
const STAGE_MIX_COLOR_BY_LABEL: Record<string, string> = {
    "Series B": "#3D0028",
};
function CCStageDonut({ title, items, titleClassName, drilldown }: {
    title: string;
    items: DistributionItem[];
    titleClassName?: string;
    drilldown?: {
        activeLabel: string | null;
        onSelect: (item: DistributionItem) => void;
    };
}) {
    if (items.length === 0)
        return null;
    const total = items.reduce((sum, item) => sum + item.count, 0);
    const cx = 138;
    const cy = 138;
    const r = 84;
    const sw = 36;
    const circ = 2 * Math.PI * r;
    const gap = items.length > 1 ? 3 : 0;
    let cum = 0;
    const segments = items.map((item, index) => {
        const fraction = total ? item.count / total : 0;
        const arcLength = fraction * circ;
        const segmentGap = Math.min(gap, arcLength * 0.2);
        const dash = arcLength - segmentGap;
        const dashOffset = -cum - segmentGap / 2;
        const midAngle = -Math.PI / 2 + (cum / circ + fraction / 2) * Math.PI * 2;
        const labelRadius = r;
        const color = STAGE_MIX_COLOR_BY_LABEL[item.label] ?? STAGE_MIX_COLORS[index % STAGE_MIX_COLORS.length];
        cum += arcLength;
        return {
            ...item,
            color,
            dash,
            dashOffset,
            labelColor: color === "#3D0028" ? "#FFFFFF" : "#001E28",
            labelX: cx + Math.cos(midAngle) * labelRadius,
            labelY: cy + Math.sin(midAngle) * labelRadius,
            labelFontSize: fraction < 0.08 ? 13 : fraction < 0.14 ? 14 : 15,
            showLabel: fraction >= 0.08,
        };
    });
    return (<div className="stage-mix px-1">
      <div className={cn("mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-charcoal", titleClassName)}>{title}</div>
      <div className="flex flex-col items-center gap-3">
        <div className="flex w-full items-center justify-center">
          <svg className="stage-mix-chart" width={cx * 2} height={cy * 2} viewBox={`0 0 ${cx * 2} ${cy * 2}`} role="img" aria-label={`${title}: ${segments.map(segment => `${segment.label}, ${segment.count} companies`).join("; ")}`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={sw}/>
            {segments.map((segment) => {
            const isActive = drilldown?.activeLabel === segment.label;
            const isDimmed = drilldown?.activeLabel && !isActive;
            return (<Fragment key={segment.label}>
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke={segment.color} strokeWidth={sw} strokeLinecap="butt" strokeDasharray={`${segment.dash} ${circ - segment.dash}`} strokeDashoffset={segment.dashOffset} transform={`rotate(-90 ${cx} ${cy})`} className={cn(drilldown && "cursor-pointer")} style={{
                    opacity: isDimmed ? 0.35 : 1,
                    transition: "opacity 180ms ease",
                }} onClick={drilldown ? () => drilldown.onSelect(segment) : undefined}>
                    <title>{segment.label}: {segment.count} companies ({Math.round(segment.pct)}%)</title>
                  </circle>
                  {segment.showLabel && <text x={segment.labelX} y={segment.labelY} textAnchor="middle" dominantBaseline="middle" pointerEvents="none" fill={segment.labelColor} fontSize={segment.labelFontSize} fontWeight="700" style={{
                    opacity: isDimmed ? 0.35 : 1,
                    transition: "opacity 180ms ease",
                }}>
                    {segment.count}
                  </text>}
                </Fragment>);
        })}
            <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle" fill="#001E28" fontSize="30" fontWeight="600">{total}</text>
            <text x={cx} y={cy + 20} textAnchor="middle" fill="#626262" fontSize="11">Companies</text>
          </svg>
        </div>

        <div className="stage-mix-legend">
          {segments.map((segment) => {
            const isActive = drilldown?.activeLabel === segment.label;
            return (<button key={segment.label} type="button" onClick={() => drilldown?.onSelect(segment)} aria-label={`${segment.label}: ${segment.count} ${segment.count === 1 ? "company" : "companies"}, ${Math.round(segment.pct)}%`} aria-pressed={isActive} className={cn("inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-left transition-all", isActive
                    ? "border-[rgba(123,245,179,0.92)] bg-[rgba(123,245,179,0.34)] shadow-sm"
                    : "border-transparent hover:border-black/8 hover:bg-black/[0.03]")}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }}/>
                <span className="min-w-0 text-xs font-medium leading-none text-charcoal">{segment.label}</span>
                <span className="ml-auto shrink-0 text-[11px] tabular-nums text-charcoal/60">{segment.count} · {Math.round(segment.pct)}%</span>
              </button>);
        })}
        </div>
      </div>
    </div>);
}
function FootprintMapChart({ title, description, companies, directCompanies = [], allowInvestmentScopeToggle = false, mapHeightPx = 340, topBucketCount = 5, holdingRows = [], }: {
    title: string;
    description?: string;
    companies: ReportingUnderlyingCompany[];
    directCompanies?: ReportingUnderlyingCompany[];
    allowInvestmentScopeToggle?: boolean;
    mapHeightPx?: number;
    topBucketCount?: number;
    holdingRows?: ReportingHolding[];
}) {
    const reportingDataSource = useReportingDataSource();
    const priorityCompanyNames = reportingDataSource.priorityCompanyNames;
    const [investmentScope, setInvestmentScope] = useState<"all" | "direct">("all");
    const [dimension, setDimension] = useState<FootprintDimension>("country");
    const [showAllCompanies, setShowAllCompanies] = useState(false);
    const [selectedCompanyKey, setSelectedCompanyKey] = useState<string | null>(null);
    const [companySort, setCompanySort] = useState<ExposureCompanySortKey>("alphabetical");
    const [shouldScrollToCompanyList, setShouldScrollToCompanyList] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{
        kind: FootprintDimension;
        item: DistributionItem;
    } | null>(null);
    const scopedCompanies = useMemo(() => (investmentScope === "direct" ? directCompanies : [...companies, ...directCompanies]), [companies, directCompanies, investmentScope]);
    const countryMix = useMemo(() => distributionOf(scopedCompanies.map(getCountryExposureValue), { topN: topBucketCount }), [scopedCompanies, topBucketCount]);
    const continentMix = useMemo(() => distributionOf(scopedCompanies.map(getContinentExposureValue), { topN: topBucketCount }), [scopedCompanies, topBucketCount]);
    const cityMix = useMemo(() => distributionOf(scopedCompanies.map(getCityExposureValue), { topN: topBucketCount }), [scopedCompanies, topBucketCount]);
    const regionMix = useMemo(() => distributionOf(scopedCompanies.map(getRegionExposureValue), { topN: topBucketCount }), [scopedCompanies, topBucketCount]);
    const activeMix = useMemo(() => {
        switch (dimension) {
            case "continent":
                return continentMix;
            case "city":
                return cityMix;
            case "region":
                return regionMix;
            case "country":
            default:
                return countryMix;
        }
    }, [cityMix, continentMix, countryMix, dimension, regionMix]);
    const footprintCountryData = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const company of scopedCompanies) {
            const country = getCountryExposureValue(company);
            if (!country)
                continue;
            counts[country] = (counts[country] ?? 0) + 1;
        }
        return counts;
    }, [scopedCompanies]);
    const selectedCountry = selectedItem?.kind === "country" && selectedItem.item.label !== "Other"
        ? selectedItem.item.label
        : null;
    const fullCompanyListDomId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-footprint-company-list`;
    const selectedCompanies = useMemo(() => {
        if (!selectedItem)
            return [];
        const resolver = selectedItem.kind === "continent"
            ? getContinentExposureValue
            : selectedItem.kind === "city"
                ? getCityExposureValue
                : selectedItem.kind === "region"
                    ? getRegionExposureValue
                    : getCountryExposureValue;
        const seen = new Set<string>();
        return scopedCompanies
            .filter((company) => resolver(company) === selectedItem.item.label)
            .filter((company) => {
            const key = company.company_id || company.company_name || "";
            if (!key || seen.has(key))
                return false;
            seen.add(key);
            return true;
        })
            .sort((a, b) => comparePriorityNames(a.company_name, b.company_name, priorityCompanyNames));
    }, [priorityCompanyNames, scopedCompanies, selectedItem]);
    const companyRowsByKey = useMemo(() => buildUnderlyingCompanyRowsByKey(scopedCompanies), [scopedCompanies]);
    const holdingsByAssetCode = useMemo(() => new Map(holdingRows
        .filter((holding) => holding.asset_code)
        .map((holding) => [holding.asset_code, holding] as const)), [holdingRows]);
    const sortedSelectedCompanies = useMemo(() => sortExposureCompanies(selectedCompanies, companySort, holdingsByAssetCode, priorityCompanyNames), [companySort, holdingsByAssetCode, priorityCompanyNames, selectedCompanies]);
    const selectedCompanyDetail = useMemo(() => {
        if (!selectedCompanyKey)
            return null;
        const detailRows = companyRowsByKey.get(selectedCompanyKey);
        if (!detailRows || detailRows.length === 0)
            return null;
        return {
            company: detailRows[0]!,
            companyRows: detailRows,
        };
    }, [companyRowsByKey, selectedCompanyKey]);
    useEffect(() => {
        setSelectedItem(null);
        setSelectedCompanyKey(null);
    }, [investmentScope]);
    useEffect(() => {
        if (!selectedItem) {
            setShowAllCompanies(false);
            setShouldScrollToCompanyList(false);
            setSelectedCompanyKey(null);
        }
    }, [selectedItem]);
    useEffect(() => {
        setSelectedCompanyKey(null);
        setCompanySort("alphabetical");
    }, [selectedItem?.kind, selectedItem?.item.label]);
    useEffect(() => {
        if (!shouldScrollToCompanyList || !showAllCompanies || selectedCompanies.length === 0)
            return;
        const scrollToList = () => {
            document.getElementById(fullCompanyListDomId)?.scrollIntoView({ behavior: "smooth", block: "center" });
            setShouldScrollToCompanyList(false);
        };
        if (typeof window !== "undefined") {
            const frame = window.requestAnimationFrame(scrollToList);
            return () => window.cancelAnimationFrame(frame);
        }
        else {
            scrollToList();
        }
    }, [fullCompanyListDomId, selectedCompanies.length, shouldScrollToCompanyList, showAllCompanies]);
    const toggleSelection = (kind: FootprintDimension, item: DistributionItem) => {
        const isSame = selectedItem?.kind === kind && selectedItem.item.label === item.label;
        if (isSame) {
            setSelectedItem(null);
            setShowAllCompanies(false);
            setShouldScrollToCompanyList(false);
            return;
        }
        setSelectedItem({ kind, item });
        setShowAllCompanies(true);
        setShouldScrollToCompanyList(true);
    };
    const handleMapCountrySelect = (country: string | null) => {
        if (!country) {
            if (selectedItem?.kind === "country") {
                setSelectedItem(null);
                setShowAllCompanies(false);
                setShouldScrollToCompanyList(false);
            }
            return;
        }
        if (selectedItem?.kind === "country" && selectedItem.item.label === country) {
            setSelectedItem(null);
            setShowAllCompanies(false);
            setShouldScrollToCompanyList(false);
            return;
        }
        const match = countryMix.find((item) => item.label === country);
        if (!match) {
            const count = footprintCountryData[country];
            if (!count)
                return;
            const total = Object.values(footprintCountryData).reduce((sum, value) => sum + value, 0);
            setDimension("country");
            setSelectedItem({
                kind: "country",
                item: {
                    label: country,
                    count,
                    pct: total > 0 ? (count / total) * 100 : 0,
                    matchValues: [country],
                },
            });
            setShowAllCompanies(true);
            setShouldScrollToCompanyList(false);
            return;
        }
        setDimension("country");
        setSelectedItem({ kind: "country", item: match });
        setShowAllCompanies(true);
        setShouldScrollToCompanyList(false);
    };
    if (scopedCompanies.length === 0)
        return null;
    return (<div className="space-y-4">
      <div className="space-y-1.5">
        <div className="font-reporting text-2xl font-semibold leading-tight text-charcoal">
          {title}
        </div>
        {description ? <p className="text-sm text-charcoal/58">{description}</p> : null}
      </div>

      {allowInvestmentScopeToggle && directCompanies.length > 0 ? (<div className="flex flex-wrap items-center gap-2.5 text-[11px] font-medium tracking-[0.04em]">
          {[
                { value: "all" as const, label: "All indirect + direct investments" },
                { value: "direct" as const, label: "Direct investments only" }
            ].map((option, index) => {
                const isActive = investmentScope === option.value;
                return (<Fragment key={option.value}>
                {index > 0 ? <span className="h-3.5 w-px bg-black/18" aria-hidden="true"/> : null}
                <button type="button" onClick={() => setInvestmentScope(option.value)} className={cn("transition-colors", isActive ? "text-[#D886FF]" : "text-charcoal/45 hover:text-charcoal/72")}>
                  {option.label}
                </button>
              </Fragment>);
            })}
        </div>) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.85fr)] xl:items-start">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-[18px] border border-black/8 bg-white/35">
            <div className="overflow-hidden" style={{ height: `${mapHeightPx}px` }}>
              <PortfolioMap countryData={footprintCountryData} selectedCountry={selectedCountry} onCountryClick={handleMapCountrySelect}/>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.15em] text-charcoal">
              Geography Mix
            </div>
            <div className="flex min-w-0 flex-1 justify-end gap-1 overflow-x-auto pb-1">
              {FOOTPRINT_DIMENSION_OPTIONS.map((option) => {
            const isActive = dimension === option.value;
            return (<button key={option.value} type="button" onClick={() => {
                    setDimension(option.value);
                    setSelectedItem((current) => (current?.kind === option.value ? current : null));
                }} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] transition-colors", isActive
                    ? "bg-[#D886FF] text-[#3D0028]"
                    : "bg-black/[0.04] text-charcoal/60 hover:bg-black/[0.06] hover:text-charcoal")}>
                    {option.label}
                  </button>);
        })}
            </div>
          </div>

          <CCMiniBarList title="Geography Mix" items={activeMix} hideTitle otherLabelCount={topBucketCount} barColor="#3D0028" drilldown={{
            activeLabel: selectedItem?.kind === dimension ? selectedItem.item.label : null,
            onSelect: (item) => toggleSelection(dimension, item),
        }}/>
        </div>
      </div>

      {selectedItem && showAllCompanies && selectedCompanies.length > 0 ? (<div className="space-y-4">
          <div id={fullCompanyListDomId} className="rounded-[24px] border border-black/8 bg-white/60 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3D0028]/70">
                {selectedItem.item.label} companies
              </div>
              <div className="flex items-center gap-3">
                <Select value={companySort} onValueChange={(value) => setCompanySort(value as ExposureCompanySortKey)}>
                  <SelectTrigger aria-label={`Sort companies: ${formatExposureCompanySortLabel(companySort)}`} className="h-7 w-auto gap-2 rounded-[10px] border-0 bg-transparent px-2.5 text-[11px] font-medium text-[#D886FF] shadow-none ring-0 hover:bg-[#3D0028]/[0.04] hover:text-[#D886FF] focus:ring-0 focus:ring-offset-0">
                    <span>Sort: {formatExposureCompanySortLabel(companySort)}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alphabetical" className="text-xs">Alphabetical</SelectItem>
                    <SelectItem value="vintage" className="text-xs">Vintage</SelectItem>
                    <SelectItem value="fair_value" className="text-xs">Fair value</SelectItem>
                    <SelectItem value="tvpi" className="text-xs">TVPI</SelectItem>
                    <SelectItem value="moic" className="text-xs">MOIC</SelectItem>
                  </SelectContent>
                </Select>
                <button type="button" onClick={() => {
                setShowAllCompanies(false);
                setShouldScrollToCompanyList(false);
                setSelectedCompanyKey(null);
            }} className="text-xs text-[#3D0028]/55 transition-colors hover:text-[#3D0028]">
                  Collapse
                </button>
              </div>
            </div>
            <div className="mt-4 max-h-[260px] overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
              {sortedSelectedCompanies.map((company, index) => {
                const companyKey = getUnderlyingCompanySelectionKey(company);
                const isSelected = companyKey != null && companyKey === selectedCompanyKey;
                return (<button key={`footprint-expanded-${company.company_id ?? company.company_name ?? index}`} type="button" onClick={() => setSelectedCompanyKey((current) => (current === companyKey ? null : companyKey))} className={isSelected
                        ? "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none text-black transition-colors"
                        : "inline-flex items-center rounded-full border bg-white px-2.5 py-1 text-[11px] font-medium leading-none text-charcoal/82 transition-colors hover:border-[#3D0028]/18 hover:text-[#3D0028]"} style={isSelected
                        ? {
                            backgroundColor: "rgba(216, 134, 255, 0.34)",
                            borderColor: "rgba(216, 134, 255, 0.5)",
                            color: "#000000",
                        }
                        : undefined}>
                    {company.company_name ?? "Unknown"}
                  </button>);
            })}
              </div>
            </div>
          </div>

          {selectedCompanyDetail ? (<div className="overflow-hidden">
              <div className="ml-5 border-l border-black/45">
                <UnderlyingCompanyExpandPanel company={selectedCompanyDetail.company} companyRows={selectedCompanyDetail.companyRows} showTopBorder={false}/>
              </div>
            </div>) : null}
        </div>) : null}
    </div>);
}
const COUNTRY_FLAGS: Record<string, string> = {
    Spain: "🇪🇸",
    "United States": "🇺🇸",
    USA: "🇺🇸",
    US: "🇺🇸",
    "United Kingdom": "🇬🇧",
    UK: "🇬🇧",
    Germany: "🇩🇪",
    France: "🇫🇷",
    Sweden: "🇸🇪",
    Netherlands: "🇳🇱",
    Greece: "🇬🇷",
    Canada: "🇨🇦",
    Portugal: "🇵🇹",
    Italy: "🇮🇹",
    Denmark: "🇩🇰",
    Belgium: "🇧🇪",
    Austria: "🇦🇹",
    Switzerland: "🇨🇭",
    Estonia: "🇪🇪",
    Lithuania: "🇱🇹",
    Finland: "🇫🇮",
    Norway: "🇳🇴",
    Poland: "🇵🇱",
    Romania: "🇷🇴",
    "Czech Republic": "🇨🇿",
    Israel: "🇮🇱",
    India: "🇮🇳",
};
function countryFlag(country: string | null | undefined) {
    if (!country)
        return "";
    return COUNTRY_FLAGS[country.trim()] ?? "";
}
function formatOwnershipPct(value: number | string | null | undefined) {
    if (value == null)
        return null;
    if (typeof value === "string")
        return value;
    if (!Number.isFinite(value))
        return null;
    if (value >= 0 && value <= 1)
        return `${(value * 100).toFixed(2)}%`;
    return `${value.toFixed(2)}%`;
}
function formatFixedPercent(value: number | null | undefined, digits = 1, fallback = "0.0") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return fallback;
    }
    return value.toFixed(digits);
}
type ReportingRenderBoundaryProps = {
    resetKey: string;
    children: ReactNode;
};
type ReportingRenderBoundaryState = {
    errorMessage: string | null;
};
export class ReportingRenderBoundary extends Component<ReportingRenderBoundaryProps, ReportingRenderBoundaryState> {
    state: ReportingRenderBoundaryState = {
        errorMessage: null,
    };
    static getDerivedStateFromError(error: Error): ReportingRenderBoundaryState {
        return {
            errorMessage: error.message || "Preview rendering failed.",
        };
    }
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("[FundReportSections] Preview render failed", error, errorInfo);
    }
    componentDidUpdate(prevProps: ReportingRenderBoundaryProps) {
        if (prevProps.resetKey !== this.props.resetKey && this.state.errorMessage) {
            this.setState({ errorMessage: null });
        }
    }
    render() {
        if (this.state.errorMessage) {
            return (<div className="rounded-[20px] border border-[#ff6a49]/18 bg-[#ff6a49]/[0.06] px-4 py-3 text-sm text-[#7a3b30]">
          Demo temporarily unavailable.
        </div>);
        }
        return this.props.children;
    }
}
function formatReportPeriodLabel(value: string | null | undefined) {
    if (!value)
        return null;
    const match = value.match(/(\d{4})[_-]?Q(\d)/i);
    if (!match)
        return value;
    return `Q${match[2]} ${match[1]}`;
}
function uniqueStrings(values: (string | null | undefined)[]) {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
        if (!value)
            continue;
        const trimmed = value.trim();
        if (!trimmed || seen.has(trimmed))
            continue;
        seen.add(trimmed);
        result.push(trimmed);
    }
    return result;
}
function firstDefinedString(values: (string | null | undefined)[]) {
    return uniqueStrings(values)[0] ?? null;
}
function firstDefinedValue<T>(values: (T | null | undefined)[]) {
    for (const value of values) {
        if (value != null)
            return value;
    }
    return null;
}
function sumAvailableNumbers(values: (number | null | undefined)[]) {
    let hasValue = false;
    let total = 0;
    for (const value of values) {
        if (value == null)
            continue;
        hasValue = true;
        total += value;
    }
    return hasValue ? total : null;
}
function averageAvailableNumbers(values: (number | null | undefined)[]) {
    let count = 0;
    let total = 0;
    for (const value of values) {
        if (value == null)
            continue;
        count += 1;
        total += value;
    }
    return count > 0 ? total / count : null;
}
function normalizeDerivedBucketKey(value: string) {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return normalized || "unknown";
}
function resolveUnderlyingCompanyExposureAmount(company: ReportingUnderlyingCompany) {
    if (isFiniteNumericValue(company.fair_value_eur))
        return company.fair_value_eur;
    if (isFiniteNumericValue(company.invested_eur))
        return company.invested_eur;
    return 0;
}
function resolveUnderlyingCompanyInvestedAmount(company: ReportingUnderlyingCompany) {
    return isFiniteNumericValue(company.invested_eur) ? company.invested_eur : 0;
}
function resolveUnderlyingCompanyRealizedAmount(company: ReportingUnderlyingCompany) {
    return (isFiniteNumericValue(company.realized_cash_eur) ? company.realized_cash_eur : 0) +
        (isFiniteNumericValue(company.proceeds_stock_eur) ? company.proceeds_stock_eur : 0);
}
function countUniqueUnderlyingCompanies(rows: ReportingUnderlyingCompany[]) {
    const seen = new Set<string>();
    for (const row of rows) {
        const key = getUnderlyingCompanySelectionKey(row)?.trim().toLowerCase();
        if (!key)
            continue;
        seen.add(key);
    }
    return seen.size;
}
function pickWeightedCompanyLabel(rows: ReportingUnderlyingCompany[], resolver: (row: ReportingUnderlyingCompany) => string | null) {
    const labels = new Map<string, {
        label: string;
        exposure: number;
        count: number;
    }>();
    for (const row of rows) {
        const label = resolver(row)?.trim();
        if (!label)
            continue;
        const existing = labels.get(label) ?? { label, exposure: 0, count: 0 };
        existing.exposure += resolveUnderlyingCompanyExposureAmount(row);
        existing.count += 1;
        labels.set(label, existing);
    }
    return [...labels.values()]
        .sort((left, right) => {
        if (right.exposure !== left.exposure)
            return right.exposure - left.exposure;
        if (right.count !== left.count)
            return right.count - left.count;
        return left.label.localeCompare(right.label, "en");
    })[0]?.label ?? null;
}
function buildDerivedBreakdownItemsFromCompanies(companies: ReportingUnderlyingCompany[], resolver: (company: ReportingUnderlyingCompany) => string | null): ReportingBreakdownItem[] {
    const buckets = new Map<string, {
        label: string;
        exposureEur: number;
        companyKeys: Set<string>;
    }>();
    for (const company of companies) {
        const label = resolver(company)?.trim();
        if (!label)
            continue;
        const bucketKey = normalizeDerivedBucketKey(label);
        const bucket = buckets.get(bucketKey) ?? {
            label,
            exposureEur: 0,
            companyKeys: new Set<string>(),
        };
        bucket.exposureEur += resolveUnderlyingCompanyExposureAmount(company);
        const companyKey = getUnderlyingCompanySelectionKey(company)?.trim().toLowerCase();
        if (companyKey)
            bucket.companyKeys.add(companyKey);
        buckets.set(bucketKey, bucket);
    }
    return [...buckets.entries()]
        .map(([bucketKey, bucket]) => ({
        bucket_key: bucketKey,
        label: bucket.label,
        company_count: bucket.companyKeys.size,
        exposure_eur: bucket.exposureEur,
    }))
        .sort((left, right) => right.exposure_eur - left.exposure_eur);
}
function buildDerivedStrategyItem(strategyKey: string, label: string, holdings: ReportingHolding[]): ReportingPackage["strategy_summary"][number] {
    const committedEur = holdings.reduce((sum, holding) => sum + (holding.committed_eur ?? 0), 0);
    const drawdownEur = holdings.reduce((sum, holding) => sum + (holding.drawdown_eur ?? 0), 0);
    const netInvestedEur = holdings.reduce((sum, holding) => sum + (holding.net_invested_eur ?? 0), 0);
    const fairValueEur = holdings.reduce((sum, holding) => sum + (holding.fair_value_eur ?? 0), 0);
    const realizedEur = holdings.reduce((sum, holding) => sum + ((holding.drawdown_eur ?? 0) * (holding.dpi ?? 0)), 0);
    const denominator = drawdownEur > 0 ? drawdownEur : netInvestedEur > 0 ? netInvestedEur : committedEur;
    const rvpi = denominator > 0 ? fairValueEur / denominator : 0;
    const dpi = denominator > 0 ? realizedEur / denominator : 0;
    return {
        strategy_key: strategyKey,
        label,
        committed_eur: committedEur,
        drawdown_eur: drawdownEur,
        net_invested_eur: netInvestedEur,
        fair_value_eur: fairValueEur,
        rvpi,
        dpi,
        tvpi: rvpi + dpi,
    };
}
function buildDerivedStrategySummaryFromHoldings(holdings: ReportingHolding[]) {
    const fofHoldings = holdings.filter((holding) => holding.practice_type === "fund_of_funds");
    const directHoldings = holdings.filter((holding) => holding.practice_type === "direct_co_investment");
    const items: ReportingPackage["strategy_summary"] = [];
    if (fofHoldings.length > 0) {
        items.push(buildDerivedStrategyItem("fund_of_funds", "Fund of Funds", fofHoldings));
    }
    if (directHoldings.length > 0) {
        items.push(buildDerivedStrategyItem("direct_co_investment", "Direct Investment", directHoldings));
    }
    if (holdings.length > 0) {
        items.push(buildDerivedStrategyItem("total_portfolio", "Total Portfolio", holdings));
    }
    return items;
}
function buildDerivedPortfolioHoldingsFromUnderlyingCompanies(companies: ReportingUnderlyingCompany[]) {
    const rowsByFund = new Map<string, {
        assetCode: string;
        assetName: string;
        rows: ReportingUnderlyingCompany[];
    }>();
    for (const company of companies) {
        const linkedFundName = firstDefinedString([
            company.linked_portfolio_holding_asset_name,
            ...(company.portfolio_fund_labels_current ?? []),
            company.linked_fund_name
        ]) ?? "Unknown fund";
        const assetCode = company.linked_fund_record_id?.trim() ||
            company.linked_portfolio_holding_asset_code?.trim() ||
            `derived-fund-${normalizeDerivedBucketKey(linkedFundName)}`;
        const groupKey = `${assetCode}:${normalizeDerivedBucketKey(linkedFundName)}`;
        const existing = rowsByFund.get(groupKey);
        if (existing) {
            existing.rows.push(company);
            continue;
        }
        rowsByFund.set(groupKey, {
            assetCode,
            assetName: linkedFundName,
            rows: [company],
        });
    }
    const derivedHoldings: ReportingHolding[] = [];
    const derivedCompanies: ReportingUnderlyingCompany[] = [];
    for (const { assetCode, assetName, rows } of rowsByFund.values()) {
        const investedEur = rows.reduce((sum, row) => sum + resolveUnderlyingCompanyInvestedAmount(row), 0);
        const fairValueEur = rows.reduce((sum, row) => sum + resolveUnderlyingCompanyExposureAmount(row), 0);
        const realizedEur = rows.reduce((sum, row) => sum + resolveUnderlyingCompanyRealizedAmount(row), 0);
        const denominator = investedEur > 0 ? investedEur : fairValueEur;
        const dominantCountry = pickWeightedCompanyLabel(rows, getCountryExposureValue);
        derivedHoldings.push({
            asset_code: assetCode,
            asset_name: assetName,
            asset_type: "fund",
            practice_type: "fund_of_funds",
            vintage_year: firstDefinedValue(rows.map((row) => row.linked_fund_vintage_year)) ?? null,
            stage_label: firstDefinedString(rows.map((row) => row.linked_fund_stage_label)) ?? null,
            vc_firm: firstDefinedString(rows.map((row) => row.linked_fund_vc_firm ?? row.linked_fund_name)) ?? assetName,
            country_label: dominantCountry,
            location: firstDefinedString(rows.map((row) => row.linked_fund_geography)) ?? dominantCountry ?? "Not yet published",
            theme: pickWeightedCompanyLabel(rows, (row) => row.sector?.trim() || null) ?? "Generalist",
            fund_size_display: null,
            called_pct: denominator > 0 ? Math.min(investedEur / denominator, 1) : null,
            deal_count: countUniqueUnderlyingCompanies(rows),
            committed_eur: denominator,
            drawdown_eur: denominator,
            net_invested_eur: investedEur > 0 ? investedEur : denominator,
            fair_value_eur: fairValueEur,
            rvpi: denominator > 0 ? fairValueEur / denominator : averageAvailableNumbers(rows.map((row) => row.moic)) ?? 0,
            dpi: denominator > 0 ? realizedEur / denominator : 0,
            tvpi: denominator > 0
                ? (fairValueEur + realizedEur) / denominator
                : averageAvailableNumbers(rows.map((row) => row.moic)) ?? 0,
            status: "active",
            detail_blurb: `Derived from ${countUniqueUnderlyingCompanies(rows).toLocaleString("en-GB")} published underlying companies.`,
        });
        for (const row of rows) {
            derivedCompanies.push({
                ...row,
                linked_portfolio_holding_asset_code: row.linked_portfolio_holding_asset_code?.trim() || assetCode,
                linked_portfolio_holding_asset_name: row.linked_portfolio_holding_asset_name?.trim() || assetName,
            });
        }
    }
    derivedHoldings.sort((left, right) => right.fair_value_eur - left.fair_value_eur);
    return {
        holdings: derivedHoldings,
        companies: derivedCompanies,
    };
}
type DerivedFundToplineSummary = {
    quarterKey: string;
    committedEur: number;
    drawdownEur: number;
    availableForDrawdownEur: number;
    paidInToCommitmentRatio: number | null;
    fairValueEur: number;
    investedEur: number;
    realizedEur: number;
    tvpi: number | null;
    rvpi: number | null;
    dpi: number | null;
};
const DERIVED_KPI_NOTE = "Derived from published holding and underlying-company exposure because fund-level KPI rows are not included in this package.";
const DERIVED_NAV_NOTE = "Derived from published fair value only. Cash, liabilities, and accruals are not separately published in this package.";
const DERIVED_DISTRIBUTIONS_NOTE = "Derived from published realized cash and stock proceeds at the underlying-company level.";
function buildDerivedFundToplineSummary(reportPackage: ReportingPackage, holdings: ReportingHolding[], underlyingCompanies: ReportingUnderlyingCompany[]): DerivedFundToplineSummary {
    const committedEur = holdings.reduce((sum, holding) => sum + (holding.committed_eur ?? 0), 0);
    const drawdownEur = holdings.reduce((sum, holding) => sum + (holding.drawdown_eur ?? 0), 0);
    const fairValueEur = holdings.reduce((sum, holding) => sum + (holding.fair_value_eur ?? 0), 0);
    const investedEur = holdings.reduce((sum, holding) => sum + (holding.net_invested_eur ?? 0), 0);
    const realizedEur = underlyingCompanies.reduce((sum, company) => sum + resolveUnderlyingCompanyRealizedAmount(company), 0);
    const tvpi = investedEur > 0 ? (fairValueEur + realizedEur) / investedEur : null;
    const rvpi = investedEur > 0 ? fairValueEur / investedEur : null;
    const dpi = investedEur > 0 ? realizedEur / investedEur : null;
    const availableForDrawdownEur = committedEur - drawdownEur;
    const paidInToCommitmentRatio = committedEur > 0 ? drawdownEur / committedEur : null;
    return {
        quarterKey: reportPackage.report_meta.quarter_key,
        committedEur,
        drawdownEur,
        availableForDrawdownEur,
        paidInToCommitmentRatio,
        fairValueEur,
        investedEur,
        realizedEur,
        tvpi,
        rvpi,
        dpi,
    };
}
function buildDerivedMetric(metric_key: string, label: string, value: number | null, value_type: ReportingMetric["value_type"], note: string, comparisonValue?: number | null): ReportingMetric | null {
    if (value == null || !Number.isFinite(value))
        return null;
    return {
        metric_key,
        label,
        value,
        value_type,
        comparison_value: comparisonValue != null && Number.isFinite(comparisonValue)
            ? comparisonValue
            : null,
        comparison_label: comparisonValue != null ? "Previous quarter" : null,
        note,
    };
}
function buildDerivedKeyMetricsFromSummary(current: DerivedFundToplineSummary, previous: DerivedFundToplineSummary | null) {
    return [
        buildDerivedMetric("tvpi_to_investors", "TVPI", current.tvpi, "multiple", DERIVED_KPI_NOTE, previous?.tvpi ?? null),
        buildDerivedMetric("net_asset_value", "Net asset value (NAV)", current.fairValueEur, "currency", DERIVED_NAV_NOTE, previous?.fairValueEur ?? null),
        buildDerivedMetric("fair_value_of_current_portfolio", "Portfolio fair value", current.fairValueEur, "currency", DERIVED_KPI_NOTE, previous?.fairValueEur ?? null),
        buildDerivedMetric("total_net_invested_in_portfolio_companies", "Total net invested in portfolio companies", current.investedEur, "currency", DERIVED_KPI_NOTE, previous?.investedEur ?? null),
        buildDerivedMetric("residual_value", "Residual value", current.fairValueEur, "currency", DERIVED_NAV_NOTE, previous?.fairValueEur ?? null),
        buildDerivedMetric("cumulative_distributions_to_fund", "Cumulative distributions to the fund", current.realizedEur, "currency", DERIVED_DISTRIBUTIONS_NOTE, previous?.realizedEur ?? null),
        buildDerivedMetric("dpi_to_investors", "DPI", current.dpi, "multiple", DERIVED_KPI_NOTE, previous?.dpi ?? null),
        buildDerivedMetric("rvpi_to_investors", "RVPI", current.rvpi, "multiple", DERIVED_KPI_NOTE, previous?.rvpi ?? null),
        buildDerivedMetric("total_commitments_to_fund", "Total commitments", current.committedEur, "currency", DERIVED_KPI_NOTE, previous?.committedEur ?? null),
        buildDerivedMetric("cumulative_paid_in_capital", "Paid-in capital", current.drawdownEur, "currency", DERIVED_KPI_NOTE, previous?.drawdownEur ?? null),
        buildDerivedMetric("total_commitment_available_for_drawdown", "Available for drawdown", current.availableForDrawdownEur, "currency", DERIVED_KPI_NOTE, previous?.availableForDrawdownEur ?? null),
        buildDerivedMetric("paid_in_to_commitment_ratio", "% called", current.paidInToCommitmentRatio, "percent", DERIVED_KPI_NOTE, previous?.paidInToCommitmentRatio ?? null)
    ].filter((metric): metric is ReportingMetric => Boolean(metric));
}
function buildDerivedNavBridgeSectionFromSummary(current: DerivedFundToplineSummary, previous: DerivedFundToplineSummary | null): ReportingFinancialSection | null {
    if (current.fairValueEur <= 0)
        return null;
    if (!previous) {
        return {
            section_key: "nav_bridge",
            title: "Derived value snapshot",
            statement_type: "bridge",
            rows: [
                {
                    row_key: "end_of_quarter_current_derived",
                    label: "Current derived portfolio fair value",
                    values: { amount: current.fairValueEur },
                    emphasis: "total",
                }
            ],
        };
    }
    const deployedSincePrior = current.investedEur - previous.investedEur;
    const realizedSincePrior = current.realizedEur - previous.realizedEur;
    const revaluation = current.fairValueEur - previous.fairValueEur - deployedSincePrior + realizedSincePrior;
    const rows: ReportingFinancialSection["rows"] = [
        {
            row_key: "start_of_quarter_derived",
            label: "Start of quarter derived fair value",
            values: { amount: previous.fairValueEur },
            emphasis: "total",
        }
    ];
    if (Math.abs(deployedSincePrior) > 1) {
        rows.push({
            row_key: "capital_deployed_current_derived",
            label: "Capital deployed since prior quarter",
            values: { amount: deployedSincePrior },
        });
    }
    if (Math.abs(realizedSincePrior) > 1) {
        rows.push({
            row_key: "realized_proceeds_current_derived",
            label: "Realized proceeds since prior quarter",
            values: { amount: -realizedSincePrior },
        });
    }
    if (Math.abs(revaluation) > 1) {
        rows.push({
            row_key: "fair_value_revaluation_current_derived",
            label: "Fair value revaluation",
            values: { amount: revaluation },
        });
    }
    rows.push({
        row_key: "end_of_quarter_derived",
        label: "End of quarter derived fair value",
        values: { amount: current.fairValueEur },
        emphasis: "total",
    });
    return {
        section_key: "nav_bridge",
        title: "Derived value bridge",
        statement_type: "bridge",
        rows,
    };
}
function findPreviousPublishedPackage(packages: ReportingPackage[], currentQuarterKey: string) {
    return packages
        .filter((candidate) => compareQuarterPeriodsAsc(candidate.report_meta.quarter_key, currentQuarterKey) < 0)
        .sort((left, right) => compareQuarterPeriodsAsc(right.report_meta.quarter_key, left.report_meta.quarter_key))[0] ?? null;
}
function maxPositiveNumber(values: (number | null | undefined)[]) {
    const positives = values.filter((value): value is number => typeof value === "number" && value > 0);
    return positives.length > 0 ? Math.max(...positives) : null;
}
type HoldingScatterRange = [
    number,
    number
];
type HoldingCompanyScatterPoint = {
    key: string;
    name: string;
    reportPeriod: string;
    firstInvestmentDate: string;
    ageYears: number;
    moic: number;
    investedEur: number | null;
    fairValueEur: number | null;
    realizedCashEur: number | null;
    sector: string | null;
    country: string | null;
    stage: string | null;
    bubbleSizeValue: number | null;
};
function isFiniteNumericValue(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}
function parseQuarterEndDate(value: string | null | undefined) {
    if (!value)
        return null;
    const match = value.match(/^(\d{4})[_-]?Q([1-4])$/i);
    if (!match)
        return null;
    const year = Number.parseInt(match[1]!, 10);
    const quarter = Number.parseInt(match[2]!, 10);
    if (!Number.isFinite(year) || !Number.isFinite(quarter))
        return null;
    return new Date(Date.UTC(year, quarter * 3, 0));
}
function parseIsoDate(value: string | null | undefined) {
    if (!value)
        return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return null;
    return parsed;
}
function diffYears(later: Date, earlier: Date) {
    return (later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}
function normalizeUnderlyingHistoryMatchValue(value: string | null | undefined) {
    const trimmed = value?.trim().toLowerCase();
    if (!trimmed)
        return null;
    const normalized = trimmed.replace(/[^a-z0-9]+/g, " ").trim();
    return normalized.length > 0 ? normalized : null;
}
function collectUnderlyingHistoryMatchAliases(company: ReportingUnderlyingCompany) {
    return [
        company.linked_portfolio_holding_asset_code,
        company.linked_portfolio_holding_asset_name,
        company.linked_fund_name
    ]
        .map((value) => normalizeUnderlyingHistoryMatchValue(value))
        .filter((value): value is string => Boolean(value));
}
function buildHistoricalUnderlyingCompanyRowsFromPackages(packages: ReportingPackage[], reportPeriod: string, matchingHistoryAliases: ReadonlySet<string>) {
    return packages
        .filter((candidate) => compareQuarterPeriodsAsc(candidate.report_meta.quarter_key, reportPeriod) < 0)
        .flatMap((candidate) => (candidate.underlying_companies ?? [])
        .filter((row) => collectUnderlyingHistoryMatchAliases(row).some((alias) => matchingHistoryAliases.has(alias)))
        .map((row) => ({
        ...row,
        report_period: row.report_period || candidate.report_meta.quarter_key,
    })));
}
function computeUnderlyingCompanyAggregateMoic(rows: ReportingUnderlyingCompany[]) {
    const totalInvested = sumAvailableNumbers(rows.map((row) => row.invested_eur));
    const totalFairValue = sumAvailableNumbers(rows.map((row) => row.fair_value_eur));
    const totalRealizedCash = sumAvailableNumbers(rows.map((row) => row.realized_cash_eur));
    const totalStockProceeds = sumAvailableNumbers(rows.map((row) => row.proceeds_stock_eur));
    if (totalInvested != null &&
        totalInvested > 0 &&
        (totalFairValue != null || totalRealizedCash != null || totalStockProceeds != null)) {
        return ((totalFairValue ?? 0) + (totalRealizedCash ?? 0) + (totalStockProceeds ?? 0)) / totalInvested;
    }
    return firstDefinedValue(rows.map((row) => (isFiniteNumericValue(row.moic) ? row.moic : null)));
}
function compareQuarterPeriodsAsc(left: string, right: string) {
    const leftDate = parseQuarterEndDate(left);
    const rightDate = parseQuarterEndDate(right);
    if (leftDate && rightDate) {
        return leftDate.getTime() - rightDate.getTime();
    }
    if (leftDate)
        return -1;
    if (rightDate)
        return 1;
    return left.localeCompare(right, "en");
}
function buildHoldingCompanyScatterPoint(key: string, rows: ReportingUnderlyingCompany[], reportPeriod: string): HoldingCompanyScatterPoint | null {
    const reportDate = parseQuarterEndDate(reportPeriod);
    if (!reportDate)
        return null;
    const firstInvestmentDate = uniqueStrings(rows.map((row) => row.first_investment_date)).sort()[0] ?? null;
    const firstInvestment = parseIsoDate(firstInvestmentDate);
    if (!firstInvestmentDate || !firstInvestment)
        return null;
    const ageYears = diffYears(reportDate, firstInvestment);
    const moic = computeUnderlyingCompanyAggregateMoic(rows);
    if (!isFiniteNumericValue(ageYears) || ageYears < 0 || !isFiniteNumericValue(moic)) {
        return null;
    }
    const investedEur = sumAvailableNumbers(rows.map((row) => row.invested_eur));
    const fairValueEur = sumAvailableNumbers(rows.map((row) => row.fair_value_eur));
    const realizedCashEur = sumAvailableNumbers(rows.map((row) => row.realized_cash_eur));
    return {
        key,
        name: firstDefinedString(rows.map((row) => row.company_name)) ?? key,
        reportPeriod,
        firstInvestmentDate,
        ageYears,
        moic,
        investedEur,
        fairValueEur,
        realizedCashEur,
        sector: firstDefinedString(rows.map((row) => row.sector)) ?? null,
        country: firstDefinedString(rows.map((row) => row.country)) ?? null,
        stage: firstDefinedString(rows.map((row) => row.company_stage_current ?? row.company_stage_reported)) ?? null,
        bubbleSizeValue: investedEur != null && investedEur > 0 ? investedEur : null,
    } satisfies HoldingCompanyScatterPoint;
}
function buildHoldingCompanyScatterPoints(companies: ReportingUnderlyingCompany[], reportPeriod: string) {
    const currentRows = companies.filter((row) => !row.report_period || row.report_period === reportPeriod);
    const rowsByKey = buildUnderlyingCompanyRowsByKey(currentRows);
    return [...rowsByKey.entries()]
        .map(([key, rows]) => buildHoldingCompanyScatterPoint(key, rows, reportPeriod))
        .filter((point): point is HoldingCompanyScatterPoint => point !== null)
        .sort((left, right) => {
        const bubbleSizeDiff = (right.bubbleSizeValue ?? 0) - (left.bubbleSizeValue ?? 0);
        if (bubbleSizeDiff !== 0)
            return bubbleSizeDiff;
        return left.ageYears - right.ageYears;
    });
}
function buildHoldingCompanyScatterTrajectoryGroups(companies: ReportingUnderlyingCompany[]) {
    const rowsByKey = buildUnderlyingCompanyRowsByKey(companies);
    return [...rowsByKey.entries()]
        .map(([key, rows]) => {
        const rowsByPeriod = new Map<string, ReportingUnderlyingCompany[]>();
        for (const row of rows) {
            const period = row.report_period?.trim();
            if (!period)
                continue;
            const existing = rowsByPeriod.get(period);
            if (existing) {
                existing.push(row);
            }
            else {
                rowsByPeriod.set(period, [row]);
            }
        }
        const points = [...rowsByPeriod.entries()]
            .sort(([left], [right]) => compareQuarterPeriodsAsc(left, right))
            .map(([period, periodRows]) => buildHoldingCompanyScatterPoint(key, periodRows, period))
            .filter((point): point is HoldingCompanyScatterPoint => point !== null);
        if (points.length < 2)
            return null;
        return {
            key,
            points,
        };
    })
        .filter((group): group is {
        key: string;
        points: HoldingCompanyScatterPoint[];
    } => group !== null);
}
function projectHoldingScatterCoordinates(ageYears: number, moic: number, chartCanvasWidth: number, chartCanvasHeight: number, xRange: HoldingScatterRange, yRange: HoldingScatterRange) {
    const basePlotWidth = Math.max(chartCanvasWidth - HOLDING_SCATTER_PLOT_MARGINS.l - HOLDING_SCATTER_PLOT_MARGINS.r, 1);
    const basePlotHeight = Math.max(chartCanvasHeight - HOLDING_SCATTER_PLOT_MARGINS.t - HOLDING_SCATTER_PLOT_MARGINS.b, 1);
    const xSpan = Math.max(xRange[1] - xRange[0], 1e-6);
    const ySpan = Math.max(yRange[1] - yRange[0], 1e-6);
    return {
        cx: HOLDING_SCATTER_PLOT_MARGINS.l +
            ((ageYears - xRange[0]) / xSpan) * basePlotWidth,
        cy: HOLDING_SCATTER_PLOT_MARGINS.t +
            (1 - (moic - yRange[0]) / ySpan) * basePlotHeight,
    };
}
function getNiceScatterTickStep(span: number, targetTickCount: number) {
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
function buildScatterTicks(range: HoldingScatterRange, targetTickCount: number, formatter: (value: number) => string) {
    const [start, end] = range;
    const span = Math.max(end - start, 1e-6);
    const step = getNiceScatterTickStep(span, targetTickCount);
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
function buildScatterYearTicks(range: HoldingScatterRange) {
    const [start, end] = range;
    const firstYear = Math.max(0, Math.ceil(start));
    const lastYear = Math.floor(end);
    const step = lastYear - firstYear > 10 ? 2 : 1;
    const values: number[] = [];
    if (start <= 0 && end >= 0) {
        values.push(0);
    }
    for (let year = Math.max(1, firstYear); year <= lastYear; year += step) {
        values.push(year);
    }
    if (values.length === 0) {
        values.push(Math.max(0, Math.round(start)));
    }
    return {
        values,
        labels: values.map((value) => value.toLocaleString("en-GB")),
    };
}
function getScatterAxisRange(values: number[], { minSpan, paddingRatio, floorAtZero = false, }: {
    minSpan: number;
    paddingRatio: number;
    floorAtZero?: boolean;
}): HoldingScatterRange {
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
    return [Number(minValue.toFixed(6)), Number(maxValue.toFixed(6))];
}
function formatScatterTickLabel(value: number, maximumFractionDigits: number) {
    return value.toLocaleString("en-GB", {
        minimumFractionDigits: 0,
        maximumFractionDigits,
    });
}
function summarizeStrings(values: string[]) {
    if (values.length === 0)
        return null;
    if (values.length === 1)
        return values[0]!;
    return values.join(" · ");
}
function deriveExposureType(rows: ReportingUnderlyingCompany[]) {
    const hasIndirect = rows.some((row) => row.relationship_type === "underlying_fund_company");
    const hasDirect = rows.some((row) => row.relationship_type !== "underlying_fund_company");
    if (hasDirect && hasIndirect)
        return "Direct + indirect";
    if (hasDirect)
        return "Direct";
    if (hasIndirect)
        return "Indirect";
    return null;
}
function hasRenderableValue(value: React.ReactNode | null | undefined) {
    if (value == null)
        return false;
    return !(typeof value === "string" && value.trim() === "");
}
function getUnderlyingCompanySelectionKey(company: ReportingUnderlyingCompany) {
    const companyId = company.company_id?.trim();
    if (companyId)
        return companyId;
    const companyName = company.company_name?.trim();
    return companyName || null;
}
function buildUnderlyingCompanyRowsByKey(rows: ReportingUnderlyingCompany[]) {
    const rowsByKey = new Map<string, ReportingUnderlyingCompany[]>();
    for (const row of rows) {
        const key = getUnderlyingCompanySelectionKey(row);
        if (!key)
            continue;
        const existing = rowsByKey.get(key);
        if (existing) {
            existing.push(row);
        }
        else {
            rowsByKey.set(key, [row]);
        }
    }
    return rowsByKey;
}
function formatCompactLinkLabel(url: string, includePath = false) {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.replace(/^www\./i, "");
        const pathname = parsed.pathname.replace(/\/$/, "");
        if (includePath && pathname && pathname !== "/") {
            return `${hostname}${pathname}`;
        }
        return hostname;
    }
    catch {
        return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
    }
}
function UnderlyingCompanyExpandPanel({ company, companyRows, showTopBorder = true, showProfileTitle = true, animateProfileTitle = false, profileTitleId, }: {
    company: ReportingUnderlyingCompany;
    companyRows: ReportingUnderlyingCompany[];
    showTopBorder?: boolean;
    showProfileTitle?: boolean;
    animateProfileTitle?: boolean;
    profileTitleId?: string;
}) {
    const isExpoView = useIsExpoView();
    const shouldMaskUnderlyingCompanyMetrics = useShouldMaskUnderlyingCompanyMetrics();
    const relatedRows = useMemo(() => [...companyRows].sort((left, right) => {
        const periodCompare = (right.report_period ?? "").localeCompare(left.report_period ?? "");
        if (periodCompare !== 0)
            return periodCompare;
        return (left.linked_fund_name ?? "").localeCompare(right.linked_fund_name ?? "", "en");
    }), [companyRows]);
    const companyName = firstDefinedString(relatedRows.map((row) => row.company_name)) ?? company.company_name ?? "—";
    const shortDescription = firstDefinedString(relatedRows.map((row) => row.description_short)) ?? company.description_short ?? null;
    const websiteRaw = firstDefinedString(relatedRows.map((row) => row.website)) ?? company.website ?? null;
    const linkedinRaw = firstDefinedString(relatedRows.map((row) => row.linkedin)) ?? company.linkedin ?? null;
    const yearFounded = firstDefinedValue(relatedRows.map((row) => row.year_founded)) ?? company.year_founded ?? null;
    const industry = firstDefinedString(relatedRows.map((row) => row.industry)) ?? company.industry ?? null;
    const country = firstDefinedString(relatedRows.map((row) => row.country)) ?? company.country ?? null;
    const currentStageValues = uniqueStrings(relatedRows.map((row) => row.company_stage_current ?? row.company_stage_reported));
    const currentStatusValues = uniqueStrings(relatedRows.map((row) => row.current_status));
    const aldeaFunds = uniqueStrings(relatedRows.flatMap((row) => row.fund_scope_labels ?? []));
    const portfolioFunds = uniqueStrings(relatedRows.flatMap((row) => row.portfolio_fund_labels_current ?? []));
    const exposureType = deriveExposureType(relatedRows);
    const firstInvestmentDate = uniqueStrings(relatedRows.map((row) => row.first_investment_date)).sort()[0] ?? null;
    const totalInvested = sumAvailableNumbers(relatedRows.map((row) => row.invested_eur));
    const totalFairValue = sumAvailableNumbers(relatedRows.map((row) => row.fair_value_eur));
    const totalRealizedCash = sumAvailableNumbers(relatedRows.map((row) => row.realized_cash_eur));
    const totalStockProceeds = sumAvailableNumbers(relatedRows.map((row) => row.proceeds_stock_eur));
    const postMoneyEur = maxPositiveNumber(relatedRows.map((row) => row.post_money_eur_current));
    const aggregateMoic = totalInvested != null &&
        totalInvested > 0 &&
        (totalFairValue != null || totalRealizedCash != null || totalStockProceeds != null)
        ? ((totalFairValue ?? 0) + (totalRealizedCash ?? 0) + (totalStockProceeds ?? 0)) / totalInvested
        : null;
    const websiteUrl = normalizeWebsiteUrl(websiteRaw);
    const linkedinUrl = normalizeWebsiteUrl(linkedinRaw);
    const websiteValue = websiteUrl ? (<span className="inline-flex items-center gap-1 text-[#3D0028] underline decoration-[#3D0028]/18 underline-offset-2 transition-colors hover:text-[#3D0028]/72">
      <Globe2 className="h-3.5 w-3.5 shrink-0"/>
      <span>{formatCompactLinkLabel(websiteUrl)}</span>
    </span>) : websiteRaw;
    const linkedinValue = linkedinUrl ? (<span className="inline-flex items-center gap-1 text-[#3D0028] underline decoration-[#3D0028]/18 underline-offset-2 transition-colors hover:text-[#3D0028]/72">
      <span>{formatCompactLinkLabel(linkedinUrl, true)}</span>
    </span>) : linkedinRaw;
    const locationLabel = country ?? null;
    const flag = countryFlag(country);
    const stageSummary = summarizeStrings(currentStageValues);
    const statusSummary = summarizeStrings(currentStatusValues);
    const companySummary = shortDescription ?? null;
    const displayRealizedCash = totalRealizedCash != null && totalRealizedCash > 0
        ? formatCurrencyDisplay(totalRealizedCash, { mask: shouldMaskUnderlyingCompanyMetrics })
        : null;
    const keyStats = [
        {
            label: "Invested",
            value: totalInvested != null ? formatCurrencyDisplay(totalInvested, { mask: shouldMaskUnderlyingCompanyMetrics }) : null,
        },
        {
            label: "Fair Value",
            value: totalFairValue != null ? formatCurrencyDisplay(totalFairValue, { mask: shouldMaskUnderlyingCompanyMetrics }) : null,
        },
        {
            label: "MOIC",
            value: aggregateMoic != null ? formatMultipleDisplay(aggregateMoic, { mask: isExpoView }) : null,
        },
        {
            label: "Post-money",
            value: postMoneyEur != null ? formatCurrencyDisplay(postMoneyEur, { mask: shouldMaskUnderlyingCompanyMetrics }) : null,
        },
        {
            label: "Realized Cash",
            value: displayRealizedCash,
        }
    ].filter(({ value }) => hasRenderableValue(value));
    const heroSummaryItems = [industry, stageSummary, statusSummary].filter(Boolean) as string[];
    const heroMetaItems = [
        websiteValue ? <Fragment key="website">{websiteValue}</Fragment> : null,
        linkedinValue ? <Fragment key="linkedin">{linkedinValue}</Fragment> : null,
        yearFounded != null ? <span key="founded">Founded {yearFounded}</span> : null
    ].filter(Boolean) as React.ReactNode[];
    const holdingContextItems = [
        portfolioFunds.length > 0 ? { label: "Portfolio fund", value: formatTextDisplay(portfolioFunds.join(", "), { mask: isExpoView }) } : null,
        exposureType ? { label: "Investment type", value: formatTextDisplay(exposureType, { mask: isExpoView }) } : null,
        firstInvestmentDate ? { label: "First investment", value: formatDateDisplay(firstInvestmentDate, { mask: isExpoView }) } : null
    ].filter(Boolean) as Array<{
        label: string;
        value: string;
    }>;
    const valueCreationParts = [
        totalInvested != null ? `${formatCurrencyDisplay(totalInvested, { compact: true, mask: shouldMaskUnderlyingCompanyMetrics })} invested` : null,
        totalFairValue != null ? `${formatCurrencyDisplay(totalFairValue, { compact: true, mask: shouldMaskUnderlyingCompanyMetrics })} fair value` : null,
        totalRealizedCash != null && totalRealizedCash > 0 ? `${formatCurrencyDisplay(totalRealizedCash, { compact: true, mask: shouldMaskUnderlyingCompanyMetrics })} realized` : null
    ].filter(Boolean) as string[];
    const rowStageAtReportValue = (row: ReportingUnderlyingCompany) => {
        const reportedStage = row.company_stage_reported ?? null;
        const currentStage = row.company_stage_current ?? null;
        if (!reportedStage)
            return null;
        return reportedStage !== currentStage ? reportedStage : null;
    };
    const shouldShowPerFundKpis = relatedRows.length > 1 ||
        aldeaFunds.length > 1 ||
        relatedRows.some((row) => row.ownership != null) ||
        relatedRows.some((row) => hasRenderableValue(rowStageAtReportValue(row)));
    const panelSectionHead = (title: string, note?: string) => (<div className="mb-1.5 flex items-center gap-2">
      <div className="h-3 w-px rounded-full bg-black/55"/>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3D0028]/58">{title}</div>
      {note && <div className="text-[10px] text-charcoal/32">{note}</div>}
    </div>);
    return (<div className={cn("w-full max-w-full overflow-x-hidden whitespace-normal bg-transparent px-6 pt-0 pb-5", showTopBorder && "border-t border-[#3D0028]/8")}>
      <div className="space-y-4">
        <div>
          {panelSectionHead("Company Profile")}
          <div className="space-y-3.5 px-1 py-1">
            {showProfileTitle && (<div className={cn("min-w-0 space-y-1.5", animateProfileTitle && "animate-fade-up")}>
                <div id={profileTitleId} className="font-reporting text-[2rem] font-semibold leading-tight text-[#3D0028]">
                  {companyName}
                </div>
                {companySummary && (<div className="max-w-4xl text-[14px] leading-relaxed text-charcoal/58">
                    {companySummary}
                  </div>)}
              </div>)}

            {locationLabel && (<div className="text-[13px] text-charcoal/52">
                {flag ? `${flag} ` : ""}
                {locationLabel}
              </div>)}

            {heroSummaryItems.length > 0 && (<div className="flex flex-wrap items-center gap-2">
                {heroSummaryItems.map((item, index) => (<span key={`${item}-${index}`} className="inline-flex items-center rounded-full border border-[#3D0028]/12 bg-white/82 px-2.5 py-1 text-[11px] font-medium leading-none text-charcoal/66">
                    {item}
                  </span>))}
              </div>)}

            {companySummary && !showProfileTitle && (<p className="max-w-4xl text-[15px] leading-relaxed text-charcoal/74">{companySummary}</p>)}

            {heroMetaItems.length > 0 && (<div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[13px] text-charcoal/58">
                {heroMetaItems.map((item, index) => (<Fragment key={index}>
                    {index > 0 && <span className="text-charcoal/24">·</span>}
                    {item}
                  </Fragment>))}
              </div>)}
          </div>
        </div>

        <div className="border-t border-black/8 pt-4">
          {panelSectionHead("Aldea Exposure")}
          <div>
            <div className={cn("grid divide-y divide-black/8 sm:grid-cols-2 sm:divide-x sm:divide-y-0", keyStats.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
              {keyStats.map(({ label, value }) => (<div key={label} className="px-5 py-4">
                  <div className="text-[9px] uppercase tracking-[0.12em] text-[#3D0028]/52">{label}</div>
                  <div className="mt-1.5 text-[1.02rem] font-semibold text-charcoal">{value}</div>
                </div>))}
            </div>

            {holdingContextItems.length > 0 && (<div className="border-t border-black/8 py-4">
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-[13px] text-charcoal/68">
                  {holdingContextItems.map(({ label, value }) => (<div key={label} className="flex min-w-[220px] items-baseline gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#3D0028]/52">
                        {label}
                      </span>
                      <span>{value}</span>
                    </div>))}
                </div>
              </div>)}

            {valueCreationParts.length >= 2 && (<div className="border-t border-black/8 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#3D0028]/52">
                  Value creation
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-charcoal/74">
                  <span className="font-medium text-[#FF6A49]">{valueCreationParts[0]}</span>
                  <span className="text-[#FF6A49]/80">→</span>
                  <span>{valueCreationParts[1]}</span>
                  {valueCreationParts[2] && (<>
                      <span className="text-charcoal/24">+</span>
                      <span>{valueCreationParts[2]}</span>
                    </>)}
                </div>
              </div>)}
          </div>
        </div>

        {shouldShowPerFundKpis && (<div className="border-t border-black/8 pt-4">
            {panelSectionHead("Current Fund Snapshot")}
            <div>
              {relatedRows.map((row, index) => {
                const rowKey = `${row.company_id ?? company.company_id ?? "company"}-${row.linked_fund_name ?? "fund"}-${row.report_period ?? "period"}-${index}`;
                const realizedCashValue = row.realized_cash_eur != null && row.realized_cash_eur > 0
                    ? formatCurrencyDisplay(row.realized_cash_eur, { mask: shouldMaskUnderlyingCompanyMetrics })
                    : null;
                const stageAtReport = rowStageAtReportValue(row);
                const portfolioFundLabel = row.portfolio_fund_labels_current?.[0] ?? row.linked_fund_name ?? null;
                const fundScopeLabel = (row.fund_scope_labels ?? []).join(", ") || null;
                const snapshotHeaderItems = [
                    portfolioFundLabel ? formatTextDisplay(portfolioFundLabel, { mask: isExpoView }) : null,
                    formatReportPeriodLabel(row.report_period),
                    fundScopeLabel ? formatTextDisplay(fundScopeLabel, { mask: isExpoView }) : null
                ].filter(Boolean) as string[];
                const snapshotDetailItems = [
                    row.ownership != null ? { label: "Ownership", value: formatOwnershipDisplay(row.ownership, { mask: shouldMaskUnderlyingCompanyMetrics }) } : null,
                    row.invested_eur != null ? { label: "Invested", value: formatCurrencyDisplay(row.invested_eur, { mask: shouldMaskUnderlyingCompanyMetrics }) } : null,
                    row.fair_value_eur != null ? { label: "Fair Value", value: formatCurrencyDisplay(row.fair_value_eur, { mask: shouldMaskUnderlyingCompanyMetrics }) } : null,
                    row.moic != null ? { label: "MOIC", value: formatMultipleDisplay(row.moic, { mask: isExpoView }) } : null,
                    realizedCashValue ? { label: "Realized Cash", value: realizedCashValue } : null,
                    stageAtReport ? { label: "Stage at report date", value: formatTextDisplay(stageAtReport, { mask: isExpoView }) } : null
                ].filter((item): item is {
                    label: string;
                    value: string;
                } => item !== null);
                return (<div key={rowKey} className={cn("px-6 py-4", index > 0 && "border-t border-black/8")}>
                    {snapshotHeaderItems.length > 0 && (<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-medium text-charcoal">
                        {snapshotHeaderItems.map((item, itemIndex) => (<Fragment key={`${item}-${itemIndex}`}>
                            {itemIndex > 0 && <span className="text-charcoal/24">·</span>}
                            <span>{item}</span>
                          </Fragment>))}
                      </div>)}

                    {snapshotDetailItems.length > 0 && (<div className="mt-4 flex flex-wrap gap-x-8 gap-y-4 sm:gap-x-10">
                        {snapshotDetailItems.map((item, itemIndex) => (<div key={`${item.label}-${item.value}-${itemIndex}`} className="min-w-[118px]">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.11em] text-charcoal/44">
                              {item.label}
                            </div>
                            <div className="mt-1.5 text-[15px] font-medium leading-tight text-charcoal">
                              {item.value}
                            </div>
                          </div>))}
                      </div>)}
                  </div>);
            })}
            </div>
          </div>)}
      </div>
    </div>);
}
export function HoldingCompanyMoicScatter({ companies, reportPeriod, aldeaFundCode, }: {
    companies: ReportingUnderlyingCompany[];
    reportPeriod: string;
    aldeaFundCode?: string | null;
}) {
    const isExpoView = useIsExpoView();
    const isLpView = useIsLpView();
    const reportingDataSource = useReportingDataSource();
    const plotClipId = useId().replace(/:/g, "");
    const viewportFrameRef = useRef<HTMLDivElement | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const xRangeRef = useRef<HoldingScatterRange>([0, 4]);
    const yRangeRef = useRef<HoldingScatterRange>(HOLDING_COMPANY_SCATTER_DEFAULT_Y_RANGE);
    const [viewportWidth, setViewportWidth] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 });
    const [interactiveXRange, setInteractiveXRange] = useState<HoldingScatterRange | null>(null);
    const [interactiveYRange, setInteractiveYRange] = useState<HoldingScatterRange | null>(null);
    const [showTrajectories, setShowTrajectories] = useState(false);
    const [historicalTrajectoryCompanies, setHistoricalTrajectoryCompanies] = useState<ReportingUnderlyingCompany[]>([]);
    const [isLoadingTrajectoryHistory, setIsLoadingTrajectoryHistory] = useState(false);
    const [selectedPointKeys, setSelectedPointKeys] = useState<string[]>([]);
    const [hoveredPoint, setHoveredPoint] = useState<{
        point: HoldingCompanyScatterPoint;
        x: number;
        y: number;
    } | null>(null);
    const points = useMemo(() => buildHoldingCompanyScatterPoints(companies, reportPeriod), [companies, reportPeriod]);
    const matchingHistoryAliases = useMemo(() => Array.from(new Set(companies.flatMap((company) => collectUnderlyingHistoryMatchAliases(company)))).sort(), [companies]);
    const trajectorySourceCompanies = useMemo(() => [...historicalTrajectoryCompanies, ...companies], [companies, historicalTrajectoryCompanies]);
    const trajectoryGroups = useMemo(() => buildHoldingCompanyScatterTrajectoryGroups(trajectorySourceCompanies), [trajectorySourceCompanies]);
    const hasTrajectoryHistory = trajectoryGroups.length > 0;
    const chartViewportHeightPx = 452;
    const chartScrollViewportHeightPx = chartViewportHeightPx - HOLDING_SCATTER_AXIS_GUTTER_HEIGHT_PX;
    const baseChartCanvasHeightPx = chartScrollViewportHeightPx;
    // Domain panning and native canvas scrolling must not compete. Fitting the
    // canvas to the viewport keeps every projected point reachable as the X/Y
    // domains translate in response to ordinary wheel and trackpad scrolling.
    const chartCanvasWidth = Math.max(viewportWidth || 1140, 1);
    const automaticXRange = useMemo<HoldingScatterRange>(() => getScatterAxisRange(points.map((point) => point.ageYears), { minSpan: 4, paddingRatio: 0.08, floorAtZero: true }), [points]);
    const automaticYRange = useMemo<HoldingScatterRange>(() => {
        const maximumMoic = Math.max(...points.map((point) => point.moic), HOLDING_COMPANY_SCATTER_DEFAULT_Y_RANGE[1]);
        if (maximumMoic <= HOLDING_COMPANY_SCATTER_DEFAULT_Y_RANGE[1]) {
            return HOLDING_COMPANY_SCATTER_DEFAULT_Y_RANGE;
        }
        return [
            HOLDING_COMPANY_SCATTER_DEFAULT_Y_RANGE[0],
            Math.ceil(maximumMoic * 1.08)
        ];
    }, [points, reportingDataSource.kind]);
    const xRange = interactiveXRange ?? automaticXRange;
    const yRange = interactiveYRange ?? automaticYRange;
    const hasInteractiveView = (interactiveXRange !== null && !scatterYRangesEqual(interactiveXRange, automaticXRange)) ||
        (interactiveYRange !== null && !scatterYRangesEqual(interactiveYRange, automaticYRange));
    useEffect(() => {
        xRangeRef.current = xRange;
        yRangeRef.current = yRange;
    }, [xRange, yRange]);
    const xTicks = useMemo(() => buildScatterYearTicks(xRange), [xRange]);
    const yTicks = useMemo(() => buildScatterTicks(yRange, 7, (value) => formatScatterTickLabel(value, 1)), [yRange]);
    const maxBubbleSizeValue = useMemo(() => Math.max(...points.map((point) => point.bubbleSizeValue ?? 0), 0), [points]);
    const plotAreaWidth = Math.max(chartCanvasWidth - HOLDING_SCATTER_PLOT_MARGINS.l - HOLDING_SCATTER_PLOT_MARGINS.r, 1);
    const plotAreaHeight = Math.max(baseChartCanvasHeightPx - HOLDING_SCATTER_PLOT_MARGINS.t - HOLDING_SCATTER_PLOT_MARGINS.b, 1);
    const scrollViewportToDefaultPosition = useCallback((element: HTMLDivElement | null) => {
        if (!element || element.clientWidth <= 0 || element.clientHeight <= 0)
            return false;
        const maxLeft = Math.max(element.scrollWidth - element.clientWidth, 0);
        const maxTop = Math.max(element.scrollHeight - element.clientHeight, 0);
        const [xStart, xEnd] = automaticXRange;
        const xSpan = Math.max(xEnd - xStart, 1e-6);
        const targetX = clampNumber(HOLDING_SCATTER_DEFAULT_CENTER.x, xStart, xEnd);
        const xOffsetWithinPlot = ((targetX - xStart) / xSpan) * plotAreaWidth;
        const [yStart, yEnd] = automaticYRange;
        const ySpan = Math.max(yEnd - yStart, 1e-6);
        const targetY = clampNumber(yEnd > HOLDING_COMPANY_SCATTER_DEFAULT_Y_RANGE[1]
            ? (yStart + yEnd) / 2
            : HOLDING_SCATTER_DEFAULT_CENTER.y, yStart, yEnd);
        const yOffsetWithinPlot = (1 - (targetY - yStart) / ySpan) * plotAreaHeight;
        const nextLeft = clampNumber(HOLDING_SCATTER_PLOT_MARGINS.l + xOffsetWithinPlot - element.clientWidth / 2, 0, maxLeft);
        const nextTop = clampNumber(HOLDING_SCATTER_PLOT_MARGINS.t + yOffsetWithinPlot - element.clientHeight / 2, 0, maxTop);
        element.scrollTo({ left: nextLeft, top: nextTop });
        setScrollPosition({ left: nextLeft, top: nextTop });
        return true;
    }, [automaticXRange, automaticYRange, plotAreaHeight, plotAreaWidth, reportingDataSource.kind]);
    const resetViewportView = useCallback(() => {
        setHoveredPoint(null);
        setInteractiveXRange(null);
        setInteractiveYRange(null);
        xRangeRef.current = automaticXRange;
        yRangeRef.current = automaticYRange;
        scrollViewportToDefaultPosition(viewportRef.current);
    }, [automaticXRange, automaticYRange, scrollViewportToDefaultPosition]);
    const visibleXAxisTicks = useMemo(() => {
        const [start, end] = xRange;
        const span = Math.max(end - start, 1e-6);
        return xTicks.values
            .map((value, index) => {
            const offsetWithinPlot = ((value - start) / span) * plotAreaWidth;
            return {
                key: `${value}`,
                label: xTicks.labels[index] ?? formatScatterTickLabel(value, 0),
                left: HOLDING_SCATTER_PLOT_MARGINS.l + offsetWithinPlot - scrollPosition.left,
            };
        })
            .filter((tick) => tick.left >= -40 && tick.left <= viewportWidth + 40);
    }, [plotAreaWidth, scrollPosition.left, viewportWidth, xRange, xTicks.labels, xTicks.values]);
    const visibleYAxisTicks = useMemo(() => {
        const [start, end] = yRange;
        const span = Math.max(end - start, 1e-6);
        return yTicks.values
            .map((value, index) => {
            const offsetWithinPlot = (1 - (value - start) / span) * plotAreaHeight;
            return {
                key: `${value}`,
                label: yTicks.labels[index] ?? formatScatterTickLabel(value, 1),
                top: HOLDING_SCATTER_PLOT_MARGINS.t + offsetWithinPlot - scrollPosition.top,
            };
        })
            .filter((tick) => tick.top >= -16 && tick.top <= viewportHeight + 16);
    }, [plotAreaHeight, scrollPosition.top, viewportHeight, yRange, yTicks.labels, yTicks.values]);
    const renderedPoints = useMemo(() => {
        return points.map((point) => {
            const { cx, cy } = projectHoldingScatterCoordinates(point.ageYears, point.moic, chartCanvasWidth, baseChartCanvasHeightPx, xRange, yRange);
            const radius = point.bubbleSizeValue != null && maxBubbleSizeValue > 0
                ? Math.max(5, Math.sqrt(point.bubbleSizeValue / maxBubbleSizeValue) * 28)
                : 8;
            return {
                ...point,
                cx,
                cy,
                radius,
                hoverRadius: Math.max(radius + 4, 10),
                labelY: Math.max(HOLDING_SCATTER_PLOT_MARGINS.t + 11, cy - radius - 8),
            };
        });
    }, [baseChartCanvasHeightPx, chartCanvasWidth, isExpoView, maxBubbleSizeValue, points, xRange, yRange]);
    const selectedPointKeySet = useMemo(() => new Set(selectedPointKeys), [selectedPointKeys]);
    const trajectoryPaths = useMemo(() => {
        if (!showTrajectories)
            return [];
        const hasSelectedPoint = selectedPointKeys.length > 0;
        return trajectoryGroups
            .map((group) => {
            const isSelected = selectedPointKeySet.has(group.key);
            const projectedPoints = group.points.map((point) => {
                const { cx, cy } = projectHoldingScatterCoordinates(point.ageYears, point.moic, chartCanvasWidth, baseChartCanvasHeightPx, xRange, yRange);
                return {
                    cx,
                    cy,
                    reportPeriod: point.reportPeriod,
                };
            });
            if (projectedPoints.length < 2)
                return null;
            return {
                key: group.key,
                isSelected,
                path: projectedPoints
                    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.cx} ${point.cy}`)
                    .join(" "),
                historyMarkers: projectedPoints.slice(0, -1),
                lineAlpha: hasSelectedPoint ? (isSelected ? 0.62 : HOLDING_SCATTER_DIMMED_LINE_ALPHA) : 0.56,
                markerFillAlpha: hasSelectedPoint ? (isSelected ? 0.22 : 0.08) : 0.22,
                markerStrokeAlpha: hasSelectedPoint ? (isSelected ? 1 : 0.56) : 1,
            };
        })
            .filter((trajectory): trajectory is {
            key: string;
            isSelected: boolean;
            path: string;
            historyMarkers: {
                cx: number;
                cy: number;
                reportPeriod: string;
            }[];
            lineAlpha: number;
            markerFillAlpha: number;
            markerStrokeAlpha: number;
        } => trajectory !== null);
    }, [baseChartCanvasHeightPx, chartCanvasWidth, selectedPointKeySet, selectedPointKeys.length, showTrajectories, trajectoryGroups, xRange, yRange]);
    const tooltipWidthPx = 280;
    const containerWidth = viewportFrameRef.current?.getBoundingClientRect().width ?? 0;
    const hasSelectedPoint = selectedPointKeys.length > 0;
    const handlePointMove = (event: Pick<ReactMouseEvent<SVGGElement>, "clientX" | "clientY"> | Pick<ReactPointerEvent<SVGGElement>, "clientX" | "clientY">, point: HoldingCompanyScatterPoint) => {
        const bounds = viewportFrameRef.current?.getBoundingClientRect();
        if (!bounds)
            return;
        setHoveredPoint({
            point,
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
        });
    };
    const handlePointLeave = useCallback(() => {
        setHoveredPoint(null);
    }, []);
    useEffect(() => {
        const matchingHistoryAliasSet = new Set(matchingHistoryAliases);
        if (!aldeaFundCode || matchingHistoryAliasSet.size === 0) {
            setHistoricalTrajectoryCompanies([]);
            setIsLoadingTrajectoryHistory(false);
            return;
        }
        {
            setHistoricalTrajectoryCompanies(buildHistoricalUnderlyingCompanyRowsFromPackages(reportingDataSource.historyPackages, reportPeriod, matchingHistoryAliasSet));
            setIsLoadingTrajectoryHistory(false);
            return;
        }
    }, [aldeaFundCode, matchingHistoryAliases, reportPeriod, reportingDataSource]);
    useEffect(() => {
        const element = viewportRef.current;
        if (!element)
            return;
        const updateSize = () => {
            setViewportWidth(element.clientWidth);
            setViewportHeight(element.clientHeight);
        };
        updateSize();
        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", updateSize);
            return () => window.removeEventListener("resize", updateSize);
        }
        const observer = new ResizeObserver(updateSize);
        observer.observe(element);
        return () => observer.disconnect();
    }, [points.length]);
    useEffect(() => {
        const element = viewportRef.current;
        if (!element)
            return;
        let frameId = 0;
        const updateScroll = () => {
            frameId = 0;
            setScrollPosition({
                left: element.scrollLeft,
                top: element.scrollTop,
            });
        };
        updateScroll();
        const handleScroll = () => {
            if (frameId !== 0)
                return;
            frameId = window.requestAnimationFrame(updateScroll);
        };
        element.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            element.removeEventListener("scroll", handleScroll);
            if (frameId !== 0) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [points.length]);
    useEffect(() => {
        resetViewportView();
    }, [points.length, reportPeriod, resetViewportView]);
    useEffect(() => {
        if (!hasTrajectoryHistory && showTrajectories) {
            setShowTrajectories(false);
        }
    }, [hasTrajectoryHistory, showTrajectories]);
    useEffect(() => {
        const availableKeys = new Set(points.map((point) => point.key));
        setSelectedPointKeys((current) => {
            const next = current.filter((key) => availableKeys.has(key));
            return next.length === current.length ? current : next;
        });
    }, [points]);
    useEffect(() => {
        const frameElement = viewportFrameRef.current;
        const scrollElement = viewportRef.current;
        if (!frameElement || !scrollElement || points.length === 0)
            return;
        const applyYZoom = (sourceRange: HoldingScatterRange, zoomFactor: number, viewportY: number) => {
            const anchorValue = getScatterYValueAtPointer({
                range: sourceRange,
                pointerY: clampNumber(viewportY, 0, scrollElement.clientHeight),
                scrollTop: scrollElement.scrollTop,
                plotTop: HOLDING_SCATTER_PLOT_MARGINS.t,
                plotHeight: plotAreaHeight,
            });
            const nextRange = zoomScatterYRange({
                range: sourceRange,
                originalRange: automaticYRange,
                anchorValue,
                zoomFactor,
            });
            if (scatterYRangesEqual(nextRange, yRangeRef.current))
                return;
            yRangeRef.current = nextRange;
            setInteractiveYRange(scatterYRangesEqual(nextRange, automaticYRange) ? null : nextRange);
        };
        const applyPan = (deltaX: number, deltaY: number) => {
            const sourceXRange = xRangeRef.current;
            const sourceYRange = yRangeRef.current;
            const xSpan = sourceXRange[1] - sourceXRange[0];
            const ySpan = sourceYRange[1] - sourceYRange[0];
            const nextXRange = panScatterRange({
                range: sourceXRange,
                originalRange: automaticXRange,
                delta: (deltaX / plotAreaWidth) * xSpan,
            });
            const nextYRange = panScatterRange({
                range: sourceYRange,
                originalRange: automaticYRange,
                delta: (-deltaY / plotAreaHeight) * ySpan,
            });
            if (!scatterYRangesEqual(nextXRange, sourceXRange)) {
                xRangeRef.current = nextXRange;
                setInteractiveXRange(scatterYRangesEqual(nextXRange, automaticXRange) ? null : nextXRange);
            }
            if (!scatterYRangesEqual(nextYRange, sourceYRange)) {
                yRangeRef.current = nextYRange;
                setInteractiveYRange(scatterYRangesEqual(nextYRange, automaticYRange) ? null : nextYRange);
            }
        };
        return bindChartGestures(scrollElement, {
            onPan: applyPan,
            onZoom: (factor, pointer) => applyYZoom(yRangeRef.current, factor, pointer.y),
            onReset: resetViewportView,
        });
    }, [automaticXRange, automaticYRange, plotAreaHeight, plotAreaWidth, points.length, resetViewportView]);
    return (<div className="rounded-xl border border-black/8 bg-white/60 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <div className="text-[15px] font-semibold uppercase tracking-[0.14em] text-[#3D0028]">
              Underlying Company MOIC Scatter
            </div>
            <div className="text-[11px] font-medium tracking-normal text-charcoal/48">
              {"— Bubble size reflects invested capital"}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {hasInteractiveView ? (<button type="button" onClick={resetViewportView} className="inline-flex items-center rounded-full bg-transparent px-3 py-1 text-xs font-medium text-charcoal/48 transition-colors hover:bg-black/[0.035] hover:text-charcoal/72">
              Reset view
            </button>) : null}
          <button type="button" disabled={!hasTrajectoryHistory || isLoadingTrajectoryHistory} onClick={() => setShowTrajectories((current) => !current)} className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs transition-colors", !hasTrajectoryHistory || isLoadingTrajectoryHistory
            ? "cursor-not-allowed bg-transparent font-medium text-charcoal/28"
            : showTrajectories
                ? "font-semibold text-[#3D0028] underline underline-offset-4 decoration-[1.5px]"
                : "bg-transparent font-medium text-charcoal/48 hover:bg-black/[0.035] hover:text-charcoal/72")}>
            View Trajectory
          </button>
        </div>
      </div>

      {points.length > 0 ? (<div className="mt-4 grid h-full w-full overflow-hidden rounded-[20px] border border-[#3D0028]/10 bg-white/20" style={{
                gridTemplateColumns: `${HOLDING_SCATTER_AXIS_GUTTER_WIDTH_PX}px minmax(0, 1fr)`,
                gridTemplateRows: `minmax(0, 1fr) ${HOLDING_SCATTER_AXIS_GUTTER_HEIGHT_PX}px`,
            }} onMouseLeave={() => setHoveredPoint(null)}>
          <div className="relative border-r border-[#3D0028]/10 bg-[#F4F1EB]/88">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal/48">
              MOIC
            </div>
            {visibleYAxisTicks.map((tick) => (<div key={tick.key} className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-charcoal/48" style={{ top: `${tick.top}px` }}>
                {tick.label}
              </div>))}
          </div>
          <div ref={viewportFrameRef} className="relative min-h-0 min-w-0 overflow-hidden bg-white/10" style={{ height: `${chartScrollViewportHeightPx}px` }}>
            <div ref={viewportRef} tabIndex={0} role="region" aria-label="Scrollable investment scatter chart" data-testid="holding-company-moic-scatter-viewport" data-x-domain={`${xRange[0]},${xRange[1]}`} data-y-domain={`${yRange[0]},${yRange[1]}`} className="min-h-0 min-w-0 overflow-x-auto overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ height: `${chartScrollViewportHeightPx}px`, touchAction: "pan-x pan-y" }}>
              <div style={{ width: `${chartCanvasWidth}px`, height: `${baseChartCanvasHeightPx}px` }}>
                <svg viewBox={`0 0 ${chartCanvasWidth} ${baseChartCanvasHeightPx}`} className="block h-full w-full">
                  <defs>
                    <clipPath id={plotClipId}>
                      <rect x={HOLDING_SCATTER_PLOT_MARGINS.l} y={HOLDING_SCATTER_PLOT_MARGINS.t} width={plotAreaWidth} height={plotAreaHeight}/>
                    </clipPath>
                  </defs>
                  {trajectoryPaths.map((trajectory) => (<g key={`trajectory-${trajectory.key}`} clipPath={hasInteractiveView ? `url(#${plotClipId})` : undefined}>
                      <path d={trajectory.path} fill="none" stroke={`rgba(61,0,40,${trajectory.lineAlpha})`} strokeWidth={trajectory.isSelected ? 1.9 : 1.5} strokeDasharray="6 5"/>
                      {trajectory.historyMarkers.map((marker) => (<circle key={`${trajectory.key}-${marker.reportPeriod}`} cx={marker.cx} cy={marker.cy} r={4} fill={`rgba(216,134,255,${trajectory.markerFillAlpha})`} stroke={`rgba(244,241,235,${trajectory.markerStrokeAlpha})`} strokeWidth="1"/>))}
                    </g>))}
                  {yTicks.values.map((value) => {
                const y = HOLDING_SCATTER_PLOT_MARGINS.t +
                    (1 - (value - yRange[0]) / Math.max(yRange[1] - yRange[0], 1e-6)) *
                        (baseChartCanvasHeightPx - HOLDING_SCATTER_PLOT_MARGINS.t - HOLDING_SCATTER_PLOT_MARGINS.b);
                return (<line key={`y-grid-${value}`} x1={HOLDING_SCATTER_PLOT_MARGINS.l} x2={chartCanvasWidth - HOLDING_SCATTER_PLOT_MARGINS.r} y1={y} y2={y} stroke="rgba(0,0,0,0.08)" strokeWidth="1"/>);
            })}

                  {xTicks.values.map((value) => {
                const x = HOLDING_SCATTER_PLOT_MARGINS.l +
                    ((value - xRange[0]) / Math.max(xRange[1] - xRange[0], 1e-6)) *
                        (chartCanvasWidth - HOLDING_SCATTER_PLOT_MARGINS.l - HOLDING_SCATTER_PLOT_MARGINS.r);
                return (<line key={`x-grid-${value}`} x1={x} x2={x} y1={HOLDING_SCATTER_PLOT_MARGINS.t} y2={baseChartCanvasHeightPx - HOLDING_SCATTER_PLOT_MARGINS.b} stroke="rgba(0,0,0,0.08)" strokeWidth="1"/>);
            })}

                  {renderedPoints.map((point) => {
                const isHovered = hoveredPoint?.point.key === point.key;
                const isSelected = selectedPointKeySet.has(point.key);
                const isDimmed = hasSelectedPoint && !isSelected;
                return (<g key={point.key} clipPath={hasInteractiveView ? `url(#${plotClipId})` : undefined} className="cursor-pointer" onMouseEnter={(event) => handlePointMove(event, point)} onMouseMove={(event) => handlePointMove(event, point)} onMouseLeave={handlePointLeave} onClick={() => setSelectedPointKeys((current) => current.includes(point.key)
                        ? current.filter((key) => key !== point.key)
                        : [...current, point.key])} onPointerDown={(event) => handlePointMove(event, point)} onPointerUp={handlePointLeave} onPointerCancel={handlePointLeave} onPointerLeave={handlePointLeave}>
                        <circle cx={point.cx} cy={point.cy} r={point.hoverRadius} fill="transparent"/>
                        <circle cx={point.cx} cy={point.cy} r={point.radius} fill={isSelected
                        ? "rgba(216, 134, 255, 0.96)"
                        : isDimmed
                            ? `rgba(216, 134, 255, ${HOLDING_SCATTER_DIMMED_BUBBLE_OPACITY})`
                            : "rgba(216, 134, 255, 0.82)"} stroke={isSelected
                        ? "rgba(61,0,40,0.62)"
                        : isHovered
                            ? "rgba(61,0,40,0.56)"
                            : isDimmed
                                ? "rgba(61,0,40,0.12)"
                                : "rgba(61,0,40,0.24)"} strokeWidth={isSelected ? 2.4 : isHovered ? 2.2 : 1.6}/>
                        {!isLpView &&
                        (!hasInteractiveView ||
                            (point.ageYears >= xRange[0] && point.ageYears <= xRange[1] &&
                                point.moic >= yRange[0] && point.moic <= yRange[1])) ? (<text x={point.cx} y={point.labelY} textAnchor="middle" fontSize="10" fontWeight={isSelected || isHovered ? "600" : "500"} fill={isSelected || isHovered
                            ? "#3D0028"
                            : isDimmed
                                ? `rgba(61,0,40,${HOLDING_SCATTER_DIMMED_TEXT_ALPHA})`
                                : "rgba(61,0,40,0.84)"} pointerEvents="none">
                            {point.name}
                          </text>) : null}
                      </g>);
            })}
                </svg>
              </div>
            </div>
            {hoveredPoint ? (<div className={cn(PORTAL_TOOLTIP_PANEL_CLASSNAME, "pointer-events-none absolute z-10 min-w-[260px] max-w-[280px]")} style={{
                    left: `${Math.max(12, Math.min(hoveredPoint.x + 16, Math.max(containerWidth - tooltipWidthPx - 12, 12)))}px`,
                    top: `${Math.max(12, Math.min(hoveredPoint.y - 18, chartScrollViewportHeightPx - 180))}px`,
                }}>
                {!isLpView ? (<div className="mb-2 text-[14px] font-semibold text-black">
                    {hoveredPoint.point.name}
                  </div>) : null}
                <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-[13px]">
                  <div className="text-right text-black/58">Invested:</div>
                  <div className="text-left text-black">
                    {formatCurrencyDisplay(hoveredPoint.point.investedEur, { mask: isExpoView })}
                  </div>
                  <div className="text-right text-black/58">Fair value:</div>
                  <div className="text-left text-black">
                    {formatCurrencyDisplay(hoveredPoint.point.fairValueEur, { mask: isExpoView })}
                  </div>
                  <div className="text-right text-black/58">MOIC:</div>
                  <div className="text-left text-black">
                    {formatMultipleDisplay(hoveredPoint.point.moic, { mask: isExpoView })}
                  </div>
                  <div className="text-right text-black/58">First investment:</div>
                  <div className="text-left text-black">
                    {formatDateDisplay(hoveredPoint.point.firstInvestmentDate, { mask: isExpoView })}
                  </div>
                  <div className="text-right text-black/58">Sector:</div>
                  <div className="text-left text-black">
                    {hoveredPoint.point.sector ?? "—"}
                  </div>
                </div>
              </div>) : null}
          </div>
          <div className="border-r border-t border-[#3D0028]/10 bg-[#F4F1EB]/88"/>
          <div className="relative border-t border-[#3D0028]/10 bg-[#F4F1EB]/88">
            {visibleXAxisTicks.map((tick) => (<div key={tick.key} className="absolute top-2 -translate-x-1/2 text-[10px] font-medium text-charcoal/48" style={{ left: `${tick.left}px` }}>
                {tick.label}
              </div>))}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal/48">
              Years Since Deal Close
            </div>
          </div>
        </div>) : (<div className="mt-4 flex min-h-[260px] items-center justify-center rounded-[18px] border border-dashed border-black/8 bg-white/35 px-6 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-charcoal/42">Underlying Company MOIC Scatter</div>
            <p className="mt-2 text-sm text-charcoal/58">
              Not enough underlying company investment-date and MOIC data is available to plot this fund yet.
            </p>
          </div>
        </div>)}
    </div>);
}
function HoldingControlCenter({ holding, fundCompanies, allUnderlyingCompanies, aboveCostMetric, reportPeriod, fundCodeLabel, aldeaFundCode, localPreviewScatterRows }: {
    holding: ReportingHolding;
    fundCompanies: ReportingUnderlyingCompany[];
    allUnderlyingCompanies: ReportingUnderlyingCompany[];
    aboveCostMetric?: AboveCostMetric | null;
    reportPeriod: string;
    fundCodeLabel: string;
    aldeaFundCode?: string | null;
    localPreviewScatterRows?: import("@demo/lib/fund-reporting/types").FundScatterPoint[];
}) {
    const isExpoView = useIsExpoView();
    const shouldMaskUnderlyingCompanyMetrics = useShouldMaskUnderlyingCompanyMetrics();
    const reportingDataSource = useReportingDataSource();
    const priorityCompanyNames = reportingDataSource.priorityCompanyNames;
    const [showAll, setShowAll] = useState(false);
    const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
    const [pendingExpandedCompanyId, setPendingExpandedCompanyId] = useState<string | null>(null);
    const [footprintDimension, setFootprintDimension] = useState<FootprintDimension>("country");
    const [selectedExposure, setSelectedExposure] = useState<{
        kind: ExposureDrilldownKind;
        item: DistributionItem;
    } | null>(null);
    const portfolioFootprintTopBucketCount = 5;
    const portfolioFootprintMapHeightPx = 370;
    const topValueDriversSectionDomId = `top-value-drivers-${holding.asset_code}`;
    const getTopValueDriverRowDomId = (rowId: string) => `top-value-driver-${holding.asset_code}-${rowId}`;
    const getTopValueDriverProfileTitleDomId = (rowId: string) => `top-value-driver-profile-title-${holding.asset_code}-${rowId}`;
    const valueCreated = holding.fair_value_eur + holding.dpi * holding.net_invested_eur - holding.net_invested_eur;
    const scatterFocusId = useMemo(() => {
        const linkedFundIds = Array.from(new Set(fundCompanies
            .map((company) => company.linked_fund_record_id?.trim())
            .filter((value): value is string => Boolean(value))));
        if (linkedFundIds.length > 0) {
            return linkedFundIds[0]!;
        }
        return /^rec/i.test(holding.asset_code) ? holding.asset_code : null;
    }, [fundCompanies, holding.asset_code]);
    const snapshot = useMemo(() => {
        const cos = fundCompanies;
        const total = cos.length;
        const active = cos.filter(c => c.current_status === "ACTIVE").length;
        const exited = cos.filter(c => c.current_status?.startsWith("EXIT") && !c.current_status.includes("WRITE")).length;
        const writtenOff = cos.filter(c => c.current_status?.includes("WRITE")).length;
        const billionPlus = cos.filter(c => c.post_money_eur_current != null && c.post_money_eur_current >= 1e9).length;
        const firstDates = cos.map(c => c.first_investment_date).filter((d): d is string => Boolean(d)).sort();
        const sectorCount = new Set(cos.map(c => c.sector).filter(Boolean)).size;
        const industryCount = new Set(cos.map(c => c.industry).filter(Boolean)).size;
        const countryCount = new Set(cos.map(c => c.country).filter(Boolean)).size;
        const regionCount = new Set(cos.map(c => c.region).filter(Boolean)).size;
        const stageCount = new Set(cos.map(c => c.company_stage_current ?? c.company_stage_reported).filter(Boolean)).size;
        const invTypeCount = new Set(cos.map(c => c.investment_type).filter(Boolean)).size;
        return { total, active, exited, writtenOff, billionPlus, firstDates, sectorCount, industryCount, countryCount, regionCount, stageCount, invTypeCount };
    }, [fundCompanies]);
    const sortedByFairValue = useMemo(() => [...fundCompanies]
        .filter((company) => company.fair_value_eur != null && !hasExitedOrWrittenOffStatus(company))
        .sort((a, b) => {
        const leftIsPriority = priorityCompanyNames.some((priority) => (a.company_name ?? "").toLowerCase().includes(priority.toLowerCase()));
        const rightIsPriority = priorityCompanyNames.some((priority) => (b.company_name ?? "").toLowerCase().includes(priority.toLowerCase()));
        if (leftIsPriority || rightIsPriority)
            return comparePriorityNames(a.company_name, b.company_name, priorityCompanyNames);
        return (b.fair_value_eur ?? 0) - (a.fair_value_eur ?? 0);
    }), [fundCompanies, priorityCompanyNames]);
    const displayedCompanies = showAll ? sortedByFairValue : sortedByFairValue.slice(0, 5);
    const sectorMix = useMemo(() => distributionOf(fundCompanies.map(c => c.sector)), [fundCompanies]);
    const countryMix = useMemo(() => distributionOf(fundCompanies.map(getCountryExposureValue), { topN: portfolioFootprintTopBucketCount }), [fundCompanies]);
    const continentMix = useMemo(() => distributionOf(fundCompanies.map(getContinentExposureValue), { topN: portfolioFootprintTopBucketCount }), [fundCompanies]);
    const cityMix = useMemo(() => distributionOf(fundCompanies.map(getCityExposureValue), { topN: portfolioFootprintTopBucketCount }), [fundCompanies]);
    const regionMix = useMemo(() => distributionOf(fundCompanies.map(getRegionExposureValue), { topN: portfolioFootprintTopBucketCount }), [fundCompanies]);
    const stageMix = useMemo(() => distributionOf(fundCompanies.map(getActiveStageValue)), [fundCompanies]);
    const activeFootprintMix = useMemo(() => {
        switch (footprintDimension) {
            case "continent":
                return continentMix;
            case "city":
                return cityMix;
            case "region":
                return regionMix;
            case "country":
            default:
                return countryMix;
        }
    }, [cityMix, continentMix, countryMix, footprintDimension, regionMix]);
    const footprintCountryData = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const company of fundCompanies) {
            const country = getCountryExposureValue(company);
            if (!country)
                continue;
            counts[country] = (counts[country] ?? 0) + 1;
        }
        return counts;
    }, [fundCompanies]);
    const selectedFootprintCountry = selectedExposure?.kind === "country" && selectedExposure.item.label !== "Other"
        ? selectedExposure.item.label
        : null;
    const selectedExposureCompanies = useMemo(() => {
        if (!selectedExposure)
            return [];
        const matches = new Set(selectedExposure.item.matchValues);
        return [...fundCompanies]
            .filter((company) => {
            const value = getExposureValue(company, selectedExposure.kind);
            return value != null && matches.has(value);
        })
            .sort((a, b) => {
            const leftIsPriority = priorityCompanyNames.some((priority) => (a.company_name ?? "").toLowerCase().includes(priority.toLowerCase()));
            const rightIsPriority = priorityCompanyNames.some((priority) => (b.company_name ?? "").toLowerCase().includes(priority.toLowerCase()));
            if (leftIsPriority || rightIsPriority)
                return comparePriorityNames(a.company_name, b.company_name, priorityCompanyNames);
            const fairValueDiff = (b.fair_value_eur ?? -1) - (a.fair_value_eur ?? -1);
            if (fairValueDiff !== 0)
                return fairValueDiff;
            return (a.company_name ?? "").localeCompare(b.company_name ?? "", "en");
        });
    }, [fundCompanies, priorityCompanyNames, selectedExposure]);
    const topValueDriverCompanyIds = useMemo(() => new Set(sortedByFairValue.map((company) => company.company_id).filter((value): value is string => Boolean(value))), [sortedByFairValue]);
    const companyRowsById = useMemo(() => {
        const rowsById = new Map<string, ReportingUnderlyingCompany[]>();
        for (const row of allUnderlyingCompanies) {
            if (!row.company_id)
                continue;
            const existing = rowsById.get(row.company_id);
            if (existing) {
                existing.push(row);
            }
            else {
                rowsById.set(row.company_id, [row]);
            }
        }
        return rowsById;
    }, [allUnderlyingCompanies]);
    const sectionCls = "px-6 py-5 border-b border-black/8";
    const sectionLabel = (text: string) => (<div className="text-[15px] font-semibold uppercase tracking-[0.14em] text-[#3D0028] mb-4">{text}</div>);
    const statBox = (label: string, value: string | number) => (<div key={label}>
      <div className="text-[10px] uppercase tracking-[0.12em] text-charcoal/70 leading-none">{label}</div>
      <div className="mt-1 text-sm font-semibold text-charcoal">{value}</div>
    </div>);
    const overviewMetricItems = [
        { label: "Underlying companies", value: formatIntegerDisplay(snapshot.total, { mask: isExpoView }) },
        snapshot.billionPlus > 0 ? { label: "€1B+ Companies", value: formatIntegerDisplay(snapshot.billionPlus, { mask: isExpoView }) } : null,
        { label: "Sectors", value: formatIntegerDisplay(snapshot.sectorCount, { mask: isExpoView }) },
        { label: "Countries", value: formatIntegerDisplay(snapshot.countryCount, { mask: isExpoView }) },
        { label: "Stages", value: formatIntegerDisplay(snapshot.stageCount, { mask: isExpoView }) },
        { label: "Industries", value: formatIntegerDisplay(snapshot.industryCount, { mask: isExpoView }) },
        { label: "Regions", value: formatIntegerDisplay(snapshot.regionCount, { mask: isExpoView }) },
        { label: "Investment types", value: formatIntegerDisplay(snapshot.invTypeCount, { mask: isExpoView }) }
    ].filter((item): item is {
        label: string;
        value: string;
    } => item !== null);
    const overviewMetricColumns = [
        overviewMetricItems.filter((_, index) => index % 2 === 0),
        overviewMetricItems.filter((_, index) => index % 2 === 1)
    ];
    const toggleExposureSelection = (kind: ExposureDrilldownKind, item: DistributionItem) => {
        const isSameSelection = selectedExposure?.kind === kind && selectedExposure.item.label === item.label;
        if (isSameSelection) {
            setSelectedExposure(null);
            return;
        }
        setSelectedExposure({ kind, item });
    };
    const handleMapCountrySelect = (country: string | null) => {
        if (!country) {
            if (selectedExposure?.kind === "country") {
                setSelectedExposure(null);
            }
            return;
        }
        if (selectedExposure?.kind === "country" && selectedExposure.item.label === country) {
            setSelectedExposure(null);
            return;
        }
        const match = countryMix.find((item) => item.label === country);
        if (!match) {
            const count = footprintCountryData[country];
            if (!count)
                return;
            const total = Object.values(footprintCountryData).reduce((sum, value) => sum + value, 0);
            setFootprintDimension("country");
            setSelectedExposure({
                kind: "country",
                item: {
                    label: country,
                    count,
                    pct: total > 0 ? (count / total) * 100 : 0,
                    matchValues: [country],
                },
            });
            return;
        }
        setFootprintDimension("country");
        setSelectedExposure({ kind: "country", item: match });
    };
    const openCompanyInTopValueDrivers = (company: ReportingUnderlyingCompany) => {
        const targetId = company.company_id;
        if (!targetId)
            return;
        if (!topValueDriverCompanyIds.has(targetId)) {
            document.getElementById(topValueDriversSectionDomId)?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        if (!displayedCompanies.some((item) => item.company_id === targetId)) {
            setShowAll(true);
        }
        setExpandedCompanyId(targetId);
        setPendingExpandedCompanyId(targetId);
    };
    useEffect(() => {
        if (!pendingExpandedCompanyId)
            return;
        if (!displayedCompanies.some((company) => company.company_id === pendingExpandedCompanyId))
            return;
        const scrollTargetIntoView = () => {
            const titleEl = document.getElementById(getTopValueDriverProfileTitleDomId(pendingExpandedCompanyId));
            const rowEl = document.getElementById(getTopValueDriverRowDomId(pendingExpandedCompanyId));
            const sectionEl = document.getElementById(topValueDriversSectionDomId);
            (titleEl ?? rowEl ?? sectionEl)?.scrollIntoView({ behavior: "smooth", block: "center" });
            setPendingExpandedCompanyId(null);
        };
        if (typeof window !== "undefined") {
            const timeoutId = window.setTimeout(scrollTargetIntoView, 280);
            return () => window.clearTimeout(timeoutId);
        }
        scrollTargetIntoView();
    }, [displayedCompanies, pendingExpandedCompanyId, topValueDriversSectionDomId]);
    return (<div className="ml-5 border-l border-black/45">

      {/* 1 — Fund Identity */}
      <div className={sectionCls}>
        {sectionLabel("Fund Identity")}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-5">
          {[
            { label: "VC Firm", value: holding.vc_firm },
            { label: "Stage", value: holding.stage_label },
            { label: "Geography", value: holding.location },
            { label: "Vintage", value: holding.vintage_year != null ? String(holding.vintage_year) : null },
            { label: "Sector", value: holding.theme },
            { label: "Fund size", value: holding.fund_size_display }
        ].filter(r => r.value).map(({ label, value }) => (<div key={label} className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.12em] text-charcoal/70">{label}</span>
              <span className="text-sm font-medium text-charcoal">{value}</span>
            </div>))}
        </div>
        {holding.detail_blurb && (<div className="mt-5">
            <div className="text-[11px] uppercase tracking-[0.12em] text-charcoal/70 mb-1.5">Fund Description</div>
            <p className="text-xs leading-relaxed text-charcoal">{holding.detail_blurb}</p>
          </div>)}
      </div>

      {/* 2 — Aldea Position */}
      <div className={sectionCls}>
        {sectionLabel("Aldea Position")}

        {/* Hero cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          {[
            { label: "Fair Value", value: formatCurrencyDisplay(holding.fair_value_eur, { mask: isExpoView }), hero: true, tooltip: null },
            { label: "Value Created", value: valueCreated !== 0 ? formatCurrencyDisplay(valueCreated, { mask: isExpoView, signed: true }) : EXPO_PLACEHOLDER, hero: false, tooltip: "value-created" },
            { label: "TVPI", value: formatMultipleDisplay(holding.tvpi, { mask: isExpoView }), hero: false, tooltip: null },
            { label: "Net Invested", value: formatCurrencyDisplay(holding.net_invested_eur, { mask: isExpoView }), hero: false, tooltip: null }
        ].map(({ label, value, hero, tooltip }) => (<div key={label} className="rounded-xl border border-black/8 bg-white/70 px-3 py-3">
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-charcoal/70 flex items-center gap-1">
                {label}
                {tooltip === "value-created" && (<Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 shrink-0 text-charcoal/40 cursor-default"/>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className={cn(PORTAL_TOOLTIP_PANEL_CLASSNAME, "max-w-[260px]")}>
                      <p className="font-semibold mb-1">Fair Value + Realized Cash − Net Invested</p>
                      <p className="text-black">Realized cash is estimated as DPI × Net Invested. Includes distributions already returned to Aldea.</p>
                    </TooltipContent>
                  </Tooltip>)}
              </div>
              <div className={cn("font-reporting text-xl font-semibold leading-none", hero ? "text-[#3D0028]" : "text-charcoal")}>{value}</div>
            </div>))}
        </div>

        {/* Secondary metrics */}
        {(() => {
            const secondaryMetrics = ([
                { label: "Committed", value: formatCurrencyDisplay(holding.committed_eur, { mask: isExpoView }) },
                { label: "Drawdown", value: formatCurrencyDisplay(holding.drawdown_eur, { mask: isExpoView }) },
                holding.called_pct != null ? { label: "Called", value: formatPercentDisplay(holding.called_pct, { mask: isExpoView }) } : null,
                { label: "DPI", value: formatMultipleDisplay(holding.dpi, { mask: isExpoView }) },
                { label: "RVPI", value: formatMultipleDisplay(holding.rvpi, { mask: isExpoView }) },
                aboveCostMetric &&
                    !aboveCostMetric.insufficient_data &&
                    typeof aboveCostMetric.at_or_above_1x_moic_percentage === "number"
                    ? {
                        label: "At / above cost %",
                        value: `${(aboveCostMetric.at_or_above_1x_moic_percentage * 100).toFixed(1)}%`,
                    }
                    : null,
                holding.deal_count != null
                    ? { label: "Deals", value: formatIntegerDisplay(holding.deal_count, { mask: isExpoView }) }
                    : null
            ] as const).filter((r): r is {
                label: string;
                value: string;
            } => r !== null);
            return (<div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 lg:[grid-template-columns:repeat(var(--metric-count),minmax(0,1fr))]" style={{ ["--metric-count" as string]: secondaryMetrics.length }}>
              {secondaryMetrics.map(({ label, value }) => (<div key={label} className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-[0.12em] text-charcoal/70">{label}</span>
              <span className="text-sm font-semibold text-charcoal">{value}</span>
            </div>))}
            </div>);
        })()}

        <div className="mt-6">
          <FundScatterChart mode="compare" initialReportPeriod={reportPeriod} focusId={scatterFocusId} focusName={holding.asset_name} aldeaFundCode={aldeaFundCode} underlyingCompanies={allUnderlyingCompanies} comparisonFundLabel={fundCodeLabel} localPreviewRows={localPreviewScatterRows} viewMode={"default"}/>
        </div>

      </div>

      {/* 3 — Underlying Portfolio Overview */}
      {fundCompanies.length > 0 && (<div className={sectionCls}>
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] xl:gap-12">
            <div>
              {sectionLabel("Underlying Portfolio Overview")}
              <div className="grid gap-x-12 gap-y-4 sm:grid-cols-2 xl:max-w-[36rem]">
                {overviewMetricColumns.map((column, columnIndex) => (<div key={columnIndex} className="flex min-w-0 flex-col gap-y-4">
                    {column.map(({ label, value }) => statBox(label, value))}
                  </div>))}
              </div>
            </div>

            {(() => {
                const stats = [
                    { label: "Active", count: snapshot.active, hex: "#FF6A49" },
                    { label: "Exited", count: snapshot.exited, hex: "#FFDE68" },
                    { label: "Written off", count: snapshot.writtenOff, hex: "#7BF5B3" }
                ].filter((s) => s.count > 0);
                if (stats.length === 0)
                    return null;
                const total = stats.reduce((s, x) => s + x.count, 0);
                const cx = 94;
                const cy = 94;
                const r = 70;
                const sw = 34;
                const circ = 2 * Math.PI * r;
                const gap = stats.length > 1 ? 2.5 : 0;
                let cum = 0;
                const segments = stats.map(({ label, count, hex }) => {
                    const fraction = total ? count / total : 0;
                    const arcLength = fraction * circ;
                    const segmentGap = Math.min(gap, arcLength * 0.2);
                    const dash = arcLength - segmentGap;
                    const dashOffset = -cum - segmentGap / 2;
                    const midAngle = -Math.PI / 2 + (cum + arcLength / 2) / r;
                    const textX = cx + r * Math.cos(midAngle);
                    const textY = cy + r * Math.sin(midAngle);
                    cum += arcLength;
                    return { label, count, hex, dash, dashOffset, textX, textY, fraction };
                });
                return (<div>
                  {sectionLabel("Underlying Portfolio Status")}
                  <div className="flex w-full flex-col items-center gap-4">
                    <div className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row sm:justify-center sm:gap-7">
                      <svg className="shrink-0" width={cx * 2} height={cy * 2} viewBox={`0 0 ${cx * 2} ${cy * 2}`} role="img" aria-label={`Underlying Portfolio Status: ${stats.map(({ label, count }) => `${label}, ${count} companies`).join("; ")}`}>
                        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={sw}/>
                        {segments.map(({ label, count, hex, dash, dashOffset, fraction }) => (<circle key={label} cx={cx} cy={cy} r={r} fill="none" stroke={hex} strokeWidth={sw} strokeLinecap="butt" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={dashOffset} transform={`rotate(-90 ${cx} ${cy})`}>
                            <title>{label}: {count} companies ({Math.round(fraction * 100)}%)</title>
                          </circle>))}
                        {segments.map(({ label, count, textX, textY, fraction }) => fraction >= 0.08 ? (<text key={`t-${label}`} x={textX} y={textY} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="700" fill="#001E28">
                              {count}
                            </text>) : null)}
                        <text x={cx} y={cy - 3} textAnchor="middle" dominantBaseline="middle" fontSize="26" fontWeight="600" fill="#001E28">{total}</text>
                        <text x={cx} y={cy + 15} textAnchor="middle" fontSize="9" fill="#626262">Companies</text>
                      </svg>
                      <div className="flex flex-col gap-2.5">
                        {segments.map(({ label, count, hex, fraction }) => (<div key={label} className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: hex }}/>
                            <span className="whitespace-nowrap text-[11px] text-charcoal/60">{label}</span>
                            <span className="ml-auto whitespace-nowrap pl-3 text-[11px] font-medium tabular-nums text-charcoal">{count} · {Math.round(fraction * 100)}%</span>
                          </div>))}
                      </div>
                    </div>
                  </div>
                </div>);
            })()}
          </div>
        </div>)}

      {/* 4 — Underlying Company Scatter */}
      {holding.asset_type === "fund" && fundCompanies.length > 0 && (<div className={sectionCls}>
          <HoldingCompanyMoicScatter companies={fundCompanies} reportPeriod={reportPeriod} aldeaFundCode={aldeaFundCode}/>
        </div>)}

      {/* 5 — Top Value Drivers */}
      {sortedByFairValue.length > 0 && (<div className={sectionCls} id={topValueDriversSectionDomId}>
          {sectionLabel("Top Value Drivers")}
          <div className="overflow-hidden">
            <ScrollArea className="w-full">
              <div className="w-full min-w-0">
                <div className="grid rounded-t-[14px] border-b border-black/8 bg-[#3D0028] text-[#FF6A49]" style={{ gridTemplateColumns: TOP_VALUE_DRIVER_GRID_TEMPLATE }}>
                  {TOP_VALUE_DRIVER_METRIC_COLS.map(({ label, align }, index) => (<div key={`${label}-${index}`} className={cn("px-3 py-2 text-xs font-medium whitespace-nowrap", index === 0 && "px-2", align === "right" ? "text-right" : "text-left")}>
                      {label}
                    </div>))}
                </div>

                <div>
                  {displayedCompanies.map((c, i) => {
                const rowId = c.company_id ?? String(i);
                const isOpen = expandedCompanyId === rowId;
                const relatedCompanyRows = c.company_id ? (companyRowsById.get(c.company_id) ?? [c]) : [c];
                const rowGridTemplate = isOpen ? TOP_VALUE_DRIVER_OPEN_GRID_TEMPLATE : TOP_VALUE_DRIVER_GRID_TEMPLATE;
                return (<div key={rowId} id={getTopValueDriverRowDomId(rowId)}>
                        <button type="button" aria-label={isOpen ? `Collapse ${c.company_name} profile` : undefined} aria-expanded={isOpen} onClick={() => setExpandedCompanyId(isOpen ? null : rowId)} className={cn("group grid w-full cursor-pointer text-left transition-[grid-template-columns,background-color] duration-340 ease-[cubic-bezier(0.22,1,0.36,1)]", isOpen ? "bg-transparent" : "hover:bg-black/[0.02]")} style={{ gridTemplateColumns: rowGridTemplate }}>
                          <div className="flex items-start px-2 py-3">
                            <ChevronDown className={cn("mt-[3px] h-3 w-3 shrink-0 text-charcoal/30 transition-[transform,color,margin] duration-340 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-charcoal/60", isOpen ? "mt-[5px] rotate-180 text-charcoal/36" : "")}/>
                          </div>
                          <div className={cn("min-w-0 overflow-hidden transition-[padding,max-height] duration-340 ease-[cubic-bezier(0.22,1,0.36,1)]", isOpen ? "max-h-0 px-0 py-0" : "px-3 py-3")}>
                            <span className={cn("block overflow-hidden whitespace-normal font-semibold text-[#3D0028] transition-[opacity,transform,max-height] duration-340 ease-[cubic-bezier(0.22,1,0.36,1)]", isOpen
                        ? "pointer-events-none max-h-0 text-[15px] leading-snug opacity-0 translate-y-4 scale-[1.04]"
                        : "max-h-12 opacity-100 translate-y-0 text-[15px] leading-snug")}>
                              {c.company_name ?? "—"}
                            </span>
                          </div>
                          <div className={cn("overflow-hidden whitespace-nowrap text-[12px] text-charcoal/60 transition-[opacity,transform,padding,max-height] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)]", isOpen ? "pointer-events-none max-h-0 px-0 py-0 opacity-0 translate-y-1" : "max-h-10 px-3 py-3 opacity-100 translate-y-0")}>
                            {c.sector ?? "—"}
                          </div>
                          <div className={cn("overflow-hidden whitespace-nowrap text-[12px] text-charcoal/60 transition-[opacity,transform,padding,max-height] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)]", isOpen ? "pointer-events-none max-h-0 px-0 py-0 opacity-0 translate-y-1" : "max-h-10 px-3 py-3 opacity-100 translate-y-0")}>
                            {c.country ?? "—"}
                          </div>
                          <div className={cn("overflow-hidden whitespace-nowrap text-[12px] text-charcoal/60 transition-[opacity,transform,padding,max-height] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)]", isOpen ? "pointer-events-none max-h-0 px-0 py-0 opacity-0 translate-y-1" : "max-h-10 px-3 py-3 opacity-100 translate-y-0")}>
                            {c.company_stage_current ?? c.company_stage_reported ?? "—"}
                          </div>
                          <div className={cn("overflow-hidden whitespace-nowrap text-[12px] text-right font-semibold text-charcoal transition-[opacity,transform,padding,max-height] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)]", isOpen ? "pointer-events-none max-h-0 px-0 py-0 opacity-0 translate-y-1" : "max-h-10 px-3 py-3 opacity-100 translate-y-0")}>
                            {c.fair_value_eur != null ? formatCurrencyDisplay(c.fair_value_eur, { compact: true, mask: shouldMaskUnderlyingCompanyMetrics }) : EXPO_PLACEHOLDER}
                          </div>
                          <div className={cn("overflow-hidden whitespace-nowrap text-[12px] text-right text-charcoal transition-[opacity,transform,padding,max-height] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)]", isOpen ? "pointer-events-none max-h-0 px-0 py-0 opacity-0 translate-y-1" : "max-h-10 px-3 py-3 opacity-100 translate-y-0")}>
                            {c.moic != null ? formatMultipleDisplay(c.moic, { mask: isExpoView }) : EXPO_PLACEHOLDER}
                          </div>
                          <div className={cn("overflow-hidden whitespace-nowrap text-[12px] text-right text-charcoal/60 transition-[opacity,transform,padding,max-height] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)]", isOpen ? "pointer-events-none max-h-0 px-0 py-0 opacity-0 translate-y-1" : "max-h-10 px-3 py-3 opacity-100 translate-y-0")}>
                            {c.post_money_eur_current != null && c.post_money_eur_current > 0
                        ? formatCurrencyDisplay(c.post_money_eur_current, { compact: true, mask: shouldMaskUnderlyingCompanyMetrics })
                        : EXPO_PLACEHOLDER}
                          </div>
                        </button>

                        <div inert={!isOpen} aria-hidden={!isOpen} className={cn("overflow-hidden transition-[max-height,opacity,transform] duration-360 ease-[cubic-bezier(0.22,1,0.36,1)]", isOpen ? "max-h-[2200px] translate-y-0 opacity-100" : "max-h-0 -translate-y-0.5 opacity-0")}>
                          <div className="ml-5 border-l border-black/45">
                            <UnderlyingCompanyExpandPanel company={c} companyRows={relatedCompanyRows} showTopBorder={false} animateProfileTitle={true} profileTitleId={getTopValueDriverProfileTitleDomId(rowId)}/>
                          </div>
                        </div>
                        <div className={cn("border-b", isOpen ? "ml-5 border-black" : "border-black/8")}/>
                      </div>);
            })}
                </div>
              </div>
            </ScrollArea>
          </div>
          {sortedByFairValue.length > 5 && (<button type="button" onClick={() => setShowAll(v => !v)} className="mt-3 text-xs text-[#3D0028]/55 hover:text-[#3D0028] transition-colors">
              {showAll
                    ? "Show top 5 only ↑"
                    :
                        `View all ${sortedByFairValue.length} companies ↓`}
            </button>)}
        </div>)}

      {/* 6 — Portfolio Exposure */}
      {fundCompanies.length > 0 && (<div className="px-6 py-5">
          {sectionLabel("Portfolio Exposure")}
          {(<>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.85fr)] xl:items-start">
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-[18px] border border-black/18 bg-white/35">
                    <div className="overflow-hidden" style={{ height: `${portfolioFootprintMapHeightPx}px` }}>
              <PortfolioMap countryData={footprintCountryData} selectedCountry={selectedFootprintCountry} onCountryClick={handleMapCountrySelect}/>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <div className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.15em] text-charcoal">
                      Geography Mix
                    </div>
                    <div className="flex min-w-0 flex-1 justify-end gap-1 overflow-x-auto pb-1">
                      {FOOTPRINT_DIMENSION_OPTIONS.map((option) => {
                    const isActive = footprintDimension === option.value;
                    return (<button key={option.value} type="button" onClick={() => setFootprintDimension(option.value)} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] transition-colors", isActive
                            ? "bg-[#D886FF] text-[#3D0028]"
                            : "bg-black/[0.04] text-charcoal/60 hover:bg-black/[0.06] hover:text-charcoal")}>
                            {option.label}
                          </button>);
                })}
                    </div>
                  </div>

                  <CCMiniBarList title="Geography Mix" items={activeFootprintMix} hideTitle otherLabelCount={portfolioFootprintTopBucketCount} barColor="#FFDE68" drilldown={{
                    activeLabel: selectedExposure?.kind === footprintDimension ? selectedExposure.item.label : null,
                    onSelect: (item) => toggleExposureSelection(footprintDimension, item),
                }}/>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] xl:divide-x xl:divide-black/8">
                <CCMiniBarList title="Sector Mix" items={sectorMix} drilldown={{
                    activeLabel: selectedExposure?.kind === "sector" ? selectedExposure.item.label : null,
                    onSelect: (item) => toggleExposureSelection("sector", item),
                }}/>
                <CCStageDonut title="Active Stage Mix" items={stageMix} titleClassName="xl:pl-4" drilldown={{
                    activeLabel: selectedExposure?.kind === "stage" ? selectedExposure.item.label : null,
                    onSelect: (item) => toggleExposureSelection("stage", item),
                }}/>
              </div>

              <div className="mt-4">
                {selectedExposure && selectedExposureCompanies.length > 0 ? (<>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 text-[15px] font-semibold uppercase tracking-[0.14em] text-[#3D0028]">
                        {selectedExposure.item.label} -{" "}
                        {selectedExposureCompanies.length === 1 ? "1 company" : `${selectedExposureCompanies.length} companies`}
                      </div>
                      <button type="button" onClick={() => setSelectedExposure(null)} className="shrink-0 text-[11px] font-medium text-[#3D0028]/60 transition-colors hover:text-[#3D0028]">
                        Clear
                      </button>
                    </div>

                    <div className="flex flex-col divide-y divide-black/6">
                      {selectedExposureCompanies.map((company, index) => {
                        const companyKey = company.company_id ?? `${selectedExposure.kind}-${selectedExposure.item.label}-${index}`;
                        const stageLabel = company.company_stage_current ?? company.company_stage_reported;
                        const subtitleLine = [company.country, stageLabel, company.sector].filter(Boolean).join(" · ");
                        return (<button key={companyKey} type="button" onClick={() => openCompanyInTopValueDrivers(company)} className="flex w-full items-start py-3 text-left transition-colors hover:bg-black/[0.02] first:pt-0 last:pb-0">
                            <div className="min-w-0 flex-1 pl-4">
                              {company.company_name && (<div className="text-sm font-semibold leading-snug text-charcoal">{company.company_name}</div>)}
                              {subtitleLine && (<div className="mt-0.5 text-[11px] leading-relaxed text-charcoal/55">{subtitleLine}</div>)}
                            </div>
                          </button>);
                    })}
                    </div>
                  </>) : (<div className="flex min-h-[128px] items-center justify-center rounded-lg border border-dashed border-black/8 bg-white/35 px-6 text-center">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-charcoal/42">Exposure Drilldown</div>
                      <p className="mt-2 text-sm text-charcoal/58">
                        Select a country on the map or a category in the exposure charts above to view the matching companies.
                      </p>
                    </div>
                  </div>)}
              </div>
            </>)}
        </div>)}
    </div>);
}
function HoldingDetailRow({ holding, fundCompanies, allUnderlyingCompanies, aboveCostMetric, reportPeriod, fundCodeLabel, aldeaFundCode, localPreviewScatterRows, disableExpansion = false, showDrawdown = false }: {
    holding: ReportingHolding;
    fundCompanies: ReportingUnderlyingCompany[];
    allUnderlyingCompanies: ReportingUnderlyingCompany[];
    aboveCostMetric?: AboveCostMetric | null;
    reportPeriod: string;
    fundCodeLabel: string;
    aldeaFundCode?: string | null;
    localPreviewScatterRows?: import("@demo/lib/fund-reporting/types").FundScatterPoint[];
    disableExpansion?: boolean;
    showDrawdown?: boolean;
}) {
    const isExpoView = useIsExpoView();
    const [open, setOpen] = useState(false);
    const isExpandable = !disableExpansion;
    const valueCreated = holding.fair_value_eur + holding.dpi * holding.net_invested_eur - holding.net_invested_eur;
    const companyCount = fundCompanies.length;
    const metadataItems = [
        holding.vc_firm,
        holding.stage_label,
        holding.country_label ?? holding.location ?? null,
        holding.vintage_year != null ? String(holding.vintage_year) : null
    ].filter(Boolean) as string[];
    const gridTemplate = isExpandable && open
        ? getExplorerOpenGridTemplate(showDrawdown)
        : getExplorerGridTemplate(showDrawdown);
    useEffect(() => {
    }, [disableExpansion]);
    const rowBody = (<>
      <div className="flex min-w-0 items-start gap-3 px-4 py-4">
        {isExpandable ? (<ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-charcoal/30 transition-[transform,color,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-charcoal/60", open ? "mt-[5px] rotate-180 text-charcoal/36" : "mt-[3px]")}/>) : (<span className="mt-[3px] h-3.5 w-3.5 shrink-0" aria-hidden="true"/>)}
        <div className="min-w-0">
          <span className={cn("block whitespace-normal font-semibold text-[#3D0028] transition-[font-size,line-height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]", isExpandable && open ? "font-reporting text-[1.3rem] leading-tight" : "text-[15px] leading-snug")}>
            {holding.asset_name}
          </span>
          {metadataItems.length > 0 && (<div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 overflow-hidden text-[11px] leading-relaxed text-charcoal/46 transition-[max-height,opacity,transform,margin] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]", isExpandable && open ? "mt-0 max-h-0 -translate-y-1 opacity-0" : "mt-1 max-h-8 translate-y-0 opacity-100")}>
              {metadataItems.map((item, index) => (<Fragment key={`${item}-${index}`}>
                  {index > 0 && <span className="text-charcoal/20">·</span>}
                  <span>{item}</span>
                </Fragment>))}
            </div>)}
          {null}
        </div>
      </div>
      <div className={cn("overflow-hidden text-[14px] font-semibold text-right text-charcoal transition-[opacity,transform,padding] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)]", "whitespace-nowrap", isExpandable && open ? "pointer-events-none px-0 py-4 opacity-0 translate-y-1" : "pl-4 pr-6 py-4 opacity-100 translate-y-0")}>
        {(formatCurrencyDisplay(holding.committed_eur, { compact: true, mask: isExpoView }))}
      </div>
      {null}
      <div className={cn("overflow-hidden text-[14px] font-semibold text-right text-charcoal transition-[opacity,transform,padding] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)]", "whitespace-nowrap", isExpandable && open ? "pointer-events-none px-0 py-4 opacity-0 translate-y-1" : "pl-4 pr-6 py-4 opacity-100 translate-y-0")}>
        {(formatCurrencyDisplay(holding.fair_value_eur, { compact: true, mask: isExpoView }))}
      </div>
      <div className={cn("overflow-hidden text-[14px] font-semibold text-right text-charcoal transition-[opacity,transform,padding] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)]", "whitespace-nowrap", isExpandable && open ? "pointer-events-none px-0 py-4 opacity-0 translate-y-1" : "pl-4 pr-6 py-4 opacity-100 translate-y-0")}>
        {(formatCurrencyDisplay(valueCreated, { compact: true, signed: true, mask: isExpoView }))}
      </div>
      <div className={cn("overflow-hidden text-[14px] font-semibold text-right text-charcoal transition-[opacity,transform,padding] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)]", "whitespace-nowrap", isExpandable && open ? "pointer-events-none px-0 py-4 opacity-0 translate-y-1" : "pl-4 pr-6 py-4 opacity-100 translate-y-0")}>
        {(formatMultipleDisplay(holding.tvpi, { mask: isExpoView }))}
      </div>
      <div className={cn("overflow-hidden whitespace-nowrap text-[14px] font-semibold text-right text-charcoal transition-[opacity,transform,padding] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)]", isExpandable && open ? "pointer-events-none px-0 py-4 opacity-0 translate-y-1" : "pl-4 pr-6 py-4 opacity-100 translate-y-0")}>
        {formatIntegerDisplay(companyCount, { mask: isExpoView })}
      </div>
    </>);
    return (<div className="w-full min-w-0">
      {isExpandable ? (<button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className={cn("group grid w-full cursor-pointer text-left transition-[grid-template-columns,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]", open ? "sticky top-[72px] z-10 bg-[#F4F1EB]" : "hover:bg-black/[0.02]")} style={{ gridTemplateColumns: gridTemplate }}>
          {rowBody}
        </button>) : (<div className="grid w-full text-left" style={{ gridTemplateColumns: gridTemplate }}>
          {rowBody}
        </div>)}

      {isExpandable && open ? (<div className={cn("overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]", open ? "max-h-[2200px] translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0")}>
          <div className="max-h-[82vh] overflow-y-auto scrollbar-hide bg-transparent">
            <HoldingControlCenter holding={holding} fundCompanies={fundCompanies} allUnderlyingCompanies={allUnderlyingCompanies} aboveCostMetric={aboveCostMetric} reportPeriod={reportPeriod} fundCodeLabel={fundCodeLabel} aldeaFundCode={aldeaFundCode} localPreviewScatterRows={localPreviewScatterRows}/>
          </div>
        </div>) : null}
      <div className={cn("border-b", isExpandable && open ? "ml-5 border-black" : "border-black/8")}/>
    </div>);
}
function ExpandableSection({ id, title, summary, eyebrow, icon: Icon, tone = "blue", dark = false, children, }: {
    id: SectionId;
    title?: string;
    summary?: string;
    eyebrow: string;
    icon: typeof FileText;
    tone?: "blue" | "burgundy";
    dark?: boolean;
    children: React.ReactNode;
}) {
    return (<section id={sectionDomId(id)} className={cn("scroll-mt-28", id === "portfolio" ? "space-y-4" : "space-y-8", dark
            ? "section-dark relative pt-8 pb-14 -mr-16 sm:-mr-18 md:-mr-20 xl:-mr-28 2xl:-mr-32"
            : id === "overview"
                ? "bg-[#F4F1EB] pt-5 pb-12"
                : "border-t border-black/10 pt-14 pb-14")}>
      {dark && (<div className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 bg-[#3D0028]"/>)}
      <div className={cn("relative space-y-4", dark && "pr-16 sm:pr-18 md:pr-20 xl:pr-28 2xl:pr-32")}>
        <div className="flex items-center gap-3">
          <div className={cn("inline-flex rounded-[18px] p-3", dark && "bg-white/10 text-[#D886FF]", !dark && tone === "blue" && "bg-[#001E28] text-[#7BF5B3]", !dark && tone === "burgundy" && "bg-[#3D0028] text-[#D886FF]")}>
            <Icon className="h-5 w-5"/>
          </div>
          <div className={cn("text-xs uppercase tracking-[0.18em]", dark ? (id === "portfolio" ? "text-[#D886FF]" : "text-[#D886FF]/82") : "text-charcoal/42")}>
            {eyebrow}
          </div>
        </div>
        <div className="space-y-3">
          {title ? (<div className={cn("font-reporting text-2xl font-semibold leading-tight", id !== "overview" && id !== "portfolio" && "md:text-[2rem]", dark ? (id === "portfolio" ? "text-[#F4F4F4]/90" : "text-[#D886FF]") : "text-charcoal")}>
              {title}
            </div>) : null}
          {summary && <p className={cn("max-w-3xl text-sm leading-relaxed md:text-base", dark ? "text-[#F4F4F4]/60" : "text-charcoal/60")}>{summary}</p>}
        </div>
      </div>
      <div className={cn("relative", dark && "pr-16 sm:pr-18 md:pr-20 xl:pr-28 2xl:pr-32")}>{children}</div>
    </section>);
}
export default function FundReportSections({ reportPackage, onActiveSectionChange, scrollContainerRef, sectionRailClassName, portfolioSnapshotVariant = "default", dataSource, }: {
    reportPackage: ReportingPackage;
    onActiveSectionChange?: (sectionId: SectionId) => void;
    scrollContainerRef?: RefObject<HTMLElement | null>;
    sectionRailClassName?: string;
    portfolioSnapshotVariant?: "default" | "mango";
    portfolioScatterHistoryRows?: FundScatterPoint[];
    dataSource: ReportingDataSource;
}) {
    const viewMode = "mock";
    const rootRef = useRef<HTMLDivElement | null>(null);
    const visibleSectionLinks = useMemo(() => sectionLinks, []);
    const fundDisplayName = reportPackage.report_meta.fund_display_name?.trim() || "Selected fund";
    const fundCodeLabel = reportPackage.report_meta.fund_code?.trim() || fundDisplayName;
    const [activeSection, setActiveSection] = useState<SectionId>("overview");
    const [isRailHovered, setIsRailHovered] = useState(false);
    const [selectedIndustryKey, setSelectedIndustryKey] = useState("");
    const [activeSleeve, setActiveSleeve] = useState<HoldingScope>("fund_of_funds");
    const [holdingsSearch, setHoldingsSearch] = useState("");
    const [holdingThemeFilters, setHoldingThemeFilters] = useState<string[]>([]);
    const [holdingLocationFilters, setHoldingLocationFilters] = useState<string[]>([]);
    const [holdingSort, setHoldingSort] = useState<HoldingSortKey>("fair_value");
    const [showAllPortfolioExplorerRows, setShowAllPortfolioExplorerRows] = useState(false);
    const [underlyingCoCount, setUnderlyingCoCount] = useState<number | null>(null);
    const [fundHistoryPackages, setFundHistoryPackages] = useState<ReportingPackage[]>([]);
    const priorityFundNames = dataSource.priorityFundNames;
    useEffect(() => {
        const fundCode = reportPackage.report_meta?.fund_code;
        const quarterKey = reportPackage.report_meta?.quarter_key;
        if (!fundCode || !quarterKey)
            return;
        {
            setUnderlyingCoCount(new Set((reportPackage.underlying_companies ?? []).map((company) => company.company_id)).size);
            return;
        }
    }, [dataSource, reportPackage.report_meta?.fund_code, reportPackage.report_meta?.quarter_key, reportPackage.underlying_companies]);
    useEffect(() => {
        const fundCode = reportPackage.report_meta?.fund_code;
        if (!fundCode)
            return;
        {
            setFundHistoryPackages(dataSource.historyPackages);
            return;
        }
    }, [dataSource, reportPackage.report_meta?.fund_code]);
    const derivedPortfolioFallback = useMemo(() => reportPackage.portfolio_holdings.length === 0 && (reportPackage.underlying_companies?.length ?? 0) > 0
        ? buildDerivedPortfolioHoldingsFromUnderlyingCompanies(reportPackage.underlying_companies ?? [])
        : null, [reportPackage.portfolio_holdings, reportPackage.underlying_companies]);
    const basePortfolioHoldings = useMemo(() => derivedPortfolioFallback?.holdings ?? reportPackage.portfolio_holdings, [derivedPortfolioFallback, reportPackage.portfolio_holdings]);
    const effectivePortfolioHoldings = useMemo(() => basePortfolioHoldings, [basePortfolioHoldings]);
    const effectiveUnderlyingCompanies = useMemo(() => derivedPortfolioFallback?.companies ?? (reportPackage.underlying_companies ?? []), [derivedPortfolioFallback, reportPackage.underlying_companies]);
    const effectiveStrategySummary = useMemo(() => reportPackage.strategy_summary.length > 0
        ? reportPackage.strategy_summary
        : buildDerivedStrategySummaryFromHoldings(effectivePortfolioHoldings), [effectivePortfolioHoldings, reportPackage.strategy_summary]);
    const effectiveGeographyBreakdown = useMemo(() => reportPackage.geography_breakdown.length > 0
        ? reportPackage.geography_breakdown
        : buildDerivedBreakdownItemsFromCompanies(effectiveUnderlyingCompanies, getCountryExposureValue), [effectiveUnderlyingCompanies, reportPackage.geography_breakdown]);
    const effectiveIndustryBreakdown = useMemo(() => reportPackage.industry_breakdown.length > 0
        ? reportPackage.industry_breakdown
        : buildDerivedBreakdownItemsFromCompanies(effectiveUnderlyingCompanies, (company) => company.industry?.trim() || null), [effectiveUnderlyingCompanies, reportPackage.industry_breakdown]);
    const previousReportPackage = useMemo(() => findPreviousPublishedPackage(fundHistoryPackages, reportPackage.report_meta.quarter_key), [fundHistoryPackages, reportPackage.report_meta.quarter_key]);
    const previousEffectivePackageData = useMemo(() => {
        if (!previousReportPackage)
            return null;
        if (previousReportPackage.portfolio_holdings.length > 0) {
            return {
                holdings: previousReportPackage.portfolio_holdings,
                companies: previousReportPackage.underlying_companies ?? [],
            };
        }
        if ((previousReportPackage.underlying_companies?.length ?? 0) === 0) {
            return {
                holdings: [] as ReportingHolding[],
                companies: [] as ReportingUnderlyingCompany[],
            };
        }
        return buildDerivedPortfolioHoldingsFromUnderlyingCompanies(previousReportPackage.underlying_companies ?? []);
    }, [previousReportPackage]);
    const derivedCurrentToplineSummary = useMemo(() => buildDerivedFundToplineSummary(reportPackage, effectivePortfolioHoldings, effectiveUnderlyingCompanies), [effectivePortfolioHoldings, effectiveUnderlyingCompanies, reportPackage]);
    const derivedPreviousToplineSummary = useMemo(() => previousReportPackage && previousEffectivePackageData
        ? buildDerivedFundToplineSummary(previousReportPackage, previousEffectivePackageData.holdings, previousEffectivePackageData.companies)
        : null, [previousEffectivePackageData, previousReportPackage]);
    const derivedKeyMetrics = useMemo(() => buildDerivedKeyMetricsFromSummary(derivedCurrentToplineSummary, derivedPreviousToplineSummary), [derivedCurrentToplineSummary, derivedPreviousToplineSummary]);
    const effectiveKeyMetrics = useMemo(() => {
        return reportPackage.key_metrics.length > 0 ? reportPackage.key_metrics : derivedKeyMetrics;
    }, [derivedKeyMetrics, reportPackage.key_metrics]);
    const effectiveNavBridgeSection = useMemo(() => {
        return (reportPackage.financial_sections.find((section) => section.section_key === "nav_bridge") ??
            buildDerivedNavBridgeSectionFromSummary(derivedCurrentToplineSummary, derivedPreviousToplineSummary));
    }, [derivedCurrentToplineSummary, derivedPreviousToplineSummary, reportPackage.financial_sections]);
    useEffect(() => {
        setSelectedIndustryKey(effectiveIndustryBreakdown.find((item) => item.bucket_key !== "total")?.bucket_key ?? "");
    }, [effectiveGeographyBreakdown, effectiveIndustryBreakdown, reportPackage.financial_sections]);
    useEffect(() => {
        const scrollContainer = scrollContainerRef?.current ?? null;
        const scrollOffset = () => (scrollContainer ? scrollContainer.scrollTop : window.scrollY);
        const viewportHeight = () => (scrollContainer ? scrollContainer.clientHeight : window.innerHeight);
        const containerTop = () => (scrollContainer ? scrollContainer.getBoundingClientRect().top : 0);
        const sectionElements = visibleSectionLinks
            .map((section) => ({ id: section.id, element: rootRef.current?.querySelector<HTMLElement>(`#${sectionDomId(section.id)}`) ?? null }))
            .filter((entry): entry is {
            id: SectionId;
            element: HTMLElement;
        } => Boolean(entry.element));
        if (!sectionElements.length)
            return;
        let ticking = false;
        let sectionFrame = 0;
        const updateActiveSection = () => {
            ticking = false;
            const threshold = scrollOffset() + Math.min(viewportHeight() * 0.65, 560);
            const relativeContainerTop = containerTop();
            let nextSection = sectionElements[0]?.id ?? "overview";
            for (const { id, element } of sectionElements) {
                const sectionTop = scrollOffset() + element.getBoundingClientRect().top - relativeContainerTop;
                if (sectionTop <= threshold) {
                    nextSection = id;
                }
                else {
                    break;
                }
            }
            setActiveSection(nextSection);
        };
        const handleViewportChange = () => {
            if (ticking)
                return;
            ticking = true;
            sectionFrame = window.requestAnimationFrame(updateActiveSection);
        };
        updateActiveSection();
        const scrollTarget = scrollContainer ?? window;
        scrollTarget.addEventListener("scroll", handleViewportChange, { passive: true });
        window.addEventListener("resize", handleViewportChange);
        return () => {
            window.cancelAnimationFrame(sectionFrame);
            scrollTarget.removeEventListener("scroll", handleViewportChange);
            window.removeEventListener("resize", handleViewportChange);
        };
    }, [reportPackage, scrollContainerRef, visibleSectionLinks]);
    useEffect(() => {
        onActiveSectionChange?.(activeSection);
    }, [activeSection, onActiveSectionChange]);
    const allMetrics = useMemo(() => [...effectiveKeyMetrics].sort((a, b) => {
        const left = overviewMetricOrder.indexOf(a.metric_key as (typeof overviewMetricOrder)[number]);
        const right = overviewMetricOrder.indexOf(b.metric_key as (typeof overviewMetricOrder)[number]);
        return (left === -1 ? Number.MAX_SAFE_INTEGER : left) - (right === -1 ? Number.MAX_SAFE_INTEGER : right);
    }), [effectiveKeyMetrics]);
    const heroMetrics = useMemo(() => {
        const preferredKeys = reportPackage.key_metrics.length > 0
            ? [
                "tvpi_to_investors",
                "net_asset_value",
                "net_irr",
                "fair_value_of_current_portfolio"
            ]
            : [
                "tvpi_to_investors",
                "net_asset_value",
                "total_net_invested_in_portfolio_companies",
                "cumulative_distributions_to_fund"
            ];
        return preferredKeys
            .map((key) => findMetric(effectiveKeyMetrics, key))
            .filter((metric): metric is ReportingMetric => Boolean(metric));
    }, [effectiveKeyMetrics, reportPackage.key_metrics.length]);
    const fofStrategy = useMemo(() => effectiveStrategySummary.find((s) => s.strategy_key === "fund_of_funds") ?? null, [effectiveStrategySummary]);
    const directStrategy = useMemo(() => effectiveStrategySummary.find((s) => s.strategy_key === "direct_co_investment") ?? null, [effectiveStrategySummary]);
    const returnsMetrics = useMemo(() => ["tvpi_to_investors", "net_irr", "dpi_to_investors", "rvpi_to_investors", "gross_irr", "gross_multiple_to_cost"]
        .map((key) => findMetric(effectiveKeyMetrics, key))
        .filter((m): m is ReportingMetric => Boolean(m)), [effectiveKeyMetrics]);
    const fundValueMetrics = useMemo(() => [
        "net_asset_value",
        "residual_value",
        "fair_value_of_current_portfolio",
        "cash_borrowings_and_other_assets_liabilities",
        "carried_interest",
        "memo_fv_plus_cash_over_nav_before_accruals"
    ]
        .map((key) => findMetric(effectiveKeyMetrics, key))
        .filter((m): m is ReportingMetric => Boolean(m)), [effectiveKeyMetrics]);
    const capitalMetrics = useMemo(() => [
        "cumulative_paid_in_capital",
        "total_commitments_to_fund",
        "total_commitment_available_for_drawdown",
        "distributed_to_investors",
        "cumulative_distributions_to_fund",
        "total_net_invested_in_portfolio_companies",
        "total_additional_commitment_to_portfolio_companies",
        "paid_in_to_commitment_ratio"
    ]
        .map((key) => findMetric(effectiveKeyMetrics, key))
        .filter((m): m is ReportingMetric => Boolean(m)), [effectiveKeyMetrics]);
    const quarterLabel = useMemo(() => {
        const qk = reportPackage.report_meta.quarter_key;
        const match = qk.match(/(\d{4})-Q(\d)/);
        if (match)
            return `Q${match[2]} ${match[1]}`;
        return qk;
    }, [reportPackage]);
    const bridgeMetrics = useMemo(() => [
        findMetric(effectiveKeyMetrics, "gross_irr"),
        findMetric(effectiveKeyMetrics, "gross_multiple_to_cost"),
        findMetric(effectiveKeyMetrics, "net_irr"),
        findMetric(effectiveKeyMetrics, "tvpi_to_investors"),
        findMetric(effectiveKeyMetrics, "dpi_to_investors"),
        findMetric(effectiveKeyMetrics, "rvpi_to_investors")
    ].filter((metric): metric is ReportingMetric => Boolean(metric)), [effectiveKeyMetrics]);
    const strategyItems = useMemo(() => effectiveStrategySummary.filter((item) => item.strategy_key !== "total_portfolio_gross" && item.strategy_key !== "total_portfolio"), [effectiveStrategySummary]);
    const navBridgeSection = useMemo(() => effectiveNavBridgeSection, [effectiveNavBridgeSection]);
    const bridgeStartRow = useMemo(() => navBridgeSection?.rows.find((r) => r.row_key.includes("start_of_quarter")) ?? null, [navBridgeSection]);
    const bridgeEndRow = useMemo(() => navBridgeSection?.rows.find((r) => r.row_key.includes("end_of_quarter")) ?? null, [navBridgeSection]);
    const bridgeMovementRows = useMemo(() => (navBridgeSection?.rows ?? []).filter((r) => !r.row_key.includes("start_of_quarter") &&
        !r.row_key.includes("end_of_quarter") &&
        r.row_key !== "check_vs_residual_value_current" &&
        typeof r.values.amount === "number"), [navBridgeSection]);
    const currentSleeveHoldings = useMemo(() => {
        if (activeSleeve === "all")
            return effectivePortfolioHoldings;
        return effectivePortfolioHoldings.filter((holding) => holding.practice_type === activeSleeve);
    }, [activeSleeve, effectivePortfolioHoldings]);
    const exposureDirectCompanies = useMemo(() => {
        const directHoldingCompanies = effectivePortfolioHoldings
            .filter((holding) => holding.practice_type === "direct_co_investment")
            .map(mapHoldingToExposureCompany);
        const seen = new Set<string>();
        const combined: ReportingUnderlyingCompany[] = [];
        const pushUnique = (company: ReportingUnderlyingCompany) => {
            const key = (company.company_name ??
                company.linked_portfolio_holding_asset_name ??
                company.linked_portfolio_holding_asset_code ??
                company.company_id)
                ?.trim()
                .toLowerCase();
            if (!key || seen.has(key))
                return;
            seen.add(key);
            combined.push(company);
        };
        directHoldingCompanies.forEach(pushUnique);
        return combined;
    }, [effectivePortfolioHoldings]);
    const availableThemes = useMemo(() => ["all", ...new Set(currentSleeveHoldings.map((holding) => holding.theme).filter(Boolean))], [currentSleeveHoldings]);
    const availableLocations = useMemo(() => ["all", ...new Set(currentSleeveHoldings.map((holding) => holding.location).filter(Boolean))], [currentSleeveHoldings]);
    useEffect(() => {
        const valid = new Set(availableThemes);
        setHoldingThemeFilters((prev) => prev.filter((t) => valid.has(t)));
    }, [availableThemes]);
    useEffect(() => {
        const valid = new Set(availableLocations);
        setHoldingLocationFilters((prev) => prev.filter((l) => valid.has(l)));
    }, [availableLocations]);
    const filteredHoldings = useMemo(() => {
        const searchValue = holdingsSearch.trim().toLowerCase();
        const companyNamesByHoldingCode = new Map<string, string[]>();
        for (const company of effectiveUnderlyingCompanies) {
            const holdingCode = company.linked_portfolio_holding_asset_code?.trim();
            const companyName = company.company_name?.trim();
            if (!holdingCode || !companyName)
                continue;
            const names = companyNamesByHoldingCode.get(holdingCode) ?? [];
            names.push(companyName);
            companyNamesByHoldingCode.set(holdingCode, names);
        }
        const filtered = [...currentSleeveHoldings].filter((holding) => {
            if (holdingThemeFilters.length > 0 && !holdingThemeFilters.includes(holding.theme))
                return false;
            if (holdingLocationFilters.length > 0 && !holdingLocationFilters.includes(holding.location))
                return false;
            if (!searchValue)
                return true;
            return [
                holding.asset_name,
                holding.location,
                holding.theme,
                holding.detail_blurb,
                ...(companyNamesByHoldingCode.get(holding.asset_code) ?? [])
            ]
                .filter(Boolean)
                .some((field) => field!.toLowerCase().includes(searchValue));
        });
        filtered.sort((a, b) => {
            const leftName = `${a.asset_name} ${a.vc_firm ?? ""}`;
            const rightName = `${b.asset_name} ${b.vc_firm ?? ""}`;
            const leftIsPriority = priorityFundNames.some((priority) => leftName.toLowerCase().includes(priority.toLowerCase()));
            const rightIsPriority = priorityFundNames.some((priority) => rightName.toLowerCase().includes(priority.toLowerCase()));
            if (leftIsPriority || rightIsPriority)
                return comparePriorityNames(leftName, rightName, priorityFundNames);
            switch (holdingSort) {
                case "tvpi":
                    return b.tvpi - a.tvpi;
                case "committed":
                    return b.committed_eur - a.committed_eur;
                case "drawdown":
                    return b.drawdown_eur - a.drawdown_eur;
                case "name":
                    return a.asset_name.localeCompare(b.asset_name);
                case "fair_value":
                default:
                    return b.fair_value_eur - a.fair_value_eur;
            }
        });
        return filtered;
    }, [
        currentSleeveHoldings,
        effectiveUnderlyingCompanies,
        holdingLocationFilters,
        holdingSort,
        holdingThemeFilters,
        holdingsSearch,
        priorityFundNames
    ]);
    const explorerPositionCount = filteredHoldings.length;
    const visibleExplorerHoldings = useMemo(() => (showAllPortfolioExplorerRows ? filteredHoldings : filteredHoldings.slice(0, 10)), [filteredHoldings, showAllPortfolioExplorerRows]);
    const portfolioSnapshot = useMemo(() => {
        const holdings = effectivePortfolioHoldings;
        const fof = holdings.filter((h) => h.practice_type === "fund_of_funds");
        const direct = holdings.filter((h) => h.practice_type === "direct_co_investment");
        // Opportunity funds are classified as direct_co_investment in the data but are fund vehicles
        const opportunityFunds = direct.filter((h) => h.asset_type === "fund");
        const pureDirectCount = direct.length - opportunityFunds.length;
        const opportunityFundDealCount = opportunityFunds.reduce((sum, h) => sum + (h.deal_count ?? 0), 0);
        const underlyingCos = fof.reduce((sum, h) => sum + (h.deal_count ?? 0), 0) + direct.length;
        const rawUnderlying = effectiveUnderlyingCompanies;
        let packageUnderlyingCount: number | null = null;
        if (rawUnderlying.length > 0) {
            const seen = new Set<string>();
            for (const co of rawUnderlying) {
                if (!co.company_id || seen.has(co.company_id))
                    continue;
                seen.add(co.company_id);
            }
            packageUnderlyingCount = seen.size;
        }
        const fofFairValue = fof.reduce((sum, h) => sum + (h.fair_value_eur ?? 0), 0);
        const directFairValue = direct.reduce((sum, h) => sum + (h.fair_value_eur ?? 0), 0);
        const totalFairValue = fofFairValue + directFairValue;
        const fofInvested = fof.reduce((sum, h) => sum + (h.net_invested_eur ?? 0), 0);
        const directInvested = direct.reduce((sum, h) => sum + (h.net_invested_eur ?? 0), 0);
        const totalInvested = fofInvested + directInvested;
        return {
            positionCount: fof.length,
            underlyingCos,
            packageUnderlyingCount,
            fofCount: fof.length,
            directCount: direct.length,
            pureDirectCount,
            opportunityFundCount: opportunityFunds.length,
            opportunityFundDealCount,
            totalFairValue,
            totalInvested,
            fofFairValuePct: totalFairValue > 0 ? fofFairValue / totalFairValue : 0,
            directFairValuePct: totalFairValue > 0 ? directFairValue / totalFairValue : 0,
            fofInvestedPct: totalInvested > 0 ? fofInvested / totalInvested : 0,
            directInvestedPct: totalInvested > 0 ? directInvested / totalInvested : 0,
        };
    }, [effectivePortfolioHoldings, effectiveUnderlyingCompanies]);
    const hasStrategyCompositionData = useMemo(() => effectivePortfolioHoldings.length > 0 &&
        (portfolioSnapshot.fofCount > 0 || portfolioSnapshot.directCount > 0) &&
        (portfolioSnapshot.totalFairValue > 0 || portfolioSnapshot.totalInvested > 0), [
        effectivePortfolioHoldings.length,
        portfolioSnapshot.directCount,
        portfolioSnapshot.fofCount,
        portfolioSnapshot.totalFairValue,
        portfolioSnapshot.totalInvested
    ]);
    const scatterFundMetadata = useMemo(() => effectivePortfolioHoldings
        .filter((holding) => holding.asset_type === "fund")
        .map((holding) => ({
        name: holding.asset_name,
        sector: holding.theme || null,
        country: getHoldingCountryForScatter(holding),
    })), [effectivePortfolioHoldings]);
    const localPreviewScatterRows = useMemo(() => {
        {
            return buildLocalPreviewFundScatterHistoryRows(dataSource.historyPackages, {
                throughReportPeriod: reportPackage.report_meta.quarter_key,
                currentHoldings: effectivePortfolioHoldings,
            });
        }
    }, [
        dataSource,
        effectivePortfolioHoldings,
        reportPackage.report_meta.fund_code,
        reportPackage.report_meta.quarter_key
    ]);
    const handleJumpToSection = (id: SectionId) => {
        setActiveSection(id);
        rootRef.current?.querySelector<HTMLElement>(`#${sectionDomId(id)}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    return (<ReportingDataSourceContext.Provider value={dataSource}>
    <ReportingViewModeContext.Provider value={viewMode}>
      <div ref={rootRef} className="relative space-y-10 pr-16 sm:pr-18 md:pr-20 xl:pr-28 2xl:pr-32">
      {null}
      <div className="space-y-0">
        <ExpandableSection id="overview" title="Key Performance Indicators" eyebrow="Overview" icon={Landmark} tone="blue">
          <OverviewContent reportPackage={reportPackage} heroMetrics={heroMetrics} fofStrategy={fofStrategy} directStrategy={directStrategy} bridgeStartRow={bridgeStartRow} bridgeEndRow={bridgeEndRow} bridgeMovementRows={bridgeMovementRows} navBridgeSection={navBridgeSection} bridgeMetrics={bridgeMetrics} returnsMetrics={returnsMetrics} fundValueMetrics={fundValueMetrics} capitalMetrics={capitalMetrics} allMetrics={allMetrics} quarterLabel={quarterLabel} strategyItems={strategyItems}/>
        </ExpandableSection>



        <ExpandableSection id="portfolio" title="Portfolio Funds and Companies" eyebrow="Portfolio" icon={Building2} tone="burgundy">
          <div className="space-y-5">
            <div className="space-y-6">

              {(<div className="space-y-6 pt-9 pb-2">
                  <div className={cn("mx-auto grid w-full max-w-[1040px] grid-cols-2 justify-items-center gap-x-8 gap-y-6 sm:gap-x-10 lg:gap-x-12", "sm:grid-cols-4")}>
                    {([
                {
                    value: portfolioSnapshot.positionCount.toString(),
                    label: "Positions",
                    tooltip: portfolioSnapshotDefinitionsByLabel.Positions,
                    missing: false,
                },
                {
                    value: (underlyingCoCount ?? portfolioSnapshot.packageUnderlyingCount)?.toLocaleString("en-GB") ?? "—",
                    label: "Underlying companies",
                    tooltip: portfolioSnapshotDefinitionsByLabel["Underlying companies"],
                    missing: underlyingCoCount === null && portfolioSnapshot.packageUnderlyingCount === null,
                },
                {
                    value: reportPackage.current_unicorn_count != null
                        ? reportPackage.current_unicorn_count.toString()
                        : "—",
                    label: "Current unicorns",
                    tooltip: portfolioSnapshotDefinitionsByLabel["Current unicorns"],
                    missing: reportPackage.current_unicorn_count == null,
                },
                {
                    value: reportPackage.above_cost_metric?.insufficient_data
                        ? "—"
                        : (reportPackage.above_cost_metric?.at_or_above_1x_moic_count?.toLocaleString("en-GB") ?? "—"),
                    label: "Above cost",
                    tooltip: portfolioSnapshotDefinitionsByLabel["Above cost"],
                    missing: !reportPackage.above_cost_metric || !!reportPackage.above_cost_metric.insufficient_data,
                }
            ]).map(({ value, label, tooltip, missing }) => (<div key={label} className="flex w-full flex-col items-center px-1 py-1 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={cn("inline-block cursor-help text-center font-reporting text-3xl font-semibold", missing ? "text-charcoal/28" : "text-[#3D0028]")}>
                              {value}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className={cn(PORTAL_TOOLTIP_PANEL_CLASSNAME, "max-w-[260px]")}>
                            {tooltip}
                          </TooltipContent>
                        </Tooltip>
                        <div className="mt-1.5 text-center text-xs font-medium uppercase leading-tight tracking-[0.14em] text-charcoal/48">
                          {label}
                        </div>
                      </div>))}
                  </div>
                </div>)}

              <div className="space-y-2.5">
                {(<FundScatterChart mode="main" initialReportPeriod={reportPackage.report_meta.quarter_key} aldeaFundCode={reportPackage.report_meta.fund_code} fundMetadata={scatterFundMetadata} underlyingCompanies={effectiveUnderlyingCompanies} comparisonFundLabel={fundCodeLabel} localPreviewRows={localPreviewScatterRows} viewMode={viewMode} forceLocalPreviewRows={portfolioSnapshotVariant === "mango"} presentationVariant={"default"}/>)}

                {(<>
                    {fofStrategy && directStrategy ? (<div className="pt-8 space-y-5">
                        <div>
                          <div className="font-reporting text-2xl font-semibold leading-tight text-charcoal">
                            Fund of Funds vs Direct Investment
                          </div>
                        </div>
                        <div className="grid gap-2.5 pl-4 md:max-w-[700px] md:grid-cols-2 md:gap-3">
                          <StrategyCard strategy={fofStrategy} title="Fund of Funds"/>
                          <StrategyCard strategy={directStrategy} title="Direct Investment"/>
                        </div>
                      </div>) : null}
                    <div className="!mt-7 rounded-xl border border-black/8 bg-white/60 px-5 py-4 space-y-4">
                      <div className="text-xs text-charcoal/58">
                        <span className="font-bold uppercase tracking-[0.16em]">Strategy composition</span>
                        <span className="font-normal normal-case tracking-normal">
                          {" — Synthetic portfolio-company positions treated as direct investments"}
                        </span>
                      </div>
                      {hasStrategyCompositionData ? (<>
                          <div className="space-y-3">
                            {[
                    { label: "Fair value", fofPct: portfolioSnapshot.fofFairValuePct, directPct: portfolioSnapshot.directFairValuePct },
                    { label: "Capital invested", fofPct: portfolioSnapshot.fofInvestedPct, directPct: portfolioSnapshot.directInvestedPct }
                ].map(({ label, fofPct, directPct }) => (<div key={label} className="space-y-1.5">
                                <div className="text-[11px] text-charcoal/48">{label}</div>
                                <div className="flex h-8 w-full overflow-hidden rounded-full bg-black/6">
                                  <div className="flex items-center justify-center bg-[#FF6A49] text-xs font-semibold text-black transition-all duration-500" style={{ width: `${fofPct * 100}%` }}>
                                    {Math.round(fofPct * 100) > 12 ? (`${Math.round(fofPct * 100)}%`) : ""}
                                  </div>
                                  <div className="flex items-center justify-center bg-[#D886FF] text-xs font-semibold text-black transition-all duration-500" style={{ width: `${directPct * 100}%` }}>
                                    {Math.round(directPct * 100) > 12 ? (`${Math.round(directPct * 100)}%`) : ""}
                                  </div>
                                </div>
                              </div>))}
                          </div>
                          <div className="flex items-center justify-between pt-4">
                            <div className="flex items-center gap-3 text-[11px] text-charcoal/48">
                              <span>{`${portfolioSnapshot.fofCount} funds-of-funds`}</span>
                              <span className="h-3.5 w-px border-l border-dashed border-black/25"/>
                              {portfolioSnapshot.opportunityFundCount > 0 ? (<>
                                  <span>{`${portfolioSnapshot.pureDirectCount} direct co-investments`}</span>
                                  <span className="h-3.5 w-px border-l border-dashed border-black/25"/>
                                  <span>{`${portfolioSnapshot.opportunityFundDealCount} opportunity fund investments`}</span>
                                </>) : (<span>{`${portfolioSnapshot.directCount} direct co-investments`}</span>)}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-charcoal/48">
                              <span className="flex items-center gap-1.5">
                                <span className="inline-block h-2 w-2 rounded-full bg-[#FF6A49]"/>
                                FoF
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="inline-block h-2 w-2 rounded-full bg-[#D886FF]"/>
                                Direct
                              </span>
                            </div>
                          </div>
                        </>) : (<div className="rounded-[22px] border border-dashed border-black/10 bg-white/52 px-5 py-6 text-sm leading-relaxed text-charcoal/56">
                          Strategy composition is not available because this fund-quarter package does not include published portfolio holdings yet.
                        </div>)}
                    </div>
                  </>)}
                <div className="pt-10 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="font-reporting text-2xl font-semibold leading-tight whitespace-nowrap text-charcoal">Portfolio Explorer</div>
                    {null}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 xl:ml-auto xl:flex-nowrap xl:justify-end xl:gap-x-6">
                    <Select value={activeSleeve} onValueChange={(value) => setActiveSleeve(value as HoldingScope)}>
                      <SelectTrigger aria-label={`Strategy: ${formatHoldingScopeLabel(activeSleeve)}`} className="h-auto w-auto justify-start gap-2 border-none bg-transparent px-0 py-0 text-xs font-medium text-charcoal/58 shadow-none ring-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0">
                        <span className="text-xs font-medium text-charcoal/58">Strategy: {formatHoldingScopeLabel(activeSleeve)}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">
                          All
                        </SelectItem>
                        <SelectItem value="fund_of_funds" className="text-xs">
                          FoF
                        </SelectItem>
                        <SelectItem value="direct_co_investment" className="text-xs">
                          Direct
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <MultiSelectFilter label="Sector" allLabel="All sectors" options={availableThemes.filter((t) => t !== "all")} selected={holdingThemeFilters} onChange={setHoldingThemeFilters}/>
                    <MultiSelectFilter label="Location" allLabel="All locations" options={availableLocations.filter((l) => l !== "all")} selected={holdingLocationFilters} onChange={setHoldingLocationFilters}/>
                    <div className="xl:ml-4">
                      <Select value={holdingSort} onValueChange={(value) => setHoldingSort(value as HoldingSortKey)}>
                        <SelectTrigger aria-label={`Ranked by ${formatHoldingSortLabel(holdingSort)}`} className="h-auto w-auto justify-start gap-2 border-none bg-transparent px-0 py-0 text-xs font-medium text-charcoal/58 shadow-none ring-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0">
                          <span className="text-xs font-medium text-charcoal/58">Ranked by {formatHoldingSortLabel(holdingSort)}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fair_value" className="text-xs">
                            Fair value
                          </SelectItem>
                          <SelectItem value="tvpi" className="text-xs">
                            TVPI
                          </SelectItem>
                          <SelectItem value="committed" className="text-xs">
                            Committed
                          </SelectItem>
                          <SelectItem value="drawdown" className="text-xs">
                            Drawdown
                          </SelectItem>
                          <SelectItem value="name" className="text-xs">
                            Name
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative ml-auto w-full max-w-[300px] xl:ml-0 xl:w-[250px] xl:flex-none">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-charcoal/40"/>
                      <Input value={holdingsSearch} onChange={(event) => setHoldingsSearch(event.target.value)} placeholder="Search fund, company, sector, or note" className="h-8 rounded-full border border-black/20 bg-white/70 pl-9 text-sm text-charcoal placeholder:text-charcoal/40 focus-visible:border-black/30 focus-visible:ring-0 focus-visible:ring-offset-0"/>
                    </div>
                  </div>
                </div>

                <HoldingsDetailExplorer holdings={visibleExplorerHoldings} underlyingCompanies={effectiveUnderlyingCompanies} aboveCostMetric={reportPackage.above_cost_metric} reportPeriod={reportPackage.report_meta.quarter_key} fundCodeLabel={fundCodeLabel} aldeaFundCode={reportPackage.report_meta.fund_code} localPreviewScatterRows={localPreviewScatterRows}/>

                {explorerPositionCount > 10 && (<button type="button" onClick={() => setShowAllPortfolioExplorerRows((value) => !value)} className="text-xs text-[#3D0028]/55 transition-colors hover:text-[#3D0028]">
                    {showAllPortfolioExplorerRows
                ? "Show top 10 only"
                : `View all ${explorerPositionCount} funds & companies`}
                  </button>)}

                {null}
              </div>

            </div>
          </div>
        </ExpandableSection>

        {(<ExpandableSection id="exposure" title="" eyebrow="Exposure" icon={Globe2} tone="blue">
          <div className="space-y-6">
            {null}
            {(<>
                <FootprintMapChart title="Geographic Exposure" description={`${fundCodeLabel} company footprint by operating geography, with country bubbles and a switchable ranking view.`} companies={effectiveUnderlyingCompanies} directCompanies={exposureDirectCompanies} allowInvestmentScopeToggle={exposureDirectCompanies.length > 0} mapHeightPx={380} topBucketCount={5} holdingRows={effectivePortfolioHoldings}/>

                <BreakdownExplorer title="Industry exposure" description="Published industry-level exposure by euro value and reported company breadth." items={effectiveIndustryBreakdown} selectedKey={selectedIndustryKey} onSelect={setSelectedIndustryKey} defaultVisibleCount={10} expandLabel="industry exposures" flushList barColor="#FF6A49" companyRows={effectiveUnderlyingCompanies} companyBucketResolver={(company) => company.industry?.trim() || null} detailEyebrow="Selected industry" detailExpandLabel="companies" detailPanelClassName="xl:mt-[78px]" holdingRows={effectivePortfolioHoldings}/>
              </>)}

          </div>
          </ExpandableSection>)}


      </div>

      <div className={cn("pointer-events-none absolute top-44 bottom-0 -right-2 z-0 sm:-right-4 md:-right-6 xl:-right-10 2xl:-right-14", sectionRailClassName)}>
        <div className="pointer-events-auto sticky top-[calc(50vh-108px)] flex justify-end">
          <div className="flex flex-col items-end gap-2.5" onMouseEnter={() => setIsRailHovered(true)} onMouseLeave={() => setIsRailHovered(false)}>
            {visibleSectionLinks.map((section) => {
            const isActive = activeSection === section.id;
            const showLabel = isRailHovered || isActive;
            return (<button key={section.id} type="button" onClick={() => handleJumpToSection(section.id)} aria-current={isActive ? "true" : undefined} className="flex min-h-6 w-[148px] items-center justify-end gap-2.5 py-1 text-right">
                  {showLabel ? (<span className={cn("whitespace-nowrap text-sm transition-all duration-200", isActive ? "text-[#3D0028]" : "text-charcoal/48")}>
                      {section.label}
                    </span>) : null}
                  <span className={cn("shrink-0 rounded-full transition-all duration-200", isActive
                    ? isRailHovered ? "h-[2px] w-8 bg-[#3D0028]" : "h-[2px] w-7 bg-[#3D0028]"
                    : "h-[2px] w-4 bg-black/35")}/>
                </button>);
        })}
          </div>
        </div>
      </div>

      {(<div className="rounded-[30px] border border-black/8 bg-white p-5 shadow-[0_20px_60px_rgba(16,18,20,0.06)]">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-[16px] bg-[#f4f4f4] p-3 text-charcoal/70">
              <ShieldAlert className="h-5 w-5"/>
            </div>
            <div>
              <div className="font-medium text-charcoal">Current package scope</div>
              <p className="mt-2 text-[15px] leading-relaxed text-charcoal/60">
                {"This page is backed only by the deterministic public-demo dataset. Qualitative identities and relationships are preserved; every valuation, cash flow, performance figure, and other quantitative value shown here is synthetic."}
              </p>
            </div>
          </div>
        </div>)}
      </div>
    </ReportingViewModeContext.Provider>
    </ReportingDataSourceContext.Provider>);
}
