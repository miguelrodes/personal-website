import { test, expect } from "@playwright/test";
import qualitativeSnapshotJson from "../src/demo/mock-data/qualitativePortfolioSnapshot.json" with { type: "json" };
import { MOCK_DATA_SEED, MOCK_LOVABLE_TARGET_MOIC, MOCK_REPORTING_MANIFEST,
  getMockReportPackage, getMockReportPackagesByFundCode } from "../src/demo/mock-data/investorPortal";
import { validateMockPackage } from "../src/demo/validateMockData";

// Financial reconciliation and permitted-identity tests preserved from the source mock implementation.
function numericMetric(reportPackage: NonNullable<ReturnType<typeof getMockReportPackage>>, key: string) {
  const value = reportPackage.key_metrics.find((metric) => metric.metric_key === key)?.value;
  if (typeof value !== "number") throw new Error(`Missing numeric metric ${key}`);
  return value;
}

function allMockPackages() {
  const fundCodes = [...new Set(MOCK_REPORTING_MANIFEST.reports.map((report) => report.fund_code))];
  return fundCodes.flatMap(getMockReportPackagesByFundCode);
}

test.describe("isolated investor portal mock data", () => {
  test("uses the existing deterministic public mock seed", () => {
    expect(MOCK_DATA_SEED).toBe("ALDEA_PUBLIC_DEMO_2026");
    expect(allMockPackages()).toHaveLength(10);
    allMockPackages().forEach(validateMockPackage);
  });

  test("preserves the real qualitative portfolio identities in the sanitized mock layer", () => {
    const packages = allMockPackages();

    expect(packages.length).toBeGreaterThan(2);
    expect(new Set(packages.map((reportPackage) => reportPackage.report_meta.fund_display_name))).toEqual(
      new Set(["Aldea Tech Fund I", "Aldea Tech Fund II"]),
    );
    for (const reportPackage of packages) {
      expect(reportPackage.overview.manager).toMatch(/Aldea/i);
      expect(reportPackage.underlying_companies?.length).toBeGreaterThan(0);
      expect(reportPackage.report_meta.source_documents).toEqual([]);
    }
  });

  test("pins byFounders and Lovable while retaining their qualitative relationship and logo", () => {
    const byFoundersPackages = allMockPackages().filter((reportPackage) =>
      reportPackage.portfolio_holdings.some((holding) => /byfounders/i.test(holding.asset_name)),
    );

    expect(byFoundersPackages.length).toBeGreaterThan(0);
    for (const reportPackage of byFoundersPackages) {
      expect(reportPackage.portfolio_holdings[0]?.asset_name).toMatch(/byfounders/i);

      const byFoundersCompanies = (reportPackage.underlying_companies ?? []).filter(
        (company) => company.linked_portfolio_holding_asset_code === "BYFOUNDERS_VC_FUND_II",
      );
      if (byFoundersCompanies.length === 0) continue;

      expect(reportPackage.underlying_companies?.[0]?.company_name).toBe("Lovable");
      expect(byFoundersCompanies[0]?.company_name).toBe("Lovable");
      expect(byFoundersCompanies[0]?.linked_fund_name).toBe("ByFounders VC Fund II K/S");
      expect(byFoundersCompanies[0]?.logo_attachment_filename).toBe("lovable_dev_logo.jpg");
      expect(byFoundersCompanies[0]?.description_short).toMatch(/GPT-powered interface/i);
    }
  });

  test("marks Lovable near 100x in the latest mock quarter without changing the byFounders fund total", () => {
    const latestPackages = [...new Set(MOCK_REPORTING_MANIFEST.reports.map((report) => report.fund_code))]
      .map((fundCode) => getMockReportPackagesByFundCode(fundCode)[0]!)
      .filter((reportPackage) =>
        reportPackage.underlying_companies?.some((company) => company.company_name === "Lovable"),
      );

    expect(latestPackages.length).toBeGreaterThan(0);
    for (const reportPackage of latestPackages) {
      const lovable = reportPackage.underlying_companies?.find((company) => company.company_name === "Lovable");
      const byFounders = reportPackage.portfolio_holdings.find(
        (holding) => holding.asset_code === "BYFOUNDERS_VC_FUND_II",
      );

      expect(lovable?.moic).toBeCloseTo(MOCK_LOVABLE_TARGET_MOIC, 2);
      expect(byFounders?.tvpi).toBeCloseTo(4.2, 3);
    }
  });

  test("reconciles NAV, distributions, TVPI, DPI, and RVPI from the underlying mock positions", () => {
    const packages = allMockPackages();

    for (const reportPackage of packages) {
      const paidIn = reportPackage.portfolio_holdings.reduce(
        (total, holding) => total + holding.net_invested_eur,
        0,
      );
      const nav = reportPackage.portfolio_holdings.reduce(
        (total, holding) => total + holding.fair_value_eur,
        0,
      );
      const distributions = reportPackage.portfolio_holdings.reduce(
        (total, holding) => total + holding.dpi * holding.net_invested_eur,
        0,
      );
      const expectedDpi = distributions / paidIn;
      const expectedRvpi = nav / paidIn;
      const expectedTvpi = expectedDpi + expectedRvpi;

      expect(numericMetric(reportPackage, "net_asset_value")).toBe(nav);
      expect(numericMetric(reportPackage, "cumulative_paid_in_capital")).toBe(paidIn);
      expect(numericMetric(reportPackage, "cumulative_distributions_to_fund")).toBe(distributions);
      expect(numericMetric(reportPackage, "dpi_to_investors")).toBeCloseTo(expectedDpi, 10);
      expect(numericMetric(reportPackage, "rvpi_to_investors")).toBeCloseTo(expectedRvpi, 10);
      expect(numericMetric(reportPackage, "tvpi_to_investors")).toBeCloseTo(expectedTvpi, 10);

      for (const holding of reportPackage.portfolio_holdings) {
        const companies = (reportPackage.underlying_companies ?? []).filter(
          (company) => company.linked_portfolio_holding_asset_code === holding.asset_code,
        );
        if (companies.length === 0) continue;
        expect(companies.reduce((total, company) => total + (company.invested_eur ?? 0), 0)).toBe(holding.net_invested_eur);
        expect(companies.reduce((total, company) => total + (company.fair_value_eur ?? 0), 0)).toBe(holding.fair_value_eur);
        expect(companies.reduce((total, company) => total + (company.realized_cash_eur ?? 0), 0)).toBeCloseTo(holding.dpi * holding.net_invested_eur, 8);
      }
      for (const company of reportPackage.underlying_companies ?? []) {
        expect(company.first_investment_date).not.toBeNull();
        expect(company.first_investment_date! <= reportPackage.report_meta.quarter_end_date).toBe(true);
        if (!(company.invested_eur && company.invested_eur > 0)) continue;
        const aggregateMoic = ((company.fair_value_eur ?? 0) + (company.realized_cash_eur ?? 0) + (company.proceeds_stock_eur ?? 0)) / company.invested_eur;
        expect(company.moic).toBeCloseTo(aggregateMoic, 10);
      }
    }
  });

  test("matches the original Quarter movement structure and reconciles every mock NAV bridge", () => {
    const expectedRows = [
      ["residual_value_start_of_quarter", "Residual Value - start of quarter"],
      ["paid_in_capital", "Paid in Capital (+)"],
      ["unrealized_gains_losses", "Unrealized gains / (losses) (+/-)"],
      ["investment_income", "Investment income (+)"],
      ["management_fees", "Management Fees (-)"],
      ["other_income_expense", "Other Income / (Expense) (+/-)"],
      ["distributions", "Distributions (-)"],
      ["carry_allocation", "Carry Allocation (-)"],
      ["residual_value_end_of_quarter", "Residual Value - end of quarter"],
      ["check_vs_residual_value_current", "Check vs Residual value (current)"],
    ];
    const fundCodes = [...new Set(MOCK_REPORTING_MANIFEST.reports.map((report) => report.fund_code))];

    for (const fundCode of fundCodes) {
      const chronologicalPackages = [...getMockReportPackagesByFundCode(fundCode)].reverse();

      chronologicalPackages.forEach((reportPackage, packageIndex) => {
        const bridge = reportPackage.financial_sections.find((section) => section.section_key === "nav_bridge");
        expect(bridge).toMatchObject({
          title: "NAV / Residual Value bridge",
          statement_type: "nav_bridge",
        });
        expect(bridge!.rows.map((row) => [row.row_key, row.label])).toEqual(expectedRows);

        const amounts = new Map(
          bridge!.rows.map((row) => [row.row_key, row.values.amount as number]),
        );
        const opening = amounts.get("residual_value_start_of_quarter")!;
        const closing = amounts.get("residual_value_end_of_quarter")!;
        const movements = bridge!.rows
          .slice(1, -2)
          .reduce((total, row) => total + (row.values.amount as number), 0);

        expect(opening + movements).toBe(closing);
        expect(closing).toBe(numericMetric(reportPackage, "net_asset_value"));
        expect(amounts.get("paid_in_capital")).toBeGreaterThanOrEqual(0);
        expect(amounts.get("investment_income")).toBeGreaterThanOrEqual(0);
        expect(amounts.get("management_fees")).toBeLessThanOrEqual(0);
        expect(amounts.get("distributions")).toBeLessThanOrEqual(0);
        expect(amounts.get("carry_allocation")).toBeLessThanOrEqual(0);

        if (packageIndex > 0) {
          const previousBridge = chronologicalPackages[packageIndex - 1]!.financial_sections.find(
            (section) => section.section_key === "nav_bridge",
          )!;
          const previousClosing = previousBridge.rows.find(
            (row) => row.row_key === "residual_value_end_of_quarter",
          )!.values.amount;
          expect(opening).toBe(previousClosing);
        }
      });
    }
  });

  test("keeps history endpoints, quarter comparisons, and reload reads consistent", () => {
    const fundCodes = [...new Set(MOCK_REPORTING_MANIFEST.reports.map((report) => report.fund_code))];
    for (const fundCode of fundCodes) {
      const descendingHistory = getMockReportPackagesByFundCode(fundCode);
      const latest = descendingHistory[0]!;
      expect(getMockReportPackage(latest.report_meta.fund_slug, latest.report_meta.quarter_slug)).toEqual(latest);
      for (let index = 0; index < descendingHistory.length - 1; index += 1) {
        const current = descendingHistory[index]!;
        const previous = descendingHistory[index + 1]!;
        for (const metric of current.key_metrics) {
          const previousValue = previous.key_metrics.find((candidate) => candidate.metric_key === metric.metric_key)?.value;
          if (typeof previousValue === "number") expect(metric.comparison_value).toBe(previousValue);
        }
      }
      const chartEndpoint = [...descendingHistory].reverse().at(-1)!;
      expect(numericMetric(chartEndpoint, "tvpi_to_investors")).toBe(numericMetric(latest, "tvpi_to_investors"));
      expect(numericMetric(chartEndpoint, "net_asset_value")).toBe(numericMetric(latest, "net_asset_value"));
    }
  });

  test("contains no embedded financial or operating quantities in qualitative snapshot strings", () => {
    const allowedStructuralFields = new Set(["asset_code", "asset_name", "company_id", "company_name", "former_name", "fund_code", "fund_display_name", "fund_slug", "fund_scope_labels", "linked_fund_name", "linked_fund_record_id", "linked_portfolio_holding_asset_code", "linked_portfolio_holding_asset_name", "linkedin", "logo_attachment_filename", "portfolio_fund_labels_current", "schema_version", "vc_firm", "website"]);
    const forbiddenPatterns = [/[€$£]\s*\d/i, /\d(?:[\d.,]*)\s*%/, /\b\d+(?:\.\d+)?\s*(?:x|k|m|mn|b|bn|million|billion)\b/i, /\b(?:arr|mrr|revenue|valuation|fund size|funding|fundraise|raised|runway|burn|gmv|aum|paid[- ]?in|nav|distributions?|proceeds|cash|customers?|employees?)\b[^.!?\n]{0,50}\d|\d[^.!?\n]{0,50}\b(?:arr|mrr|revenue|valuation|fund size|funding|fundraise|raised|runway|burn|gmv|aum|paid[- ]?in|nav|distributions?|proceeds|cash|customers?|employees?)\b/i];
    const suspicious: Array<{ path: string; value: string }> = [];
    function scan(value: unknown, path: string[] = []) {
      if (Array.isArray(value)) { value.forEach((item) => scan(item, [...path, "[]"])); return; }
      if (value && typeof value === "object") { Object.entries(value).forEach(([key, item]) => scan(item, [...path, key])); return; }
      if (typeof value !== "string" || allowedStructuralFields.has(path.at(-1) ?? "")) return;
      if (forbiddenPatterns.some((pattern) => pattern.test(value))) suspicious.push({ path: path.join("."), value });
    }
    scan(qualitativeSnapshotJson);
    expect(suspicious).toEqual([]);
  });

});

test("rejects absent, empty, non-mock, and non-finite reporting data", () => {
  const original = getMockReportPackage("tech-fund-1", "2026-q2")!;
  for (const invalid of [null, {}, {...original, package_id: "production"},
    {...original, underlying_companies: []},
    {...original, report_meta: {...original.report_meta, source_documents: ["private.pdf"]}},
    {...original, key_metrics: [{metric_key: "net_asset_value", value: NaN}]}]) {
    expect(() => validateMockPackage(invalid)).toThrow("Demo temporarily unavailable.");
  }
});
