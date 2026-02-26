/**
 * Remove zeros à esquerda do número do pedido.
 * Ex.: "0000000487" → "487", "0000000000" → "0"
 */
export function formatOrderNumber(value: string | number | undefined | null): string {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    if (!str) return '';
    // Remove leading zeros, preserving at least one digit
    return str.replace(/^0+/, '') || '0';
}
