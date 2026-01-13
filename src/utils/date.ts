const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_WITH_SPACE_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const DATE_TIME_ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

// Formata YYYY-MM-DD diretamente para DD/MM/YYYY sem usar Date (evita deslocamento de fuso)
const toDisplayFromDateOnly = (value: string) => {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

// Formata data com timestamp, extraindo apenas a parte da data sem deslocamento de fuso
const toDisplayFromDateTime = (value: string) => {
  // Extrair apenas a parte da data (YYYY-MM-DD)
  const dateOnly = value.split('T')[0] || value.split(' ')[0];
  if (DATE_ONLY_REGEX.test(dateOnly)) {
    return toDisplayFromDateOnly(dateOnly);
  }
  // Se não conseguir extrair, tentar parsear como data local
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  return dateOnly;
};

export const formatDateForDisplay = (value?: string | null, fallback = '-') => {
  if (!value) return fallback;

  const trimmed = value.trim();
  if (!trimmed) return fallback;

  // Se é apenas data YYYY-MM-DD, formatar diretamente (sem deslocamento de fuso)
  if (DATE_ONLY_REGEX.test(trimmed)) {
    return toDisplayFromDateOnly(trimmed);
  }

  // Se tem timestamp ISO (YYYY-MM-DDTHH:mm:ss), extrair apenas a data
  if (DATE_TIME_ISO_REGEX.test(trimmed)) {
    return toDisplayFromDateTime(trimmed);
  }

  // Se tem timestamp com espaço (YYYY-MM-DD HH:mm:ss)
  if (DATE_TIME_WITH_SPACE_REGEX.test(trimmed)) {
    return toDisplayFromDateTime(trimmed);
  }

  // Para outros formatos, tentar extrair data YYYY-MM-DD do início
  const dateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    return toDisplayFromDateOnly(dateMatch[1]);
  }

  // Fallback: tentar parsear como data local (não UTC)
  try {
    // Se parece ser uma data, tentar extrair componentes
    const parts = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (parts) {
      const [, y, m, d] = parts;
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }
    }
  } catch {
    // Se falhar, retornar fallback
  }

  return fallback;
};

export const ensureDateInputValue = (value?: string | null) => {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  if (DATE_ONLY_REGEX.test(trimmed)) {
    return trimmed;
  }

  const normalized = DATE_TIME_WITH_SPACE_REGEX.test(trimmed) ? trimmed.replace(' ', 'T') : trimmed;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
