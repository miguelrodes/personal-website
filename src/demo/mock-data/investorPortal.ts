import qualitativeSnapshotJson from "./qualitativePortfolioSnapshot.json" with { type: "json" };

import type {
  ReportingBreakdownItem,
  ReportingFinancialSection,
  ReportingHolding,
  ReportingManifest,
  ReportingMetric,
  ReportingPackage,
  ReportingUnderlyingCompany,
} from "../lib/fund-reporting/types";

export const MOCK_DATA_SEED = "ALDEA_PUBLIC_DEMO_2026";
export const MOCK_PRIORITY_FUND_NAMES = ["byFounders"];
export const MOCK_PRIORITY_COMPANY_NAMES = ["Lovable"];
export const MOCK_LOVABLE_TARGET_MOIC = 100;

const MOCK_LOVABLE_VALUE_SHARE = 0.52;

type QualitativeHolding = {
  asset_code: string;
  asset_name: string;
  asset_type: string;
  practice_type: string;
  stage_label: string | null;
  vc_firm: string | null;
  country_label: string | null;
  location: string | null;
  theme: string | null;
  status: string | null;
  detail_blurb: string | null;
};

type QualitativeCompany = {
  relationship_type: string;
  company_id: string;
  company_name: string | null;
  linked_fund_record_id: string | null;
  linked_fund_name: string;
  linked_fund_vc_firm: string | null;
  linked_fund_geography: string | null;
  linked_fund_stage_label: string | null;
  linked_portfolio_holding_asset_code: string | null;
  linked_portfolio_holding_asset_name: string | null;
  fund_scope_labels: string[];
  portfolio_fund_labels_current: string[];
  description_short: string | null;
  description_long: string | null;
  website: string | null;
  linkedin: string | null;
  logo_attachment_filename: string | null;
  former_name: string | null;
  sub_industries: string[];
  tech_innovation: string | null;
  deeptech_domain: string | null;
  founder_executive_team_woman: string | null;
  name_woman: string | null;
  usa_state: string | null;
  location_barcelona_cat: boolean | null;
  sector: string | null;
  industry: string | null;
  city: string | null;
  country: string | null;
  region: string | null;
  company_stage_reported: string | null;
  company_stage_current: string | null;
  current_status: string | null;
  investment_type: string | null;
};

type QualitativeFund = {
  fund_code: string;
  fund_slug: "tech-fund-1" | "tech-fund-2";
  fund_display_name: string;
  manager: string | null;
  investment_focus: string | null;
  structure_summary: string | null;
  domicile: string | null;
  holdings: QualitativeHolding[];
  companies: QualitativeCompany[];
};

type MockQuarter = { key: string; slug: string; endDate: string; publishedAt: string };

type CompanyAllocation = {
  qualitative: QualitativeCompany;
  ownership: number;
  finalInvestedEur: number;
  finalDistributionEur: number;
  finalMoic: number;
};

type HoldingModel = {
  qualitative: QualitativeHolding;
  companies: CompanyAllocation[];
  finalInvestedEur: number;
  finalDistributionEur: number;
  finalFairValueEur: number;
  committedEur: number;
};

type MockFundModel = {
  qualitative: QualitativeFund;
  quarters: MockQuarter[];
  vintageYear: number;
  firstClose: string;
  finalClose: string;
  investmentPeriodEnd: string;
  holdings: HoldingModel[];
};

type PackageSummary = {
  committed: number;
  paidIn: number;
  nav: number;
  distributions: number;
  tvpi: number;
  dpi: number;
  rvpi: number;
  irr: number;
};

const qualitativeSnapshot = qualitativeSnapshotJson as unknown as {
  schema_version: string;
  provenance: string;
  funds: QualitativeFund[];
};

// A damaged or substituted qualitative module must fail before any report is generated.
if (qualitativeSnapshot.schema_version !== "public-demo-qualitative-v1" ||
  !Array.isArray(qualitativeSnapshot.funds) || qualitativeSnapshot.funds.length !== 2 ||
  qualitativeSnapshot.funds.some(fund => !["ATF1", "ATF2"].includes(fund.fund_code) ||
    !fund.holdings?.length || !fund.companies?.length)) {
  throw new Error("Demo temporarily unavailable.");
}

