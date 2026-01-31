import {
    ApiPedidoItem,
    ApiAcabamento,
    ApiPedido,
    OrderStatus,
    OrderWithItems,
    OrderItem,
    OrderFicha,
    MaterialApi,
    MaterialEntity,
    MaterialPayload,
    DesignerApi,
    DesignerEntity,
    DesignerPayload,
    VendedorApi,
    VendedorEntity,
    VendedorPayload,
    FormaEnvioApi,
    FormaEnvioEntity,
    FormaEnvioPayload,
    FormaPagamentoApi,
    FormaPagamentoEntity,
    FormaPagamentoPayload,
    UserApi,
    UserEntity,
    UserCreatePayload,
    UserUpdatePayload,
    TipoProducaoApi,
    TipoProducaoEntity,
    TipoProducaoPayload,
    ApiOrderStatus,
    CreateOrderRequest,
    CreateOrderItemRequest,
    UpdateOrderRequest,
    UpdateOrderMetadataRequest,
    UpdateOrderStatusRequest,
} from '../types';
import {
    deriveQuantity,
    deriveUnitPrice,
    parseDecimal,
    safeString,
    normalizeApiMoney,
    normalizeNullableString,
    sanitizePayload,
    normalizePriority,
    parseNumericId,
    toCurrencyString,
    inferTipoProducao,
    buildAcabamento,
} from '../utils';
import { canonicalizeFromItemRequest } from '../../mappers/productionItems';

const APP_STATUS_TO_API: Record<OrderStatus, ApiOrderStatus> = {
    [OrderStatus.Pendente]: 'pendente',
    [OrderStatus.EmProcessamento]: 'em_producao',
    [OrderStatus.Concluido]: 'pronto',
    [OrderStatus.Cancelado]: 'cancelado',
};

const API_STATUS_TO_APP: Record<ApiOrderStatus, OrderStatus> = {
    pendente: OrderStatus.Pendente,
    em_producao: OrderStatus.EmProcessamento,
    pronto: OrderStatus.Concluido,
    entregue: OrderStatus.Concluido,
    cancelado: OrderStatus.Cancelado,
};

export const mapStatusFromApi = (status: ApiOrderStatus): OrderStatus => {
    return API_STATUS_TO_APP[status] ?? OrderStatus.Pendente;
};

export const mapStatusToApi = (status: OrderStatus): ApiOrderStatus => {
    return APP_STATUS_TO_API[status] ?? 'pendente';
};

