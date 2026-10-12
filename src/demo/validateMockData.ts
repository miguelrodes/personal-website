import type { ReportingPackage } from "./lib/fund-reporting/types";

export function validateMockPackage(value: unknown): asserts value is ReportingPackage {
  const p = value as ReportingPackage | null;
  if (!p || !p.package_id?.startsWith("mock-") || !p.report_meta?.fund_code ||
    p.report_meta.source_documents?.length !== 0 || !p.portfolio_holdings?.length ||
    !p.underlying_companies?.length || !p.key_metrics?.length ||
    !p.financial_sections?.some(s => s.section_key === "nav_bridge" && s.rows.length === 10)) {
    throw new Error("Demo temporarily unavailable.");
  }
  function checkNumbers(item: unknown) {
    if (typeof item === "number" && !Number.isFinite(item)) throw new Error("Demo temporarily unavailable.");
    if (item && typeof item === "object") Object.values(item).forEach(checkNumbers);
  }
  checkNumbers(p);
}
