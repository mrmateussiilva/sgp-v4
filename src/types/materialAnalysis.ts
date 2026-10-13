export type { RankingItem } from '@/api/types';

export interface MaterialConfig {
  medida: 'm2' | 'linear' | 'unidade';
  larguraRolo: number;
}

export type MaterialConfigMap = Record<string, MaterialConfig>;

export interface FichaItemDetail {
  id: string;
  pedidoNumero: string;
  cliente: string;
  dataEntrada: string;
  dataEntrega?: string;
  tipoProducao: string;
  material: string;
  materialRaw: string;
  descricao: string;
  largura: string;
  altura: string;
  larguraNum: number;
  alturaNum: number;
  quantidade: number;
  areaItemM2: number;
  areaTotalM2: number;
  acabamentos: string[];
  designer?: string;
  observacao?: string;
  isAlerta: boolean;
  alertaMotivo: string;
}

export type SortField = 'pedido' | 'cliente' | 'area' | 'linear' | 'data';
export type SortDirection = 'asc' | 'desc';

export type MaterialDatePreset = 'today' | '7days' | '30days' | 'month' | 'lastMonth' | 'custom';