export const mapItemFromApi = (item: ApiPedidoItem, orderId: number, index: number): OrderItem => {
    const anyItem = item as unknown as Record<string, unknown>;
    const acabamentoAny = (item.acabamento ?? (anyItem.acabamento as ApiAcabamento | null | undefined)) ?? null;
    const quantity = deriveQuantity(item);
    const unitPrice =
        item.valor_unitario != null || item.valor_totem != null || item.valor_lona != null || item.valor_adesivo != null || item.valor_painel != null || item.valor_canga != null || item.valor_impressao_3d != null
            ? parseDecimal(item.valor_unitario ?? item.valor_totem ?? item.valor_lona ?? item.valor_adesivo ?? item.valor_painel ?? item.valor_canga ?? item.valor_impressao_3d)
            : deriveUnitPrice(item);
    const subtotal = Number((unitPrice * quantity).toFixed(2));
    const fallbackId = item.id ?? orderId * 1000 + index;
    const imagemCandidate =
        (typeof item.imagem === 'string' && item.imagem.trim().length > 0 ? item.imagem : null) ??
        (typeof anyItem.imagem_path === 'string' && anyItem.imagem_path.trim().length > 0 ? anyItem.imagem_path : null) ??
        (typeof anyItem.image_reference === 'string' && anyItem.image_reference.trim().length > 0 ? anyItem.image_reference : null) ??
        (typeof anyItem.server_reference === 'string' && anyItem.server_reference.trim().length > 0 ? anyItem.server_reference : null) ??
        null;
    const machineIdCandidate =
        item.machine_id ??
        (typeof anyItem.maquina_id === 'number' ? anyItem.maquina_id : undefined) ??
        (typeof anyItem.machineId === 'number' ? anyItem.machineId : undefined) ??
        (typeof anyItem.maquina === 'object' && anyItem.maquina !== null
            ? (anyItem.maquina as Record<string, unknown>).id ?? (anyItem.maquina as Record<string, unknown>).machine_id
            : undefined) ??
        null;
    const ripMaquinaCandidate =
        item.rip_maquina ??
        (typeof anyItem.rip_maquina === 'string' ? anyItem.rip_maquina : undefined) ??
        (typeof anyItem.maquina === 'string' ? anyItem.maquina : undefined) ??
        (typeof anyItem.machine_name === 'string' ? anyItem.machine_name : undefined) ??
        (typeof anyItem.maquina_nome === 'string' ? anyItem.maquina_nome : undefined) ??
        (typeof anyItem.maquina === 'object' && anyItem.maquina !== null
            ? (anyItem.maquina as Record<string, unknown>).nome ?? (anyItem.maquina as Record<string, unknown>).name
            : undefined) ??
        null;
    const dataImpressaoCandidate =
        item.data_impressao ??
        (typeof anyItem.data_impressao === 'string' ? anyItem.data_impressao : undefined) ??
        (typeof anyItem.dataImpressao === 'string' ? anyItem.dataImpressao : undefined) ??
        null;
    const perfilCorCandidate =
        item.perfil_cor ??
        (typeof anyItem.perfil_cor === 'string' ? anyItem.perfil_cor : undefined) ??
        (typeof anyItem.perfilCor === 'string' ? anyItem.perfilCor : undefined) ??
        null;
    const tecidoFornecedorCandidate =
        item.tecido_fornecedor ??
        (typeof anyItem.tecido_fornecedor === 'string' ? anyItem.tecido_fornecedor : undefined) ??
        (typeof anyItem.tecidoFornecedor === 'string' ? anyItem.tecidoFornecedor : undefined) ??
        null;

    return {
        id: fallbackId,
        order_id: orderId,
        item_name: safeString(item.descricao ?? item.tipo_producao ?? 'Item'),
        quantity,
        unit_price: unitPrice,
        subtotal,
        tipo_producao: item.tipo_producao,
        descricao: item.descricao,
        largura: item.largura ?? undefined,
        altura: item.altura ?? undefined,
        metro_quadrado: item.metro_quadrado ?? undefined,
        vendedor: item.vendedor || '',
        designer: item.designer ?? undefined,
        tecido: item.tecido ?? undefined,
        overloque: Boolean(acabamentoAny?.overloque ?? anyItem.overloque),
        elastico: Boolean(acabamentoAny?.elastico ?? anyItem.elastico),
        tipo_acabamento: item.tipo_acabamento ?? undefined,
        quantidade_ilhos: item.quantidade_ilhos ?? item.ilhos_qtd ?? undefined,
        espaco_ilhos: item.espaco_ilhos ?? item.ilhos_distancia ?? undefined,
        valor_ilhos: item.valor_ilhos ?? item.ilhos_valor_unitario ?? undefined,
        quantidade_cordinha: item.quantidade_cordinha ?? undefined,
        espaco_cordinha: item.espaco_cordinha ?? undefined,
        valor_cordinha: item.valor_cordinha ?? undefined,
        observacao: item.observacao ?? undefined,
        imagem: imagemCandidate ?? undefined,
        legenda_imagem: item.legenda_imagem ?? undefined,
        quantidade_paineis: item.quantidade_paineis ?? undefined,
        valor_painel: normalizeApiMoney(item.valor_painel) ?? undefined,
        valores_adicionais: normalizeApiMoney(item.valores_adicionais) ?? undefined,
        valor_unitario: normalizeApiMoney(item.valor_unitario) ?? undefined,
        emenda: item.emenda ?? undefined,
        emenda_qtd: item.emenda_qtd ?? undefined,
        terceirizado: Boolean(item.terceirizado),
        acabamento_lona: item.acabamento_lona ?? undefined,
        quantidade_lona: item.quantidade_lona ?? undefined,
        valor_lona: normalizeApiMoney(item.valor_lona) ?? undefined,
        outros_valores_lona: normalizeApiMoney(item.outros_valores_lona) ?? undefined,
        tipo_adesivo: item.tipo_adesivo ?? undefined,
        quantidade_adesivo: item.quantidade_adesivo ?? undefined,
        valor_adesivo: normalizeApiMoney(item.valor_adesivo) ?? undefined,
        outros_valores_adesivo: normalizeApiMoney(item.outros_valores_adesivo) ?? undefined,
        ziper: Boolean(item.ziper),
        cordinha_extra: Boolean(item.cordinha_extra),
        alcinha: Boolean(item.alcinha),
        toalha_pronta: Boolean(item.toalha_pronta),
        acabamento_totem: item.acabamento_totem ?? undefined,
        acabamento_totem_outro: item.acabamento_totem_outro ?? undefined,
        quantidade_totem: item.quantidade_totem ?? undefined,
        valor_totem: normalizeApiMoney(item.valor_totem) ?? undefined,
        outros_valores_totem: normalizeApiMoney(item.outros_valores_totem) ?? undefined,
        composicao_tecidos: item.composicao_tecidos ?? undefined,
        machine_id: machineIdCandidate as number | null,
        rip_maquina: ripMaquinaCandidate as string | null,
        data_impressao: dataImpressaoCandidate,
        perfil_cor: perfilCorCandidate,
        tecido_fornecedor: tecidoFornecedorCandidate,
    };
};

