import { parseMonetary } from './currency';

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export interface ValidationItem extends Record<string, any> {
  tipo_producao: string;
}

// Helpers for specific types
export function isMochilinhaType(tipoProducao?: string): boolean {
  if (!tipoProducao) return false;
  const normalized = tipoProducao.toLowerCase().trim();
  return normalized === 'mochilinha' ||
    normalized === 'bolsinha' ||
    normalized.includes('mochilinha') ||
    normalized.includes('bolsinha');
}

export function isImpressao3DType(tipoProducao?: string): boolean {
  if (!tipoProducao) return false;
  const normalized = tipoProducao
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return normalized === 'impressao_3d' ||
    normalized === 'impressao 3d' ||
    normalized.includes('impressao 3d') ||
    normalized.includes('impressao_3d') ||
    normalized.includes('impressao3d');
}

/**
 * Validação de item separada por regras base e específicas de produção.
 */
export function validateProductionItem(item: ValidationItem): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- REGRAS GLOBAIS COMUNS ---
  if (!item.descricao || item.descricao.trim().length < 3) {
    errors.push("Descrição é obrigatória (mínimo 3 caracteres)");
  }
  if (!item.largura || parseMonetary(item.largura) <= 0) {
    errors.push("Largura é obrigatória e deve ser maior que zero");
  }
  if (!item.altura || parseMonetary(item.altura) <= 0) {
    errors.push("Altura é obrigatória e deve ser maior que zero");
  }
  if (!item.tecido || item.tecido.trim().length === 0) {
    errors.push("Material/Tecido é obrigatório");
  }
  if (!item.designer || item.designer.trim().length === 0) {
    errors.push("Designer é obrigatório");
  }
  if (!item.vendedor || item.vendedor.trim().length === 0) {
    errors.push("Vendedor é obrigatório");
  }
  if (!item.imagem || item.imagem.trim().length === 0) {
    errors.push("Imagem (arquivo da arte) é obrigatória");
  }

  // --- REGRAS ESPECÍFICAS ---
  switch (item.tipo_producao) {
    case 'painel':
    case 'generica': {
      const valorPainel = parseMonetary(item.valor_painel || '0,00');
      const valoresAdicionais = parseMonetary(item.valores_adicionais || '0,00');
      if (valorPainel <= 0 && valoresAdicionais <= 0) {
        errors.push("Valor é obrigatório (preencha pelo menos o valor do painel ou valores adicionais)");
      }
      
      const quantidade = parseInt(item.quantidade_paineis || '0', 10);
      if (Number.isNaN(quantidade) || quantidade <= 0) {
        errors.push("Quantidade de painéis é obrigatória e deve ser maior que zero");
      }

      // Warnings
      if (!item.overloque) warnings.push("Overloque não será aplicado");
      if (!item.elastico) warnings.push("Elástico não será aplicado");
      if (item.emenda === 'sem-emenda') warnings.push("Emenda não será aplicada");
      if (item.tipo_acabamento === 'nenhum') warnings.push("Nenhum acabamento especial será aplicado");
      break;
    }

    case 'totem': {
      const valorTotem = parseMonetary(item.valor_totem || '0,00');
      const outrosTotem = parseMonetary(item.outros_valores_totem || '0,00');
      const valorUnitarioTotem = parseMonetary(item.valor_unitario || '0,00');

      if (valorTotem <= 0 && outrosTotem <= 0) {
        errors.push("Informe o valor do totem ou outros valores adicionais");
      }
      if (valorUnitarioTotem <= 0) {
        errors.push("Valor total por totem deve ser maior que zero");
      }
      if (item.acabamento_totem === 'outro' && (!item.acabamento_totem_outro || item.acabamento_totem_outro.trim().length === 0)) {
        errors.push("Descreva o outro acabamento do totem");
      }

      const quantidadeTotem = parseInt(item.quantidade_totem || '0', 10);
      if (Number.isNaN(quantidadeTotem) || quantidadeTotem <= 0) {
        errors.push("Quantidade de totens é obrigatória e deve ser maior que zero");
      }
      if (!item.acabamento_totem || item.acabamento_totem.trim().length === 0) {
        errors.push("Selecione o acabamento do totem");
      }
      break;
    }

    case 'lona': {
      const valorLona = parseMonetary(item.valor_lona || '0,00');
      const outrosValoresLona = parseMonetary(item.outros_valores_lona || '0,00');
      let valorIlhos = 0;
      if (item.tipo_acabamento === 'ilhos') {
        const qtdIlhos = parseInt(item.quantidade_ilhos || '0', 10);
        const valorUnitIlhos = parseMonetary(item.valor_ilhos || '0,00');
        valorIlhos = qtdIlhos * valorUnitIlhos;
      }
      const valorUnitarioLona = parseMonetary(item.valor_unitario || '0,00');

      if (valorLona <= 0 && outrosValoresLona <= 0 && valorIlhos <= 0) {
        errors.push("Informe o valor da lona ou valores adicionais");
      }
      if (valorUnitarioLona <= 0) {
        errors.push("Valor total por lona deve ser maior que zero");
      }
      if (item.emenda === 'com-emenda') {
        const qtdEmenda = parseInt(item.emendaQtd || '0', 10);
        if (Number.isNaN(qtdEmenda) || qtdEmenda <= 0) {
          errors.push("Informe a quantidade de emendas");
        }
      }

      const quantidadeLona = parseInt(item.quantidade_lona || '0', 10);
      if (Number.isNaN(quantidadeLona) || quantidadeLona <= 0) {
        errors.push("Quantidade de lonas é obrigatória e deve ser maior que zero");
      }
      if (!item.acabamento_lona || item.acabamento_lona.trim().length === 0) {
        errors.push("Selecione o acabamento da lona");
      }

      // Warnings
      if (item.acabamento_lona === 'nao_refilar') {
        warnings.push("Lona será entregue sem refilar");
      }
      break;
    }

    case 'adesivo': {
      const valorUnitario = parseMonetary(item.valor_unitario || '0,00');
      if (valorUnitario <= 0) {
        errors.push("Valor unitário é obrigatório e deve ser maior que zero");
      }
      const quantidadeAdesivo = parseInt(item.quantidade_adesivo || '0', 10);
      if (Number.isNaN(quantidadeAdesivo) || quantidadeAdesivo <= 0) {
        errors.push("Quantidade de adesivos é obrigatória e deve ser maior que zero");
      }
      break;
    }

    case 'canga': {
      const valorUnitario = parseMonetary(item.valor_unitario || '0,00');
      if (valorUnitario <= 0) {
        errors.push("Valor unitário é obrigatório e deve ser maior que zero");
      }
      const quantidadeCanga = parseInt(item.quantidade_canga || '0', 10);
      if (Number.isNaN(quantidadeCanga) || quantidadeCanga <= 0) {
        errors.push("Quantidade de cangas é obrigatória e deve ser maior que zero");
      }
      break;
    }

    default: {
      if (isImpressao3DType(item.tipo_producao)) {
        const valor3D = parseMonetary(item.valor_impressao_3d || '0,00');
        const add3D = parseMonetary(item.valores_adicionais || '0,00');
        const unitVal = parseMonetary(item.valor_unitario || '0,00');

        if (valor3D <= 0 && add3D <= 0 && unitVal <= 0) {
          errors.push("Valor unitário da Impressão 3D é obrigatório");
        }
        
        const quantidadeImpressao3D = parseInt(item.quantidade_impressao_3d || '0', 10);
        if (Number.isNaN(quantidadeImpressao3D) || quantidadeImpressao3D <= 0) {
          errors.push("Quantidade de impressões 3D é obrigatória e deve ser maior que zero");
        }
      } else if (isMochilinhaType(item.tipo_producao)) {
        const valorUnitario = parseMonetary(item.valor_unitario || '0,00');
        if (valorUnitario <= 0) {
          errors.push("Valor unitário é obrigatório e deve ser maior que zero");
        }
        
        const quantidadeMochilinha = parseInt(item.quantidade_mochilinha || '0', 10);
        if (Number.isNaN(quantidadeMochilinha) || quantidadeMochilinha <= 0) {
          errors.push("Quantidade de mochilinhas/bolsinhas é obrigatória e deve ser maior que zero");
        }
      } else {
        // Fallback genérico
        const valorUnitario = parseMonetary(item.valor_unitario || '0,00');
        if (valorUnitario <= 0) {
          errors.push("Valor unitário é obrigatório e deve ser maior que zero");
        }
      }
      break;
    }
  }

  return { errors, warnings };
}
