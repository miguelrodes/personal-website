import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { MOCK_DATA_SEED, MOCK_REPORTING_MANIFEST, MOCK_REPORT_PACKAGES, MOCK_CASH_FLOWS_BY_QUARTER,
  getMockReportPackage, getMockReportPackagesByFundCode } from "../src/demo/mock-data/investorPortal";
import { SYNTHETIC_FUND, SYNTHETIC_HOLDINGS } from "../src/demo/mock-data/syntheticPortfolio";
import { validateMockPackage } from "../src/demo/validateMockData";
import { buildLocalPreviewFundScatterHistoryRows } from "../src/demo/lib/fund-reporting/fundScatter";
import type { ReportingPackage } from "../src/demo/lib/fund-reporting/types";

const metric = (report: ReportingPackage, key: string) => Number(report.key_metrics.find(m => m.metric_key === key)?.value);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

test("only the new synthetic fund and six deterministic quarterly reports are available", () => {
  expect(MOCK_DATA_SEED).toBe("ALDEA_FULLY_SYNTHETIC_V1");
  expect(MOCK_REPORT_PACKAGES).toHaveLength(6);
  expect(MOCK_REPORTING_MANIFEST.reports).toHaveLength(6);
  expect(getMockReportPackage("synthetic-fund")).toEqual(MOCK_REPORT_PACKAGES.at(-1));
  expect(getMockReportPackage("unknown-fund")).toBeNull();
  expect(getMockReportPackage("synthetic-fund", "2030-q1")).toBeNull();
  expect(getMockReportPackagesByFundCode("SYNTHETIC")).toEqual([...MOCK_REPORT_PACKAGES].reverse());
  expect(existsSync("src/demo/mock-data/qualitativePortfolioSnapshot.json")).toBe(false);
  for (const report of MOCK_REPORT_PACKAGES) {
    validateMockPackage(report);
    expect(report.report_meta).toMatchObject({ fund_display_name: "Aldea Synthetic Fund", fund_code: "SYNTHETIC", source_documents: [] });
    expect(getMockReportPackage(SYNTHETIC_FUND.slug, report.report_meta.quarter_slug)).toEqual(report);
  }
});

test("five invented funds contain 165 distinct companies with no real identity metadata", () => {
  for (const report of MOCK_REPORT_PACKAGES) {
    expect(report.portfolio_holdings.map(h => h.asset_name)).toEqual(["Fund A", "Fund B", "Fund C", "Fund D", "Fund E"]);
    expect(report.underlying_companies).toHaveLength(165);
    expect(new Set(report.underlying_companies!.map(c => c.company_id)).size).toBe(165);
    for (const spec of SYNTHETIC_HOLDINGS) {
      const holding = report.portfolio_holdings.find(h => h.asset_name === `Fund ${spec.letter}`)!;
      const rows = report.underlying_companies!.filter(c => c.linked_portfolio_holding_asset_code === holding.asset_code);
      expect(rows).toHaveLength(spec.companyCount);
      expect(holding.deal_count).toBe(rows.length);
      expect(rows.map(c => c.company_name)).toEqual(Array.from({length: spec.companyCount}, (_, i) => `Fund ${spec.letter} ${i + 1}`));
      for (const company of rows) {
        expect(company.linked_fund_name).toBe(holding.asset_name);
        expect(company.fund_scope_labels).toEqual(["Aldea Synthetic Fund"]);
        expect(company.portfolio_fund_labels_current).toEqual([holding.asset_name]);
        expect(company.description_short).toContain("fictional");
        expect(company.description_long).toContain("do not describe a real company");
        expect(company.update_narrative).toContain("All information is invented");
        expect([company.website, company.linkedin, company.logo_attachment_filename, company.former_name, company.name_woman]).toEqual([null, null, null, null, null]);
        expect(company.year_founded).toBeLessThanOrEqual(Number(company.first_investment_date!.slice(0, 4)));
        expect(company.first_investment_date! >= holding.first_closing_date!).toBe(true);
        expect(company.first_investment_date! <= report.report_meta.quarter_end_date).toBe(true);
      }
    }
  }
});