const ALL_QUARTERS: MockQuarter[] = [
  { key: "2025_Q1", slug: "2025-q1", endDate: "2025-03-31", publishedAt: "2025-04-24T09:00:00.000Z" },
  { key: "2025_Q2", slug: "2025-q2", endDate: "2025-06-30", publishedAt: "2025-07-24T09:00:00.000Z" },
  { key: "2025_Q3", slug: "2025-q3", endDate: "2025-09-30", publishedAt: "2025-10-23T09:00:00.000Z" },
  { key: "2025_Q4", slug: "2025-q4", endDate: "2025-12-31", publishedAt: "2026-01-29T09:00:00.000Z" },
  { key: "2026_Q1", slug: "2026-q1", endDate: "2026-03-31", publishedAt: "2026-04-23T09:00:00.000Z" },
  { key: "2026_Q2", slug: "2026-q2", endDate: "2026-06-30", publishedAt: "2026-07-23T09:00:00.000Z" },
];

const round = (value: number) => Math.round(value);
const roundTo = (value: number, increment = 1_000) => Math.round(value / increment) * increment;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);

function stableHash(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function unit(key: string, salt: string) {
  return stableHash(`${MOCK_DATA_SEED}:${key}:${salt}`) / 0xffff_ffff;
}

function isPriorityName(value: string | null | undefined, priorities: string[]) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return priorities.some((priority) => normalized.includes(priority.toLowerCase()));
}

function priorityCompare(left: string | null | undefined, right: string | null | undefined, priorities: string[]) {
  const priorityDifference = Number(!isPriorityName(left, priorities)) - Number(!isPriorityName(right, priorities));
  return priorityDifference || (left ?? "").localeCompare(right ?? "", "en");
}

function distributeShares<T>(items: T[], keyFor: (item: T) => string, priorityIndex: number | null, priorityShare: number) {
  if (items.length === 0) return [];
  if (items.length === 1) return [1];
  const regularIndexes = items.map((_, index) => index).filter((index) => index !== priorityIndex);
  const regularWeights = regularIndexes.map((index) => 0.35 + unit(keyFor(items[index]!), "weight") * 1.65);
  const regularTotal = sum(regularWeights);
  const available = priorityIndex == null ? 1 : 1 - priorityShare;
  const shares = items.map(() => 0);
  regularIndexes.forEach((itemIndex, weightIndex) => {
    shares[itemIndex] = available * (regularWeights[weightIndex]! / regularTotal);
  });
  if (priorityIndex != null) shares[priorityIndex] = priorityShare;
  return shares;
}