export const mapPedidoFromApi = (pedido: ApiPedido): OrderWithItems => {
    const items = (pedido.items ?? []).map((item, index) => mapItemFromApi(item, pedido.id, index));
    const valorFrete = parseDecimal(pedido.valor_frete);
    const valorItens = parseDecimal(pedido.valor_itens ?? pedido.valor_total);
    const totalValue = valorItens || items.reduce((sum, item) => sum + item.subtotal, 0);
    const status = mapStatusFromApi(pedido.status);
    const prontoFromApi = (pedido as unknown as { pronto?: unknown }).pronto;

    return {
        id: pedido.id,
        numero: pedido.numero ?? undefined,
        customer_name: pedido.cliente ?? '',
        cliente: pedido.cliente ?? '',
        address: pedido.cidade_cliente ?? '',
        cidade_cliente: pedido.cidade_cliente ?? undefined,
        estado_cliente: pedido.estado_cliente ?? undefined,
        telefone_cliente: pedido.telefone_cliente ?? undefined,
        data_entrada: pedido.data_entrada ?? undefined,
        data_entrega: pedido.data_entrega ?? undefined,
        total_value: totalValue,
        valor_total: totalValue,
        valor_frete: valorFrete,
        created_at: pedido.data_criacao ?? undefined,
        updated_at: pedido.ultima_atualizacao ?? undefined,
        status,
        prioridade: pedido.prioridade ?? undefined,
        forma_envio: pedido.forma_envio ?? undefined,
        forma_pagamento_id: parseNumericId(pedido.tipo_pagamento ?? undefined) ?? undefined,
        observacao: pedido.observacao ?? undefined,
        financeiro: Boolean(pedido.financeiro),
        conferencia: Boolean(pedido.conferencia),
        sublimacao: Boolean(pedido.sublimacao),
        costura: Boolean(pedido.costura),
        expedicao: Boolean(pedido.expedicao),
        pronto: typeof prontoFromApi === 'boolean' ? prontoFromApi : status === OrderStatus.Concluido,
        sublimacao_maquina: pedido.sublimacao_maquina ?? undefined,
        sublimacao_data_impressao: pedido.sublimacao_data_impressao ?? undefined,
        items,
    };
};

export const mapOrderToFicha = (order: OrderWithItems): OrderFicha => ({
    id: order.id,
    numero: order.numero,
    cliente: order.cliente,
    telefone_cliente: order.telefone_cliente,
    cidade_cliente: order.cidade_cliente,
    estado_cliente: order.estado_cliente,
    data_entrada: order.data_entrada,
    data_entrega: order.data_entrega,
    forma_envio: order.forma_envio,
    forma_pagamento_id: order.forma_pagamento_id ?? undefined,
    valor_frete:
        typeof order.valor_frete === 'string'
            ? parseDecimal(order.valor_frete)
            : order.valor_frete ?? 0,
    total_value:
        typeof order.total_value === 'string'
            ? parseDecimal(order.total_value)
            : order.total_value ?? 0,
    observacao: order.observacao,
    items: order.items.map((item) => ({ ...item })),
});

export const mapMaterialFromApi = (material: MaterialApi): MaterialEntity => ({
    id: material.id,
    nome: material.nome,
    tipo: material.tipo,
    valor_metro: Number(material.valor_metro ?? 0),
    estoque_metros: Number(material.estoque_metros ?? 0),
    ativo: Boolean(material.ativo),
    observacao: material.observacao ?? undefined,
});

export const buildMaterialCreatePayload = (payload: MaterialPayload): MaterialPayload => ({
    nome: payload.nome,
    tipo: payload.tipo,
    valor_metro: Number(payload.valor_metro ?? 0),
    estoque_metros: Number(payload.estoque_metros ?? 0),
    ativo: payload.ativo ?? true,
    observacao: normalizeNullableString(payload.observacao),
});

