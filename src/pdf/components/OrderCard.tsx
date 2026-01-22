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
    if (prod.acabamento_lona) techSpecs.push(`Acabamento Lona: ${prod.acabamento_lona}`);
    if (prod.acabamento_totem) techSpecs.push(`Acabamento Totem: ${prod.acabamento_totem}`);
    if (prod.tipo_acabamento && prod.tipo_acabamento !== 'nenhum')
        techSpecs.push(`Acabamento: ${prod.tipo_acabamento}`);
    if (prod.quantidade_ilhos)
        techSpecs.push(`Ilhós: ${prod.quantidade_ilhos}un${prod.espaco_ilhos ? ` (esp: ${prod.espaco_ilhos})` : ''}`);
    if (prod.quantidade_cordinha)
        techSpecs.push(`Cordinha: ${prod.quantidade_cordinha}un${prod.espaco_cordinha ? ` (esp: ${prod.espaco_cordinha})` : ''}`);
    if (prod.emenda)
        techSpecs.push(`Emenda: ${prod.emenda} (${prod.emenda_qtd || 1}x)`);

    return (
        <View style={styles.container} wrap={false}>

            {/* DOCUMENT TITLE */}
            <Text style={styles.docTitle}>ORDEM DE PRODUÇÃO</Text>

            {/* METADATA BAR */}
            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>ENTRADA:</Text>
                    <Text style={styles.metaValue}>{formatDate(order.data_entrada)}</Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>ENVIO:</Text>
                    <Text style={styles.metaValue}>{formatDate(order.data_envio)}</Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>PRIORIDADE:</Text>
                    <Text style={[styles.metaValue, { color: getPriorityColor(order.prioridade) }]}>
                        {order.prioridade.toUpperCase()}
                    </Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>TRANSPORTE:</Text>
                    <Text style={styles.metaValue}>{order.forma_envio}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            {/* CLIENT SECTION */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.orderNumber}>ORDEM #{order.numero}</Text>
                {order.is_reposicao && (
                    <View style={styles.badge}>
                        <Text>REPOS</Text>
                    </View>
                )}
                {(order as any).costura && (
                    <View style={styles.badge}>
                        <Text>COST</Text>
                    </View>
                )}
            </View>
            <Text style={styles.clientName}>{order.cliente}</Text>
            <Text style={styles.clientInfo}>
                {[order.telefone_cliente, order.cidade_estado].filter(Boolean).join(' • ')}
            </Text>

            <View style={styles.dividerThin} />

            {/* PRODUCT NAME */}
            <Text style={styles.sectionHeader}>PRODUTO</Text>
            <Text style={styles.productName}>{prod.descricao}</Text>

            {/* SPECS IN ONE LINE */}
            <View style={styles.specsRow}>
                <View style={styles.specItem}>
                    <Text style={styles.specLabel}>TIPO:</Text>
                    <Text style={styles.specValue}>{prod.tipo_producao.toUpperCase()}</Text>
                </View>
                <View style={styles.specItem}>
                    <Text style={styles.specLabel}>QTD:</Text>
                    <Text style={styles.specValue}>
                        {prod.quantity}{prod.quantidade_paineis ? ` (${prod.quantidade_paineis}un)` : ''}
                    </Text>
                </View>
                <View style={styles.specItem}>
                    <Text style={styles.specLabel}>DIMENSÕES:</Text>
                    <Text style={styles.specValue}>{prod.dimensoes}</Text>
                </View>
            </View>
            <View style={styles.specsRow}>
                <View style={styles.specItem}>
                    <Text style={styles.specLabel}>MATERIAL:</Text>
                    <Text style={styles.specValue}>
                        {prod.tecido || prod.tipo_adesivo || prod.material || '---'}
                    </Text>
                </View>
            </View>

            <View style={styles.dividerThin} />

            {/* TWO COLUMN: TECHNICAL DETAILS + PREVIEW */}
            <View style={styles.twoCol}>

                {/* LEFT: Technical specs */}
                <View style={styles.col70}>
                    {techSpecs.length > 0 && (
                        <>
                            <Text style={styles.sectionHeader}>ACABAMENTOS E DETALHES TÉCNICOS</Text>
                            <View style={styles.techList}>
                                {techSpecs.map((spec, i) => (
                                    <Text key={i} style={styles.techItem}>• {spec}</Text>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Observations */}
                    {(prod.observacao_item || order.observacao_pedido) && (
                        <View style={styles.obsBox}>
                            <Text style={styles.obsLabel}>OBSERVAÇÕES</Text>
                            {prod.observacao_item && <Text style={styles.obsText}>• {prod.observacao_item}</Text>}
                            {order.observacao_pedido && <Text style={styles.obsText}>• {order.observacao_pedido}</Text>}
                        </View>
                    )}
                </View>

                {/* RIGHT: Preview (small, reference) */}
                <View style={styles.col30}>
                    <Text style={styles.sectionHeader}>REFERÊNCIA</Text>
                    <View style={styles.previewBox}>
                        {images.length > 0 ? (
                            <Image src={images[0]} style={styles.previewImage} />
                        ) : (
                            <Text style={{ fontSize: 8, color: '#CCC' }}>-</Text>
                        )}
                    </View>
                    {prod.legenda_imagem && (
                        <Text style={styles.previewLabel}>{prod.legenda_imagem}</Text>
                    )}
                </View>
            </View>

            {/* PRODUCTION CONTROL SECTION */}
            <View style={styles.controlSection}>
                <Text style={styles.sectionHeader}>CONTROLE DE PRODUÇÃO</Text>
                <View style={styles.controlRow}>
                    <Text style={styles.controlField}>RIP: _______________________</Text>
                    <Text style={styles.controlField}>DATA: ____/____/______</Text>
                </View>
                <Text style={{ fontSize: 7, color: '#666' }}>Assinatura do Operador: _________________________________</Text>
            </View>

            {/* FOOTER */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Vendedor: {order.vendedor || '---'} • Designer: {order.designer || '---'}
                </Text>
                <Text style={styles.footerText}>
                    Gerado em {new Date().toLocaleDateString('pt-BR')}
                </Text>
            </View>
        </View>
    );
};
