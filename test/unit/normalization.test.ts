import { describe, it, expect } from 'vitest';
import { normalizeSkills, normalizePayload } from '../../src/domain/normalization.js';

describe('Task 1.2: Payload Normalization Rules', () => {
  describe('normalizeSkills', () => {
    it('trims whitespace and converts to lowercase', () => {
      const input = ['  TypeScript  ', '  NODE.JS '];
      expect(normalizeSkills(input)).toEqual(['typescript', 'node.js']);
    });

    it('deduplicates case-insensitively while preserving first-occurrence order', () => {
      const input = [' TypeScript ', 'MongoDB', 'typescript', 'NODE.JS', 'mongodb', 'React'];
      expect(normalizeSkills(input)).toEqual(['typescript', 'mongodb', 'node.js', 'react']);
    });

    it('filters out blank or whitespace-only elements', () => {
      const input = ['Go', '   ', '', 'Rust', '   '];
      expect(normalizeSkills(input)).toEqual(['go', 'rust']);
    });
  });

  describe('normalizePayload', () => {
    it('trims title, company, location, and normalizes skills', () => {
      const raw = {
        title: '  Senior Software Engineer  ',
        company: '  Example Labs Inc. ',
        location: '  Surat, Gujarat  ',
        experienceMin: 3,
        experienceMax: 7,
        applyUrl: '  https://example.test/jobs/senior-dev  ',
        skills: [' TypeScript ', 'MongoDB', 'typescript'],
      };

      const normalized = normalizePayload(raw);

      expect(normalized.title).toBe('Senior Software Engineer');
      expect(normalized.company).toBe('Example Labs Inc.');
      expect(normalized.location).toBe('Surat, Gujarat');
      expect(normalized.applyUrl).toBe('https://example.test/jobs/senior-dev');
      expect(normalized.skills).toEqual(['typescript', 'mongodb']);
      expect(normalized.experienceMin).toBe(3);
      expect(normalized.experienceMax).toBe(7);
    });

    it('throws error if title becomes empty after trimming', () => {
      const raw = {
        title: '    ',
        company: 'Example Labs',
        location: 'Surat',
        experienceMin: 1,
        experienceMax: 3,
        applyUrl: 'https://example.test/jobs/alpha',
        skills: ['TypeScript'],
      };

      expect(() => normalizePayload(raw)).toThrowError(
        'Title, company, and location must be non-blank after trimming'
      );
    });
  });
});
