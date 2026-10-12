import { useMemo, type RefObject } from "react";
import FundReportSections from "./components/fund-reporting/FundReportSections";
import { TooltipProvider } from "./components/ui/tooltip";
import { PortalContainerContext } from "./PortalContainer";
import { MOCK_PRIORITY_COMPANY_NAMES, MOCK_PRIORITY_FUND_NAMES,
  getMockReportPackage, getMockReportPackagesByFundCode } from "./mock-data/investorPortal";
import { validateMockPackage } from "./validateMockData";
import "@fontsource/onest/400.css";
import "@fontsource/onest/500.css";
import "@fontsource/onest/600.css";
import "@fontsource/onest/700.css";
import "./theme.generated.css";
import "./demo.css";

export default function InvestorPortalDemo({ container, scrollContainerRef }: {
  container: HTMLElement;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}) {
  const report = getMockReportPackage("tech-fund-1", "2026-q2");
  validateMockPackage(report);
  const dataSource = useMemo(() => {
    const historyPackages = getMockReportPackagesByFundCode(report.report_meta.fund_code);
    historyPackages.forEach(validateMockPackage);
    return { kind: "mock" as const, historyPackages,
      priorityFundNames: MOCK_PRIORITY_FUND_NAMES, priorityCompanyNames: MOCK_PRIORITY_COMPANY_NAMES };
  }, [report.report_meta.fund_code]);

  return <PortalContainerContext.Provider value={container}>
    <TooltipProvider delayDuration={250}>
      <FundReportSections key={report.package_id} reportPackage={report} dataSource={dataSource}
        scrollContainerRef={scrollContainerRef} sectionRailClassName="demo-section-rail" />
    </TooltipProvider>
  </PortalContainerContext.Provider>;
}
