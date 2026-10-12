import type {
  FundScatterPoint,
  ReportingHolding,
  ReportingPackage,
  ReportingUnderlyingCompany,
} from "./types.ts";

type RawFundScatterRow = {
  fund_record_id: string;
  fund_kpi_record_id: string;
  name: string | null;
  company_count: number | null;
  vintage: number | null;
  aldea_fund: string | null;
  commitment_lcy: number | null;
  closing_date_first: string | null;
  drawdown_lcy: number | null;
  distributions_lcy: number | null;
  tvpi_final: number | null;
  tvpi_calc: number | null;
  tvpi_position: number | null;
  moic_calc: number | null;
  fx_to_eur: number | null;
  report_period: string | null;
};

type ScatterMetric = FundScatterPoint["metric"];

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function normalizeAldeaFundCode(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const directMatch = /^F(\d+)$/i.exec(trimmed);
    if (directMatch) return `F${directMatch[1]}`;

    const aldeaMatch = /Aldea Fund\s+(\d+)/i.exec(trimmed);
    if (aldeaMatch) return `F${aldeaMatch[1]}`;

    const atfMatch = /^ATF(\d+)$/i.exec(trimmed);
    if (atfMatch) return `F${atfMatch[1]}`;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeAldeaFundCode(item);
      if (normalized) return normalized;
    }
  }

  return null;
}

export function quarterIndexFromKey(quarterKey: string): number | null {
  const match = /^(\d{4})[_-]Q([1-4])$/.exec(quarterKey);
  if (!match) return null;
  const [, yearText, quarterText] = match;
  const year = Number(yearText);
  const quarter = Number(quarterText);
  return year * 4 + (quarter - 1);
}

export function quarterKeyFromIndex(index: number): string {
  const year = Math.floor(index / 4);
  const quarter = (index % 4) + 1;
  return `${year}_Q${quarter}`;
}

export function compareReportPeriodsDesc(left: string, right: string) {
  const leftIndex = quarterIndexFromKey(left);
  const rightIndex = quarterIndexFromKey(right);
  if (leftIndex != null && rightIndex != null) {
    return rightIndex - leftIndex;
  }
  return right.localeCompare(left);
}

export function periodDateFromQuarterKey(quarterKey: string): string | null {
  const match = /^(\d{4})[_-]Q([1-4])$/.exec(quarterKey);
  if (!match) return null;
  const [, year, quarter] = match;
  switch (quarter) {
    case "1":
      return `${year}-03-31`;
    case "2":
      return `${year}-06-30`;
    case "3":
      return `${year}-09-30`;
    case "4":
      return `${year}-12-31`;
    default:
      return null;
  }
}

function resolveTvpiMetric(row: RawFundScatterRow) {
  const tvpi = row.tvpi_final ?? row.tvpi_calc ?? row.tvpi_position ?? row.moic_calc ?? null;
  const metric: ScatterMetric =
    row.tvpi_final != null || row.tvpi_calc != null || row.tvpi_position != null ? "TVPI" : "MOIC";
  return { tvpi, metric };
}

function resolveCommitmentEur(row: RawFundScatterRow) {
  if (row.commitment_lcy == null || row.fx_to_eur == null) return null;
  return roundTo(row.commitment_lcy * row.fx_to_eur, 2);
}

function resolveLcyToEur(value: number | null, fxToEur: number | null) {
  if (value == null || fxToEur == null) return null;
  return roundTo(value * fxToEur, 2);
}

function resolveFairValueEur(row: RawFundScatterRow, tvpi: number | null) {
  const drawdownEur = resolveLcyToEur(row.drawdown_lcy, row.fx_to_eur);
  if (drawdownEur == null || tvpi == null) return null;

  const distributionsEur = resolveLcyToEur(row.distributions_lcy ?? 0, row.fx_to_eur) ?? 0;
  return roundTo(drawdownEur * tvpi - distributionsEur, 2);
}

