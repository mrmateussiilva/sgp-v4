import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { ProductionOrder } from '../groupOrders';
import { styles } from '../styles';

interface OrderCardProps {
    order: ProductionOrder;
}

const formatDate = (dateString?: string) => {
    if (!dateString || dateString === '---') return '---';
    const isoMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const [, y, m, d] = isoMatch;
        return `${d}/${m}/${y}`;
    }
    const brMatch = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) {
        const [, d, m, y] = brMatch;
        return `${d}/${m}/${y}`;
    }
    return dateString;
};

const getPriorityColor = (priority: string): string => {
    const p = priority.toLowerCase();
    if (p === 'alta') return '#D32F2F';
    if (p === 'média' || p === 'media') return '#F57F17';
    if (p === 'baixa') return '#388E3C';
    return '#000000';
};

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
    const images = order.produtos.map(p => p.imagem).filter(Boolean) as string[];
    const prod = order.produtos[0];

    // Collect technical specs
    const techSpecs: string[] = [];
    if (prod.overloque) techSpecs.push('Overloque');
    if (prod.elastico) techSpecs.push('Elástico');
    if (prod.ziper) techSpecs.push('Zíper');
    if (prod.alcinha) techSpecs.push('Alcinha');
    if (prod.toalha_pronta) techSpecs.push('Toalha Pronta');
    if (prod.terceirizado) techSpecs.push('Terceirizado');
    if (prod.acabamento_lona) techSpecs.push(`Acab. Lona: ${prod.acabamento_lona}`);
    if (prod.acabamento_totem) techSpecs.push(`Acab. Totem: ${prod.acabamento_totem}`);
    if (prod.tipo_acabamento && prod.tipo_acabamento !== 'nenhum')
        techSpecs.push(`Acabamento: ${prod.tipo_acabamento}`);
    if (prod.quantidade_ilhos)
        techSpecs.push(`Ilhós: ${prod.quantidade_ilhos}un${prod.espaco_ilhos ? ` [${prod.espaco_ilhos}]` : ''}`);
    if (prod.quantidade_cordinha)
        techSpecs.push(`Cordinha: ${prod.quantidade_cordinha}un${prod.espaco_cordinha ? ` [${prod.espaco_cordinha}]` : ''}`);
    if (prod.emenda)
        techSpecs.push(`Emenda: ${prod.emenda} (${prod.emenda_qtd || 1}x)`);

    return (
        <View style={styles.orderContainer} wrap={false}>

            {/* HEADER - Logistics metadata */}
            <View style={styles.header}>
                <View style={styles.headerItem}>
                    <Text style={styles.hLabel}>Entrada:</Text>
                    <Text style={styles.hValue}>{formatDate(order.data_entrada)}</Text>
                </View>
                <View style={styles.headerItem}>
                    <Text style={styles.hLabel}>Envio:</Text>
                    <Text style={styles.hValue}>{formatDate(order.data_envio)}</Text>
                </View>
                <View style={styles.headerItem}>
                    <Text style={styles.hLabel}>Prioridade:</Text>
                    <Text style={[styles.hValue, { color: getPriorityColor(order.prioridade) }]}>
                        {order.prioridade.toUpperCase()}
                    </Text>
                </View>
                <View style={styles.headerItem}>
                    <Text style={styles.hLabel}>Transporte:</Text>
                    <Text style={styles.hValue}>{order.forma_envio}</Text>
                </View>
            </View>

            {/* MAIN GRID */}
            <View style={styles.row}>

                {/* LEFT COLUMN - 55% */}
                <View style={styles.col55}>

                    {/* CARD: Identification */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Identificação do Pedido</Text>
                        <Text style={styles.orderNumber}>Ordem #{order.numero}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={styles.clientName}>{order.cliente}</Text>
                            {order.is_reposicao && (
                                <View style={styles.badge}>
                                    <Text>REPOS</Text>
                                </View>
                            )}
                            {(order as any).costura && (
                                <View style={[styles.badge, { backgroundColor: '#9C27B0' }]}>
                                    <Text>COST</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.clientMeta}>
                            {[order.telefone_cliente, order.cidade_estado].filter(Boolean).join(' • ')}
                        </Text>
                    </View>

                    {/* CARD: Product Specifications */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Especificações do Produto</Text>
                        <Text style={styles.productName}>{prod.descricao}</Text>

                        <View style={styles.specRow}>
                            <Text style={styles.specLabel}>Tipo</Text>
                            <Text style={styles.specValue}>{prod.tipo_producao.toUpperCase()}</Text>
                        </View>
                        <View style={styles.specRow}>
                            <Text style={styles.specLabel}>Dimensões</Text>
                            <Text style={styles.specValue}>{prod.dimensoes}</Text>
                        </View>
                        <View style={styles.specRow}>
                            <Text style={styles.specLabel}>Material</Text>
                            <Text style={styles.specValue}>
                                {prod.tecido || prod.tipo_adesivo || prod.material || '---'}
                            </Text>
                        </View>
                        <View style={{ ...styles.specRow, borderBottomWidth: 0 }}>
                            <Text style={styles.specLabel}>Quantidade</Text>
                            <Text style={styles.specValue}>
                                {prod.quantity}{prod.quantidade_paineis ? ` (${prod.quantidade_paineis} un)` : ''}
                            </Text>
                        </View>
                    </View>

                    {/* CARD: Technical Details (if exist) */}
                    {techSpecs.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Acabamentos & Detalhes Técnicos</Text>
                            <View style={styles.techList}>
                                {techSpecs.map((spec, i) => (
                                    <Text key={i} style={styles.techItem}>• {spec}</Text>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* CARD: Observations (if exist) */}
                    {(prod.observacao_item || order.observacao_pedido) && (
                        <View style={styles.obsCard}>
                            {prod.observacao_item && <Text style={styles.obsText}>• {prod.observacao_item}</Text>}
                            {order.observacao_pedido && <Text style={styles.obsText}>• {order.observacao_pedido}</Text>}
                        </View>
                    )}
                </View>

                {/* RIGHT COLUMN - 45% */}
                <View style={styles.col45}>

                    {/* CARD: Preview (controlled height) */}
                    <View style={styles.previewCard}>
                        <Text style={styles.previewTitle}>Preview do Modelo</Text>
                        <View style={styles.previewImageContainer}>
                            {images.length > 0 ? (
                                <Image src={images[0]} style={styles.previewImage} />
                            ) : (
                                <Text style={{ fontSize: 10, color: '#CCC' }}>SEM IMAGEM</Text>
                            )}
                        </View>
                        {prod.legenda_imagem && (
                            <Text style={styles.previewCaption}>{prod.legenda_imagem}</Text>
                        )}
                    </View>

                    {/* CARD: Production Control */}
                    <View style={styles.controlCard}>
                        <Text style={styles.controlTitle}>Controle de Produção</Text>
                        <Text style={styles.controlField}>RIP: _________________</Text>
                        <Text style={styles.controlField}>DATA: ____/____/______</Text>
                        <Text style={{ fontSize: 7, color: '#999' }}>Assinatura do Operador</Text>
                    </View>
                </View>
            </View>

            {/* FOOTER */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Vendedor: {order.vendedor || '---'} • Designer: {order.designer || '---'}
                </Text>
                <Text style={styles.footerText}>
                    Gerado: {new Date().toLocaleDateString('pt-BR')}
                </Text>
            </View>
        </View>
    );
};
