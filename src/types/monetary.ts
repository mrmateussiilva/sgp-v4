/**
 * CONTRATO OFICIAL DE VALORES MONETÁRIOS
 * 
 * REGRA ÚNICA:
 * - Backend SEMPRE envia valores em REAIS (ex: 1500.00)
 * - Frontend SEMPRE recebe valores em REAIS
 * - Frontend NUNCA divide ou multiplica por 100 para conversão
 * - Multiplicação/divisão por 100 APENAS para arredondamento
 */

/**
 * Valor monetário SEMPRE em reais (nunca centavos)
 * 
 * @example
 * const preco: MonetaryValue = 1500.00; // R$ 1.500,00
 * const frete: MonetaryValue = 50.50;   // R$ 50,50
 */
export type MonetaryValue = number;

/**
 * Contrato completo de valor monetário
 */
export interface MonetaryContract {
    /**
     * Valor monetário em reais (ex: 1500.00)
     * NUNCA em centavos
     */
    value: MonetaryValue;

    /**
     * Código da moeda (sempre BRL)
     */
    currency: 'BRL';
}