function buildHoldingModel(fund: QualitativeFund, holding: QualitativeHolding): HoldingModel {
  const holdingKey = `${fund.fund_code}:${holding.asset_code}`;
  const isByFounders = isPriorityName(`${holding.asset_name} ${holding.vc_firm ?? ""}`, MOCK_PRIORITY_FUND_NAMES);
  const linkedCompanies = fund.companies.filter((company) => {
    const linkedCode = company.linked_portfolio_holding_asset_code ?? company.linked_fund_record_id;
    return linkedCode === holding.asset_code;
  });
  const finalInvestedEur = isByFounders
    ? 9_600_000
    : roundTo(1_350_000 + unit(holdingKey, "invested") * 5_150_000, 25_000);
  const finalTvpi = isByFounders ? 4.2 : clamp(0.55 + unit(holdingKey, "tvpi") * 2.45, 0.55, 3);
  const maturity = fund.fund_code === "ATF1" ? 1 : 0.42;
  const distributionRate = isByFounders
    ? 0.16
    : maturity * Math.max(0, unit(holdingKey, "distribution") - 0.5) * 0.72;
  const finalDistributionEur = roundTo(finalInvestedEur * distributionRate, 1_000);
  const finalFairValueEur = round(Math.max(0, finalInvestedEur * finalTvpi - finalDistributionEur));
  const committedEur = roundTo(finalInvestedEur / (0.62 + unit(holdingKey, "called") * 0.28), 25_000);
  const lovableIndex = linkedCompanies.findIndex((company) => company.company_name === "Lovable");
  const valueShares = distributeShares(linkedCompanies, (company) => `${holdingKey}:${company.company_id}:value`, lovableIndex >= 0 ? lovableIndex : null, lovableIndex >= 0 ? MOCK_LOVABLE_VALUE_SHARE : 0);
  const lovableInvestedShare = lovableIndex >= 0
    ? clamp((finalTvpi * valueShares[lovableIndex]!) / MOCK_LOVABLE_TARGET_MOIC, 0.001, 0.95)
    : 0;
  const investedShares = distributeShares(linkedCompanies, (company) => `${holdingKey}:${company.company_id}`, lovableIndex >= 0 ? lovableIndex : null, lovableInvestedShare);
  const distributionShares = distributeShares(linkedCompanies, (company) => `${holdingKey}:${company.company_id}:distribution`, lovableIndex >= 0 ? lovableIndex : null, lovableIndex >= 0 ? 0.18 : 0);
  const companies = linkedCompanies.map((qualitative, index): CompanyAllocation => {
    const companyKey = `${holdingKey}:${qualitative.company_id}`;
    const finalCompanyInvested = round(finalInvestedEur * investedShares[index]!);
    const finalCompanyTotalValue = round(finalInvestedEur * finalTvpi * valueShares[index]!);
    const finalCompanyDistribution = round(finalDistributionEur * distributionShares[index]!);
    return {
      qualitative,
      ownership: qualitative.company_name === "Lovable" ? 0.0095 : 0.004 + unit(companyKey, "ownership") * 0.041,
      finalInvestedEur: finalCompanyInvested,
      finalDistributionEur: finalCompanyDistribution,
      finalMoic: finalCompanyInvested > 0 ? finalCompanyTotalValue / finalCompanyInvested : 0,
    };
  });
  return { qualitative: holding, companies, finalInvestedEur, finalDistributionEur, finalFairValueEur, committedEur };
}

function buildFundModel(qualitative: QualitativeFund): MockFundModel {
  const isFirstFund = qualitative.fund_code === "ATF1";
  return {
    qualitative,
    quarters: isFirstFund ? ALL_QUARTERS : ALL_QUARTERS.slice(2),
    vintageYear: isFirstFund ? 2018 : 2023,
    firstClose: isFirstFund ? "2018-05-17" : "2023-02-16",
    finalClose: isFirstFund ? "2019-11-21" : "2024-06-20",
    investmentPeriodEnd: isFirstFund ? "2023-11-21" : "2029-06-20",
    holdings: [...qualitative.holdings]
      .sort((left, right) => priorityCompare(`${left.asset_name} ${left.vc_firm ?? ""}`, `${right.asset_name} ${right.vc_firm ?? ""}`, MOCK_PRIORITY_FUND_NAMES))
      .map((holding) => buildHoldingModel(qualitative, holding)),
  };
}

function getProgress(quarterIndex: number, quarterCount: number) {
  if (quarterCount <= 1) return 1;
  return 0.66 + (0.34 * quarterIndex) / (quarterCount - 1);
}

function getValueProgress(quarterIndex: number, quarterCount: number, key: string) {
  if (quarterIndex === quarterCount - 1) return 1;
  const linear = quarterIndex / Math.max(quarterCount - 1, 1);
  const eased = linear * linear * (3 - 2 * linear);
  const variation = (unit(key, `trajectory-${quarterIndex}`) - 0.5) * 0.12 * Math.sin(Math.PI * linear);
  return clamp(eased + variation, 0, 0.96);
}

function syntheticDate(vintageYear: number, key: string, latestDate?: string) {
  const year = vintageYear + Math.floor(unit(key, "investment-year") * 4);
  const month = 1 + Math.floor(unit(key, "investment-month") * 12);
  const day = 1 + Math.floor(unit(key, "investment-day") * 27);
  const candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (!latestDate || candidate <= latestDate) return candidate;

  const startTime = Date.UTC(vintageYear, 0, 1);
  const latestTime = new Date(`${latestDate}T00:00:00.000Z`).getTime();
  const safeTime = startTime + Math.floor(unit(key, "investment-safe-date") * Math.max(latestTime - startTime, 0));
  return new Date(safeTime).toISOString().slice(0, 10);
}

