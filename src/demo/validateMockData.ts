import type { ReportingPackage } from "./lib/fund-reporting/types";
import { SYNTHETIC_FUND, SYNTHETIC_HOLDINGS } from "./mock-data/syntheticPortfolio";

export function validateMockPackage(value: unknown): asserts value is ReportingPackage {
  const fail = () => { throw new Error("Demo temporarily unavailable."); };
  const p = value as ReportingPackage | null;
  if (!p || !p.package_id?.startsWith("mock-synthetic-") ||
    p.report_meta?.fund_code !== SYNTHETIC_FUND.code ||
    p.report_meta.fund_slug !== SYNTHETIC_FUND.slug ||
    p.report_meta.fund_display_name !== SYNTHETIC_FUND.name ||
    p.report_meta.source_documents?.length !== 0 ||
    !Array.isArray(p.portfolio_holdings) || p.portfolio_holdings.length !== 5 ||
    !Array.isArray(p.underlying_companies) || p.underlying_companies.length !== 165 ||
    !Array.isArray(p.key_metrics) || !p.key_metrics.length ||
    !p.financial_sections?.some(s => s.section_key === "nav_bridge" && s.rows.length === 10)) return fail();
  function checkNumbers(item: unknown) {
    if (typeof item === "number" && !Number.isFinite(item)) fail();
    if (item && typeof item === "object") Object.values(item).forEach(checkNumbers);
  }
  checkNumbers(p);
  const close = (a: number, b: number) => { if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a - b) > 0.000001) fail(); };
  const companies = p.underlying_companies!;
  if (new Set(companies.map(c => c.company_id)).size !== companies.length) fail();
  let paidIn = 0, nav = 0, distributions = 0, committed = 0;
  for (const spec of SYNTHETIC_HOLDINGS) {
    const code = `SYNTHETIC_FUND_${spec.letter}`;
    const name = `Fund ${spec.letter}`;
    const holding = p.portfolio_holdings.find(h => h.asset_code === code);
    const rows = companies.filter(c => c.linked_portfolio_holding_asset_code === code);
    if (!holding || holding.asset_name !== name || rows.length !== spec.companyCount) return fail();
    let invested = 0, fairValue = 0, cash = 0;
    rows.forEach((company, index) => {
      if (company.company_name !== `${name} ${index + 1}` ||
        company.company_id !== `synthetic-${spec.letter.toLowerCase()}-${String(index + 1).padStart(2, "0")}` ||
        company.linked_fund_name !== name || company.linked_fund_record_id !== code ||
        company.linked_portfolio_holding_asset_name !== name || company.relationship_type !== "underlying_fund_company" ||
        company.website != null || company.linkedin != null || company.logo_attachment_filename != null ||
        company.former_name != null || company.name_woman != null ||
        !(company.invested_eur! > 0) || !(company.fair_value_eur! >= 0) || !(company.realized_cash_eur! >= 0) ||
        company.proceeds_stock_eur !== 0 || !company.first_investment_date ||
        company.first_investment_date > p.report_meta.quarter_end_date ||
        company.first_investment_date < holding.first_closing_date! ||
        company.year_founded! > Number(company.first_investment_date.slice(0, 4))) fail();
      if (company.current_status?.startsWith("EXIT") && (company.fair_value_eur !== 0 || company.ownership !== 0)) fail();
      if (company.current_status?.includes("WRITE") && company.realized_cash_eur !== 0) fail();
      close(company.moic!, (company.fair_value_eur! + company.realized_cash_eur!) / company.invested_eur!);
      invested += company.invested_eur!;
      fairValue += company.fair_value_eur!;
      cash += company.realized_cash_eur!;
    });
    close(holding.net_invested_eur, invested);
    close(holding.drawdown_eur, invested);
    close(holding.fair_value_eur, fairValue);
    close(holding.tvpi, (fairValue + cash) / invested);
    close(holding.dpi, cash / invested);
    close(holding.rvpi, fairValue / invested);
    close(holding.called_pct!, invested / holding.committed_eur);
    if (holding.committed_eur < invested) fail();
    paidIn += invested; nav += fairValue; distributions += cash; committed += holding.committed_eur;
  }
  const metric = (key: string) => Number(p.key_metrics.find(m => m.metric_key === key)?.value);
  close(metric("net_asset_value"), nav);
  close(metric("cumulative_paid_in_capital"), paidIn);
  close(metric("cumulative_distributions_to_fund"), distributions);
  close(metric("total_commitments_to_fund"), committed);
  close(metric("tvpi_to_investors"), (nav + distributions) / paidIn);
  close(metric("rvpi_to_investors"), nav / paidIn);
  close(metric("dpi_to_investors"), distributions / paidIn);
  for (const breakdown of [p.geography_breakdown, p.industry_breakdown]) {
    close(breakdown.reduce((s, row) => s + row.exposure_eur, 0), nav);
    close(breakdown.reduce((s, row) => s + row.company_count, 0), companies.length);
  }
  const bridge = p.financial_sections.find(section => section.section_key === "nav_bridge")!;
  close(bridge.rows.slice(0, -2).reduce((s, row) => s + Number(row.values.amount), 0), nav);
  close(Number(bridge.rows.at(-2)!.values.amount), nav);
}
