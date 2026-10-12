import { createContext, useContext } from "react";
import type { ReportingPackage } from "./types";

// There is deliberately no live variant or default data provider in this extraction.
export type ReportingDataSource = {
  kind: "mock";
  historyPackages: ReportingPackage[];
  priorityFundNames: string[];
  priorityCompanyNames: string[];
};
export const ReportingDataSourceContext = createContext<ReportingDataSource | null>(null);
export function useReportingDataSource() {
  const source = useContext(ReportingDataSourceContext);
  if (!source || source.kind !== "mock" || !source.historyPackages.length) {
    throw new Error("Demo temporarily unavailable.");
  }
  return source;
}
