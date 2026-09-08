/**
 * amenityIcons.test.js
 * ----------------------------------------------------------------------------
 * Tests for the amenityIcon helper.
 */

import { describe, it, expect } from 'vitest';
import { amenityIcon } from './amenityIcons';

describe('amenityIcon', () => {
  it('returns a known glyph + label for a mapped amenity', () => {
    const out = amenityIcon('pool');
    expect(out.glyph).toBe('🏊');
    expect(out.label).toBe('Pool');
  });

  it('humanises underscores for the free Wi-Fi key (with a space)', () => {
    const out = amenityIcon('free Wi-Fi');
    expect(out.glyph).toBe('📶');
    expect(out.label).toBe('Free Wi-Fi');
  });

  it('humanises an unknown snake_case string and falls back to a checkmark glyph', () => {
    const out = amenityIcon('unknown_amenity_name');
    expect(out.glyph).toBe('✓');
    expect(out.label).toBe('Unknown Amenity Name');
  });

  it('humanises an unknown space-separated string', () => {
    const out = amenityIcon('rooftop pool with city view');
    expect(out.glyph).toBe('✓');
    expect(out.label).toBe('Rooftop Pool With City View');
  });

  it('returns { glyph, label } shape for every result', () => {
    const out = amenityIcon('spa');
    expect(Object.keys(out).sort()).toEqual(['glyph', 'label']);
  });

  it('handles empty string without throwing', () => {
    const out = amenityIcon('');
    expect(out.glyph).toBe('✓');
    expect(out.label).toBe('');
  });

  it('returns distinct icons for distinct known amenities', () => {
    const icons = new Set(['pool', 'spa', 'fitness_center', 'bar', 'restaurant'].map(amenityIcon).map((a) => a.glyph));
    expect(icons.size).toBe(5);
  });
});