function buildCompanyRow(model: MockFundModel, holding: HoldingModel, company: CompanyAllocation, quarterIndex: number): ReportingUnderlyingCompany {
  const quarter = model.quarters[quarterIndex]!;
  const investmentProgress = getProgress(quarterIndex, model.quarters.length);
  const valueProgress = getValueProgress(quarterIndex, model.quarters.length, company.qualitative.company_id);
  const invested = round(company.finalInvestedEur * investmentProgress);
  const startMoic = 0.78 + unit(company.qualitative.company_id, "j-curve-entry-moic") * 0.14;
  const currentMoic = startMoic + (company.finalMoic - startMoic) * valueProgress;
  const distributionProgress = clamp((quarterIndex - 1) / Math.max(model.quarters.length - 2, 1), 0, 1);
  const realized = round(company.finalDistributionEur * distributionProgress);
  const totalValue = round(invested * currentMoic);
  const fairValue = Math.max(0, totalValue - realized);
  const postMoney = fairValue > 0 ? roundTo(fairValue / company.ownership, 100_000) : 0;
  const companyKey = `${model.qualitative.fund_code}:${holding.qualitative.asset_code}:${company.qualitative.company_id}`;
  const arr = unit(companyKey, "arr-presence") > 0.34
    ? roundTo(postMoney * (0.025 + unit(companyKey, "arr-rate") * 0.085), 10_000)
    : null;
  return {
    ...company.qualitative,
    linked_portfolio_holding_asset_code: holding.qualitative.asset_code,
    linked_portfolio_holding_asset_name: holding.qualitative.asset_name,
    linked_fund_vintage_year: model.vintageYear + Math.floor(unit(holding.qualitative.asset_code, "vintage") * 4),
    year_founded: 2012 + Math.floor(unit(companyKey, "founded") * 13),
    first_investment_date: syntheticDate(model.vintageYear, companyKey, model.quarters[0]?.endDate),
    ownership: company.ownership,
    invested_eur: invested,
    fair_value_eur: fairValue,
    realized_cash_eur: realized,
    proceeds_stock_eur: 0,
    moic: invested > 0 ? totalValue / invested : 0,
    arr,
    update_narrative: `Public-demo operating update for ${quarter.key.replace("_", " ")}. Financial and operating values in this profile are deterministic synthetic values.`,
    post_money_eur_current: postMoney,
    post_money_usd_current: round(postMoney * 1.11),
    report_period: quarter.key,
  };
}

function buildHoldingRow(model: MockFundModel, holding: HoldingModel, companyRows: ReportingUnderlyingCompany[]): ReportingHolding {
  const qualitative = holding.qualitative;
  const invested = companyRows.length > 0 ? sum(companyRows.map((company) => company.invested_eur ?? 0)) : holding.finalInvestedEur;
  const fairValue = companyRows.length > 0 ? sum(companyRows.map((company) => company.fair_value_eur ?? 0)) : holding.finalFairValueEur;
  const distributions = companyRows.length > 0 ? sum(companyRows.map((company) => company.realized_cash_eur ?? 0)) : holding.finalDistributionEur;
  const rvpi = invested > 0 ? fairValue / invested : 0;
  const dpi = invested > 0 ? distributions / invested : 0;
  const syntheticFundSize = roundTo(holding.committedEur / (0.035 + unit(qualitative.asset_code, "fund-size") * 0.045), 1_000_000);
  return {
    asset_code: qualitative.asset_code,
    asset_name: qualitative.asset_name,
    asset_type: qualitative.asset_type,
    practice_type: qualitative.practice_type,
    vintage_year: model.vintageYear + Math.floor(unit(qualitative.asset_code, "vintage") * 4),
    first_closing_date: syntheticDate(model.vintageYear, `${qualitative.asset_code}:close`),
    stage_label: qualitative.stage_label,
    vc_firm: qualitative.vc_firm,
    country_label: qualitative.country_label,
    location: qualitative.location ?? qualitative.country_label ?? "Europe",
    theme: qualitative.theme ?? "Generalist",
    fund_size_display: qualitative.asset_type === "fund" ? `€${Math.round(syntheticFundSize / 1_000_000)}m` : null,
    called_pct: holding.committedEur > 0 ? invested / holding.committedEur : 0,
    deal_count: companyRows.length,
    committed_eur: holding.committedEur,
    drawdown_eur: invested,
    net_invested_eur: invested,
    fair_value_eur: fairValue,
    rvpi,
    dpi,
    tvpi: rvpi + dpi,
    status: qualitative.status ?? "active",
    detail_blurb: qualitative.detail_blurb,
  };
}

