import { describe, it, expect } from 'vitest';
import {
  parseLocalDate,
  isDateToday,
  isDateOverdue,
  getDaysDifference,
  calculateDashboardStats,
  calculateProductionEfficiency,
  calculateProductionStageCounts
} from '@/utils/dashboardStats';
import { OrderWithItems } from '@/types';

describe('dashboardStats utils', () => {
  it('parseLocalDate deve parsear corretamente data YYYY-MM-DD mantendo ano, mês e dia local', () => {
    const date = parseLocalDate('2026-10-05');
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(9); // Outubro (0-indexed)
    expect(date?.getDate()).toBe(5);
  });

  it('isDateToday deve retornar true para hoje e false para outras datas', () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    expect(isDateToday(todayStr)).toBe(true);
    expect(isDateToday('2020-01-01')).toBe(false);
    expect(isDateToday(null)).toBe(false);
  });

  it('isDateOverdue deve identificar pedidos em atraso apenas se não estiverem prontos', () => {
    expect(isDateOverdue('2020-01-01', false)).toBe(true);
    expect(isDateOverdue('2020-01-01', true)).toBe(false); // Pronto não está atrasado
    expect(isDateOverdue('2099-01-01', false)).toBe(false);
    expect(isDateOverdue(null, false)).toBe(false);
  });

  it('getDaysDifference deve calcular dias positivos para o futuro e negativos para o passado', () => {
    const diffPast = getDaysDifference('2020-01-01');
    expect(diffPast).toBeDefined();
    expect(diffPast!).toBeLessThan(0);

    const diffFuture = getDaysDifference('2099-01-01');
    expect(diffFuture).toBeDefined();
    expect(diffFuture!).toBeGreaterThan(0);
  });

  it('calculateDashboardStats deve calcular métricas corretamente a partir de uma lista de pedidos', () => {
    const mockOrders: Partial<OrderWithItems>[] = [
      {
        id: '1',
        numero: 101,
        pronto: false,
        prioridade: 'ALTA',
        data_entrega: '2020-01-01',
        forma_envio: 'Sedex',
      },
      {
        id: '2',
        numero: 102,
        pronto: true,
        prioridade: 'NORMAL',
        data_entrega: '2099-01-01',
        forma_envio: 'Sedex',
      },
      {
        id: '3',
        numero: 103,
        pronto: false,
        prioridade: 'NORMAL',
        data_entrega: '2099-01-01',
        forma_envio: 'Retirada',
      },
    ];

    const stats = calculateDashboardStats(mockOrders as OrderWithItems[]);
    expect(stats.totalOrders).toBe(3);
    expect(stats.pendingOrders).toBe(2);
    expect(stats.completedOrders).toBe(1);
    expect(stats.urgentOrders).toBe(1);
    expect(stats.waitingShipmentOrders).toBe(1);
    expect(stats.shippingMethods.length).toBe(2);
    expect(stats.shippingMethods[0].name).toBe('Sedex');
    expect(stats.shippingMethods[0].count).toBe(2);
  });

  it('calculateProductionEfficiency e calculateProductionStageCounts devem mapear etapas', () => {
    const mockOrders: Partial<OrderWithItems>[] = [
      { id: '1', financeiro: true, conferencia: false, pronto: false },
      { id: '2', financeiro: true, conferencia: true, sublimacao: false, pronto: false },
      { id: '3', pronto: true },
    ];

    const counts = calculateProductionStageCounts(mockOrders as OrderWithItems[]);
    expect(counts.financeiro).toBe(1);
    expect(counts.conferencia).toBe(1);
    expect(counts.pronto).toBe(1);

    const efficiency = calculateProductionEfficiency(mockOrders as OrderWithItems[]);
    expect(efficiency.financeiro).toBe(67); // 2 de 3 = 67%
  });
});