function resolveValueCreatedEur(row: RawFundScatterRow, tvpi: number | null) {
  const drawdownEur = resolveLcyToEur(row.drawdown_lcy, row.fx_to_eur);
  if (drawdownEur == null || tvpi == null) return null;
  return roundTo(drawdownEur * (tvpi - 1), 2);
}

function resolveAgeYears(reportPeriod: string | null, closingDateFirst: string | null) {
  if (!reportPeriod || !closingDateFirst) return null;
  const periodDate = periodDateFromQuarterKey(reportPeriod);
  if (!periodDate) return null;

  const closing = new Date(`${closingDateFirst}T00:00:00Z`);
  const period = new Date(`${periodDate}T00:00:00Z`);
  if (Number.isNaN(closing.getTime()) || Number.isNaN(period.getTime())) return null;

  const diffMs = period.getTime() - closing.getTime();
  return roundTo(diffMs / (365.25 * 24 * 60 * 60 * 1000), 2);
}

function resolveApproximateAgeYearsFromVintage(reportPeriod: string, vintageYear: number | null | undefined) {
  if (vintageYear == null || !Number.isFinite(vintageYear)) return null;

  const periodDate = periodDateFromQuarterKey(reportPeriod);
  if (!periodDate) return null;

  const vintageStart = new Date(`${Math.round(vintageYear)}-01-01T00:00:00Z`);
  const period = new Date(`${periodDate}T00:00:00Z`);
  if (Number.isNaN(vintageStart.getTime()) || Number.isNaN(period.getTime())) return null;

  const diffMs = period.getTime() - vintageStart.getTime();
  return roundTo(Math.max(diffMs, 0) / (365.25 * 24 * 60 * 60 * 1000), 2);
}

