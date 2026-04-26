import { describe, it, expect } from 'vitest';
import { formatDateForDisplay, formatTimeHHmm, ensureDateInputValue } from './date';

describe('Date Utilities', () => {
    describe('formatDateForDisplay', () => {
        it('returns fallback for empty inputs', () => {
            expect(formatDateForDisplay('')).toBe('-');
            expect(formatDateForDisplay(null as any)).toBe('-');
            expect(formatDateForDisplay(undefined)).toBe('-');
            expect(formatDateForDisplay('   ')).toBe('-');
        });

        it('formats YYYY-MM-DD correctly without time zone shifting', () => {
            expect(formatDateForDisplay('2026-04-26')).toBe('26/04/2026');
        });

        it('formats ISO dates correctly without time zone shifting', () => {
            expect(formatDateForDisplay('2026-04-26T12:00:00.000Z')).toBe('26/04/2026');
            expect(formatDateForDisplay('2026-04-26T23:59:59.000Z')).toBe('26/04/2026');
        });

        it('formats space-separated dates correctly', () => {
            expect(formatDateForDisplay('2026-04-26 12:00:00')).toBe('26/04/2026');
        });

        it('uses custom fallback', () => {
            expect(formatDateForDisplay('', 'N/A')).toBe('N/A');
        });
    });

    describe('formatTimeHHmm', () => {
        it('returns fallback for empty inputs', () => {
            expect(formatTimeHHmm('')).toBe('-');
            expect(formatTimeHHmm(null as any)).toBe('-');
            expect(formatTimeHHmm(undefined)).toBe('-');
        });

        it('formats ISO strings to HH:mm handling UTC logic', () => {
            // Vitest runs in local TZ (e.g., UTC or something else). 
            // For predictable HH:mm from UTC "Z" strings, we check if it produces string format 00:00
            // We will test the parsing format
            const time = formatTimeHHmm('2026-04-26T12:00:00Z');
            expect(time).toMatch(/^\d{2}:\d{2}$/);
        });

        it('formats space-separated date times', () => {
            const time = formatTimeHHmm('2026-04-26 12:00:00');
            expect(time).toMatch(/^\d{2}:\d{2}$/);
        });
    });

    describe('ensureDateInputValue', () => {
        it('returns empty string for empty inputs', () => {
            expect(ensureDateInputValue('')).toBe('');
            expect(ensureDateInputValue(null as any)).toBe('');
            expect(ensureDateInputValue(undefined)).toBe('');
        });

        it('keeps YYYY-MM-DD intact', () => {
            expect(ensureDateInputValue('2026-04-26')).toBe('2026-04-26');
        });

        it('converts ISO string to YYYY-MM-DD', () => {
            const dateStr = ensureDateInputValue('2026-04-26T12:00:00.000Z');
            expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });
});
