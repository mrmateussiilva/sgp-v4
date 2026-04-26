import { describe, it, expect } from 'vitest';
import { formatOrderNumber } from './formatOrderNumber';

describe('formatOrderNumber', () => {
    it('removes leading zeros', () => {
        expect(formatOrderNumber('0000000487')).toBe('487');
        expect(formatOrderNumber('0487')).toBe('487');
    });

    it('keeps single zero if it is only zeros', () => {
        expect(formatOrderNumber('0000000000')).toBe('0');
        expect(formatOrderNumber('0')).toBe('0');
    });

    it('handles numbers instead of strings', () => {
        expect(formatOrderNumber(487)).toBe('487');
        expect(formatOrderNumber(0)).toBe('0');
    });

    it('handles empty inputs', () => {
        expect(formatOrderNumber('')).toBe('');
        expect(formatOrderNumber('   ')).toBe('');
        expect(formatOrderNumber(null)).toBe('');
        expect(formatOrderNumber(undefined)).toBe('');
    });
});
