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
    produtos: ProductionProduct[];
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
        };

        // Criar um bloco separado para cada item
        order.items.forEach((item: OrderItem, index: number) => {
            flattenedOrders.push({
                ...commonInfo,
                id: `${order.id}-${item.id}-${index}-${flattenedOrders.length}`,
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
                }],
            });
        });
    });

    return flattenedOrders;
}
