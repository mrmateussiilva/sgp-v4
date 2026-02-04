import type { MonetaryValue } from '@/types/monetary';

/**
 * CONTRATO: Backend SEMPRE envia valores em REAIS (não centavos)
 * Frontend NUNCA divide/multiplica por 100 para conversão
 * Multiplicação por 100 APENAS para arredondamento
 */

/**
 * Parseia valor monetário garantindo que está em reais
 * 
 * @param value - Valor a ser parseado (number, string, null, undefined)
 * @returns Valor em reais, arredondado para 2 casas decimais
 * 
 * @example
 * parseMonetary(1500)           // 1500.00
 * parseMonetary("1.500,00")     // 1500.00
 * parseMonetary("1500.00")      // 1500.00
 * parseMonetary(1000)           // 1000.00 (NÃO divide por 100!)
 * parseMonetary(null)           // 0
 * parseMonetary(NaN)            // 0
 */
export const parseMonetary = (value: unknown): MonetaryValue => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? roundToTwoDecimals(value) : 0;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return 0;

        // Remove formatação brasileira
        let normalized = trimmed;

        // Se tem vírgula E ponto, é formato brasileiro: remove pontos e converte vírgula
        if (trimmed.includes(',') && trimmed.includes('.')) {
            normalized = trimmed.replace(/\./g, '').replace(',', '.');
        }
        // Se tem apenas vírgula, é formato brasileiro: converte para ponto decimal
        else if (trimmed.includes(',')) {
            normalized = trimmed.replace(',', '.');
        }
        // Se tem apenas ponto, precisa detectar se é separador de milhar ou decimal
        else if (trimmed.includes('.')) {
            // Conta quantos pontos tem
            const dotCount = (trimmed.match(/\./g) || []).length;

            if (dotCount === 1) {
                // Um único ponto: pode ser milhar (1.500) ou decimal (1500.00)
                const parts = trimmed.split('.');
                const afterDot = parts[1];

                // Se tem exatamente 2 dígitos após o ponto E o valor antes é >= 1000,
                // provavelmente é decimal no formato US (1500.00)
                // Caso contrário, é separador de milhar brasileiro (1.500)
                if (afterDot.length === 2 && Number.parseInt(parts[0], 10) >= 1000) {
                    // Formato US: 1500.00
                    normalized = trimmed;
                } else if (afterDot.length === 3) {
                    // Claramente separador de milhar: 1.500
                    normalized = trimmed.replace(/\./g, '');
                } else if (afterDot.length === 2 && Number.parseInt(parts[0], 10) < 1000) {
                    // Formato decimal: 50.50
                    normalized = trimmed;
                } else {
                    // Padrão: assumir separador de milhar se não for óbvio
                    normalized = trimmed.replace(/\./g, '');
                }
            } else {
                // Múltiplos pontos: separadores de milhar (1.234.567)
                normalized = trimmed.replace(/\./g, '');
            }
        }
        // Se não tem nem vírgula nem ponto, já está normalizado

        const numeric = Number.parseFloat(normalized);
        return Number.isFinite(numeric) ? roundToTwoDecimals(numeric) : 0;
    }

    return 0;
};

/**
 * Arredonda para 2 casas decimais (padrão monetário)
 * Usa Math.round para evitar erros de ponto flutuante
 * 
 * @param value - Valor a ser arredondado
 * @returns Valor arredondado para 2 casas decimais
 * 
 * @example
 * roundToTwoDecimals(123.456)   // 123.46
 * roundToTwoDecimals(123.454)   // 123.45
 * roundToTwoDecimals(123.4)     // 123.40
 */
export const roundToTwoDecimals = (value: number): number => {
    return Math.round(value * 100) / 100;
};

/**
 * Formata valor monetário para exibição em pt-BR (sem símbolo)
 * 
 * @param value - Valor em reais
 * @returns String formatada (ex: "1.500,00")
 * 
 * @example
 * formatMonetary(1500)      // "1.500,00"
 * formatMonetary(50.5)      // "50,50"
 * formatMonetary(0)         // "0,00"
 */
export const formatMonetary = (value: number): string => {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/**
 * Formata valor monetário com símbolo de moeda
 * 
 * @param value - Valor em reais
 * @returns String formatada com símbolo (ex: "R$ 1.500,00")
 * 
 * @example
 * formatCurrency(1500)      // "R$ 1.500,00"
 * formatCurrency(50.5)      // "R$ 50,50"
 * formatCurrency(0)         // "R$ 0,00"
 */
export const formatCurrency = (value: number): string => {
    return `R$ ${formatMonetary(value)}`;
};

/**
 * Valida se um valor monetário é válido
 * 
 * @param value - Valor a ser validado
 * @returns true se válido, false caso contrário
 * 
 * @example
 * isValidMonetary(1500)     // true
 * isValidMonetary(0)        // true
 * isValidMonetary(-100)     // false (negativo)
 * isValidMonetary(NaN)      // false
 * isValidMonetary(Infinity) // false
 */
export const isValidMonetary = (value: unknown): boolean => {
    if (typeof value !== 'number') return false;
    if (!Number.isFinite(value)) return false;
    if (value < 0) return false;
    return true;
};

/**
 * Soma valores monetários com arredondamento correto
 * 
 * @param values - Array de valores a serem somados
 * @returns Soma arredondada para 2 casas decimais
 * 
 * @example
 * sumMonetary([10.5, 20.3, 5.2])  // 36.00
 * sumMonetary([])                  // 0
 */
export const sumMonetary = (...values: number[]): MonetaryValue => {
    const sum = values.reduce((acc, val) => acc + val, 0);
    return roundToTwoDecimals(sum);
};

/**
 * Multiplica valor monetário por quantidade com arredondamento correto
 * 
 * @param value - Valor unitário
 * @param quantity - Quantidade
 * @returns Valor total arredondado para 2 casas decimais
 * 
 * @example
 * multiplyMonetary(10.5, 3)   // 31.50
 * multiplyMonetary(10.99, 2)  // 21.98
 */
export const multiplyMonetary = (value: number, quantity: number): MonetaryValue => {
    return roundToTwoDecimals(value * quantity);
};
