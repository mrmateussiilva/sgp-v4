import { MaterialConfigMap, FichaItemDetail } from '@/types/materialAnalysis';

export const calculateSmartLinearMeters = (
  largura: number,
  altura: number,
  quantidade: number,
  areaM2: number,
  larguraRolo: number,
  mode: 'encaixe' | 'area' = 'encaixe'
): number => {
  const rolo = larguraRolo > 0 ? larguraRolo : 1.5;
  const qtd = quantidade > 0 ? quantidade : 1;

  if (mode === 'area' || largura <= 0 || altura <= 0) {
    return Number(((areaM2 || 0) / rolo).toFixed(2));
  }

  // Se a largura cabe na largura do rolo, o rolo avança pela altura da peça
  if (largura <= rolo && altura <= rolo) {
    // Cabe em qualquer orientação, escolhe a que consome menos metragem linear
    return Number((Math.min(largura, altura) * qtd).toFixed(2));
  } else if (largura <= rolo) {
    return Number((altura * qtd).toFixed(2));
  } else if (altura <= rolo) {
    // Girada 90 graus para caber na largura do rolo
    return Number((largura * qtd).toFixed(2));
  } else {
    // Ambos maiores que a largura do rolo -> Necessita de emenda
    // Calcula o número de passadas pelo menor lado e multiplica pelo maior
    const menorLado = Math.min(largura, altura);
    const maiorLado = Math.max(largura, altura);
    const passadas = Math.ceil(menorLado / rolo);
    return Number((passadas * maiorLado * qtd).toFixed(2));
  }
};

export const getConsumo = (nome: string, area_m2: number, quantidade_itens: number, configs?: MaterialConfigMap) => {
  const safeConfigs = configs || {};
  const safeNome = nome || '';
  const config = safeConfigs[safeNome] || safeConfigs[safeNome.toUpperCase()];
  if (!config || config.medida === 'm2') {
    return { value: area_m2 || 0, text: `${(area_m2 || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} m²`, label: 'm²' };
  }
  if (config.medida === 'unidade') {
    return { value: quantidade_itens || 0, text: `${(quantidade_itens || 0).toLocaleString()} un`, label: 'unidades' };
  }
  if (config.medida === 'linear') {
    const largura = config.larguraRolo || 1;
    const lineares = (area_m2 || 0) / (largura || 1);
    return { value: lineares, text: `${lineares.toLocaleString(undefined, { maximumFractionDigits: 2 })} m lin.`, label: 'm linear' };
  }
  return { value: area_m2 || 0, text: `${(area_m2 || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} m²`, label: 'm²' };
};

export const parseDecimalVal = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const raw = String(val).trim();
  if (!raw) return 0;
  let filtered = raw.replace(/\s+/g, '');
  if (filtered.includes(',') && filtered.includes('.')) {
    if (filtered.lastIndexOf(',') > filtered.lastIndexOf('.')) {
      filtered = filtered.replace(/\./g, '').replace(',', '.');
    } else {
      filtered = filtered.replace(/,/g, '');
    }
  } else if (filtered.includes(',')) {
    filtered = filtered.replace(',', '.');
  }
  const clean = filtered.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

export const calculateItemAreaM2 = (item: any): number => {
  const m2 = parseDecimalVal(item.metro_quadrado);
  if (m2 > 0) return m2;
  const l = parseDecimalVal(item.largura);
  const a = parseDecimalVal(item.altura);
  const calc = l * a;
  if (calc > 0) return calc;
  return 1.0;
};

export const getItemQuantidade = (item: any): number => {
  for (const field of ['quantidade_paineis', 'quantidade_lona', 'quantidade_adesivo', 'quantidade_totem', 'quantidade']) {
    const q = parseDecimalVal(item[field]);
    if (q > 0) return q;
  }
  return 1.0;
};