export const buildMaterialUpdatePayload = (payload: Partial<MaterialPayload>): Record<string, any> => {
    const update: Record<string, any> = {};
    if (payload.nome !== undefined) {
        update.nome = payload.nome;
    }
    if (payload.tipo !== undefined) {
        update.tipo = payload.tipo;
    }
    if (payload.valor_metro !== undefined) {
        update.valor_metro = Number(payload.valor_metro ?? 0);
    }
    if (payload.estoque_metros !== undefined) {
        update.estoque_metros = Number(payload.estoque_metros ?? 0);
    }
    if (payload.ativo !== undefined) {
        update.ativo = Boolean(payload.ativo);
    }
    if (payload.observacao !== undefined) {
        update.observacao = normalizeNullableString(payload.observacao);
    }
    return sanitizePayload(update);
};

export const mapDesignerFromApi = (designer: DesignerApi): DesignerEntity => ({
    id: designer.id,
    nome: designer.nome,
    email: designer.email ?? undefined,
    telefone: designer.telefone ?? undefined,
    ativo: Boolean(designer.ativo),
    observacao: designer.observacao ?? undefined,
});

export const buildDesignerCreatePayload = (payload: DesignerPayload): DesignerPayload => ({
    nome: payload.nome,
    email: normalizeNullableString(payload.email),
    telefone: normalizeNullableString(payload.telefone),
    ativo: payload.ativo ?? true,
    observacao: normalizeNullableString(payload.observacao),
});

export const buildDesignerUpdatePayload = (payload: Partial<DesignerPayload>): Record<string, any> => {
    const update: Record<string, any> = {};
    if (payload.nome !== undefined) update.nome = payload.nome;
    if (payload.email !== undefined) update.email = normalizeNullableString(payload.email);
    if (payload.telefone !== undefined) update.telefone = normalizeNullableString(payload.telefone);
    if (payload.ativo !== undefined) update.ativo = Boolean(payload.ativo);
    if (payload.observacao !== undefined) update.observacao = normalizeNullableString(payload.observacao);
    return sanitizePayload(update);
};

export const mapVendedorFromApi = (vendedor: VendedorApi): VendedorEntity => ({
    id: vendedor.id,
    nome: vendedor.nome,
    email: vendedor.email ?? undefined,
    telefone: vendedor.telefone ?? undefined,
    comissao_percentual: Number(vendedor.comissao_percentual ?? 0),
    ativo: Boolean(vendedor.ativo),
    observacao: vendedor.observacao ?? undefined,
});

export const buildVendedorCreatePayload = (payload: VendedorPayload): VendedorPayload => ({
    nome: payload.nome,
    email: normalizeNullableString(payload.email),
    telefone: normalizeNullableString(payload.telefone),
    comissao_percentual: Number(payload.comissao_percentual ?? 0),
    ativo: payload.ativo ?? true,
    observacao: normalizeNullableString(payload.observacao),
});

export const buildVendedorUpdatePayload = (payload: Partial<VendedorPayload>): Record<string, any> => {
    const update: Record<string, any> = {};
    if (payload.nome !== undefined) update.nome = payload.nome;
    if (payload.email !== undefined) update.email = normalizeNullableString(payload.email);
    if (payload.telefone !== undefined) update.telefone = normalizeNullableString(payload.telefone);
    if (payload.comissao_percentual !== undefined) {
        update.comissao_percentual = Number(payload.comissao_percentual ?? 0);
    }
    if (payload.ativo !== undefined) update.ativo = Boolean(payload.ativo);
    if (payload.observacao !== undefined) update.observacao = normalizeNullableString(payload.observacao);
    return sanitizePayload(update);
};

export const mapFormaEnvioFromApi = (forma: FormaEnvioApi): FormaEnvioEntity => ({
    id: forma.id,
    nome: forma.nome,
    valor: Number(forma.valor ?? 0),
    prazo_dias: Number(forma.prazo_dias ?? 0),
    ativo: Boolean(forma.ativo),
    observacao: forma.observacao ?? undefined,
});

export const buildFormaEnvioCreatePayload = (payload: FormaEnvioPayload): FormaEnvioPayload => ({
    nome: payload.nome,
    valor: payload.valor ?? 0,
    prazo_dias: Number(payload.prazo_dias ?? 0),
    ativo: payload.ativo ?? true,
    observacao: normalizeNullableString(payload.observacao),
});

