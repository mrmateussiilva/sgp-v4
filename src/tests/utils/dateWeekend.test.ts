import { describe, it, expect } from 'vitest';
import { getWeekendDetails } from '@/utils/date';

describe('getWeekendDetails Utility', () => {
  it('correctly identifies a Saturday (2026-10-17)', () => {
    const result = getWeekendDetails('2026-10-17');
    expect(result.isWeekend).toBe(true);
    expect(result.dayName).toBe('Sábado');
    expect(result.dayOfWeek).toBe(6);
    expect(result.nextBusinessDay).toBe('2026-10-19');
    expect(result.nextBusinessDayDisplay).toBe('19/10/2026');
    expect(result.formattedDate).toBe('17/10/2026');
  });

  it('correctly identifies a Sunday (2026-10-18)', () => {
    const result = getWeekendDetails('2026-10-18');
    expect(result.isWeekend).toBe(true);
    expect(result.dayName).toBe('Domingo');
    expect(result.dayOfWeek).toBe(0);
    expect(result.nextBusinessDay).toBe('2026-10-19');
    expect(result.nextBusinessDayDisplay).toBe('19/10/2026');
    expect(result.formattedDate).toBe('18/10/2026');
  });

  it('correctly returns false for a Friday (2026-10-16)', () => {
    const result = getWeekendDetails('2026-10-16');
    expect(result.isWeekend).toBe(false);
    expect(result.dayName).toBe('');
  });

  it('correctly returns false for a Monday (2026-10-19)', () => {
    const result = getWeekendDetails('2026-10-19');
    expect(result.isWeekend).toBe(false);
    expect(result.dayName).toBe('');
  });

  it('handles month rollover on Saturday (2026-10-31)', () => {
    const result = getWeekendDetails('2026-10-31');
    expect(result.isWeekend).toBe(true);
    expect(result.dayName).toBe('Sábado');
    expect(result.nextBusinessDay).toBe('2026-11-02');
    expect(result.nextBusinessDayDisplay).toBe('02/11/2026');
  });

  it('handles ISO datetime strings', () => {
    const result = getWeekendDetails('2026-10-17T15:30:00Z');
    expect(result.isWeekend).toBe(true);
    expect(result.dayName).toBe('Sábado');
    expect(result.nextBusinessDay).toBe('2026-10-19');
  });

  it('handles null, undefined or empty strings safely', () => {
    expect(getWeekendDetails(null).isWeekend).toBe(false);
    expect(getWeekendDetails(undefined).isWeekend).toBe(false);
    expect(getWeekendDetails('').isWeekend).toBe(false);
    expect(getWeekendDetails('invalid-date').isWeekend).toBe(false);
  });
});
