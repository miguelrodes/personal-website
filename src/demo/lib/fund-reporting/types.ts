export interface ReportingManifestEntry {
  report_id: string;
  fund_code: string;
  fund_slug: string;
  fund_display_name: string;
  quarter_key: string;
  quarter_slug: string;
  title: string;
  published_at: string;
  package_path: string;
  summary: string;
}

export interface ReportingManifest {
  schema_version: string;
  updated_at: string;
  reports: ReportingManifestEntry[];
}

export interface ReportingSourceDocument {
  source_id: string;
  title: string;
  kind: string;
  filename: string;
  storage_bucket?: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
  byte_size?: number | null;
  sha256?: string | null;
}

export interface ReportingFundLevelTemplateRelease {
  template_id: string;
  template_version: string;
  template_sha256: string;
  data_contract_version: string;
  renderer_version: string;
  qualitative_mode: "frozen" | "editable" | string;
  page_count: number;
}

export interface ReportingFundLevelRenderData {
  data_contract_version: string;
  workbook_meta: {
    fund_code: string;
    quarter_key: string;
    quarter_end_date: string;
    current_period_label: string;
    prior_period_label: string;
  };
  sheets: Record<string, Record<string, unknown>[]>;
}

export interface ReportingDetailedPortfolioTemplateRelease {
  template_id: string;
  template_version: string;
  template_sha256: string;
  data_contract_version: string;
  renderer_version: string;
  qualitative_mode: "frozen" | string;
  base_page_count: number;
}

export interface ReportingOpportunityTemplateRelease {
  template_id: string;
  template_version: string;
  template_sha256: string;
  data_contract_version: string;
  renderer_version: string;
  qualitative_mode: "airtable-quarter" | string;
  fixed_page_count: number;
}

export interface ReportingDetailedPortfolioRenderData {
  data_contract_version: string;
  quarter_key: string;
  quarter_end_date: string;
  expected_page_count: number;
  funds: Array<{
    asset_code: string;
    currency: string;
    fund_size_orig_m: number | null;
    fund_size_eur_m: number | null;
    committed_eur: number;
    drawdown_eur: number;
    distribution_to_aldea_eur: number | null;
    called_pct: number | null;
    dpi: number;
    tvpi: number;
    first_closing_date: string | null;
    top_companies: Array<{
      name: string;
      region: string;
      industry: string;
      invested_eur: number | null;
      fair_value_eur: number | null;
      moic: number | null;
    }>;
  }>;
  companies: Array<{
    asset_code: string;
    invested_eur: number;
    fair_value_eur: number;
    moic: number;
  }>;
  unsupported_asset_codes: string[];
}

export interface ReportingMetric {
  metric_key: string;
  label: string;
  value: number | string;
  value_type: "currency" | "percent" | "multiple" | "integer" | string;
  comparison_value?: number | string | null;
  comparison_label?: string | null;
  note?: string | null;
}

export interface ReportingBreakdownItem {
  bucket_key: string;
  label: string;
  company_count: number;
  exposure_eur: number;
}

export interface ReportingHolding {
  asset_code: string;
  asset_name: string;
  asset_type: "fund" | "company" | string;
  practice_type: "fund_of_funds" | "direct_co_investment" | string;
  vintage_year?: number | null;
  first_closing_date?: string | null;
  stage_label?: string | null;
  vc_firm?: string | null;
  country_label?: string | null;
  location: string;
  theme: string;
  fund_size_display?: string | null;
  called_pct?: number | null;
  deal_count?: number | null;
  committed_eur: number;
  drawdown_eur: number;
  net_invested_eur: number;
  fair_value_eur: number;
  rvpi: number;
  dpi: number;
  tvpi: number;
  status: string;
  detail_blurb?: string | null;
}

export interface ReportingUnderlyingCompany {
  relationship_type: string;
  company_id: string;
  company_name?: string | null;
  aldea_company_id?: number | string | null;
  report_period?: string | null;
  linked_fund_record_id?: string | null;
  linked_fund_name: string;
  linked_fund_vc_firm?: string | null;
  linked_fund_vintage_year?: number | null;
  linked_fund_geography?: string | null;
  linked_fund_stage_label?: string | null;
  linked_portfolio_holding_asset_code?: string | null;
  linked_portfolio_holding_asset_name?: string | null;
  fund_scope_labels?: string[];
  portfolio_fund_labels_current?: string[];
  description_short?: string | null;
  description_long?: string | null;
  website?: string | null;
  linkedin?: string | null;
  logo_attachment_filename?: string | null;
  former_name?: string | null;
  rosetta_stone?: string | null;
  year_founded?: number | null;
  sub_industries?: string[] | null;
  tech_innovation?: string | null;
  deeptech_domain?: string | null;
  founder_executive_team_woman?: string | null;
  name_woman?: string | null;
  usa_state?: string | null;
  location_barcelona_cat?: boolean | null;
  sector?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  region?: string | null;
  company_stage_reported?: string | null;
  company_stage_current?: string | null;
  current_status?: string | null;
  investment_type?: string | null;
  first_investment_date?: string | null;
  ownership?: number | string | null;
  invested_eur?: number | null;
  fair_value_eur?: number | null;
  realized_cash_eur?: number | null;
  proceeds_stock_eur?: number | null;
  moic?: number | null;
  arr?: number | null;
  update_narrative?: string | null;
  post_money_eur_current?: number | null;
  post_money_usd_current?: number | null;
}