export const buildFormaEnvioUpdatePayload = (payload: Partial<FormaEnvioPayload>): Record<string, any> => {
    const update: Record<string, any> = {};
    if (payload.nome !== undefined) update.nome = payload.nome;
    if (payload.valor !== undefined) update.valor = payload.valor ?? 0;
    if (payload.prazo_dias !== undefined) update.prazo_dias = Number(payload.prazo_dias ?? 0);
    if (payload.ativo !== undefined) update.ativo = Boolean(payload.ativo);
    if (payload.observacao !== undefined) update.observacao = normalizeNullableString(payload.observacao);
    return sanitizePayload(update);
};

export const mapFormaPagamentoFromApi = (forma: FormaPagamentoApi): FormaPagamentoEntity => ({
    id: forma.id,
    nome: forma.nome,
    parcelas_max: Number(forma.parcelas_max ?? 1),
    taxa_percentual: Number(forma.taxa_percentual ?? 0),
    ativo: Boolean(forma.ativo),
    observacao: forma.observacao ?? undefined,
});

export const buildFormaPagamentoCreatePayload = (payload: FormaPagamentoPayload): FormaPagamentoPayload => ({
    nome: payload.nome,
    parcelas_max: Number(payload.parcelas_max ?? 1),
    taxa_percentual: Number(payload.taxa_percentual ?? 0),
    ativo: payload.ativo ?? true,
    observacao: normalizeNullableString(payload.observacao),
});

export const buildFormaPagamentoUpdatePayload = (payload: Partial<FormaPagamentoPayload>): Record<string, any> => {
    const update: Record<string, any> = {};
    if (payload.nome !== undefined) update.nome = payload.nome;
    if (payload.parcelas_max !== undefined) update.parcelas_max = Number(payload.parcelas_max ?? 1);
    if (payload.taxa_percentual !== undefined) update.taxa_percentual = Number(payload.taxa_percentual ?? 0);
    if (payload.ativo !== undefined) update.ativo = Boolean(payload.ativo);
    if (payload.observacao !== undefined) update.observacao = normalizeNullableString(payload.observacao);
    return sanitizePayload(update);
};

export const mapUserFromApi = (user: UserApi): UserEntity => ({
    id: user.id,
    username: user.username,
    is_admin: Boolean(user.is_admin),
    is_active: Boolean(user.is_active),
    created_at: user.created_at ?? undefined,
});

export const buildUserCreatePayload = (payload: UserCreatePayload): Record<string, any> =>
    sanitizePayload({
        username: payload.username,
        password: payload.password,
        is_admin: payload.is_admin ?? false,
        is_active: payload.is_active ?? true,
    });

export const buildUserUpdatePayload = (payload: UserUpdatePayload): Record<string, any> => {
    const update: Record<string, any> = {};
    if (payload.username !== undefined) update.username = payload.username;
    if (payload.password) update.password = payload.password;
    if (payload.is_admin !== undefined) update.is_admin = payload.is_admin;
    if (payload.is_active !== undefined) update.is_active = payload.is_active;
    return sanitizePayload(update);
};

export const mapTipoProducaoFromApi = (tipo: TipoProducaoApi): TipoProducaoEntity => ({
    id: tipo.id,
    name: tipo.name,
    description: tipo.description ?? undefined,
    active: Boolean(tipo.active),
    created_at: tipo.created_at ?? undefined,
});

export const buildTipoProducaoCreatePayload = (payload: TipoProducaoPayload): TipoProducaoPayload => ({
    name: payload.name,
    description: normalizeNullableString(payload.description),
    active: payload.active ?? true,
});

export const buildTipoProducaoUpdatePayload = (payload: Partial<TipoProducaoPayload>): Record<string, any> => {
    const update: Record<string, any> = {};
    if (payload.name !== undefined) update.name = payload.name;
    if (payload.description !== undefined) update.description = normalizeNullableString(payload.description);
    if (payload.active !== undefined) update.active = Boolean(payload.active);
    return sanitizePayload(update);
};