test("company values, holdings, strategy totals, KPIs, and every exposure bucket reconcile", () => {
  for (const report of MOCK_REPORT_PACKAGES) {
    const allCompanies = report.underlying_companies!;
    const nav = sum(allCompanies.map(c => c.fair_value_eur!));
    const paidIn = sum(allCompanies.map(c => c.invested_eur!));
    const cash = sum(allCompanies.map(c => c.realized_cash_eur!));
    expect(metric(report, "net_asset_value")).toBe(nav);
    expect(metric(report, "cumulative_paid_in_capital")).toBe(paidIn);
    expect(metric(report, "cumulative_distributions_to_fund")).toBe(cash);
    expect(metric(report, "tvpi_to_investors")).toBeCloseTo((nav + cash) / paidIn, 10);
    expect(metric(report, "tvpi_to_investors")).toBeCloseTo(metric(report, "dpi_to_investors") + metric(report, "rvpi_to_investors"), 10);
    expect(report.strategy_summary).toHaveLength(1);
    expect(report.strategy_summary[0]).toMatchObject({ fair_value_eur: nav, net_invested_eur: paidIn });
    for (const holding of report.portfolio_holdings) {
      const companies = allCompanies.filter(c => c.linked_portfolio_holding_asset_code === holding.asset_code);
      expect(holding.net_invested_eur).toBe(sum(companies.map(c => c.invested_eur!)));
      expect(holding.fair_value_eur).toBe(sum(companies.map(c => c.fair_value_eur!)));
      expect(holding.dpi * holding.net_invested_eur).toBeCloseTo(sum(companies.map(c => c.realized_cash_eur!)), 6);
      expect(holding.tvpi).toBeCloseTo(holding.dpi + holding.rvpi, 10);
      expect(holding.called_pct).toBeGreaterThan(0);
      expect(holding.called_pct).toBeLessThanOrEqual(1);
    }
    for (const [field, buckets] of [["country", report.geography_breakdown], ["industry", report.industry_breakdown]] as const) {
      expect(sum(buckets.map(b => b.exposure_eur))).toBe(nav);
      expect(sum(buckets.map(b => b.company_count))).toBe(165);
      for (const bucket of buckets) {
        const companies = allCompanies.filter(c => c[field] === bucket.label);
        expect(bucket.company_count).toBe(companies.length);
        expect(bucket.exposure_eur).toBe(sum(companies.map(c => c.fair_value_eur!)));
      }
    }
    expect(report.above_cost_metric!.at_or_above_1x_moic_count).toBe(allCompanies.filter(c => c.moic! >= 1).length);
    expect(report.current_unicorn_count).toBe(allCompanies.filter(c => c.post_money_eur_current! >= 1e9).length);
  }
});

test("exits and write-offs have zero residual value and stay closed in later quarters", () => {
  const latest = MOCK_REPORT_PACKAGES.at(-1)!;
  const statuses = new Set(latest.underlying_companies!.map(c => c.current_status));
  expect(statuses).toEqual(new Set(["ACTIVE", "EXITED", "EXIT - WRITE OFF"]));
  expect(latest.underlying_companies!.some(c => c.current_status === "ACTIVE" && c.moic! < 1)).toBe(true);
  expect(latest.underlying_companies!.some(c => c.current_status === "ACTIVE" && c.moic! > 5)).toBe(true);
  expect(new Set(latest.underlying_companies!.filter(c => c.current_status === "ACTIVE").map(c => c.company_stage_current)).size).toBe(4);
  for (const [index, report] of MOCK_REPORT_PACKAGES.entries()) {
    for (const company of report.underlying_companies!) {
      expect(company.moic).toBeCloseTo((company.fair_value_eur! + company.realized_cash_eur!) / company.invested_eur!, 10);
      if (company.current_status!.startsWith("EXIT")) {
        expect(company.fair_value_eur).toBe(0);
        expect(company.ownership).toBe(0);
        expect(company.post_money_eur_current).toBeNull();
      }
      if (company.current_status!.includes("WRITE")) {
        expect(company.realized_cash_eur).toBe(0);
        expect(company.moic).toBe(0);
      }
      if (index > 0) {
        const prior = MOCK_REPORT_PACKAGES[index - 1]!.underlying_companies!.find(c => c.company_id === company.company_id)!;
        expect(company.invested_eur!).toBeGreaterThanOrEqual(prior.invested_eur!);
        expect(company.realized_cash_eur!).toBeGreaterThanOrEqual(prior.realized_cash_eur!);
        expect(company.first_investment_date).toBe(prior.first_investment_date);
        if (prior.current_status!.startsWith("EXIT")) {
          expect(company.current_status).toBe(prior.current_status);
          expect(company.invested_eur).toBe(prior.invested_eur);
          expect(company.realized_cash_eur).toBe(prior.realized_cash_eur);
        }
      }
    }
  }
});