function buildSummary(holdings: ReportingHolding[], model: MockFundModel, quarter: MockQuarter): PackageSummary {
  const committed = sum(holdings.map((holding) => holding.committed_eur));
  const paidIn = sum(holdings.map((holding) => holding.net_invested_eur));
  const nav = sum(holdings.map((holding) => holding.fair_value_eur));
  const distributions = sum(holdings.map((holding) => holding.dpi * holding.net_invested_eur));
  const rvpi = paidIn > 0 ? nav / paidIn : 0;
  const dpi = paidIn > 0 ? distributions / paidIn : 0;
  const tvpi = rvpi + dpi;
  const ageYears = Math.max(1, (new Date(quarter.endDate).getTime() - new Date(model.firstClose).getTime()) / 31_557_600_000);
  const irr = Math.pow(Math.max(tvpi, 0.01), 1 / ageYears) - 1;
  return { committed, paidIn, nav, distributions, tvpi, dpi, rvpi, irr };
}

function metric(key: string, label: string, value: number, valueType: ReportingMetric["value_type"], previous?: number): ReportingMetric {
  return { metric_key: key, label, value, value_type: valueType, comparison_value: previous, comparison_label: previous == null ? null : "Previous quarter", note: `Deterministic synthetic value (${MOCK_DATA_SEED}).` };
}

function buildMetrics(summary: PackageSummary, previous?: PackageSummary): ReportingMetric[] {
  return [
    metric("tvpi_to_investors", "TVPI", summary.tvpi, "multiple", previous?.tvpi),
    metric("net_asset_value", "Net asset value (NAV)", summary.nav, "currency", previous?.nav),
    metric("net_irr", "Net IRR", summary.irr, "percent", previous?.irr),
    metric("dpi_to_investors", "DPI", summary.dpi, "multiple", previous?.dpi),
    metric("rvpi_to_investors", "RVPI", summary.rvpi, "multiple", previous?.rvpi),
    metric("cumulative_paid_in_capital", "Paid-in capital", summary.paidIn, "currency", previous?.paidIn),
    metric("cumulative_distributions_to_fund", "Cumulative distributions", summary.distributions, "currency", previous?.distributions),
    metric("total_commitments_to_fund", "Total commitments", summary.committed, "currency", previous?.committed),
    metric("total_commitment_available_for_drawdown", "Available for drawdown", summary.committed - summary.paidIn, "currency", previous ? previous.committed - previous.paidIn : undefined),
    metric("fair_value_of_current_portfolio", "Portfolio fair value", summary.nav, "currency", previous?.nav),
    metric("residual_value", "Residual value", summary.nav, "currency", previous?.nav),
    metric("distributed_to_investors", "Distributed to investors", summary.distributions, "currency", previous?.distributions),
    metric("total_net_invested_in_portfolio_companies", "Net invested capital", summary.paidIn, "currency", previous?.paidIn),
    metric("paid_in_to_commitment_ratio", "% called", summary.paidIn / summary.committed, "percent", previous ? previous.paidIn / previous.committed : undefined),
    metric("gross_irr", "Gross IRR", summary.irr + 0.037, "percent", previous ? previous.irr + 0.037 : undefined),
    metric("gross_multiple_to_cost", "Gross multiple to cost", summary.tvpi + 0.065, "multiple", previous ? previous.tvpi + 0.065 : undefined),
    metric("cash_borrowings_and_other_assets_liabilities", "Cash and other net assets", summary.nav * 0.028, "currency", previous ? previous.nav * 0.028 : undefined),
  ];
}

