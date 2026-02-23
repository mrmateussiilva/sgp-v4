import { describe, it, expect } from 'vitest';
import { buildItemPayloadFromRequest } from './index';
import { normalizeApiMoney, parseDecimal, toCurrencyString } from '../utils';

describe('API Mappers & Utils Regression', () => {
    describe('normalizeApiMoney', () => {
        it('should NOT divide values >= 1000 by 100 anymore', () => {
            expect(normalizeApiMoney(1000)).toBe('1000.00');
            expect(normalizeApiMoney(1500)).toBe('1500.00');
            expect(normalizeApiMoney('1500,00')).toBe('1500.00');
            expect(normalizeApiMoney('1500.00')).toBe('1500.00');
        });

        it('should handle small values correctly', () => {
            expect(normalizeApiMoney(10)).toBe('10.00');
            expect(normalizeApiMoney('10,50')).toBe('10.50');
        });
    });

    describe('buildItemPayloadFromRequest - valor_unitario hardening', () => {
        it('should prefer item.valor_unitario if it is a non-zero string', () => {
            const item = {
                tipo_producao: 'painel',
                valor_unitario: '150,00',
                unit_price: 150
            };
            const payload = buildItemPayloadFromRequest(item);
            expect(payload.valor_unitario).toBe('150.00');
        });

        it('should prefer unit_price if item.valor_unitario is zero ("0,00")', () => {
            const item = {
                tipo_producao: 'painel',
                valor_unitario: '0,00',
                unit_price: 150.55
            };
            const payload = buildItemPayloadFromRequest(item);
            expect(payload.valor_unitario).toBe('150.55');
        });

        it('should prefer unit_price if item.valor_unitario is missing', () => {
            const item = {
                tipo_producao: 'painel',
                unit_price: 75.25
            };
            const payload = buildItemPayloadFromRequest(item);
            expect(payload.valor_unitario).toBe('75.25');
        });

        it('should fallback to 0 if everything is zero/missing', () => {
            const item = {
                tipo_producao: 'painel'
            };
            const payload = buildItemPayloadFromRequest(item);
            expect(payload.valor_unitario).toBe('0.00');
        });

        it('should handle totem specifically using canon.valor_unitario', () => {
            const item = {
                tipo_producao: 'totem',
                valor_totem: '50,00',
                unit_price: 50
            };
            // Note: canonicalizeFromItemRequest will extract valor_totem into its result
            const payload = buildItemPayloadFromRequest(item);
            expect(payload.valor_unitario).toBe('50.00');
        });

        it('should derive valor_unitario from valor_lona for lona items', () => {
            const item = {
                tipo_producao: 'lona',
                valor_lona: '200,00',
                unit_price: 0,
            };
            const payload = buildItemPayloadFromRequest(item);
            expect(payload.valor_unitario).toBe('200.00');
            expect(payload.valor_lona).toBe('200.00');
        });

        it('should derive valor_unitario from valor_adesivo for adesivo items', () => {
            const item = {
                tipo_producao: 'adesivo',
                valor_adesivo: '75,50',
                unit_price: 0,
            };
            const payload = buildItemPayloadFromRequest(item);
            expect(payload.valor_unitario).toBe('75.50');
            expect(payload.valor_adesivo).toBe('75.50');
        });

        it('should derive valor_unitario from valor_canga for canga items', () => {
            const item = {
                tipo_producao: 'canga',
                valor_canga: '35,00',
                unit_price: 0,
            };
            const payload = buildItemPayloadFromRequest(item);
            expect(payload.valor_unitario).toBe('35.00');
            expect(payload.valor_canga).toBe('35.00');
        });

        it('should derive valor_unitario from valor_impressao_3d for impressao_3d items', () => {
            const item = {
                tipo_producao: 'impressao_3d',
                valor_impressao_3d: '120,00',
                unit_price: 0,
            };
            const payload = buildItemPayloadFromRequest(item);
            expect(payload.valor_unitario).toBe('120.00');
            expect(payload.valor_impressao_3d).toBe('120.00');
        });
    });

    describe('toCurrencyString & parseDecimal consistency', () => {
        it('should parse BR format and format back to dot-decimal string', () => {
            expect(toCurrencyString('1.500,00')).toBe('1500.00');
            expect(toCurrencyString('150,55')).toBe('150.55');
        });

        it('should handle numeric inputs', () => {
            expect(toCurrencyString(1500)).toBe('1500.00');
            expect(toCurrencyString(150.55)).toBe('150.55');
        });
    });
});
