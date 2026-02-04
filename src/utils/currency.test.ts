import { describe, it, expect } from 'vitest';
import {
    parseMonetary,
    roundToTwoDecimals,
    formatMonetary,
    formatCurrency,
    isValidMonetary,
    sumMonetary,
    multiplyMonetary,
} from './currency';

describe('currency utilities', () => {
    describe('parseMonetary', () => {
        it('deve parsear number válido', () => {
            expect(parseMonetary(1500)).toBe(1500);
            expect(parseMonetary(50.5)).toBe(50.5);
            expect(parseMonetary(0)).toBe(0);
        });

        it('deve parsear string no formato brasileiro', () => {
            expect(parseMonetary('1.500,00')).toBe(1500);
            expect(parseMonetary('50,50')).toBe(50.5);
            expect(parseMonetary('1.234.567,89')).toBe(1234567.89);
        });

        it('deve parsear string no formato US', () => {
            expect(parseMonetary('1500.00')).toBe(1500);
            expect(parseMonetary('50.50')).toBe(50.5);
            expect(parseMonetary('1234567.89')).toBe(1234567.89);
        });

        it('deve tratar valor exatamente 1000 corretamente (NÃO dividir por 100)', () => {
            expect(parseMonetary(1000)).toBe(1000);
            expect(parseMonetary('1000')).toBe(1000);
            expect(parseMonetary('1.000,00')).toBe(1000);
            expect(parseMonetary('1000.00')).toBe(1000);
        });

        it('deve tratar valores próximos a 1000', () => {
            expect(parseMonetary(999.99)).toBe(999.99);
            expect(parseMonetary(1000.01)).toBe(1000.01);
            expect(parseMonetary('999,99')).toBe(999.99);
            expect(parseMonetary('1.000,01')).toBe(1000.01);
        });

        it('deve arredondar para 2 casas decimais', () => {
            expect(parseMonetary(123.456)).toBe(123.46);
            expect(parseMonetary(123.454)).toBe(123.45);
            expect(parseMonetary('123,456')).toBe(123.46);
        });

        it('deve retornar 0 para valores inválidos', () => {
            expect(parseMonetary(NaN)).toBe(0);
            expect(parseMonetary(Infinity)).toBe(0);
            expect(parseMonetary(-Infinity)).toBe(0);
            expect(parseMonetary(null)).toBe(0);
            expect(parseMonetary(undefined)).toBe(0);
            expect(parseMonetary('')).toBe(0);
            expect(parseMonetary('   ')).toBe(0);
            expect(parseMonetary('abc')).toBe(0);
        });

        it('deve aceitar valores negativos (para cálculos intermediários)', () => {
            expect(parseMonetary(-100)).toBe(-100);
            expect(parseMonetary('-50,50')).toBe(-50.5);
        });

        it('deve tratar strings com espaços', () => {
            expect(parseMonetary('  1500  ')).toBe(1500);
            expect(parseMonetary('  1.500,00  ')).toBe(1500);
        });
    });

    describe('roundToTwoDecimals', () => {
        it('deve arredondar para 2 casas decimais', () => {
            expect(roundToTwoDecimals(123.456)).toBe(123.46);
            expect(roundToTwoDecimals(123.454)).toBe(123.45);
            expect(roundToTwoDecimals(123.455)).toBe(123.46); // arredonda para cima
        });

        it('deve manter valores já com 2 casas', () => {
            expect(roundToTwoDecimals(123.45)).toBe(123.45);
            expect(roundToTwoDecimals(100.00)).toBe(100);
        });

        it('deve adicionar casas decimais quando necessário', () => {
            expect(roundToTwoDecimals(123)).toBe(123);
            expect(roundToTwoDecimals(123.4)).toBe(123.4);
        });
    });

    describe('formatMonetary', () => {
        it('deve formatar valores em pt-BR sem símbolo', () => {
            expect(formatMonetary(1500)).toBe('1.500,00');
            expect(formatMonetary(50.5)).toBe('50,50');
            expect(formatMonetary(0)).toBe('0,00');
            expect(formatMonetary(1234567.89)).toBe('1.234.567,89');
        });

        it('deve sempre mostrar 2 casas decimais', () => {
            expect(formatMonetary(100)).toBe('100,00');
            expect(formatMonetary(100.5)).toBe('100,50');
        });
    });

    describe('formatCurrency', () => {
        it('deve formatar com símbolo R$', () => {
            expect(formatCurrency(1500)).toBe('R$ 1.500,00');
            expect(formatCurrency(50.5)).toBe('R$ 50,50');
            expect(formatCurrency(0)).toBe('R$ 0,00');
        });
    });

    describe('isValidMonetary', () => {
        it('deve validar números positivos', () => {
            expect(isValidMonetary(1500)).toBe(true);
            expect(isValidMonetary(0)).toBe(true);
            expect(isValidMonetary(0.01)).toBe(true);
        });

        it('deve rejeitar valores negativos', () => {
            expect(isValidMonetary(-100)).toBe(false);
            expect(isValidMonetary(-0.01)).toBe(false);
        });

        it('deve rejeitar valores inválidos', () => {
            expect(isValidMonetary(NaN)).toBe(false);
            expect(isValidMonetary(Infinity)).toBe(false);
            expect(isValidMonetary(-Infinity)).toBe(false);
        });

        it('deve rejeitar não-números', () => {
            expect(isValidMonetary('1500')).toBe(false);
            expect(isValidMonetary(null)).toBe(false);
            expect(isValidMonetary(undefined)).toBe(false);
            expect(isValidMonetary({})).toBe(false);
        });
    });

    describe('sumMonetary', () => {
        it('deve somar valores corretamente', () => {
            expect(sumMonetary(10.5, 20.3, 5.2)).toBe(36);
            expect(sumMonetary(100, 200, 300)).toBe(600);
        });

        it('deve arredondar resultado', () => {
            expect(sumMonetary(10.555, 20.444)).toBe(31);
        });

        it('deve retornar 0 para array vazio', () => {
            expect(sumMonetary()).toBe(0);
        });

        it('deve somar um único valor', () => {
            expect(sumMonetary(100)).toBe(100);
        });
    });

    describe('multiplyMonetary', () => {
        it('deve multiplicar valor por quantidade', () => {
            expect(multiplyMonetary(10.5, 3)).toBe(31.5);
            expect(multiplyMonetary(10.99, 2)).toBe(21.98);
            expect(multiplyMonetary(100, 5)).toBe(500);
        });

        it('deve arredondar resultado', () => {
            expect(multiplyMonetary(10.555, 2)).toBe(21.11);
        });

        it('deve retornar 0 quando multiplicado por 0', () => {
            expect(multiplyMonetary(100, 0)).toBe(0);
        });
    });

    describe('casos de teste críticos (bug de 1000)', () => {
        it('NÃO deve dividir valores >= 1000 por 100', () => {
            // Este era o bug da função normalizeApiMoney
            expect(parseMonetary(1000)).toBe(1000); // NÃO 10
            expect(parseMonetary(1500)).toBe(1500); // NÃO 15
            expect(parseMonetary(2000)).toBe(2000); // NÃO 20
            expect(parseMonetary(10000)).toBe(10000); // NÃO 100
        });

        it('deve tratar valores < 1000 normalmente', () => {
            expect(parseMonetary(999)).toBe(999);
            expect(parseMonetary(500)).toBe(500);
            expect(parseMonetary(100)).toBe(100);
        });

        it('deve ser consistente independente do formato', () => {
            // Todos devem resultar em 1500, não 15
            expect(parseMonetary(1500)).toBe(1500);
            expect(parseMonetary('1500')).toBe(1500);
            expect(parseMonetary('1.500')).toBe(1500);
            expect(parseMonetary('1500.00')).toBe(1500);
            expect(parseMonetary('1.500,00')).toBe(1500);
        });
    });

    describe('casos de uso reais', () => {
        it('deve calcular subtotal de item corretamente', () => {
            const unitPrice = parseMonetary('150,00');
            const quantity = 10;
            const subtotal = multiplyMonetary(unitPrice, quantity);

            expect(subtotal).toBe(1500);
            expect(formatCurrency(subtotal)).toBe('R$ 1.500,00');
        });

        it('deve somar itens de pedido corretamente', () => {
            const item1 = parseMonetary('1.500,00');
            const item2 = parseMonetary('500,00');
            const frete = parseMonetary('50,00');

            const total = sumMonetary(item1, item2, frete);

            expect(total).toBe(2050);
            expect(formatCurrency(total)).toBe('R$ 2.050,00');
        });

        it('deve processar valores do backend corretamente', () => {
            // Simula valores vindos do backend
            const backendValue1 = 1500.00; // number
            const backendValue2 = '1500.00'; // string (caso raro)

            expect(parseMonetary(backendValue1)).toBe(1500);
            expect(parseMonetary(backendValue2)).toBe(1500);
        });
    });
});
