import type { ReportingBreakdownItem, ReportingFinancialSection, ReportingHolding,
  ReportingManifest, ReportingMetric, ReportingPackage, ReportingUnderlyingCompany } from "../lib/fund-reporting/types";
import { SYNTHETIC_FUND, SYNTHETIC_PORTFOLIO, type SyntheticCompany, type SyntheticHolding } from "./syntheticPortfolio";

export { SYNTHETIC_FUND } from "./syntheticPortfolio";
export const MOCK_DATA_SEED = "ALDEA_FULLY_SYNTHETIC_V1";
export const MOCK_PRIORITY_FUND_NAMES: string[] = [];
export const MOCK_PRIORITY_COMPANY_NAMES: string[] = [];
export const MOCK_LATEST_QUARTER = "2026-q2";

const QUARTERS = [
  { key: "2025_Q1", slug: "2025-q1", end: "2025-03-31", published: "2025-04-24T09:00:00.000Z" },
  { key: "2025_Q2", slug: "2025-q2", end: "2025-06-30", published: "2025-07-24T09:00:00.000Z" },
  { key: "2025_Q3", slug: "2025-q3", end: "2025-09-30", published: "2025-10-23T09:00:00.000Z" },
  { key: "2025_Q4", slug: "2025-q4", end: "2025-12-31", published: "2026-01-29T09:00:00.000Z" },
  { key: "2026_Q1", slug: "2026-q1", end: "2026-03-31", published: "2026-04-23T09:00:00.000Z" },
  { key: "2026_Q2", slug: MOCK_LATEST_QUARTER, end: "2026-06-30", published: "2026-07-23T09:00:00.000Z" },
];
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const roundTo = (value: number, increment: number) => Math.round(value / increment) * increment;
function unit(key: string, salt: string) {
  let hash = 2166136261;
  for (const char of `${MOCK_DATA_SEED}:${key}:${salt}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 0x1_0000_0000;
}

// Reject substituted catalogues rather than falling back to any old portfolio.
if (SYNTHETIC_PORTFOLIO.schemaVersion !== "synthetic-portfolio-v1" ||
    SYNTHETIC_PORTFOLIO.holdings.length !== 5 ||
    SYNTHETIC_PORTFOLIO.holdings.some((holding, index) => holding.name !== `Fund ${"ABCDE"[index]}` ||
      holding.companies.length < 30 || holding.companies.length > 39 ||
      holding.companies.some((company, index) => company.company_name !== `${holding.name} ${index + 1}`))) {
  throw new Error("Demo temporarily unavailable.");
}

type CompanyModel = {
  qualitative: SyntheticCompany;
  cost: number;
  targetMoic: number;
  outcome: "active" | "exit" | "writeoff";
  eventQuarter: number;
  ownership: number;
  firstInvestment: string;
  founded: number;
  initialStage: number;
};
type HoldingModel = { qualitative: SyntheticHolding; companies: CompanyModel[]; commitment: number; fundSize: number };
type CashFlow = { date: string; amount: number };
type Summary = { committed: number; paidIn: number; nav: number; distributions: number; tvpi: number; dpi: number; rvpi: number; irr: number };

const models: HoldingModel[] = SYNTHETIC_PORTFOLIO.holdings.map(qualitative => {
  const companies = qualitative.companies.map((company, index): CompanyModel => {
    const key = company.company_id;
    const outcome = index % 11 === 8 ? "writeoff" : index % 9 === 6 ? "exit" : "active";
    const earliestInvestment = Date.parse(qualitative.firstClose) + 30 * 86_400_000;
    const latestInvestment = Date.parse("2024-10-15");
    const firstInvestment = new Date(earliestInvestment + Math.floor(unit(key, "investment-date") *
      (latestInvestment - earliestInvestment))).toISOString().slice(0, 10);
    const investmentYear = Number(firstInvestment.slice(0, 4));
    return {
      qualitative: company,
      cost: roundTo(180_000 + unit(key, "cost") * 720_000, 5_000),
      targetMoic: outcome === "writeoff" ? 0 : outcome === "exit" ? 0.65 + unit(key, "return") * 3.2 :
        index % 13 === 0 ? 5.5 + unit(key, "return") * 3.5 : 0.35 + unit(key, "return") * 3.8,
      outcome,
      eventQuarter: outcome === "active" ? 5 : 2 + Math.floor(unit(key, "exit-quarter") * 4),
      ownership: index % 13 === 0 ? 0.0025 : 0.008 + unit(key, "ownership") * 0.035,
      firstInvestment,
      founded: investmentYear - 1 - Math.floor(unit(key, "founded") * 4),
      initialStage: Math.floor(unit(key, "stage") * 3),
    };
  });
  const commitment = roundTo(sum(companies.map(company => company.cost)) * (1.15 + unit(qualitative.code, "reserve") * 0.2), 100_000);
  return { qualitative, companies, commitment,
    fundSize: roundTo(commitment / (0.12 + unit(qualitative.code, "fund-size") * 0.08), 1_000_000) };
});

function companyAtQuarter(holding: HoldingModel, model: CompanyModel, quarterIndex: number): ReportingUnderlyingCompany {
  const { updateTopic, ...qualitative } = model.qualitative;
  const progress = Math.min(quarterIndex + 1, model.eventQuarter + 1) / (model.eventQuarter + 1);
  const invested = Math.round(model.cost * (0.6 + 0.4 * progress));
  const startingMoic = 0.82 + unit(qualitative.company_id, "entry-value") * 0.28;
  const moic = startingMoic + (model.targetMoic - startingMoic) * progress * progress * (3 - 2 * progress);
  const totalValue = Math.round(invested * moic);
  const terminated = model.outcome !== "active" && quarterIndex >= model.eventQuarter;
  const exited = terminated && model.outcome === "exit";
  const writtenOff = terminated && model.outcome === "writeoff";
  const partialDistribution = model.outcome === "active" && model.targetMoic > 1.4
    ? Math.round(model.cost * (0.06 + unit(qualitative.company_id, "realization") * 0.18) * Math.max(0, quarterIndex - 2) / 3)
    : 0;
  const realized = exited ? totalValue : partialDistribution;
  const fairValue = writtenOff || exited ? 0 : totalValue - realized;
  const currentStatus = writtenOff ? "EXIT - WRITE OFF" : exited ? "EXITED" : "ACTIVE";
  const stages = ["Pre-Seed", "Seed", "Series A", "Series B"];
  const stage = writtenOff ? "Exit - Write-off" : exited ? "Exit" : stages[Math.min(3, model.initialStage + (quarterIndex >= 3 && model.targetMoic > 2 ? 1 : 0))]!;
  const postMoney = terminated ? null : Math.round(fairValue / model.ownership);
  const arr = terminated ? (writtenOff ? 0 : null) : roundTo((postMoney ?? 0) / (8 + unit(qualitative.company_id, "revenue-multiple") * 12), 1_000);
  const period = QUARTERS[quarterIndex]?.key ?? "2024_Q4";
  const update = writtenOff ? "The modeled investment was written off; residual value and future operating revenue are zero." :
    exited ? "The modeled investment was fully realized in cash; no residual holding remains." :
    `The fictional team is ${updateTopic}. ${model.targetMoic < 1 ? "The scenario models a valuation decline and a narrower product focus." : "The scenario models continued product development and gradual commercial progress."}${partialDistribution > 0 ? " A partial cash realization is included while the remaining position stays active." : ""}`;
  return { ...qualitative,
    linked_fund_vintage_year: holding.qualitative.vintage,
    year_founded: model.founded,
    first_investment_date: model.firstInvestment,
    company_stage_reported: stage, company_stage_current: stage, current_status: currentStatus,
    ownership: terminated ? 0 : model.ownership,
    invested_eur: invested, fair_value_eur: fairValue, realized_cash_eur: realized, proceeds_stock_eur: 0,
    moic: (fairValue + realized) / invested,
    arr, update_narrative: `${period.replace("_", " ")} — ${update} All information is invented for this demonstration.`,
    post_money_eur_current: postMoney,
    post_money_usd_current: postMoney == null ? null : Math.round(postMoney * 1.1),
    report_period: period,
  };
}

function holdingAtQuarter(model: HoldingModel, companies: ReportingUnderlyingCompany[]): ReportingHolding {
  const invested = sum(companies.map(c => c.invested_eur!));
  const fairValue = sum(companies.map(c => c.fair_value_eur!));
  const distributed = sum(companies.map(c => c.realized_cash_eur!));
  const q = model.qualitative;
  return {
    asset_code: q.code, asset_name: q.name, asset_type: "fund", practice_type: "fund_of_funds",
    vintage_year: q.vintage, first_closing_date: q.firstClose, stage_label: "Pre-Seed – Series B",
    vc_firm: q.manager, country_label: q.country, location: `${q.city}, ${q.country}`, theme: q.theme,
    fund_size_display: `€${model.fundSize / 1_000_000}m`, called_pct: invested / model.commitment,
    deal_count: companies.length, committed_eur: model.commitment, drawdown_eur: invested,
    net_invested_eur: invested, fair_value_eur: fairValue,
    rvpi: fairValue / invested, dpi: distributed / invested, tvpi: (fairValue + distributed) / invested,
    status: "active", detail_blurb: q.description,
  };
}

// Actual dated synthetic contributions and distributions, plus the terminal NAV.
// No estimated return is obtained by adding an arbitrary uplift to another metric.
export function calculateSyntheticIrr(cashFlows: CashFlow[], endDate: string, nav: number) {
  const ordered = [...cashFlows, { date: endDate, amount: nav }].sort((a, b) => a.date.localeCompare(b.date));
  const start = Date.parse(ordered[0]!.date);
  const npv = (rate: number) => sum(ordered.map(flow => flow.amount / (1 + rate) ** ((Date.parse(flow.date) - start) / 31_557_600_000)));
  let low = -0.9999, high = 1;
  while (npv(high) > 0 && high < 1024) high *= 2;
  if (npv(low) < 0 || npv(high) > 0) throw new Error("Synthetic cash flows do not bracket an IRR.");
  for (let iteration = 0; iteration < 100; iteration++) {
    const middle = (low + high) / 2;
    if (npv(middle) > 0) low = middle; else high = middle;
  }
  return (low + high) / 2;
}

function summarize(holdings: ReportingHolding[], companies: ReportingUnderlyingCompany[], flows: CashFlow[], end: string): Summary {
  const committed = sum(holdings.map(h => h.committed_eur));
  const paidIn = sum(companies.map(c => c.invested_eur!));
  const nav = sum(companies.map(c => c.fair_value_eur!));
  const distributions = sum(companies.map(c => c.realized_cash_eur!));
  return { committed, paidIn, nav, distributions, tvpi: (nav + distributions) / paidIn,
    dpi: distributions / paidIn, rvpi: nav / paidIn, irr: calculateSyntheticIrr(flows, end, nav) };
}
function metric(key: string, label: string, value: number, type: string, previous?: number): ReportingMetric {
  return { metric_key: key, label, value, value_type: type, comparison_value: previous,
    comparison_label: previous == null ? null : "Previous quarter", note: "Fictional look-through values; no separate fund fees, carried interest, or other assets are modeled." };
}
function buildMetrics(s: Summary, p?: Summary): ReportingMetric[] {
  return [
    metric("tvpi_to_investors", "TVPI", s.tvpi, "multiple", p?.tvpi),
    metric("net_asset_value", "Net asset value (NAV)", s.nav, "currency", p?.nav),
    metric("net_irr", "Net IRR", s.irr, "percent", p?.irr),
    metric("dpi_to_investors", "DPI", s.dpi, "multiple", p?.dpi),
    metric("rvpi_to_investors", "RVPI", s.rvpi, "multiple", p?.rvpi),
    metric("cumulative_paid_in_capital", "Paid-in capital", s.paidIn, "currency", p?.paidIn),
    metric("cumulative_distributions_to_fund", "Cumulative distributions", s.distributions, "currency", p?.distributions),
    metric("total_commitments_to_fund", "Total commitments", s.committed, "currency", p?.committed),
    metric("total_commitment_available_for_drawdown", "Available for drawdown", s.committed - s.paidIn, "currency", p ? p.committed - p.paidIn : undefined),
    metric("fair_value_of_current_portfolio", "Portfolio fair value", s.nav, "currency", p?.nav),
    metric("residual_value", "Residual value", s.nav, "currency", p?.nav),
    metric("distributed_to_investors", "Distributed to investors", s.distributions, "currency", p?.distributions),
    metric("total_net_invested_in_portfolio_companies", "Net invested capital", s.paidIn, "currency", p?.paidIn),
    metric("paid_in_to_commitment_ratio", "% called", s.paidIn / s.committed, "percent", p ? p.paidIn / p.committed : undefined),
    metric("gross_irr", "Gross IRR", s.irr, "percent", p?.irr),
    metric("gross_multiple_to_cost", "Gross multiple to cost", s.tvpi, "multiple", p?.tvpi),
    metric("cash_borrowings_and_other_assets_liabilities", "Cash and other net assets", 0, "currency", p ? 0 : undefined),
  ];
}
function breakdown(companies: ReportingUnderlyingCompany[], field: "country" | "industry"): ReportingBreakdownItem[] {
  const groups = new Map<string, ReportingBreakdownItem>();
  for (const company of companies) {
    const label = company[field]!;
    const item = groups.get(label) ?? { bucket_key: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label, company_count: 0, exposure_eur: 0 };
    item.company_count += 1;
    item.exposure_eur += company.fair_value_eur!;
    groups.set(label, item);
  }
  return [...groups.values()].sort((a, b) => b.exposure_eur - a.exposure_eur);
}
function financialSections(current: Summary, previous: Summary): ReportingFinancialSection[] {
  const capital = current.paidIn - previous.paidIn;
  const distributions = -(current.distributions - previous.distributions);
  const gains = current.nav - previous.nav - capital - distributions;
  return [
    { section_key: "nav_bridge", title: "NAV / Residual Value bridge", statement_type: "nav_bridge", rows: [
      { row_key: "residual_value_start_of_quarter", label: "Residual Value - start of quarter", values: { amount: previous.nav } },
      { row_key: "paid_in_capital", label: "Paid in Capital (+)", values: { amount: capital } },
      { row_key: "unrealized_gains_losses", label: "Unrealized gains / (losses) (+/-)", values: { amount: gains } },
      { row_key: "investment_income", label: "Investment income (+)", values: { amount: 0 } },
      { row_key: "management_fees", label: "Management Fees (-)", values: { amount: 0 } },
      { row_key: "other_income_expense", label: "Other Income / (Expense) (+/-)", values: { amount: 0 } },
      { row_key: "distributions", label: "Distributions (-)", values: { amount: distributions } },
      { row_key: "carry_allocation", label: "Carry Allocation (-)", values: { amount: 0 } },
      { row_key: "residual_value_end_of_quarter", label: "Residual Value - end of quarter", values: { amount: current.nav } },
      { row_key: "check_vs_residual_value_current", label: "Check vs Residual value (current)", values: { amount: 0 } },
    ] },
    { section_key: "cash_flow", title: "Cash flow", statement_type: "cash_flow", rows: [
      { row_key: "paid_in", label: "Cumulative paid-in capital", values: { amount: current.paidIn } },
      { row_key: "distributed", label: "Cumulative distributions", values: { amount: current.distributions } },
      { row_key: "net_cash", label: "Net contributed capital", values: { amount: current.paidIn - current.distributions } },
    ] },
    { section_key: "value_reconciliation", title: "Value reconciliation", statement_type: "reconciliation", rows: [
      { row_key: "residual_value", label: "Residual value", values: { amount: current.nav } },
      { row_key: "realized_value", label: "Realized value", values: { amount: current.distributions } },
      { row_key: "total_value", label: "Total value", values: { amount: current.nav + current.distributions } },
    ] },
  ];
}
function rowsAtQuarter(index: number) {
  const groups = models.map(model => {
    const companies = model.companies.map(company => companyAtQuarter(model, company, index));
    return { holding: holdingAtQuarter(model, companies), companies };
  });
  return { holdings: groups.map(group => group.holding), companies: groups.flatMap(group => group.companies) };
}

const opening = rowsAtQuarter(-1);
const cashFlows: CashFlow[] = opening.companies.map(company => ({ date: company.first_investment_date!, amount: -company.invested_eur! }));
let priorRows = opening;
let priorSummary = summarize(opening.holdings, opening.companies, cashFlows, "2024-12-31");
// Exposed for reconciliation tests; generated from the same per-company ledger as the UI.
export const MOCK_CASH_FLOWS_BY_QUARTER = new Map<string, CashFlow[]>();
export const MOCK_REPORT_PACKAGES: ReportingPackage[] = QUARTERS.map((quarter, index) => {
  const { holdings, companies } = rowsAtQuarter(index);
  companies.forEach((company, companyIndex) => {
    const prior = priorRows.companies[companyIndex]!;
    cashFlows.push({ date: quarter.end, amount: -(company.invested_eur! - prior.invested_eur!) + company.realized_cash_eur! - prior.realized_cash_eur! });
  });
  MOCK_CASH_FLOWS_BY_QUARTER.set(quarter.key, cashFlows.map(flow => ({ ...flow })));
  const s = summarize(holdings, companies, cashFlows, quarter.end);
  const unicorns = companies.filter(company => (company.post_money_eur_current ?? 0) >= 1_000_000_000);
  const aboveCost = companies.filter(company => company.moic! >= 1).length;
  const active = companies.filter(company => company.current_status === "ACTIVE").length;
  const report: ReportingPackage = {
    schema_version: "1.0.0", package_id: `mock-synthetic-${quarter.key.toLowerCase()}`, published_at: quarter.published,
    report_meta: { fund_code: SYNTHETIC_FUND.code, fund_slug: SYNTHETIC_FUND.slug, fund_display_name: SYNTHETIC_FUND.name,
      quarter_key: quarter.key, quarter_slug: quarter.slug, quarter_end_date: quarter.end, report_currency: "EUR",
      scope: "Entirely fictional portfolio, relationships, qualitative information, and financial history.",
      source_status: { pdf_seeded: false, excel_ready: false, airtable_enriched: false }, source_documents: [] },
    overview: { headline: `${SYNTHETIC_FUND.name}: five fictional funds and ${companies.length} invented companies.`,
      vintage_year: SYNTHETIC_FUND.vintageYear, manager: "Synthetic Manager (fictional)", fund_currency: "EUR",
      term: "Ten-year fictional closed-end vehicle", investment_focus: "Illustrative international early-stage technology investments",
      structure_summary: "A fictional fund-of-funds with five invented holdings. No actual Aldea portfolio structure or positions are represented.",
      first_closing_date: SYNTHETIC_FUND.firstClose, final_closing_date: SYNTHETIC_FUND.finalClose,
      investment_period_end: SYNTHETIC_FUND.investmentPeriodEnd, domicile: "Fictional demonstration vehicle", total_commitment_eur: s.committed },
    key_metrics: buildMetrics(s, index === 0 ? undefined : priorSummary),
    strategy_summary: [{ strategy_key: "fund_of_funds", label: "Fund of Funds", committed_eur: s.committed,
      drawdown_eur: s.paidIn, net_invested_eur: s.paidIn, fair_value_eur: s.nav, rvpi: s.rvpi, dpi: s.dpi, tvpi: s.tvpi,
      note: "Sum of the five fictional fund positions." }],
    geography_breakdown: breakdown(companies, "country"), industry_breakdown: breakdown(companies, "industry"),
    portfolio_holdings: holdings, underlying_companies: companies,
    above_cost_metric: { at_or_above_1x_moic_count: aboveCost, valid_moic_count: companies.length,
      at_or_above_1x_moic_percentage: aboveCost / companies.length, deduplication_method: "unique_synthetic_company_id",
      is_deduplicated: true, metric_basis: "unique_companies", insufficient_data: false },
    current_unicorn_count: unicorns.length, current_unicorn_active_count: unicorns.length,
    current_unicorn_companies: unicorns.map(company => ({ company_id: company.company_id, company_name: company.company_name!,
      current_status: company.current_status!, fund_scope_labels: [SYNTHETIC_FUND.name], top_round_name: "Fictional preferred equity round",
      top_round_stage: company.company_stage_current!, top_round_date: quarter.end,
      top_post_money_lcy: company.post_money_eur_current!, top_post_money_eur: company.post_money_eur_current! })),
    financial_sections: financialSections(s, priorSummary),
    narrative_sections: [
      { section_key: "quarterly_highlights", title: "Quarterly highlights", summary: "An entirely fictional investment scenario",
        body_markdown: `This simulated quarter includes ${active} active companies out of ${companies.length} invented investments. ${aboveCost} positions are at or above cost. Every name, relationship, business description, and number was created for the demonstration.`, sort_order: 1, is_expandable: true },
      { section_key: "portfolio_evolution", title: "Portfolio evolution", summary: "Illustrative deployment, growth, exits, and write-offs",
        body_markdown: "Capital calls, residual values, cash realizations, and status changes follow one deterministic scenario. Company amounts sum into the five funds and the overall report; maps and charts use those same records.", sort_order: 2, is_expandable: true },
    ],
    footnotes: [
      { footnote_key: "synthetic_data", text: "All entities, identities, relationships, descriptions, locations assigned to entities, and figures are fictional. Geography labels refer to real places only to demonstrate the maps.", applies_to: "all" },
      { footnote_key: "model_basis", text: "Simplified attributed look-through amounts in EUR. No separate wrapper fees, carry, borrowings, or other assets; gross and net returns coincide. IRR uses dated synthetic cash flows and terminal NAV. A fixed illustrative EUR/USD rate of 1.10 is used.", applies_to: "all" },
    ],
  };
  priorRows = { holdings, companies };
  priorSummary = s;
  return report;
});

export const MOCK_REPORTING_MANIFEST: ReportingManifest = {
  schema_version: "1.0.0", updated_at: QUARTERS.at(-1)!.published,
  reports: [...MOCK_REPORT_PACKAGES].reverse().map(report => ({ report_id: report.package_id,
    fund_code: SYNTHETIC_FUND.code, fund_slug: SYNTHETIC_FUND.slug, fund_display_name: SYNTHETIC_FUND.name,
    quarter_key: report.report_meta.quarter_key, quarter_slug: report.report_meta.quarter_slug,
    title: `${SYNTHETIC_FUND.name} · ${report.report_meta.quarter_key}`, published_at: report.published_at,
    package_path: `mock-data://${report.package_id}`, summary: report.overview.headline })),
};
export function getMockReportPackage(fundSlug: string, quarterSlug?: string | null) {
  return [...MOCK_REPORT_PACKAGES].reverse().find(report => report.report_meta.fund_slug === fundSlug &&
    (!quarterSlug || report.report_meta.quarter_slug === quarterSlug)) ?? null;
}
export function getMockReportPackagesByFundCode(fundCode: string) {
  return [...MOCK_REPORT_PACKAGES].reverse().filter(report => report.report_meta.fund_code === fundCode);
}
