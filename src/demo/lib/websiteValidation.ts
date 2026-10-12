export type NormalizeWebsiteUrlOpts = {
  logFailures?: boolean;
  context?: string;
};

export function normalizeWebsiteUrl(
  raw: string | null | undefined,
  opts?: NormalizeWebsiteUrlOpts,
): string | null {
  const value = (raw ?? "").trim();
  if (!value || value.toLowerCase() === "null" || value.toLowerCase() === "n/a") return null;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(withProtocol);
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.hostname) {
      if (opts?.logFailures) {
        console.warn(`[website-norm] Failed (bad protocol/host): "${value}" [${opts.context ?? ""}]`);
      }
      return null;
    }
    // Avoid treating placeholders like "https://" or local hostnames as valid company websites.
    if (!parsed.hostname.includes(".")) {
      if (opts?.logFailures) {
        console.warn(`[website-norm] Failed (no TLD): "${value}" [${opts.context ?? ""}]`);
      }
      return null;
    }
    return parsed.toString();
  } catch {
    if (opts?.logFailures) {
      console.warn(`[website-norm] Failed (parse error): "${value}" [${opts.context ?? ""}]`);
    }
    return null;
  }
}

/**
 * Prefer normalized URL for storage; keep raw when normalization fails (never drop real attempts).
 * Returns null only for empty / placeholder values.
 */
export function coerceWebsiteForStorage(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "n/a") return null;
  const normalized = normalizeWebsiteUrl(trimmed);
  return normalized || trimmed;
}

export function hasUsableWebsite(raw: string | null | undefined): boolean {
  return normalizeWebsiteUrl(raw) !== null;
}
