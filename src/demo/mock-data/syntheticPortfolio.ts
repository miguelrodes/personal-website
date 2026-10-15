import type { ReportingUnderlyingCompany } from "../lib/fund-reporting/types";

// Invented from these specifications. No source portfolio, record IDs, biographies,
// domains, logos, or investment relationships are used to create this catalogue.
export const SYNTHETIC_FUND = {
  code: "SYNTHETIC",
  slug: "synthetic-fund",
  name: "Aldea Synthetic Fund",
  vintageYear: 2020,
  firstClose: "2020-01-15",
  finalClose: "2022-12-15",
  investmentPeriodEnd: "2027-12-31",
} as const;

export const SYNTHETIC_HOLDINGS = [
  { letter: "A", companyCount: 32, vintage: 2020, country: "Denmark", city: "Copenhagen", theme: "Enterprise Software" },
  { letter: "B", companyCount: 34, vintage: 2021, country: "Germany", city: "Berlin", theme: "Climate Technology" },
  { letter: "C", companyCount: 31, vintage: 2021, country: "France", city: "Paris", theme: "Health Technology" },
  { letter: "D", companyCount: 35, vintage: 2022, country: "Spain", city: "Madrid", theme: "Industrial Technology" },
  { letter: "E", companyCount: 33, vintage: 2022, country: "Netherlands", city: "Amsterdam", theme: "Financial Software" },
] as const;

const locations = [
  ["Copenhagen", "Denmark", "NORDICS"], ["Berlin", "Germany", "DACH"],
  ["Paris", "France", "FRANCE"], ["Madrid", "Spain", "SOUTH EUROPE"],
  ["Amsterdam", "Netherlands", "BENELUX"], ["Stockholm", "Sweden", "NORDICS"],
  ["Lisbon", "Portugal", "SOUTH EUROPE"], ["Dublin", "Ireland", "UK & IRELAND"],
  ["Helsinki", "Finland", "NORDICS"], ["Vienna", "Austria", "DACH"],
  ["Tallinn", "Estonia", "BALTICS"], ["Warsaw", "Poland", "CEE"],
  ["Toronto", "Canada", "NORTH AMERICA"], ["Boston", "United States", "NORTH AMERICA"],
  ["Singapore", "Singapore", "ASIA PACIFIC"], ["Melbourne", "Australia", "ASIA PACIFIC"],
  ["London", "United Kingdom", "UK & IRELAND"],
] as const;

const businesses = [
  { sector: "Enterprise Software", industry: "Business Software", product: "workflow planning software", customers: "small service businesses", technology: "Rules-based workflow automation", topic: "testing a guided onboarding workflow" },
  { sector: "Climate Technology", industry: "Energy", product: "energy-demand forecasting tools", customers: "building operators", technology: "Time-series modeling", topic: "evaluating a revised energy forecasting model" },
  { sector: "Healthcare", industry: "Health Software", product: "appointment coordination software", customers: "outpatient clinics", technology: "Scheduling optimization", topic: "piloting an appointment coordination interface" },
  { sector: "Finance", industry: "Financial Software", product: "invoice reconciliation tools", customers: "regional distributors", technology: "Document classification", topic: "reviewing an invoice matching workflow" },
  { sector: "Industrial Technology", industry: "Manufacturing", product: "equipment maintenance planning tools", customers: "independent factories", technology: "Sensor data processing", topic: "testing preventive maintenance alerts" },
  { sector: "Enterprise Software", industry: "Cybersecurity", product: "access-review software", customers: "distributed software teams", technology: "Identity policy analysis", topic: "refining an access review dashboard" },
  { sector: "Food & Agriculture", industry: "Agricultural Technology", product: "irrigation planning tools", customers: "greenhouse cooperatives", technology: "Environmental sensing", topic: "evaluating a greenhouse monitoring prototype" },
  { sector: "Mobility", industry: "Logistics", product: "delivery scheduling software", customers: "local logistics operators", technology: "Route optimization", topic: "trialing a delivery scheduling workflow" },
  { sector: "Education", industry: "Learning Software", product: "skills practice software", customers: "vocational training centers", technology: "Adaptive practice recommendations", topic: "testing a skills assessment interface" },
  { sector: "Consumer Technology", industry: "Commerce Software", product: "inventory planning tools", customers: "independent retailers", technology: "Demand modeling", topic: "reviewing a replenishment planning workflow" },
] as const;

export type SyntheticCompany = ReportingUnderlyingCompany & { updateTopic: string };
export type SyntheticHolding = {
  code: string;
  name: string;
  manager: string;
  vintage: number;
  firstClose: string;
  country: string;
  city: string;
  theme: string;
  description: string;
  companies: SyntheticCompany[];
};

export const SYNTHETIC_PORTFOLIO = {
  schemaVersion: "synthetic-portfolio-v1",
  holdings: SYNTHETIC_HOLDINGS.map((spec, fundIndex): SyntheticHolding => {
    const code = `SYNTHETIC_FUND_${spec.letter}`;
    const name = `Fund ${spec.letter}`;
    const manager = `Manager ${spec.letter} (fictional)`;
    return {
      code, name, manager, vintage: spec.vintage,
      firstClose: `${spec.vintage}-03-01`,
      country: spec.country, city: spec.city, theme: spec.theme,
      description: `${name} is an invented early-stage investment fund used only for this demonstration. Its fictional strategy combines ${spec.theme.toLowerCase()} with a diversified selection of other sectors. All locations, positions, and outcomes are simulated.`,
      companies: Array.from({ length: spec.companyCount }, (_, index) => {
        const number = index + 1;
        const companyName = `${name} ${number}`;
        const [city, country, region] = locations[(index * 7 + fundIndex * 3) % locations.length]!;
        const business = businesses[(index * 3 + fundIndex) % businesses.length]!;
        return {
          relationship_type: "underlying_fund_company",
          company_id: `synthetic-${spec.letter.toLowerCase()}-${String(number).padStart(2, "0")}`,
          company_name: companyName,
          linked_fund_record_id: code,
          linked_fund_name: name,
          linked_fund_vc_firm: manager,
          linked_fund_geography: "Simulated international portfolio",
          linked_fund_stage_label: "Pre-Seed – Series B",
          linked_portfolio_holding_asset_code: code,
          linked_portfolio_holding_asset_name: name,
          fund_scope_labels: [SYNTHETIC_FUND.name],
          portfolio_fund_labels_current: [name],
          description_short: `${companyName} is a fictional provider of ${business.product} for ${business.customers}.`,
          description_long: `This invented business explores ${business.product} for ${business.customers}. The example team is based in ${city}, ${country}, and is ${business.topic}. Its strategy, location, operations, and investment relationship were created solely for this demo and do not describe a real company.`,
          website: null,
          linkedin: null,
          logo_attachment_filename: null,
          former_name: null,
          sub_industries: [business.industry],
          tech_innovation: business.technology,
          deeptech_domain: null,
          founder_executive_team_woman: null,
          name_woman: null,
          usa_state: country === "United States" ? "Massachusetts" : null,
          location_barcelona_cat: false,
          sector: business.sector,
          industry: business.industry,
          city, country, region,
          investment_type: "Primary equity (synthetic)",
          updateTopic: business.topic,
        };
      }),
    };
  }),
};
