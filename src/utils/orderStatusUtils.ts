import { OrderWithItems, UpdateOrderStatusRequest, OrderStatus } from '../types';

export const buildStatusUpdatePayload = (
    order: OrderWithItems,
    campo: string,
    novoValor: boolean
): UpdateOrderStatusRequest => {
    // CRÍTICO: Não incluir campo financeiro no payload quando não está sendo alterado
    // O campo financeiro só deve ser incluído quando está sendo explicitamente alterado

    // Usar valor atual do pedido para cálculos internos
    const financeiroAtual = order.financeiro === true;

    // Construir payload - NÃO incluir financeiro se não está sendo alterado
    const payload: UpdateOrderStatusRequest = {
        id: order.id,
        conferencia: campo === 'conferencia' ? novoValor : order.conferencia === true,
        sublimacao: campo === 'sublimacao' ? novoValor : order.sublimacao === true,
        costura: campo === 'costura' ? novoValor : order.costura === true,
        expedicao: campo === 'expedicao' ? novoValor : order.expedicao === true,
    };

    // Incluir financeiro APENAS se está sendo explicitamente alterado
    if (campo === 'financeiro') {
        payload.financeiro = novoValor;
        (payload as any)._isFinanceiroUpdate = true;
    } else {
        // NÃO incluir financeiro no payload quando não está sendo alterado
        (payload as any)._isFinanceiroUpdate = false;
    }

    // Manter valores existentes de máquina e data de impressão quando não está alterando sublimação
    const existingMachine = order.sublimacao_maquina ?? null;
    const existingDate = order.sublimacao_data_impressao ?? null;

    if (campo === 'sublimacao') {
        if (!novoValor) {
            payload.sublimacao_maquina = null;
            payload.sublimacao_data_impressao = null;
        } else {
            payload.sublimacao_maquina = existingMachine;
            payload.sublimacao_data_impressao = existingDate;
        }
    } else {
        payload.sublimacao_maquina = existingMachine;
        payload.sublimacao_data_impressao = existingDate;
    }

    // Para cálculo de "pronto", usar valor atual do pedido se financeiro não está sendo alterado
    const financeiroParaCalculo = campo === 'financeiro' ? novoValor : financeiroAtual;
    const allComplete =
        financeiroParaCalculo &&
        payload.conferencia &&
        payload.sublimacao &&
        payload.costura &&
        payload.expedicao;

    payload.pronto = allComplete;
    if (allComplete) {
        payload.status = OrderStatus.Concluido;
    } else {
        payload.status =
            order.status === OrderStatus.Concluido ? OrderStatus.EmProcessamento : order.status;
    }

    // Se financeiro está sendo desmarcado, resetar todos os outros status
    if (campo === 'financeiro' && !novoValor) {
        payload.conferencia = false;
        payload.sublimacao = false;
        payload.costura = false;
        payload.expedicao = false;
        payload.sublimacao_maquina = null;
        payload.sublimacao_data_impressao = null;
        payload.pronto = false;
        if (payload.status === OrderStatus.Concluido) {
            payload.status = OrderStatus.EmProcessamento;
        }
    }

    return payload;
};
