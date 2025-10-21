const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_WITH_SPACE_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

const toDisplayFromDateOnly = (value: string) => {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

export const formatDateForDisplay = (value?: string | null, fallback = '-') => {
  if (!value) return fallback;

  const trimmed = value.trim();
  if (!trimmed) return fallback;

  if (DATE_ONLY_REGEX.test(trimmed)) {
    return toDisplayFromDateOnly(trimmed);
  }

  const normalized = DATE_TIME_WITH_SPACE_REGEX.test(trimmed) ? trimmed.replace(' ', 'T') : trimmed;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toLocaleDateString('pt-BR');
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