function dedupeRows(rows: RawFundScatterRow[]) {
  const deduped = new Map<string, RawFundScatterRow>();

  for (const row of rows) {
    if (!row.report_period) continue;
    const key = `${row.fund_record_id}:${row.report_period}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, row);
      continue;
    }

    const currentScore = [
      row.name,
      row.vintage,
      row.aldea_fund,
      row.commitment_lcy,
      row.closing_date_first,
      row.tvpi_final,
      row.tvpi_calc,
      row.tvpi_position,
      row.moic_calc,
      row.fx_to_eur,
    ].filter((value) => value != null).length;

    const existingScore = [
      existing.name,
      existing.vintage,
      existing.aldea_fund,
      existing.commitment_lcy,
      existing.closing_date_first,
      existing.tvpi_final,
      existing.tvpi_calc,
      existing.tvpi_position,
      existing.moic_calc,
      existing.fx_to_eur,
    ].filter((value) => value != null).length;

    if (currentScore > existingScore) {
      deduped.set(key, row);
    }
  }

  return [...deduped.values()];
}

function averageNullableNumbers(values: Array<number | null | undefined>) {
  const present = values.filter((value): value is number => value != null);
  if (present.length === 0) return null;
  return roundTo(present.reduce((sum, value) => sum + value, 0) / present.length, 2);
}

function averageNullableIntegers(values: Array<number | null | undefined>) {
  const averaged = averageNullableNumbers(values);
  return averaged == null ? null : Math.round(averaged);
}

function sumNullableNumbers(values: Array<number | null | undefined>) {
  const present = values.filter((value): value is number => value != null);
  if (present.length === 0) return null;
  return roundTo(present.reduce((sum, value) => sum + value, 0), 2);
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeLookupKey(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function yearFromIsoDate(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const match = /^(\d{4})/.exec(normalized);
  return match ? Number(match[1]) : null;
}

function resolveCompanyInvestmentVintageYear(company: ReportingUnderlyingCompany) {
  return yearFromIsoDate(company.first_investment_date);
}

function resolveCompanyExposureEur(company: ReportingUnderlyingCompany) {
  if (company.fair_value_eur != null) return company.fair_value_eur;
  return company.invested_eur ?? null;
}

function resolveAggregateMetric(points: FundScatterPoint[]): ScatterMetric {
  const metrics = Array.from(new Set(points.map((point) => point.metric)));
  if (metrics.length === 1) {
    return metrics[0]!;
  }
  return "MIXED";
}

function matchesVintage(left: number | null, right: number | null) {
  if (left == null || right == null) return left == null && right == null;
  return Math.round(left) === Math.round(right);
}

function buildAverageScatterPoint(
  points: FundScatterPoint[],
  options: {
    id: string;
    name: string;
    reportPeriod: string;
    aldeaFund: string | null;
    vintage?: number | null;
  },
) {
  return {
    id: options.id,
    name: options.name,
    entity_type: "peer_average",
    fund_count: points.length,
    company_count: averageNullableIntegers(points.map((row) => row.company_count)),
    vintage: options.vintage ?? averageNullableNumbers(points.map((row) => row.vintage)),
    aldea_fund: options.aldeaFund,
    commitment_eur: averageNullableNumbers(points.map((row) => row.commitment_eur)),
    fair_value_eur: averageNullableNumbers(points.map((row) => row.fair_value_eur)),
    value_created_eur: averageNullableNumbers(points.map((row) => row.value_created_eur)),
    tvpi: averageNullableNumbers(points.map((row) => row.tvpi)),
    metric: resolveAggregateMetric(points),
    age_years: averageNullableNumbers(points.map((row) => row.age_years)),
    tvpi_1y: averageNullableNumbers(points.map((row) => row.tvpi_1y)),
    tvpi_2y: averageNullableNumbers(points.map((row) => row.tvpi_2y)),
    report_period: options.reportPeriod,
  } satisfies FundScatterPoint;
}

export function buildFundScatterRows(rows: RawFundScatterRow[]): FundScatterPoint[] {
  const dedupedRows = dedupeRows(rows);
  const resolved = dedupedRows
    .filter((row) => row.report_period && row.name)
    .map((row) => {
      const { tvpi, metric } = resolveTvpiMetric(row);
      return {
        fund_record_id: row.fund_record_id,
        report_period: row.report_period!,
        point: {
          id: row.fund_record_id,
          name: row.name!,
          entity_type: "fund",
          fund_count: 1,
          company_count: row.company_count,
          vintage: row.vintage,
          aldea_fund: row.aldea_fund,
          commitment_eur: resolveCommitmentEur(row),
          fair_value_eur: resolveFairValueEur(row, tvpi),
          value_created_eur: resolveValueCreatedEur(row, tvpi),
          tvpi,
          metric,
          age_years: resolveAgeYears(row.report_period, row.closing_date_first),
          tvpi_1y: null as number | null,
          tvpi_2y: null as number | null,
          report_period: row.report_period!,
        } satisfies FundScatterPoint,
      };
    });

  const valueByFundAndQuarter = new Map<string, number | null>();
  for (const row of resolved) {
    valueByFundAndQuarter.set(`${row.fund_record_id}:${row.report_period}`, row.point.tvpi);
  }

  for (const row of resolved) {
    const quarterIndex = quarterIndexFromKey(row.report_period);
    if (quarterIndex == null) continue;
    const oneYearKey = `${row.fund_record_id}:${quarterKeyFromIndex(quarterIndex - 4)}`;
    const twoYearKey = `${row.fund_record_id}:${quarterKeyFromIndex(quarterIndex - 8)}`;
    row.point.tvpi_1y = valueByFundAndQuarter.get(oneYearKey) ?? null;
    row.point.tvpi_2y = valueByFundAndQuarter.get(twoYearKey) ?? null;
  }

  return resolved
    .map((row) => row.point)
    .sort((left, right) => {
      const periodCompare = compareReportPeriodsDesc(left.report_period, right.report_period);
      if (periodCompare !== 0) return periodCompare;
      return left.name.localeCompare(right.name);
    });
}

export function buildLocalPreviewFundScatterRows(
  holdings: ReportingHolding[],
  options: {
    reportPeriod: string;
    aldeaFund?: unknown;
  },
): FundScatterPoint[] {
  const normalizedAldeaFund = normalizeAldeaFundCode(options.aldeaFund);

  return holdings
    .filter((holding) => holding.asset_type === "fund")
    .map((holding, index) => {
      const name = normalizeText(holding.asset_name) ?? normalizeText(holding.vc_firm) ?? `Fund ${index + 1}`;
      const valueCreatedFromTvpi =
        holding.drawdown_eur != null && Number.isFinite(holding.tvpi)
          ? roundTo(holding.drawdown_eur * (holding.tvpi - 1), 2)
          : null;
      const fallbackValueCreated =
        holding.fair_value_eur != null && holding.net_invested_eur != null
          ? roundTo(holding.fair_value_eur - holding.net_invested_eur, 2)
          : null;

      return {
        id: normalizeText(holding.asset_code) ?? `preview-fund:${normalizeLookupKey(name) ?? index}`,
        name,
        entity_type: "fund",
        fund_count: 1,
        company_count: holding.deal_count ?? null,
        vintage: holding.vintage_year ?? null,
        aldea_fund: normalizedAldeaFund,
        commitment_eur: holding.committed_eur,
        fair_value_eur: holding.fair_value_eur,
        value_created_eur: valueCreatedFromTvpi ?? fallbackValueCreated,
        tvpi: holding.tvpi,
        metric: "TVPI",
        age_years:
          resolveAgeYears(options.reportPeriod, holding.first_closing_date ?? null) ??
          resolveApproximateAgeYearsFromVintage(options.reportPeriod, holding.vintage_year),
        tvpi_1y: null as number | null,
        tvpi_2y: null as number | null,
        report_period: options.reportPeriod,
      } satisfies FundScatterPoint;
    })
    .sort((left, right) => left.name.localeCompare(right.name, "en"));
}

export function buildLocalPreviewFundScatterHistoryRows(
  packages: Array<Pick<ReportingPackage, "portfolio_holdings" | "report_meta">>,
  options: {
    throughReportPeriod: string;
    currentHoldings?: ReportingHolding[];
  },
): FundScatterPoint[] {
  const ceilingQuarterIndex = quarterIndexFromKey(options.throughReportPeriod);

  return packages
    .filter((reportPackage) => {
      const quarterIndex = quarterIndexFromKey(reportPackage.report_meta.quarter_key);
      if (ceilingQuarterIndex == null || quarterIndex == null) {
        return reportPackage.report_meta.quarter_key === options.throughReportPeriod;
      }
      return quarterIndex <= ceilingQuarterIndex;
    })
    .flatMap((reportPackage) =>
      buildLocalPreviewFundScatterRows(
        reportPackage.report_meta.quarter_key === options.throughReportPeriod && options.currentHoldings
          ? options.currentHoldings
          : reportPackage.portfolio_holdings,
        {
          reportPeriod: reportPackage.report_meta.quarter_key,
          aldeaFund: reportPackage.report_meta.fund_code,
        },
      ),
    )
    .sort((left, right) => {
      const periodCompare = compareReportPeriodsDesc(left.report_period, right.report_period);
      if (periodCompare !== 0) return periodCompare;
      return left.name.localeCompare(right.name, "en");
    });
}

export function buildLocalPreviewCompanyScatterRows(
  companies: ReportingUnderlyingCompany[],
  options: {
    reportPeriod: string;
    aldeaFund?: unknown;
  },
): FundScatterPoint[] {
  const normalizedAldeaFund = normalizeAldeaFundCode(options.aldeaFund);

  return companies
    .flatMap((company, index) => {
      const name = normalizeText(company.company_name);
      const moic = company.moic;
      if (!name || moic == null || !Number.isFinite(moic)) return [];

      const investedEur = company.invested_eur != null && Number.isFinite(company.invested_eur)
        ? company.invested_eur
        : null;
      const fairValueEur = company.fair_value_eur != null && Number.isFinite(company.fair_value_eur)
        ? company.fair_value_eur
        : null;
      const firstInvestmentDate = normalizeText(company.first_investment_date);
      const investmentYear = firstInvestmentDate
        ? Number.parseInt(firstInvestmentDate.slice(0, 4), 10)
        : null;
      const vintage = investmentYear != null && Number.isFinite(investmentYear)
        ? investmentYear
        : company.year_founded ?? null;

      return [{
        id: normalizeText(company.company_id) ?? `preview-company:${normalizeLookupKey(name) ?? index}`,
        name,
        // The scatter aggregation pipeline uses `fund` for individually plotted
        // entities. In this Mango-only source, each entity is a company.
        entity_type: "fund" as const,
        fund_count: 1,
        company_count: 1,
        vintage,
        aldea_fund: normalizedAldeaFund,
        commitment_eur: investedEur,
        fair_value_eur: fairValueEur,
        value_created_eur:
          investedEur != null && fairValueEur != null
            ? roundTo(fairValueEur - investedEur, 2)
            : null,
        tvpi: moic,
        metric: "MOIC" as const,
        age_years:
          resolveAgeYears(options.reportPeriod, firstInvestmentDate) ??
          resolveApproximateAgeYearsFromVintage(options.reportPeriod, vintage),
        tvpi_1y: null as number | null,
        tvpi_2y: null as number | null,
        report_period: options.reportPeriod,
      } satisfies FundScatterPoint];
    })
    .sort((left, right) => left.name.localeCompare(right.name, "en"));
}

export function buildVintageAverageScatterRows(rows: FundScatterPoint[]): FundScatterPoint[] {
  const grouped = new Map<string, FundScatterPoint[]>();

  for (const row of rows) {
    const vintageKey = row.vintage != null ? String(row.vintage) : "unknown";
    const key = `${row.report_period}:${vintageKey}`;
    const existing = grouped.get(key) ?? [];
    existing.push(row);
    grouped.set(key, existing);
  }

  return [...grouped.entries()]
    .map(([key, points]) => {
      const [reportPeriod, vintageKey] = key.split(":");
      return {
        id: `vintage:${vintageKey}:${reportPeriod}`,
        name: vintageKey === "unknown" ? "Vintage Unknown" : `Vintage ${vintageKey}`,
        entity_type: "vintage_average",
        fund_count: points.length,
        company_count: averageNullableIntegers(points.map((point) => point.company_count)),
        vintage: vintageKey === "unknown" ? null : Number(vintageKey),
        aldea_fund: points[0]?.aldea_fund ?? null,
        commitment_eur: averageNullableNumbers(points.map((point) => point.commitment_eur)),
        fair_value_eur: averageNullableNumbers(points.map((point) => point.fair_value_eur)),
        value_created_eur: averageNullableNumbers(points.map((point) => point.value_created_eur)),
        tvpi: averageNullableNumbers(points.map((point) => point.tvpi)),
        metric: resolveAggregateMetric(points),
        age_years: averageNullableNumbers(points.map((point) => point.age_years)),
        tvpi_1y: averageNullableNumbers(points.map((point) => point.tvpi_1y)),
        tvpi_2y: averageNullableNumbers(points.map((point) => point.tvpi_2y)),
        report_period: reportPeriod,
      } satisfies FundScatterPoint;
    })
    .sort((left, right) => {
      const periodCompare = compareReportPeriodsDesc(left.report_period, right.report_period);
      if (periodCompare !== 0) return periodCompare;
      if (left.vintage == null && right.vintage == null) return 0;
      if (left.vintage == null) return 1;
      if (right.vintage == null) return -1;
      return left.vintage - right.vintage;
    });
}

export function buildCompanyVintageAverageScatterRows(
  rows: FundScatterPoint[],
  underlyingCompanies: ReportingUnderlyingCompany[],
): FundScatterPoint[] {
  const fundRows = rows.filter((row) => row.entity_type === "fund");
  const fundRowsByPeriodAndId = new Map<string, FundScatterPoint>();
  const fundRowsByPeriodAndName = new Map<string, FundScatterPoint>();

  for (const row of fundRows) {
    fundRowsByPeriodAndId.set(`${row.report_period}:${row.id}`, row);
    const normalizedName = normalizeLookupKey(row.name);
    if (normalizedName) {
      fundRowsByPeriodAndName.set(`${row.report_period}:${normalizedName}`, row);
    }
  }

  const investmentsByPeriodCompanyFundAndVintage = new Map<string, {
    reportPeriod: string;
    companyId: string;
    vintage: number | null;
    companyRows: ReportingUnderlyingCompany[];
    linkedFundRow: FundScatterPoint;
  }>();

  for (const company of underlyingCompanies) {
    const reportPeriod = normalizeText(company.report_period);
    const companyId = normalizeText(company.company_id) ?? normalizeText(company.company_name);
    if (!reportPeriod || !companyId) continue;

    const fundRow =
      (company.linked_fund_record_id
        ? fundRowsByPeriodAndId.get(`${reportPeriod}:${company.linked_fund_record_id}`)
        : undefined) ??
      (normalizeLookupKey(company.linked_fund_name)
        ? fundRowsByPeriodAndName.get(
            `${reportPeriod}:${normalizeLookupKey(company.linked_fund_name)}`,
          )
        : undefined);

    if (!fundRow) continue;

    const investmentVintage = resolveCompanyInvestmentVintageYear(company);
    const key = `${reportPeriod}:${companyId}:${fundRow.id}:${investmentVintage ?? "unknown"}`;
    const existing = investmentsByPeriodCompanyFundAndVintage.get(key);
    if (existing) {
      existing.companyRows.push(company);
      continue;
    }

    investmentsByPeriodCompanyFundAndVintage.set(key, {
      reportPeriod,
      companyId,
      vintage: investmentVintage,
      companyRows: [company],
      linkedFundRow: fundRow,
    });
  }

  const investmentObservations = [...investmentsByPeriodCompanyFundAndVintage.values()].map((investment) => {
    const exposureEur = sumNullableNumbers(investment.companyRows.map(resolveCompanyExposureEur));
    return {
      company_id: investment.companyId,
      fund_id: investment.linkedFundRow.id,
      name:
        investment.vintage == null
          ? "Vintage Unknown"
          : `Vintage ${Math.round(investment.vintage)}`,
      vintage: investment.vintage,
      exposure_eur: exposureEur,
      linked_fund_row: investment.linkedFundRow,
      report_period: investment.reportPeriod,
    };
  });

  const grouped = new Map<string, typeof investmentObservations>();

  for (const row of investmentObservations) {
    const vintageKey = row.vintage != null ? String(Math.round(row.vintage)) : "unknown";
    const key = `${row.report_period}:${vintageKey}`;
    const existing = grouped.get(key) ?? [];
    existing.push(row);
    grouped.set(key, existing);
  }

  return [...grouped.entries()]
    .map(([key, investments]) => {
      const [reportPeriod, vintageKey] = key.split(":");
      const fundCount = new Set(investments.map((investment) => investment.fund_id)).size;
      const companyCount = new Set(investments.map((investment) => investment.company_id)).size;
      const linkedFundRows = investments.map((investment) => investment.linked_fund_row);

      return {
        id: `company-vintage:${vintageKey}:${reportPeriod}`,
        name: vintageKey === "unknown" ? "Vintage Unknown" : `Vintage ${vintageKey}`,
        entity_type: "vintage_average",
        fund_count: fundCount,
        company_count: companyCount,
        vintage: vintageKey === "unknown" ? null : Number(vintageKey),
        aldea_fund: investments[0]?.linked_fund_row.aldea_fund ?? null,
        commitment_eur: sumNullableNumbers(investments.map((investment) => investment.exposure_eur)),
        fair_value_eur: sumNullableNumbers(investments.map((investment) => investment.exposure_eur)),
        value_created_eur: null,
        tvpi: averageNullableNumbers(linkedFundRows.map((row) => row.tvpi)),
        metric: resolveAggregateMetric(linkedFundRows),
        age_years: resolveApproximateAgeYearsFromVintage(
          reportPeriod,
          vintageKey === "unknown" ? null : Number(vintageKey),
        ),
        tvpi_1y: averageNullableNumbers(linkedFundRows.map((row) => row.tvpi_1y)),
        tvpi_2y: averageNullableNumbers(linkedFundRows.map((row) => row.tvpi_2y)),
        report_period: reportPeriod,
      } satisfies FundScatterPoint;
    })
    .sort((left, right) => {
      const periodCompare = compareReportPeriodsDesc(left.report_period, right.report_period);
      if (periodCompare !== 0) return periodCompare;
      if (left.vintage == null && right.vintage == null) return 0;
      if (left.vintage == null) return 1;
      if (right.vintage == null) return -1;
      return left.vintage - right.vintage;
    });
}

export function buildPeerAverageScatterRows(
  rows: FundScatterPoint[],
  options: {
    focusId?: string | null;
    focusName?: string | null;
    reportPeriod: string;
    comparisonFundLabel?: string | null;
    underlyingCompanies?: ReportingUnderlyingCompany[];
  },
): FundScatterPoint[] {
  const scopedRows = rows.filter((row) => row.report_period === options.reportPeriod && row.entity_type === "fund");
  const focus = scopedRows.find((row) =>
    (options.focusId && row.id === options.focusId) ||
    (options.focusName && row.name === options.focusName)
  );

  if (!focus) {
    throw new Error("Focused fund was not found for the requested report period");
  }

  const comparisonRows: FundScatterPoint[] = [focus];
  const comparisonFundLabel = options.comparisonFundLabel?.trim() || focus.aldea_fund || "Selected fund";

  const sameVintagePeers = scopedRows.filter(
    (row) => row.id !== focus.id && matchesVintage(row.vintage, focus.vintage),
  );
  if (sameVintagePeers.length > 0) {
    comparisonRows.push(
      buildAverageScatterPoint(sameVintagePeers, {
        id: `same-vintage-average:${focus.id}`,
        name:
          focus.vintage != null
            ? `${comparisonFundLabel} Vintage ${Math.round(focus.vintage)} Avg`
            : `${comparisonFundLabel} Same Vintage Avg`,
        reportPeriod: options.reportPeriod,
        aldeaFund: focus.aldea_fund,
        vintage: focus.vintage,
      }),
    );
  }

  if (focus.vintage != null && (options.underlyingCompanies?.length ?? 0) > 0) {
    const companyVintageAverage = buildCompanyVintageAverageScatterRows(
      scopedRows.filter((row) => row.id !== focus.id),
      options.underlyingCompanies ?? [],
    ).find((row) => matchesVintage(row.vintage, focus.vintage));

    if (companyVintageAverage) {
      comparisonRows.push({
        ...companyVintageAverage,
        id: `company-vintage-average:${focus.id}`,
        name: `${comparisonFundLabel} Vintage ${Math.round(focus.vintage)} Avg (Company)`,
        entity_type: "peer_average",
        aldea_fund: focus.aldea_fund,
      });
    }
  }

  if (scopedRows.length > 1) {
    comparisonRows.push(
      buildAverageScatterPoint(scopedRows, {
        id: `all-funds-average:${focus.id}`,
        name: `${comparisonFundLabel} All Funds Avg`,
        reportPeriod: options.reportPeriod,
        aldeaFund: focus.aldea_fund,
      }),
    );
  }

  return comparisonRows;
}

export type { RawFundScatterRow };
