/**
 * Input sanitization utilities for server-side validation.
 * Prevents XSS, injection attacks, and enforces data constraints.
 */

/**
 * Strip HTML tags from a string to prevent XSS.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize a general text input.
 * Strips HTML, trims whitespace, enforces max length.
 */
export function sanitizeText(input: unknown, maxLength: number = 500): string {
  if (typeof input !== 'string') return '';
  const cleaned = stripHtml(input).trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Sanitize a name (user name, test title, etc.).
 * Strips HTML, trims, max 100 chars, removes control characters.
 */
export function sanitizeName(input: unknown, maxLength: number = 100): string {
  if (typeof input !== 'string') return '';
  const cleaned = stripHtml(input)
    .trim()
    // Remove control characters (except newline/tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.slice(0, maxLength);
}

/**
 * Sanitize an email address.
 * Basic validation and normalization.
 */
export function sanitizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().toLowerCase();
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return null;
  if (trimmed.length > 254) return null; // RFC 5321 max
  return trimmed;
}

/**
 * Sanitize a URL input.
 * Validates protocol (http/https only), strips dangerous characters.
 */
export function sanitizeUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  
  // Allow relative URLs starting with /
  if (trimmed.startsWith('/')) {
    // Prevent path traversal
    if (trimmed.includes('..')) return null;
    return trimmed.slice(0, 500);
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString().slice(0, 2000);
  } catch {
    return null;
  }
}

/**
 * Sanitize an integer input.
 * Parses and clamps to min/max bounds.
 */
export function sanitizeInt(
  input: unknown,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): number | null {
  if (input === undefined || input === null) return null;
  const num = typeof input === 'number' ? input : parseInt(String(input), 10);
  if (isNaN(num)) return null;
  return Math.max(min, Math.min(max, Math.floor(num)));
}

/**
 * Sanitize LaTeX content.
 * Allows LaTeX math formatting but strips HTML tags.
 * Preserves $...$ and $$...$$ delimiters.
 */
export function sanitizeLatex(input: unknown, maxLength: number = 5000): string {
  if (typeof input !== 'string') return '';
  // Strip HTML but preserve LaTeX delimiters
  const cleaned = stripHtml(input).trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Validate and sanitize a Prisma-safe ID (cuid format).
 */
export function sanitizeId(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  // cuid format: starts with 'c', alphanumeric, 25 chars
  if (/^c[a-z0-9]{24,}$/i.test(trimmed) && trimmed.length <= 30) {
    return trimmed;
  }
  // Also allow UUID format
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Sanitize an array of strings (e.g., selected subjects).
 */
export function sanitizeStringArray(
  input: unknown,
  maxItems: number = 50,
  maxItemLength: number = 200
): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is string => typeof item === 'string')
    .slice(0, maxItems)
    .map((item) => sanitizeText(item, maxItemLength));
}

/**
 * Validate pagination parameters.
 */
export function sanitizePagination(
  page: unknown,
  limit: unknown
): { page: number; limit: number } {
  return {
    page: sanitizeInt(page, 1, 1000) || 1,
    limit: sanitizeInt(limit, 1, 100) || 50,
  };
}
