export function formatCurrency(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
}

export function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatMetricValue(
  value: number | string | null | undefined,
  valueType: string,
) {
  if (value == null) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  if (!Number.isFinite(value)) {
    return "—";
  }

  switch (valueType) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "multiple":
      return `x${value.toFixed(2)}`;
    case "integer":
      return new Intl.NumberFormat("en-GB", {
        maximumFractionDigits: 0,
      }).format(value);
    default:
      return new Intl.NumberFormat("en-GB", {
        maximumFractionDigits: 2,
      }).format(value);
  }
}

export function formatMaybePercent(value: number | null | undefined) {
  if (typeof value !== "number") return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatMultiple(value: number | null | undefined) {
  if (typeof value !== "number") return "—";
  return `x${value.toFixed(2)}`;
}