test("quarterly bridges, cash flows, comparisons and IRR reconcile across history", () => {
  for (const [index, report] of MOCK_REPORT_PACKAGES.entries()) {
    const bridge = report.financial_sections.find(s => s.section_key === "nav_bridge")!;
    const amounts = new Map(bridge.rows.map(r => [r.row_key, Number(r.values.amount)]));
    expect(bridge.rows).toHaveLength(10);
    expect(sum(bridge.rows.slice(0, -2).map(r => Number(r.values.amount)))).toBe(metric(report, "net_asset_value"));
    expect(amounts.get("residual_value_end_of_quarter")).toBe(metric(report, "net_asset_value"));
    if (index > 0) {
      const prior = MOCK_REPORT_PACKAGES[index - 1]!;
      expect(amounts.get("residual_value_start_of_quarter")).toBe(metric(prior, "net_asset_value"));
      expect(amounts.get("paid_in_capital")).toBe(metric(report, "cumulative_paid_in_capital") - metric(prior, "cumulative_paid_in_capital"));
      expect(amounts.get("distributions")).toBe(-(metric(report, "cumulative_distributions_to_fund") - metric(prior, "cumulative_distributions_to_fund")));
      for (const m of report.key_metrics) expect(m.comparison_value).toBe(metric(prior, m.metric_key));
    }
    const cashFlows = MOCK_CASH_FLOWS_BY_QUARTER.get(report.report_meta.quarter_key)!;
    expect(sum(cashFlows.map(f => f.amount))).toBe(metric(report, "cumulative_distributions_to_fund") - metric(report, "cumulative_paid_in_capital"));
    const allFlows = [...cashFlows, { date: report.report_meta.quarter_end_date, amount: metric(report, "net_asset_value") }];
    const start = Math.min(...allFlows.map(f => Date.parse(f.date)));
    const irr = metric(report, "net_irr");
    const npv = sum(allFlows.map(f => f.amount / (1 + irr) ** ((Date.parse(f.date) - start) / 31_557_600_000)));
    expect(Math.abs(npv)).toBeLessThan(0.01);
    expect(metric(report, "gross_irr")).toBe(irr);
  }
});

test("scatter histories contain only the five funds with correct quarterly endpoints", () => {
  const latest = MOCK_REPORT_PACKAGES.at(-1)!;
  const scatter = buildLocalPreviewFundScatterHistoryRows(MOCK_REPORT_PACKAGES, { throughReportPeriod: latest.report_meta.quarter_key });
  expect(scatter).toHaveLength(30);
  for (const report of MOCK_REPORT_PACKAGES) {
    const rows = scatter.filter(r => r.report_period === report.report_meta.quarter_key);
    expect(rows).toHaveLength(5);
    for (const holding of report.portfolio_holdings) {
      const row = rows.find(r => r.name === holding.asset_name)!;
      expect(row.aldea_fund).toBe("SYNTHETIC");
      expect(row.tvpi).toBeCloseTo(holding.tvpi, 5);
      expect(row.company_count).toBe(holding.deal_count);
    }
  }
});

test("rejects missing, substituted, identifiable, inconsistent, and non-finite data", () => {
  const original = MOCK_REPORT_PACKAGES.at(-1)!;
  for (const mutation of [
    (p: ReportingPackage) => { p.package_id = "production"; },
    (p: ReportingPackage) => { p.report_meta.fund_display_name = "Unapproved fund"; },
    (p: ReportingPackage) => { p.underlying_companies = []; },
    (p: ReportingPackage) => { p.underlying_companies![0]!.company_name = "Unapproved company"; },
    (p: ReportingPackage) => { p.underlying_companies![0]!.website = "https://example.com"; },
    (p: ReportingPackage) => { p.underlying_companies![0]!.invested_eur! += 1; },
    (p: ReportingPackage) => { p.key_metrics[0]!.value = NaN; },
    (p: ReportingPackage) => { p.report_meta.source_documents = [{} as never]; },
  ]) {
    const altered = structuredClone(original);
    mutation(altered);
    expect(() => validateMockPackage(altered)).toThrow("Demo temporarily unavailable.");
  }
  for (const value of [null, {}]) expect(() => validateMockPackage(value)).toThrow("Demo temporarily unavailable.");
});
