# Task 1.2: Payload Normalization Rules

## Objective
Implement pure functions to normalize valid event payloads per PRD §6.1, ensuring consistent, trimmed, and deduplicated data before storage and hashing.

## Background & Requirements
Per PRD §6.1:
- `title`, `company`, `location`: strings must be trimmed of leading and trailing whitespace. If after trimming the string is empty, it must be rejected as invalid.
- `skills`: array of non-blank strings.
  - Normalization rule: Each skill string must be trimmed and converted to lowercase.
  - Deduplication rule: Remove duplicate skills.
  - Order preservation rule: Preserve the **first-occurrence** order of elements.
    - Example: `[" TypeScript ", "MongoDB", "typescript", "NODE.JS", "mongodb"]`
    - Becomes: `["typescript", "mongodb", "node.js"]`

## Detailed Steps

1. **Create `src/domain/normalization.ts`**:
   - Implement `normalizeSkills(skills: string[]): string[]`:
     ```ts
     export function normalizeSkills(skills: string[]): string[] {
       const seen = new Set<string>();
       const result: string[] = [];

       for (const raw of skills) {
         const trimmed = raw.trim();
         if (!trimmed) continue;
         const lower = trimmed.toLowerCase();
         if (!seen.has(lower)) {
           seen.add(lower);
           result.push(lower);
         }
       }
       return result;
     }
     ```
   - Implement `normalizePayload(payload: RawJobPayload): NormalizedJobPayload`:
     ```ts
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
     ```

2. **Integrate Normalization with Event Parsing Pipeline**:
   - Ensure normalization executes immediately after initial structural validation.
   - If an upsert payload has fields that become blank when trimmed, throw validation error (`400`).

## Verification Criteria
- [ ] Multi-space strings (e.g. `"   "`) in `title`, `company`, or `location` are rejected.
- [ ] Skills array correctly normalizes casing to lowercase.
- [ ] First-seen order of skills is strictly preserved.
- [ ] Normalized payload maintains exact type adherence to `NormalizedJobPayload`.
