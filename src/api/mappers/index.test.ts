import { describe, it, expect } from 'vitest';
import { buildItemPayloadFromRequest } from './index';

describe('API Mappers', () => {
    describe('buildItemPayloadFromRequest', () => {
        it('generates a full payload filling missing properties with defaults', () => {
            const input = {
                data_impressao: '2026-04-26T12:00:00Z'
            };

            const result = buildItemPayloadFromRequest(input);

            expect(result).toMatchObject({
                descricao: '',
                vendedor: '',
                designer: '',
                tecido: '',
                emenda: 'sem-emenda',
                imagem: null,
                data_impressao: '2026-04-26T12:00:00Z'
            });
        });

        it('preserves existing properties from input', () => {
            const input = {
                descricao: 'Lona Promocional',
                tipo_producao: 'lona',
                vendedor: 'Karol',
                imagem: 'data:image/png;base64,...',
                tecido: 'Lona 440g',
                data_impressao: '2026-04-26T12:00:00Z',
                valor_lona: '150.00'
            };

            const result = buildItemPayloadFromRequest(input);

            expect(result).toMatchObject({
                descricao: 'Lona Promocional',
                tipo_producao: 'lona',
                vendedor: 'Karol',
                tecido: 'Lona 440g',
                imagem: 'data:image/png;base64,...',
                data_impressao: '2026-04-26T12:00:00Z',
                valor_unitario: '150.00' // Verifica se a ramificação de resolver preços funcionou
            });
        });

        it('sanitizes price calculation logic according to type', () => {
            const totemInput = {
                tipo_producao: 'totem',
                valor_totem: '300.00'
            };
            expect(buildItemPayloadFromRequest(totemInput).valor_unitario).toBe('300.00');

            const adesivoInput = {
                tipo_producao: 'adesivo',
                unit_price: '45.00'
            };
            expect(buildItemPayloadFromRequest(adesivoInput).valor_unitario).toBe('45.00');
        });

    });
});