export interface ReportingFinancialRow {
  row_key: string;
  label: string;
  values: Record<string, number | string | null>;
  emphasis?: string | null;
}

export interface ReportingFinancialSection {
  section_key: string;
  title: string;
  statement_type: string;
  rows: ReportingFinancialRow[];
}

export interface ReportingNarrativeSection {
  section_key: string;
  title: string;
  summary: string;
  body_markdown: string;
  sort_order: number;
  is_expandable: boolean;
}

export interface ReportingFundLevelDescriptiveTextField {
  field_key: string;
  slide_number: number;
  value: string;
}

export interface ReportingFundLevelDescriptiveText {
  schema_version: string;
  fields: ReportingFundLevelDescriptiveTextField[];
}

export interface ReportingFootnote {
  footnote_key: string;
  text: string;
  applies_to: string;
}

export interface UnderlyingCompanyFundRow {
  t5_record_id: string;
  fund_name: string | null;
  investment_date_first_ticket: string | null;
  ownership: number | string | null;
  invested_eur: number | null;
  fair_value_eur: number | null;
  moic: number | null;
  arr: number | null;
  update_narrative: string | null;
}

export interface UnderlyingCompanyDetailRow {
  company_id: string;
  aldea_id: number | string | null;
  company_name: string | null;
  sector: string | null;
  industry: string | null;
  city: string | null;
  country: string | null;
  region: string | null;
  company_stage: string | null;
  current_status: string | null;
  fund_rows: UnderlyingCompanyFundRow[];
}

export interface ReportingCurrentUnicornCompany {
  company_id: string;
  company_name: string | null;
  current_status: string | null;
  fund_scope_labels: string[];
  top_round_name: string | null;
  top_round_stage: string | null;
  top_round_date: string | null;
  top_post_money_lcy: number | null;
  top_post_money_eur: number | null;
}

export interface ReportingAboveCostMetric {
  at_or_above_1x_moic_count: number | null;
  valid_moic_count: number;
  at_or_above_1x_moic_percentage: number | null;
  deduplication_method: string;
  is_deduplicated: boolean;
  metric_basis: "unique_companies" | "company_records";
  insufficient_data: boolean;
  reason?: string | null;
}

export interface UnderlyingCompanyCountResponse {
  count: number;
  company_ids: string[];
}

export interface UnderlyingCompanyDetailResponse extends UnderlyingCompanyCountResponse {
  companies: UnderlyingCompanyDetailRow[];
}

export interface FundScatterPoint {
  id: string;
  name: string;
  entity_type: "fund" | "vintage_average" | "peer_average" | "sector_average" | "region_average";
  fund_count: number;
  company_count: number | null;
  vintage: number | null;
  aldea_fund: string | null;
  commitment_eur: number | null;
  fair_value_eur: number | null;
  value_created_eur: number | null;
  tvpi: number | null;
  metric: "TVPI" | "MOIC" | "MIXED";
  age_years: number | null;
  tvpi_1y: number | null;
  tvpi_2y: number | null;
  report_period: string;
}

export interface FundScatterRowsResponse {
  rows: FundScatterPoint[];
}

export interface FundScatterPeriodsResponse {
  periods: string[];
}

export interface ReportingPackage {
  schema_version: string;
  package_id: string;
  published_at: string;
  report_meta: {
    fund_code: string;
    fund_slug: string;
    fund_display_name: string;
    quarter_key: string;
    quarter_slug: string;
    quarter_end_date: string;
    report_currency: string;
    scope: string;
    source_status: {
      pdf_seeded: boolean;
      excel_ready: boolean;
      airtable_enriched: boolean;
    };
    source_documents: ReportingSourceDocument[];
    template_release?: ReportingFundLevelTemplateRelease | null;
    detailed_portfolio_template_release?: ReportingDetailedPortfolioTemplateRelease | null;
    opportunity_template_release?: ReportingOpportunityTemplateRelease | null;
    source_workbook_sha256?: string | null;
  };
  overview: {
    headline: string;
    vintage_year: number;
    manager: string;
    fund_currency: string;
    term: string;
    investment_focus: string;
    structure_summary: string;
    first_closing_date?: string | null;
    final_closing_date?: string | null;
    investment_period_end?: string | null;
    domicile?: string | null;
    total_commitment_eur?: number | null;
  };
  key_metrics: ReportingMetric[];
  strategy_summary: Array<{
    strategy_key: string;
    label: string;
    committed_eur: number;
    drawdown_eur: number;
    net_invested_eur: number;
    fair_value_eur: number;
    rvpi: number;
    dpi: number;
    tvpi: number;
    note?: string | null;
  }>;
  geography_breakdown: ReportingBreakdownItem[];
  industry_breakdown: ReportingBreakdownItem[];
  portfolio_holdings: ReportingHolding[];
  underlying_companies?: ReportingUnderlyingCompany[];
  above_cost_metric?: ReportingAboveCostMetric | null;
  current_unicorn_count?: number | null;
  current_unicorn_active_count?: number | null;
  current_unicorn_companies?: ReportingCurrentUnicornCompany[];
  financial_sections: ReportingFinancialSection[];
  narrative_sections: ReportingNarrativeSection[];
  fund_level_descriptive_text?: ReportingFundLevelDescriptiveText | null;
  fund_level_render_data?: ReportingFundLevelRenderData | null;
  detailed_portfolio_render_data?: ReportingDetailedPortfolioRenderData | null;
  footnotes: ReportingFootnote[];
}