export const buildItemPayloadFromRequest = (item: any): Record<string, any> => {
    const tipo = inferTipoProducao(item);
    const canon = canonicalizeFromItemRequest(item as CreateOrderItemRequest);

    const payload: Record<string, any> = {
        tipo_producao: tipo,
        descricao: safeString(canon.descricao ?? 'Item'),
        largura: canon.largura ?? '',
        altura: canon.altura ?? '',
        metro_quadrado: canon.metro_quadrado ?? '',
        vendedor: canon.vendedor ?? '',
        designer: canon.designer ?? '',
        tecido: canon.tecido ?? '',
        acabamento: buildAcabamento(canon),
        emenda: canon.emenda ?? 'sem-emenda',
        emenda_qtd: canon.emenda_qtd ?? undefined,
        observacao: canon.observacao ?? '',
        valor_unitario: toCurrencyString(
            (canon.tipo_producao === 'totem' ? canon.valor_unitario : undefined) ??
            item?.valor_unitario ??
            item?.unit_price ??
            0
        ),
        imagem: canon.imagem ?? null,
        legenda_imagem: normalizeNullableString(canon.legenda_imagem ?? undefined),
        terceirizado: canon.terceirizado ?? false,
        ziper: item?.ziper ?? false,
        cordinha_extra: item?.cordinha_extra ?? false,
        alcinha: item?.alcinha ?? false,
        toalha_pronta: item?.toalha_pronta ?? false,
        quantidade_cordinha: item?.quantidade_cordinha ?? undefined,
        valor_cordinha: item?.valor_cordinha ?? undefined,
        espaco_cordinha: item?.espaco_cordinha ?? undefined,
        quantidade_ilhos: item?.quantidade_ilhos ?? item?.ilhos_qtd ?? undefined,
        valor_ilhos: item?.valor_ilhos ?? item?.ilhos_valor_unitario ?? undefined,
        espaco_ilhos: item?.espaco_ilhos ?? item?.ilhos_distancia ?? undefined,
        composicao_tecidos: item?.composicao_tecidos ?? undefined,
        rip_maquina: item?.rip_maquina ?? null,
        data_impressao: item?.data_impressao ?? null,
        perfil_cor: item?.perfil_cor ?? null,
        tecido_fornecedor: item?.tecido_fornecedor ?? null,
        machine_id: item?.machine_id ?? null,
    };

    if ((tipo === 'painel' || tipo === 'generica' || tipo === 'mesa_babado') &&
        (canon.tipo_producao === 'painel' || canon.tipo_producao === 'generica' || canon.tipo_producao === 'mesa_babado')) {
        payload.tipo_acabamento = canon.tipo_acabamento ?? 'nenhum';
        payload.quantidade_paineis = canon.quantidade_paineis ?? (item?.quantity ? String(item.quantity) : undefined);
        payload.valor_painel = canon.valor_painel ? toCurrencyString(canon.valor_painel) : undefined;
        payload.valores_adicionais = canon.valores_adicionais ? toCurrencyString(canon.valores_adicionais) : undefined;
    } else if (tipo === 'totem' && canon.tipo_producao === 'totem') {
        payload.quantidade_totem = canon.quantidade_totem ?? undefined;
        payload.valor_totem = canon.valor_totem ? toCurrencyString(canon.valor_totem) : undefined;
        payload.outros_valores_totem = canon.outros_valores_totem ?? undefined;
        payload.acabamento_totem = canon.acabamento_totem ?? undefined;
        payload.acabamento_totem_outro = canon.acabamento_totem_outro ?? undefined;
    } else if (tipo === 'lona' && canon.tipo_producao === 'lona') {
        payload.tipo_acabamento = canon.tipo_acabamento ?? 'nenhum';
        payload.acabamento_lona = canon.acabamento_lona ?? undefined;
        payload.quantidade_lona = canon.quantidade_lona ?? undefined;
        payload.valor_lona = canon.valor_lona ? toCurrencyString(canon.valor_lona) : undefined;
        payload.outros_valores_lona = canon.outros_valores_lona ? toCurrencyString(canon.outros_valores_lona) : undefined;
        payload.quantidade_ilhos = canon.quantidade_ilhos ?? undefined;
        payload.espaco_ilhos = canon.espaco_ilhos ?? undefined;
        payload.valor_ilhos = canon.valor_ilhos ?? undefined;
        payload.quantidade_cordinha = canon.quantidade_cordinha ?? undefined;
        payload.espaco_cordinha = canon.espaco_cordinha ?? undefined;
        payload.valor_cordinha = canon.valor_cordinha ?? undefined;
    } else if (tipo === 'adesivo' && canon.tipo_producao === 'adesivo') {
        payload.tipo_adesivo = canon.tipo_adesivo ?? undefined;
        payload.quantidade_adesivo = canon.quantidade_adesivo ?? undefined;
        payload.valor_adesivo = canon.valor_adesivo ? toCurrencyString(canon.valor_adesivo) : undefined;
        payload.outros_valores_adesivo = canon.outros_valores_adesivo
            ? toCurrencyString(canon.outros_valores_adesivo)
            : undefined;
    } else if (tipo === 'canga' && canon.tipo_producao === 'canga') {
        payload.baininha = canon.baininha ?? false;
        payload.quantidade_canga = canon.quantidade_canga ?? undefined;
        payload.valor_canga = canon.valor_canga ? toCurrencyString(canon.valor_canga) : undefined;
        payload.valores_adicionais = canon.valores_adicionais ? toCurrencyString(canon.valores_adicionais) : undefined;
    } else if (tipo === 'impressao_3d' && canon.tipo_producao === 'impressao_3d') {
        payload.material_gasto = canon.material_gasto ?? undefined;
        payload.quantidade_impressao_3d = canon.quantidade_impressao_3d ?? undefined;
        payload.valor_impressao_3d = canon.valor_impressao_3d ? toCurrencyString(canon.valor_impressao_3d) : undefined;
        payload.valores_adicionais = canon.valores_adicionais ? toCurrencyString(canon.valores_adicionais) : undefined;
    } else {
        payload.quantidade_paineis = item?.quantidade_paineis ?? (item?.quantity ? String(item.quantity) : undefined);
        payload.valor_painel = item?.valor_painel ? toCurrencyString(item.valor_painel) : undefined;
        payload.valores_adicionais = item?.valores_adicionais ? toCurrencyString(item.valores_adicionais) : undefined;
        payload.quantidade_totem = item?.quantidade_totem ?? undefined;
        payload.quantidade_lona = item?.quantidade_lona ?? undefined;
        payload.quantidade_adesivo = item?.quantidade_adesivo ?? undefined;
        payload.valor_totem = item?.valor_totem ? toCurrencyString(item.valor_totem) : undefined;
        payload.valor_lona = item?.valor_lona ? toCurrencyString(item.valor_lona) : undefined;
        payload.valor_adesivo = item?.valor_adesivo ? toCurrencyString(item.valor_adesivo) : undefined;
        payload.outros_valores_totem = item?.outros_valores_totem ?? undefined;
        payload.outros_valores_lona = item?.outros_valores_lona ?? undefined;
        payload.outros_valores_adesivo = item?.outros_valores_adesivo ?? undefined;
        payload.acabamento_lona = item?.acabamento_lona ?? undefined;
        payload.acabamento_totem = item?.acabamento_totem ?? undefined;
        payload.acabamento_totem_outro = item?.acabamento_totem_outro ?? undefined;
        payload.tipo_adesivo = item?.tipo_adesivo ?? undefined;
    }

    const identifier = item?.orderItemId ?? item?.id;
    if (identifier) {
        payload.id = identifier;
    }

    return sanitizePayload(payload);
};

