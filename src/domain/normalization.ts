import type { RawJobPayload, NormalizedJobPayload } from './types.js';

/**
 * Normalizes an array of skills:
 * 1. Trims leading and trailing whitespace.
 * 2. Filters out empty strings.
 * 3. Converts to lowercase.
 * 4. Deduplicates while strictly preserving the first-occurrence order.
 */
export function normalizeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const skill of skills) {
    const trimmed = skill.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      normalized.push(lower);
    }
  }

  return normalized;
}

/**
 * Normalizes a raw job payload:
 * - Trims display strings: title, company, location.
 * - Validates non-blankness after trimming.
 * - Trims applyUrl.
 * - Normalizes skills array.
 */
export function normalizePayload(payload: RawJobPayload): NormalizedJobPayload {
  const title = payload.title.trim();
  const company = payload.company.trim();
  const location = payload.location.trim();

  if (!title || !company || !location) {
    throw new Error('Title, company, and location must be non-blank after trimming');
  }

  return {
    title,
    company,
    location,
    experienceMin: payload.experienceMin,
    experienceMax: payload.experienceMax,
    applyUrl: payload.applyUrl.trim(),
    skills: normalizeSkills(payload.skills),
  };
}
