export interface Country {
  code: string;
  name: string;
  region: string;
}

export const COUNTRIES: Country[] = [
  // Europe
  { code: "AL", name: "Albania", region: "Europe" },
  { code: "AD", name: "Andorra", region: "Europe" },
  { code: "AT", name: "Austria", region: "Europe" },
  { code: "BY", name: "Belarus", region: "Europe" },
  { code: "BE", name: "Belgium", region: "Europe" },
  { code: "BA", name: "Bosnia and Herzegovina", region: "Europe" },
  { code: "BG", name: "Bulgaria", region: "Europe" },
  { code: "HR", name: "Croatia", region: "Europe" },
  { code: "CY", name: "Cyprus", region: "Europe" },
  { code: "CZ", name: "Czech Republic", region: "Europe" },
  { code: "DK", name: "Denmark", region: "Europe" },
  { code: "EE", name: "Estonia", region: "Europe" },
  { code: "FI", name: "Finland", region: "Europe" },
  { code: "FR", name: "France", region: "Europe" },
  { code: "GE", name: "Georgia", region: "Europe" },
  { code: "DE", name: "Germany", region: "Europe" },
  { code: "GR", name: "Greece", region: "Europe" },
  { code: "HU", name: "Hungary", region: "Europe" },
  { code: "IS", name: "Iceland", region: "Europe" },
  { code: "IE", name: "Ireland", region: "Europe" },
  { code: "IT", name: "Italy", region: "Europe" },
  { code: "XK", name: "Kosovo", region: "Europe" },
  { code: "LV", name: "Latvia", region: "Europe" },
  { code: "LI", name: "Liechtenstein", region: "Europe" },
  { code: "LT", name: "Lithuania", region: "Europe" },
  { code: "LU", name: "Luxembourg", region: "Europe" },
  { code: "MT", name: "Malta", region: "Europe" },
  { code: "MD", name: "Moldova", region: "Europe" },
  { code: "MC", name: "Monaco", region: "Europe" },
  { code: "ME", name: "Montenegro", region: "Europe" },
  { code: "NL", name: "Netherlands", region: "Europe" },
  { code: "MK", name: "North Macedonia", region: "Europe" },
  { code: "NO", name: "Norway", region: "Europe" },
  { code: "PL", name: "Poland", region: "Europe" },
  { code: "PT", name: "Portugal", region: "Europe" },
  { code: "RO", name: "Romania", region: "Europe" },
  { code: "RS", name: "Serbia", region: "Europe" },
  { code: "SK", name: "Slovakia", region: "Europe" },
  { code: "SI", name: "Slovenia", region: "Europe" },
  { code: "ES", name: "Spain", region: "Europe" },
  { code: "SE", name: "Sweden", region: "Europe" },
  { code: "CH", name: "Switzerland", region: "Europe" },
  { code: "UA", name: "Ukraine", region: "Europe" },
  { code: "GB", name: "United Kingdom", region: "Europe" },
  // North America
  { code: "CA", name: "Canada", region: "North America" },
  { code: "MX", name: "Mexico", region: "North America" },
  { code: "US", name: "United States", region: "North America" },
  // Latin America
  { code: "AR", name: "Argentina", region: "Latin America" },
  { code: "BO", name: "Bolivia", region: "Latin America" },
  { code: "BR", name: "Brazil", region: "Latin America" },
  { code: "CL", name: "Chile", region: "Latin America" },
  { code: "CO", name: "Colombia", region: "Latin America" },
  { code: "CR", name: "Costa Rica", region: "Latin America" },
  { code: "CU", name: "Cuba", region: "Latin America" },
  { code: "DO", name: "Dominican Republic", region: "Latin America" },
  { code: "EC", name: "Ecuador", region: "Latin America" },
  { code: "SV", name: "El Salvador", region: "Latin America" },
  { code: "GT", name: "Guatemala", region: "Latin America" },
  { code: "HN", name: "Honduras", region: "Latin America" },
  { code: "JM", name: "Jamaica", region: "Latin America" },
  { code: "NI", name: "Nicaragua", region: "Latin America" },
  { code: "PA", name: "Panama", region: "Latin America" },
  { code: "PY", name: "Paraguay", region: "Latin America" },
  { code: "PE", name: "Peru", region: "Latin America" },
  { code: "PR", name: "Puerto Rico", region: "Latin America" },
  { code: "TT", name: "Trinidad and Tobago", region: "Latin America" },
  { code: "UY", name: "Uruguay", region: "Latin America" },
  { code: "VE", name: "Venezuela", region: "Latin America" },
  // Middle East & Africa
  { code: "DZ", name: "Algeria", region: "Middle East & Africa" },
  { code: "AO", name: "Angola", region: "Middle East & Africa" },
  { code: "BH", name: "Bahrain", region: "Middle East & Africa" },
  { code: "CM", name: "Cameroon", region: "Middle East & Africa" },
  { code: "CD", name: "DR Congo", region: "Middle East & Africa" },
  { code: "EG", name: "Egypt", region: "Middle East & Africa" },
  { code: "ET", name: "Ethiopia", region: "Middle East & Africa" },
  { code: "GH", name: "Ghana", region: "Middle East & Africa" },
  { code: "IQ", name: "Iraq", region: "Middle East & Africa" },
  { code: "IL", name: "Israel", region: "Middle East & Africa" },
  { code: "CI", name: "Ivory Coast", region: "Middle East & Africa" },
  { code: "JO", name: "Jordan", region: "Middle East & Africa" },
  { code: "KE", name: "Kenya", region: "Middle East & Africa" },
  { code: "KW", name: "Kuwait", region: "Middle East & Africa" },
  { code: "LB", name: "Lebanon", region: "Middle East & Africa" },
  { code: "LY", name: "Libya", region: "Middle East & Africa" },
  { code: "MG", name: "Madagascar", region: "Middle East & Africa" },
  { code: "MA", name: "Morocco", region: "Middle East & Africa" },
  { code: "MZ", name: "Mozambique", region: "Middle East & Africa" },
  { code: "NG", name: "Nigeria", region: "Middle East & Africa" },
  { code: "OM", name: "Oman", region: "Middle East & Africa" },
  { code: "QA", name: "Qatar", region: "Middle East & Africa" },
  { code: "RW", name: "Rwanda", region: "Middle East & Africa" },
  { code: "SA", name: "Saudi Arabia", region: "Middle East & Africa" },
  { code: "SN", name: "Senegal", region: "Middle East & Africa" },
  { code: "ZA", name: "South Africa", region: "Middle East & Africa" },
  { code: "TN", name: "Tunisia", region: "Middle East & Africa" },
  { code: "TR", name: "Turkey", region: "Middle East & Africa" },
  { code: "TZ", name: "Tanzania", region: "Middle East & Africa" },
  { code: "UG", name: "Uganda", region: "Middle East & Africa" },
  { code: "AE", name: "United Arab Emirates", region: "Middle East & Africa" },
  { code: "ZM", name: "Zambia", region: "Middle East & Africa" },
  { code: "ZW", name: "Zimbabwe", region: "Middle East & Africa" },
  // Asia Pacific
  { code: "AF", name: "Afghanistan", region: "Asia Pacific" },
  { code: "AU", name: "Australia", region: "Asia Pacific" },
  { code: "BD", name: "Bangladesh", region: "Asia Pacific" },
  { code: "KH", name: "Cambodia", region: "Asia Pacific" },
  { code: "CN", name: "China", region: "Asia Pacific" },
  { code: "HK", name: "Hong Kong", region: "Asia Pacific" },
  { code: "IN", name: "India", region: "Asia Pacific" },
  { code: "ID", name: "Indonesia", region: "Asia Pacific" },
  { code: "JP", name: "Japan", region: "Asia Pacific" },
  { code: "KZ", name: "Kazakhstan", region: "Asia Pacific" },
  { code: "MY", name: "Malaysia", region: "Asia Pacific" },
  { code: "MM", name: "Myanmar", region: "Asia Pacific" },
  { code: "NP", name: "Nepal", region: "Asia Pacific" },
  { code: "NZ", name: "New Zealand", region: "Asia Pacific" },
  { code: "PK", name: "Pakistan", region: "Asia Pacific" },
  { code: "PH", name: "Philippines", region: "Asia Pacific" },
  { code: "SG", name: "Singapore", region: "Asia Pacific" },
  { code: "KR", name: "South Korea", region: "Asia Pacific" },
  { code: "LK", name: "Sri Lanka", region: "Asia Pacific" },
  { code: "TW", name: "Taiwan", region: "Asia Pacific" },
  { code: "TH", name: "Thailand", region: "Asia Pacific" },
  { code: "UZ", name: "Uzbekistan", region: "Asia Pacific" },
  { code: "VN", name: "Vietnam", region: "Asia Pacific" },
];

export const COUNTRIES_BY_REGION = COUNTRIES.reduce<Record<string, Country[]>>((acc, c) => {
  if (!acc[c.region]) acc[c.region] = [];
  acc[c.region].push(c);
  return acc;
}, {});

export const REGIONS = Object.keys(COUNTRIES_BY_REGION).sort();

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code.toLowerCase() === code.toLowerCase());
}

export function getCountryByName(name: string): Country | undefined {
  return COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export function normalizeGeography(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const byName = getCountryByName(trimmed);
  if (byName) return byName.name;
  const byCode = getCountryByCode(trimmed);
  if (byCode) return byCode.name;
  // Fuzzy: check if raw contains or is contained in a country name
  const fuzzy = COUNTRIES.find(
    (c) =>
      c.name.toLowerCase().includes(trimmed.toLowerCase()) ||
      trimmed.toLowerCase().includes(c.name.toLowerCase())
  );
  if (fuzzy) return fuzzy.name;
  return trimmed;
}

export function formatGeography(geography: string | null | undefined): string {
  if (!geography) return "";
  return normalizeGeography(geography);
}