export const computeTotalsFromItems = (items: any[], frete: number): { valorItens: number; valorTotal: number } => {
    const valorItens = items.reduce((sum, item) => {
        const qty = deriveQuantity(item);
        const unitPrice = deriveUnitPrice(item);
        return sum + qty * unitPrice;
    }, 0);
    const valorTotal = valorItens + frete;
    return { valorItens, valorTotal };
};

export const buildPedidoCreatePayload = (request: CreateOrderRequest): Record<string, any> => {
    const freteNumber = parseDecimal(request.valor_frete ?? 0);
    const { valorItens, valorTotal } = computeTotalsFromItems(request.items ?? [], freteNumber);
    const itemsPayload = (request.items ?? []).map((item) => buildItemPayloadFromRequest(item));

    const payload: Record<string, any> = {
        numero: request.numero ?? undefined,
        cliente: request.cliente ?? request.customer_name ?? '',
        telefone_cliente: request.telefone_cliente ?? '',
        cidade_cliente: request.cidade_cliente ?? '',
        estado_cliente: request.estado_cliente ?? '',
        data_entrada: request.data_entrada ?? new Date().toISOString().split('T')[0],
        data_entrega: request.data_entrega ?? null,
        observacao: request.observacao ?? '',
        prioridade: normalizePriority(request.prioridade ?? null),
        status: mapStatusToApi(request.status),
        valor_frete: toCurrencyString(freteNumber),
        valor_itens: toCurrencyString(valorItens),
        valor_total: toCurrencyString(valorTotal),
        tipo_pagamento: request.forma_pagamento_id ? String(request.forma_pagamento_id) : '',
        forma_envio: request.forma_envio ?? '',
        forma_envio_id: parseNumericId(request.forma_envio) ?? 0,
        items: itemsPayload,
        financeiro: false,
        conferencia: false,
        sublimacao: false,
        costura: false,
        expedicao: false,
    };

    return sanitizePayload(payload);
};

