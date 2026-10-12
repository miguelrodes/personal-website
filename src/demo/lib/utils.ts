import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** True for standard UUID strings (used to tell GP ids from Observatory manager-name filters in URL params). */
export function isDatabaseUuid(value: string | null | undefined): value is string {
  if (!value || typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

/** Strip HTML tags from a string (useful for displaying newsletter titles outside the editor) */
export function stripHtml(str: string): string {
  if (!str) return str;
  return str.replace(/<[^>]*>/g, "").trim();
}

/** Returns true when the source name (e.g. hostname) is independent of the org name (different slugs). */
export function isIndependentSource(orgName: string, sourceName: string): boolean {
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  const srcSlug = sourceName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  return slug !== srcSlug;
}