export const getItemAcabamentos = (item: any): string[] => {
  const list: string[] = [];
  if (item.acabamento) {
    if (item.acabamento.overloque) list.push('Overloque');
    if (item.acabamento.elastico) list.push('Elástico');
    if (item.acabamento.ilhos) {
      const q = parseDecimalVal(item.quantidade_ilhos);
      list.push(q > 0 ? `Ilhós (${q})` : 'Ilhós');
    }
  }
  if (item.emenda && item.emenda !== 'sem-emenda' && item.emenda !== 'nenhuma') {
    list.push(`Emenda ${item.emenda}`);
  }
  if (item.acabamento_totem && item.acabamento_totem !== 'sem_pe') {
    list.push(item.acabamento_totem === 'com_pe' ? 'Com Pé' : item.acabamento_totem);
  }
  if (item.acabamento_lona) {
    list.push(item.acabamento_lona);
  }
  return list;
};

export const chartColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
];

export const materialPalette = [
  { hex: '#3b82f6', bg: 'bg-blue-500', border: 'border-blue-200', text: 'text-blue-700', shadow: 'shadow-blue-100', icon: 'text-blue-500' },
  { hex: '#10b981', bg: 'bg-emerald-500', border: 'border-emerald-200', text: 'text-emerald-700', shadow: 'shadow-emerald-100', icon: 'text-emerald-500' },
  { hex: '#f59e0b', bg: 'bg-amber-500', border: 'border-amber-200', text: 'text-amber-700', shadow: 'shadow-amber-100', icon: 'text-amber-500' },
  { hex: '#ef4444', bg: 'bg-rose-500', border: 'border-rose-200', text: 'text-rose-700', shadow: 'shadow-rose-100', icon: 'text-rose-500' },
  { hex: '#6366f1', bg: 'bg-indigo-500', border: 'border-indigo-200', text: 'text-indigo-700', shadow: 'shadow-indigo-100', icon: 'text-indigo-500' },
  { hex: '#71717a', bg: 'bg-zinc-500', border: 'border-zinc-200', text: 'text-zinc-700', shadow: 'shadow-zinc-100', icon: 'text-zinc-500' },
];

/**
 * Exporta fichas de produção formatadas para arquivo CSV com UTF-8 BOM e separador ';'
 */
export const exportMaterialFichasCSV = (
  fichas: FichaItemDetail[],
  getItemMetrics: (item: FichaItemDetail) => { effectiveLinear: number; isOverridden: boolean },
  calcMode: 'encaixe' | 'area',
  filename = 'fichas_materiais'
) => {
  if (!fichas || fichas.length === 0) return;

  const headers = [
    'Pedido',
    'Cliente',
    'Data Entrada',
    'Tipo Producao',
    'Material',
    'Descricao',
    'Largura (m)',
    'Altura (m)',
    'Quantidade',
    'Area Item (m2)',
    'Area Total (m2)',
    'Metros Lineares (m)',
    'Tipo de Calculo',
    'Acabamentos',
    'Observacao'
  ];

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = fichas.map((f) => {
    const { effectiveLinear, isOverridden } = getItemMetrics(f);
    const tipoCalc = isOverridden
      ? 'Ajuste Manual'
      : `Automático (${calcMode === 'encaixe' ? 'Encaixe Real' : 'Área ÷ Rolo'})`;

    return [
      escapeCSV(f.pedidoNumero),
      escapeCSV(f.cliente),
      escapeCSV(f.dataEntrada ? f.dataEntrada.split('-').reverse().join('/') : ''),
      escapeCSV(f.tipoProducao),
      escapeCSV(f.material),
      escapeCSV(f.descricao),
      escapeCSV(f.largura.replace('.', ',')),
      escapeCSV(f.altura.replace('.', ',')),
      escapeCSV(f.quantidade),
      escapeCSV(f.areaItemM2.toFixed(2).replace('.', ',')),
      escapeCSV(f.areaTotalM2.toFixed(2).replace('.', ',')),
      escapeCSV(effectiveLinear.toFixed(2).replace('.', ',')),
      escapeCSV(tipoCalc),
      escapeCSV(f.acabamentos.join(', ')),
      escapeCSV(f.observacao || '')
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