function buildBreakdown(companies: ReportingUnderlyingCompany[], field: "country" | "industry"): ReportingBreakdownItem[] {
  const grouped = new Map<string, { exposure: number; companyIds: Set<string> }>();
  for (const company of companies) {
    const label = company[field]?.trim() || "Other";
    const current = grouped.get(label) ?? { exposure: 0, companyIds: new Set<string>() };
    current.companyIds.add(company.company_id);
    current.exposure += company.fair_value_eur ?? 0;
    grouped.set(label, current);
  }
  return [...grouped.entries()].sort((left, right) => right[1].exposure - left[1].exposure).map(([label, values]) => ({ bucket_key: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label, company_count: values.companyIds.size, exposure_eur: values.exposure }));
}

function buildFinancialSections(
  summary: PackageSummary,
  previous: PackageSummary | undefined,
  seedKey: string,
): ReportingFinancialSection[] {
  const priorNav = round(previous?.nav ?? summary.nav * 0.91);
  const paidInCapital = round(previous ? summary.paidIn - previous.paidIn : summary.paidIn * 0.06);
  const investmentIncome = round(priorNav * (0.0002 + unit(seedKey, "investment-income") * 0.0005));
  const managementFees = -round(summary.committed * (0.0012 + unit(seedKey, "management-fees") * 0.0008));
  const otherIncomeExpense = round(priorNav * (unit(seedKey, "other-income-expense") - 0.5) * 0.0008);
  const distributed = round(previous ? summary.distributions - previous.distributions : summary.distributions * 0.15);
  const distributions = -distributed;
  const preCarryValueCreation = summary.nav - priorNav - paidInCapital - investmentIncome - managementFees - otherIncomeExpense - distributions;
  const carryAllocation =
    preCarryValueCreation > 0 && unit(seedKey, "carry-allocation-trigger") > 0.6
      ? -round(preCarryValueCreation * (0.015 + unit(seedKey, "carry-allocation-rate") * 0.02))
      : 0;
  const unrealizedGainsLosses = round(
    summary.nav -
      priorNav -
      paidInCapital -
      investmentIncome -
      managementFees -
      otherIncomeExpense -
      distributions -
      carryAllocation,
  );
  return [
    { section_key: "nav_bridge", title: "NAV / Residual Value bridge", statement_type: "nav_bridge", rows: [
      { row_key: "residual_value_start_of_quarter", label: "Residual Value - start of quarter", values: { amount: round(priorNav) } },
      { row_key: "paid_in_capital", label: "Paid in Capital (+)", values: { amount: paidInCapital } },
      { row_key: "unrealized_gains_losses", label: "Unrealized gains / (losses) (+/-)", values: { amount: unrealizedGainsLosses } },
      { row_key: "investment_income", label: "Investment income (+)", values: { amount: investmentIncome } },
      { row_key: "management_fees", label: "Management Fees (-)", values: { amount: managementFees } },
      { row_key: "other_income_expense", label: "Other Income / (Expense) (+/-)", values: { amount: otherIncomeExpense } },
      { row_key: "distributions", label: "Distributions (-)", values: { amount: distributions } },
      { row_key: "carry_allocation", label: "Carry Allocation (-)", values: { amount: carryAllocation } },
      { row_key: "residual_value_end_of_quarter", label: "Residual Value - end of quarter", values: { amount: round(summary.nav) } },
      { row_key: "check_vs_residual_value_current", label: "Check vs Residual value (current)", values: { amount: 0 } },
    ] },
    { section_key: "cash_flow", title: "Cash flow", statement_type: "cash_flow", rows: [
      { row_key: "paid_in", label: "Cumulative paid-in capital", values: { amount: round(summary.paidIn) }, emphasis: "total" },
      { row_key: "distributed", label: "Cumulative distributions", values: { amount: round(summary.distributions) } },
      { row_key: "net_cash", label: "Net contributed capital", values: { amount: round(summary.paidIn - summary.distributions) }, emphasis: "total" },
    ] },
    { section_key: "value_reconciliation", title: "Value reconciliation", statement_type: "reconciliation", rows: [
      { row_key: "residual_value", label: "Residual value", values: { amount: round(summary.nav) } },
      { row_key: "realized_value", label: "Realized value", values: { amount: round(summary.distributions) } },
      { row_key: "total_value", label: "Total value", values: { amount: round(summary.nav + summary.distributions) }, emphasis: "total" },
    ] },
  ];
}

