import { describe, it, expect, vi } from 'vitest';
import {
  calculateSmartLinearMeters,
  getConsumo,
  parseDecimalVal,
  calculateItemAreaM2,
  getItemQuantidade,
  getItemAcabamentos,
  exportMaterialFichasCSV
} from '@/utils/materialAnalysisUtils';
import { FichaItemDetail, MaterialConfigMap } from '@/types/materialAnalysis';

describe('materialAnalysisUtils', () => {
  describe('calculateSmartLinearMeters', () => {
    it('calcula encaixe real quando cabe em qualquer orientação escolhendo a menor metragem', () => {
      // Largura 1.0, Altura 0.5 em rolo 1.5 -> menor lado é 0.5, avanço é 0.5
      const res = calculateSmartLinearMeters(1.0, 0.5, 2, 1.0, 1.5, 'encaixe');
      expect(res).toBe(1.0); // 0.5 * 2 = 1.0
    });

    it('calcula avanço pela altura quando apenas largura cabe no rolo', () => {
      // Largura 1.2 <= 1.5, mas Altura 2.0 > 1.5
      const res = calculateSmartLinearMeters(1.2, 2.0, 1, 2.4, 1.5, 'encaixe');
      expect(res).toBe(2.0);
    });

    it('gira peça em 90 graus quando apenas altura cabe no rolo', () => {
      // Largura 2.0 > 1.5, Altura 1.2 <= 1.5 -> rotaciona para consumir 2.0m lineares
      const res = calculateSmartLinearMeters(2.0, 1.2, 1, 2.4, 1.5, 'encaixe');
      expect(res).toBe(2.0);
    });

    it('calcula passadas com emenda quando ambos são maiores que o rolo', () => {
      // 3.0m x 2.0m em rolo 1.5m -> menor lado 2.0 / 1.5 = ceil(1.33) = 2 passadas de 3.0m = 6.0m
      const res = calculateSmartLinearMeters(3.0, 2.0, 1, 6.0, 1.5, 'encaixe');
      expect(res).toBe(6.0);
    });

    it('modo area divide a area total pela largura do rolo', () => {
      const res = calculateSmartLinearMeters(2.0, 2.0, 1, 3.0, 1.5, 'area');
      expect(res).toBe(2.0); // 3.0 / 1.5 = 2.0
    });
  });

  describe('getConsumo', () => {
    const configs: MaterialConfigMap = {
      TACTEL: { medida: 'linear', larguraRolo: 1.5 },
      ADESIVO: { medida: 'm2', larguraRolo: 1.2 },
      BASE_MDF: { medida: 'unidade', larguraRolo: 1.0 }
    };

    it('retorna metros lineares formatados para material com medida linear', () => {
      const res = getConsumo('TACTEL', 3.0, 2, configs);
      expect(res.label).toBe('m linear');
      expect(res.value).toBe(2.0);
    });

    it('retorna unidades formatadas para material com medida unidade', () => {
      const res = getConsumo('BASE_MDF', 5.0, 10, configs);
      expect(res.label).toBe('unidades');
      expect(res.value).toBe(10);
    });

    it('retorna m² por padrão quando configurado m² ou não especificado', () => {
      const res = getConsumo('ADESIVO', 4.5, 3, configs);
      expect(res.label).toBe('m²');
      expect(res.value).toBe(4.5);
    });
  });

  describe('parseDecimalVal', () => {
    it('lida com números com vírgula e ponto', () => {
      expect(parseDecimalVal('1.250,50')).toBe(1250.5);
      expect(parseDecimalVal('2,5')).toBe(2.5);
      expect(parseDecimalVal('3.5')).toBe(3.5);
      expect(parseDecimalVal(42)).toBe(42);
      expect(parseDecimalVal(null)).toBe(0);
      expect(parseDecimalVal(undefined)).toBe(0);
      expect(parseDecimalVal('')).toBe(0);
    });
  });

  describe('exportMaterialFichasCSV', () => {
    it('gera download de CSV com headers e linhas', () => {
      const fakeFichas: FichaItemDetail[] = [
        {
          id: '001-0',
          pedidoNumero: '001000',
          cliente: 'Cliente Teste',
          dataEntrada: '2026-10-10',
          tipoProducao: 'PAINEL',
          material: 'TACTEL',
          materialRaw: 'tactel',
          descricao: 'Painel Redondo',
          largura: '1.5',
          altura: '1.5',
          larguraNum: 1.5,
          alturaNum: 1.5,
          quantidade: 1,
          areaItemM2: 2.25,
          areaTotalM2: 2.25,
          acabamentos: ['Overloque', 'Elástico'],
          isAlerta: false,
          alertaMotivo: ''
        }
      ];

      // Mock DOM methods
      const createObjectURLMock = vi.fn().mockReturnValue('blob:test');
      const revokeObjectURLMock = vi.fn();
      global.URL.createObjectURL = createObjectURLMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;

      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      exportMaterialFichasCSV(
        fakeFichas,
        () => ({ effectiveLinear: 1.5, isOverridden: false }),
        'encaixe',
        'teste'
      );

      expect(createObjectURLMock).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });
  });
});
