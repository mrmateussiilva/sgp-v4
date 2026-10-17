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

/** Formata string ISO/datetime para apenas hora e minutos (HH:mm). Retorna fallback se inválido ou ausente. */
export const formatTimeHHmm = (value?: string | null, fallback = '-'): string => {
  if (!value || !String(value).trim()) return fallback;
  
  let dateStr = String(value).trim();
  
  // Se estiver no formato "YYYY-MM-DD HH:mm:ss" (espaço em vez de T), normaliza para ISO
  if (DATE_TIME_WITH_SPACE_REGEX.test(dateStr)) {
    dateStr = dateStr.replace(' ', 'T');
  }

  // Se for um formato ISO mas não tiver fuso horário (nem 'Z', nem '+' ou '-'), assume UTC
  // Ex: "2026-03-12T23:25:00" -> "2026-03-12T23:25:00Z"
  if (dateStr.includes('T') && !/[Z+-]/.test(dateStr.split('T')[1])) {
    dateStr += 'Z';
  }

  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return fallback;
  
  return parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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

export interface WeekendDetails {
  isWeekend: boolean;
  dayOfWeek?: number;
  dayName: 'Sábado' | 'Domingo' | '';
  nextBusinessDay?: string;
  nextBusinessDayDisplay?: string;
  formattedDate?: string;
}

/**
 * Analisa se uma data é final de semana (Sábado ou Domingo) de forma segura em relação ao fuso horário,
 * calculando também o próximo dia útil (Segunda-feira).
 */
export const getWeekendDetails = (value?: string | null): WeekendDetails => {
  if (!value) {
    return { isWeekend: false, dayName: '' };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { isWeekend: false, dayName: '' };
  }

  // Extrair apenas a parte da data
  const dateOnly = trimmed.split('T')[0].split(' ')[0];
  let year: number;
  let month: number;
  let day: number;

  const ymdMatch = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    year = Number(ymdMatch[1]);
    month = Number(ymdMatch[2]) - 1;
    day = Number(ymdMatch[3]);
  } else {
    const dmyMatch = dateOnly.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmyMatch) {
      day = Number(dmyMatch[1]);
      month = Number(dmyMatch[2]) - 1;
      year = Number(dmyMatch[3]);
    } else {
      return { isWeekend: false, dayName: '' };
    }
  }

  // Criar data local (ano, mes, dia) para evitar desvios de fuso horário
  const date = new Date(year, month, day);
  if (Number.isNaN(date.getTime())) {
    return { isWeekend: false, dayName: '' };
  }

  const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado
  if (dayOfWeek !== 0 && dayOfWeek !== 6) {
    return { isWeekend: false, dayName: '', dayOfWeek };
  }

  const dayName: 'Sábado' | 'Domingo' = dayOfWeek === 6 ? 'Sábado' : 'Domingo';
  const daysToAdd = dayOfWeek === 6 ? 2 : 1; // Se sábado, +2 dias = segunda; se domingo, +1 dia = segunda

  const nextDate = new Date(year, month, day);
  nextDate.setDate(nextDate.getDate() + daysToAdd);

  const nextYear = nextDate.getFullYear();
  const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
  const nextDay = String(nextDate.getDate()).padStart(2, '0');

  const nextBusinessDay = `${nextYear}-${nextMonth}-${nextDay}`;
  const nextBusinessDayDisplay = `${nextDay}/${nextMonth}/${nextYear}`;
  const formattedDate = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;

  return {
    isWeekend: true,
    dayOfWeek,
    dayName,
    nextBusinessDay,
    nextBusinessDayDisplay,
    formattedDate,
  };
};

export interface SameDayDetails {
  isSameDay: boolean;
  todayFormatted: string;
  nextDate: string;
  nextDateDisplay: string;
  nextDateLabel: string;
}

/**
 * Verifica se a entrega está agendada para o mesmo dia (hoje ou igual à data de entrada)
 * e calcula a data seguinte mais próxima (pulando finais de semana automaticamente).
 */
export const getSameDayDetails = (
  dataEntrega?: string | null,
  dataEntrada?: string | null
): SameDayDetails => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  const todayYmd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const todayFormatted = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;

  // Próximo dia
  const next = new Date(year, month, day + 1);
  let nextDateLabel = 'Amanhã';

  // Se amanhã for sábado (6), pula para segunda (+2)
  if (next.getDay() === 6) {
    next.setDate(next.getDate() + 2);
    nextDateLabel = 'Segunda-feira';
  } else if (next.getDay() === 0) {
    // Se domingo (0), pula para segunda (+1)
    next.setDate(next.getDate() + 1);
    nextDateLabel = 'Segunda-feira';
  }

  const nextYmd = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  const nextDateDisplay = `${String(next.getDate()).padStart(2, '0')}/${String(next.getMonth() + 1).padStart(2, '0')}/${next.getFullYear()}`;

  if (!dataEntrega) {
    return {
      isSameDay: false,
      todayFormatted,
      nextDate: nextYmd,
      nextDateDisplay,
      nextDateLabel,
    };
  }

  const cleanEntrega = dataEntrega.split('T')[0].split(' ')[0].trim();
  const cleanEntrada = dataEntrada ? dataEntrada.split('T')[0].split(' ')[0].trim() : todayYmd;

  const isSameDay = cleanEntrega === cleanEntrada || cleanEntrega === todayYmd;

  return {
    isSameDay,
    todayFormatted,
    nextDate: nextYmd,
    nextDateDisplay,
    nextDateLabel,
  };
};


