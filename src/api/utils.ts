import { normalizeTipo } from '../mappers/productionItems';

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

export const deriveQuantity = (source: Record<string, unknown>): number => {
    const s = source as any;
    const candidates = [
        s?.quantity,
        s?.quantidade_paineis,
        s?.quantidade_totem,
        s?.quantidade_lona,
        s?.quantidade_adesivo,
        s?.quantidade_canga,
        s?.quantidade_impressao_3d,
        s?.quantidade_mochilinha,
        s?.quantidade,
    ];

    for (const candidate of candidates) {
        const numeric = parseDecimal(candidate);
        if (numeric > 0) {
            return numeric;
        }
    }
    return 1;
};

export const deriveUnitPrice = (source: Record<string, unknown>): number => {
    const s = source as any;
    const candidates = [
        s?.unit_price,
        s?.valor_unitario,
        s?.valor_totem,
        s?.valor_lona,
        s?.valor_adesivo,
        s?.valor_painel,
        s?.valor_canga,
        s?.valor_impressao_3d,
        s?.valor_mochilinha,
    ];

    for (const candidate of candidates) {
        const numeric = parseDecimal(candidate);
        if (numeric > 0) {
            return numeric;
        }
    }
    return 0;
};

export const inferTipoProducao = (item: Record<string, unknown>): string => {
    const i = item as any;
    if (i?.tipo_producao) {
        return normalizeTipo(i.tipo_producao);
    }
    if (typeof i?.descricao === 'string') {
        const lower = i.descricao.toLowerCase();
        if (lower.includes('totem')) return 'totem';
        if (lower.includes('lona')) return 'lona';
        if (lower.includes('adesivo')) return 'adesivo';
        if (lower.includes('mesa de babado') || lower.includes('mesa_babado')) return 'mesa_babado';
    }
    return 'generica';
};

export const buildAcabamento = (item: Record<string, unknown>): { overloque?: boolean; elastico?: boolean; ilhos?: boolean } => {
    const i = item as any;
    return {
        overloque: Boolean(i?.overloque),
        elastico: Boolean(i?.elastico),
        ilhos:
            Boolean(i?.tipo_acabamento && String(i.tipo_acabamento).toLowerCase().includes('ilho')) ||
            Boolean(i?.quantidade_ilhos || i?.ilhos_qtd),
    };
};

export const sanitizePayload = (payload: Record<string, unknown>): Record<string, unknown> => {
    const p = payload as any;
    Object.keys(p).forEach((key) => {
        if (p[key] === undefined) {
            delete p[key];
        }
    });
    return p as Record<string, unknown>;
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
