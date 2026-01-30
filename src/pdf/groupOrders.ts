import { OrderWithItems, OrderItem } from '../types';

export interface ProductionProduct {
    id: number;
    descricao: string;
    dimensoes: string;
    quantity: number;
    material: string;
    observacao_item?: string;
    imagem?: string;
    legenda_imagem?: string;
    tipo_producao: string;
    tecido?: string;
    overloque?: boolean;
    elastico?: boolean;
    tipo_acabamento?: string;
    quantidade_ilhos?: string;
    espaco_ilhos?: string;
    quantidade_cordinha?: string;
    espaco_cordinha?: string;
    ziper?: boolean;
    cordinha_extra?: boolean;
    alcinha?: boolean;
    toalha_pronta?: boolean;
    emenda?: string;
    emenda_qtd?: string;
    metro_quadrado?: string;
    quantidade_paineis?: string;
    terceirizado?: boolean;
    // Novos campos adicionados para cobrir Lona, Totem e Adesivo
    acabamento_lona?: string;
    tipo_adesivo?: string;
    acabamento_totem?: string;
    acabamento_totem_outro?: string;
    composicao_tecidos?: string;
    data_impressao?: string;
    rip_maquina?: string;
    perfil_cor?: string;
    tecido_fornecedor?: string;
}

export interface ProductionOrder {
    id: string | number;
    numero: string;
    cliente: string;
    telefone_cliente?: string;
    cidade_estado?: string;
    data_envio: string;
    prioridade: string;
    forma_envio: string;
    is_reposicao: boolean;
    designer?: string;
    vendedor?: string;
    observacao_pedido?: string;
    data_entrada?: string;
    valor_frete?: string | number;
    valor_total?: string | number;
    status?: string;
    produtos: ProductionProduct[];
    item_index?: number;
    total_items?: number;
}

/**
 * Transforma pedidos e seus itens em uma lista "achatada" (flat), 
 * onde cada item do pedido vira um bloco independente no PDF.
 */
export function groupOrders(orders: OrderWithItems[]): ProductionOrder[] {
    const flattenedOrders: ProductionOrder[] = [];

    orders.forEach((order) => {
        const cityState = order.cidade_cliente
            ? `${order.cidade_cliente}${order.estado_cliente ? '/' + order.estado_cliente : ''}`
            : undefined;

        const commonInfo = {
            numero: String(order.numero || order.id),
            cliente: order.customer_name || order.cliente || 'Não informado',
            telefone_cliente: order.telefone_cliente,
            cidade_estado: cityState,
            data_envio: order.data_entrega || order.data_entrada || new Date().toISOString().split('T')[0],
            prioridade: order.prioridade || 'Normal',
            forma_envio: order.forma_envio || 'Não especificado',
            is_reposicao: (order as any).is_reposicao || false,
            designer: (order as any).designer,
            vendedor: (order as any).vendedor,
            observacao_pedido: order.observacao,
            data_entrada: order.data_entrada,
            valor_frete: order.valor_frete,
            valor_total: order.valor_total || order.total_value,
            status: order.status,
        };

        // Criar um bloco separado para cada item
        order.items.forEach((item: OrderItem, index: number) => {
            flattenedOrders.push({
                ...commonInfo,
                id: `${order.id}-${item.id}-${index}-${flattenedOrders.length}`,
                designer: item.designer || commonInfo.designer,
                vendedor: item.vendedor || commonInfo.vendedor,
                produtos: [{
                    id: item.id,
                    descricao: item.descricao || item.item_name || '',
                    dimensoes: item.largura && item.altura ? `${item.largura} x ${item.altura}` : 'Sob medida',
                    quantity: item.quantity || 1,
                    material: (item as any).tecido || (item as any).material || 'Não especificado',
                    observacao_item: item.observacao,
                    imagem: item.imagem,
                    legenda_imagem: item.legenda_imagem,
                    tipo_producao: item.tipo_producao || 'painel',
                    tecido: item.tecido,
                    overloque: item.overloque,
                    elastico: item.elastico,
                    tipo_acabamento: item.tipo_acabamento,
                    quantidade_ilhos: item.quantidade_ilhos,
                    espaco_ilhos: item.espaco_ilhos,
                    quantidade_cordinha: item.quantidade_cordinha,
                    espaco_cordinha: item.espaco_cordinha,
                    ziper: item.ziper,
                    cordinha_extra: item.cordinha_extra,
                    alcinha: item.alcinha,
                    toalha_pronta: item.toalha_pronta,
                    emenda: item.emenda,
                    emenda_qtd: item.emenda_qtd || (item as any).emendaQtd,
                    metro_quadrado: item.metro_quadrado,
                    quantidade_paineis: item.quantidade_paineis,
                    terceirizado: item.terceirizado,
                    acabamento_lona: item.acabamento_lona,
                    tipo_adesivo: item.tipo_adesivo,
                    acabamento_totem: item.acabamento_totem,
                    acabamento_totem_outro: item.acabamento_totem_outro,
                    composicao_tecidos: item.composicao_tecidos,
                    data_impressao: (item as any).data_impressao,
                    rip_maquina: (item as any).rip_maquina,
                    perfil_cor: (item as any).perfil_cor,
                    tecido_fornecedor: (item as any).tecido_fornecedor,
                }],
                item_index: index + 1,
                total_items: order.items.length,
            });
        });
    });

    return flattenedOrders;
}