export const buildPedidoUpdatePayload = (request: UpdateOrderRequest): Record<string, any> => {
    const payload: Record<string, any> = {};

    if (request.customer_name || request.cliente) {
        payload.cliente = request.cliente ?? request.customer_name;
    }
    if (request.address) {
        payload.cidade_cliente = request.address;
    }
    if (request.cidade_cliente) {
        payload.cidade_cliente = request.cidade_cliente;
    }
    if (request.estado_cliente) {
        payload.estado_cliente = request.estado_cliente;
    }
    if (request.telefone_cliente) {
        payload.telefone_cliente = request.telefone_cliente;
    }
    if (request.status) {
        payload.status = mapStatusToApi(request.status);
    }
    if (request.prioridade) {
        payload.prioridade = normalizePriority(request.prioridade);
    }
    if (request.forma_envio) {
        payload.forma_envio = request.forma_envio;
        const parsed = parseNumericId(request.forma_envio);
        if (parsed !== null) {
            payload.forma_envio_id = parsed;
        }
    }
    if (request.forma_pagamento_id !== undefined) {
        payload.forma_pagamento_id = request.forma_pagamento_id;
        payload.tipo_pagamento = request.forma_pagamento_id ? String(request.forma_pagamento_id) : '';
    }
    if (request.observacao !== undefined) {
        payload.observacao = request.observacao ?? '';
    }

    if (Array.isArray(request.items)) {
        payload.items = request.items.map((item) => buildItemPayloadFromRequest(item));
    }

    if (request.valor_frete !== undefined) {
        payload.valor_frete = toCurrencyString(request.valor_frete);
    }

    if (Array.isArray(request.items) || request.valor_frete !== undefined) {
        const frete = parseDecimal(payload.valor_frete ?? request.valor_frete ?? 0);
        const { valorItens, valorTotal } = computeTotalsFromItems(request.items ?? [], frete);
        payload.valor_itens = toCurrencyString(valorItens);
        payload.valor_total = toCurrencyString(valorTotal);
    }

    delete payload.financeiro;

    return sanitizePayload(payload);
};

export const buildMetadataPayload = (request: UpdateOrderMetadataRequest): Record<string, any> => {
    const payload: Record<string, any> = {};
    (
        [
            'cliente',
            'cidade_cliente',
            'estado_cliente',
            'telefone_cliente',
            'prioridade',
            'forma_envio',
            'observacao',
        ] as Array<keyof UpdateOrderMetadataRequest>
    ).forEach((key) => {
        if (request[key] !== undefined) {
            payload[key] = request[key];
        }
    });

    if (request.data_entrega !== undefined) {
        payload.data_entrega = request.data_entrega ?? null;
    }
    if (request.forma_pagamento_id !== undefined) {
        payload.forma_pagamento_id = request.forma_pagamento_id;
        payload.tipo_pagamento = request.forma_pagamento_id ? String(request.forma_pagamento_id) : '';
    }
    if (request.valor_frete !== undefined) {
        payload.valor_frete = toCurrencyString(request.valor_frete);
    }

    delete payload.financeiro;

    return sanitizePayload(payload);
};

export const buildStatusPayload = (request: UpdateOrderStatusRequest): Record<string, any> => {
    const payload: Record<string, any> = {
        conferencia: request.conferencia,
        sublimacao: request.sublimacao,
        costura: request.costura,
        expedicao: request.expedicao,
        sublimacao_maquina: request.sublimacao_maquina,
        sublimacao_data_impressao: request.sublimacao_data_impressao,
    };

    const isFinanceiroUpdate = (request as any)._isFinanceiroUpdate === true;
    if (isFinanceiroUpdate && request.financeiro !== undefined) {
        payload.financeiro = request.financeiro;
    }
    delete payload._isFinanceiroUpdate;

    if (request.status) {
        payload.status = mapStatusToApi(request.status);
    }
    if (request.pronto !== undefined) {
        payload.pronto = request.pronto;
    }

    return sanitizePayload(payload);
};