function buildStrategySummary(holdings: ReportingHolding[]) {
  return (["fund_of_funds", "direct_co_investment"] as const).map((practiceType) => {
    const rows = holdings.filter((holding) => holding.practice_type === practiceType);
    const invested = sum(rows.map((holding) => holding.net_invested_eur));
    const fairValue = sum(rows.map((holding) => holding.fair_value_eur));
    const distributions = sum(rows.map((holding) => holding.dpi * holding.net_invested_eur));
    return { strategy_key: practiceType, label: practiceType === "fund_of_funds" ? "Fund of Funds" : "Direct Investment", committed_eur: sum(rows.map((holding) => holding.committed_eur)), drawdown_eur: invested, net_invested_eur: invested, fair_value_eur: fairValue, rvpi: invested > 0 ? fairValue / invested : 0, dpi: invested > 0 ? distributions / invested : 0, tvpi: invested > 0 ? (fairValue + distributions) / invested : 0, note: "Synthetic strategy roll-up derived from the public-demo holdings." };
  }).filter((row) => row.committed_eur > 0);
}

function buildPackage(model: MockFundModel, quarterIndex: number, previousSummary?: PackageSummary) {
  const quarter = model.quarters[quarterIndex]!;
  const companiesByHolding = new Map<string, ReportingUnderlyingCompany[]>();
  for (const holding of model.holdings) {
    companiesByHolding.set(holding.qualitative.asset_code, holding.companies.map((company) => buildCompanyRow(model, holding, company, quarterIndex)));
  }
  const companies = [...companiesByHolding.values()].flat().sort((left, right) => priorityCompare(left.company_name, right.company_name, MOCK_PRIORITY_COMPANY_NAMES));
  const holdings = model.holdings.map((holding) => buildHoldingRow(model, holding, companiesByHolding.get(holding.qualitative.asset_code) ?? [])).sort((left, right) => {
    const priority = priorityCompare(`${left.asset_name} ${left.vc_firm ?? ""}`, `${right.asset_name} ${right.vc_firm ?? ""}`, MOCK_PRIORITY_FUND_NAMES);
    return priority || right.fair_value_eur - left.fair_value_eur;
  });
  const summary = buildSummary(holdings, model, quarter);
  const aboveCostCount = companies.filter((company) => (company.moic ?? 0) >= 1).length;
  const unicorns = companies.filter((company) => (company.post_money_eur_current ?? 0) >= 1_000_000_000);
  const reportPackage: ReportingPackage = {
    schema_version: "1.0.0",
    package_id: `mock-${model.qualitative.fund_code.toLowerCase()}-${quarter.key.toLowerCase()}`,
    published_at: quarter.publishedAt,
    report_meta: { fund_code: model.qualitative.fund_code, fund_slug: model.qualitative.fund_slug, fund_display_name: model.qualitative.fund_display_name, quarter_key: quarter.key, quarter_slug: quarter.slug, quarter_end_date: quarter.endDate, report_currency: "EUR", scope: `Deterministic public demo (${MOCK_DATA_SEED})`, source_status: { pdf_seeded: false, excel_ready: false, airtable_enriched: false }, source_documents: [] },
    overview: { headline: `${model.qualitative.fund_display_name} public-demo portfolio overview.`, vintage_year: model.vintageYear, manager: model.qualitative.manager ?? "Aldea Ventures", fund_currency: "EUR", term: "Synthetic closed-end fund timeline for public demonstration", investment_focus: model.qualitative.investment_focus ?? "European venture capital", structure_summary: model.qualitative.structure_summary ?? "Diversified fund and direct investment strategy.", first_closing_date: model.firstClose, final_closing_date: model.finalClose, investment_period_end: model.investmentPeriodEnd, domicile: model.qualitative.domicile ?? "Europe", total_commitment_eur: summary.committed },
    key_metrics: buildMetrics(summary, previousSummary),
    strategy_summary: buildStrategySummary(holdings),
    geography_breakdown: buildBreakdown(companies, "country"),
    industry_breakdown: buildBreakdown(companies, "industry"),
    portfolio_holdings: holdings,
    underlying_companies: companies,
    above_cost_metric: { at_or_above_1x_moic_count: aboveCostCount, valid_moic_count: companies.length, at_or_above_1x_moic_percentage: companies.length > 0 ? aboveCostCount / companies.length : null, deduplication_method: "sanitized_company_id", is_deduplicated: true, metric_basis: "company_records", insufficient_data: false },
    current_unicorn_count: unicorns.length,
    current_unicorn_active_count: unicorns.filter((company) => company.current_status === "ACTIVE").length,
    current_unicorn_companies: unicorns.map((company) => ({ company_id: company.company_id, company_name: company.company_name ?? null, current_status: company.current_status ?? null, fund_scope_labels: company.fund_scope_labels ?? [], top_round_name: "Synthetic preferred round", top_round_stage: company.company_stage_current ?? null, top_round_date: quarter.endDate, top_post_money_lcy: company.post_money_eur_current ?? null, top_post_money_eur: company.post_money_eur_current ?? null })),
    financial_sections: buildFinancialSections(
      summary,
      previousSummary,
      `${model.qualitative.fund_code}:${quarter.key}`,
    ),
    narrative_sections: [
      { section_key: "quarterly_highlights", title: "Quarterly highlights", summary: "Public-demo value creation across the portfolio", body_markdown: `The qualitative portfolio structure is preserved for the demo. Every financial and operating figure shown for **${quarter.key.replace("_", " ")}** is generated independently from the fixed seed \`${MOCK_DATA_SEED}\`.`, sort_order: 1, is_expandable: true },
      { section_key: "portfolio_evolution", title: "Portfolio evolution", summary: "A deterministic alternative financial history", body_markdown: "The mock history includes staged deployment, mixed outcomes, write-downs, step-ups, and partial realizations. The final chart points reconcile with the current synthetic holdings and company positions.", sort_order: 2, is_expandable: true },
    ],
    footnotes: [
      { footnote_key: "mock_data", text: `All quantitative values are deterministic synthetic public-demo data generated from ${MOCK_DATA_SEED}.`, applies_to: "all" },
      { footnote_key: "qualitative_snapshot", text: "Names, identities, descriptions, classifications, logos, and portfolio relationships come from a sanitized qualitative-only local snapshot.", applies_to: "all" },
    ],
  };
  return { reportPackage, summary };
}

