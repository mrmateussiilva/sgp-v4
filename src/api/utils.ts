
export const sanitizeDecimalString = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
        return '0';
    }
    if (trimmed.includes(',')) {
        return trimmed.replace(/\./g, '').replace(',', '.');
    }
    return trimmed;
};

export const parseDecimal = (value: string | number | null | undefined): number => {
    if (typeof value === 'number') {
        return Number.isNaN(value) ? 0 : value;
    }
    if (typeof value === 'string') {
        const numeric = Number.parseFloat(sanitizeDecimalString(value));
        return Number.isNaN(numeric) ? 0 : numeric;
    }
    if (value == null) {
        return 0;
    }
    return 0;
};

export const toCurrencyString = (value: string | number | null | undefined): string => {
    return parseDecimal(value).toFixed(2);
};

export const normalizeApiMoney = (value: string | number | null | undefined): string | undefined => {
    const numeric = parseDecimal(value);
    if (!numeric) {
        return undefined;
    }

    return numeric.toFixed(2);
};

export const safeString = (value: unknown, fallback = ''): string => {
    if (value === null || value === undefined) {
        return fallback;
    }
    return String(value);
};

export const parseNumericId = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0 && /^[0-9]+$/.test(trimmed)) {
            return Number.parseInt(trimmed, 10);
        }
    }
    return null;
};

export const deriveQuantity = (source: any): number => {
    const candidates = [
        source?.quantity,
        source?.quantidade_paineis,
        source?.quantidade_totem,
        source?.quantidade_lona,
        source?.quantidade_adesivo,
        source?.quantidade_canga,
        source?.quantidade_impressao_3d,
        source?.quantidade_mochilinha,
        source?.quantidade,
    ];

    for (const candidate of candidates) {
        const numeric = parseDecimal(candidate);
        if (numeric > 0) {
            return numeric;
        }
    }
    return 1;
};

export const deriveUnitPrice = (source: any): number => {
    const candidates = [
        source?.unit_price,
        source?.valor_unitario,
        source?.valor_totem,
        source?.valor_lona,
        source?.valor_adesivo,
        source?.valor_painel,
        source?.valor_canga,
        source?.valor_impressao_3d,
        source?.valor_mochilinha,
    ];

    for (const candidate of candidates) {
        const numeric = parseDecimal(candidate);
        if (numeric > 0) {
            return numeric;
        }
    }
    return 0;
};

export const inferTipoProducao = (item: any): string => {
    if (item?.tipo_producao) {
        return String(item.tipo_producao);
    }
    if (typeof item?.descricao === 'string') {
        const lower = item.descricao.toLowerCase();
        if (lower.includes('totem')) return 'totem';
        if (lower.includes('lona')) return 'lona';
        if (lower.includes('adesivo')) return 'adesivo';
    }
    return 'generica';
};

export const buildAcabamento = (item: any): { overloque?: boolean; elastico?: boolean; ilhos?: boolean } => ({
    overloque: Boolean(item?.overloque),
    elastico: Boolean(item?.elastico),
    ilhos:
        Boolean(item?.tipo_acabamento && String(item.tipo_acabamento).toLowerCase().includes('ilho')) ||
        Boolean(item?.quantidade_ilhos || item?.ilhos_qtd),
});

export const sanitizePayload = (payload: Record<string, any>): Record<string, any> => {
    Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
            delete payload[key];
        }
    });
    return payload;
};

export const normalizeNullableString = (value?: string | null): string | null => {
    if (value === undefined || value === null) {
        return null;
    }
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
};

export const normalizePriority = (value?: string | null): 'NORMAL' | 'ALTA' => {
    if (value && value.toUpperCase() === 'ALTA') {
        return 'ALTA';
    }
    return 'NORMAL';
};
