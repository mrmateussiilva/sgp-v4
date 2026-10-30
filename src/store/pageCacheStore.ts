import { create } from 'zustand';
import { Cliente, MaterialEvolutionResponse, MaterialStatsResponse } from '../api/types';
import { OrderWithItems } from '../types';

export interface ClientesPageCache {
  clientes: Cliente[];
  searchTerm: string;
  currentPage: number;
  lastFetchTime: number;
}

export interface MaterialAnalysisPageCache {
  stats: MaterialStatsResponse | null;
  evolution: MaterialEvolutionResponse | null;
  tiposProducao: { value: string; label: string }[];
  dataInicio: string;
  dataFim: string;
  tipoProducao: string;
  lastQueryKey: string;
  lastFetchTime: number;
}

export type ExpedicaoDatePreset = 'fila_hoje' | 'apenas_hoje' | 'semana' | 'todos' | 'customizado';
export type ExpedicaoViewTab = 'todos' | 'atrasados' | 'hoje' | 'expedidos';

export interface ExpedicaoPageCache {
  orders: OrderWithItems[];
  datePreset: ExpedicaoDatePreset;
  dataInicio: string;
  dataFim: string;
  searchQuery: string;
  activeTab: ExpedicaoViewTab;
  apenasProntosProducao: boolean;
  ocultarExpedidos: boolean;
  lastQueryKey: string;
  lastFetchTime: number;
}

interface PageCacheState {
  clientesCache: ClientesPageCache;
  materialAnalysisCache: MaterialAnalysisPageCache;
  expedicaoCache: ExpedicaoPageCache;
  setClientesCache: (partial: Partial<ClientesPageCache>) => void;
  setMaterialAnalysisCache: (partial: Partial<MaterialAnalysisPageCache>) => void;
  setExpedicaoCache: (partial: Partial<ExpedicaoPageCache>) => void;
}

const getThirtyDaysAgoIso = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};

const getTodayIso = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPastLocalDateString = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return getLocalDateString(date);
};

export const usePageCacheStore = create<PageCacheState>((set) => ({
  clientesCache: {
    clientes: [],
    searchTerm: '',
    currentPage: 1,
    lastFetchTime: 0,
  },
  materialAnalysisCache: {
    stats: null,
    evolution: null,
    tiposProducao: [],
    dataInicio: getThirtyDaysAgoIso(),
    dataFim: getTodayIso(),
    tipoProducao: 'all',
    lastQueryKey: '',
    lastFetchTime: 0,
  },
  expedicaoCache: {
    orders: [],
    datePreset: 'fila_hoje',
    dataInicio: getPastLocalDateString(60),
    dataFim: getLocalDateString(),
    searchQuery: '',
    activeTab: 'todos',
    apenasProntosProducao: false,
    ocultarExpedidos: true,
    lastQueryKey: '',
    lastFetchTime: 0,
  },
  setClientesCache: (partial) =>
    set((state) => ({
      clientesCache: { ...state.clientesCache, ...partial },
    })),
  setMaterialAnalysisCache: (partial) =>
    set((state) => ({
      materialAnalysisCache: { ...state.materialAnalysisCache, ...partial },
    })),
  setExpedicaoCache: (partial) =>
    set((state) => ({
      expedicaoCache: { ...state.expedicaoCache, ...partial },
    })),
}));