const MOCK_FUND_MODELS = qualitativeSnapshot.funds.map(buildFundModel);
const MOCK_PACKAGES: ReportingPackage[] = MOCK_FUND_MODELS.flatMap((model) => {
  let previousSummary: PackageSummary | undefined;
  return model.quarters.map((_, quarterIndex) => {
    const built = buildPackage(model, quarterIndex, previousSummary);
    previousSummary = built.summary;
    return built.reportPackage;
  });
});

export const MOCK_REPORTING_MANIFEST: ReportingManifest = {
  schema_version: "1.0.0",
  updated_at: "2026-07-23T09:00:00.000Z",
  reports: [...MOCK_PACKAGES].sort((left, right) => right.report_meta.quarter_key.localeCompare(left.report_meta.quarter_key, "en")).map((reportPackage) => ({ report_id: reportPackage.package_id, fund_code: reportPackage.report_meta.fund_code, fund_slug: reportPackage.report_meta.fund_slug, fund_display_name: reportPackage.report_meta.fund_display_name, quarter_key: reportPackage.report_meta.quarter_key, quarter_slug: reportPackage.report_meta.quarter_slug, title: `${reportPackage.report_meta.fund_display_name} · ${reportPackage.report_meta.quarter_key}`, published_at: reportPackage.published_at, package_path: `mock-data://${reportPackage.package_id}`, summary: reportPackage.overview.headline })),
};

export function getMockReportPackage(fundSlug: string, quarterSlug?: string | null) {
  return MOCK_PACKAGES.find((candidate) => candidate.report_meta.fund_slug === fundSlug && (!quarterSlug || candidate.report_meta.quarter_slug === quarterSlug)) ?? null;
}

export function getMockReportPackagesByFundCode(fundCode: string) {
  return MOCK_PACKAGES.filter((candidate) => candidate.report_meta.fund_code === fundCode).sort((left, right) => right.report_meta.quarter_key.localeCompare(left.report_meta.quarter_key, "en"));
}
