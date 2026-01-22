import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { ProductionOrder } from '../groupOrders';
import { styles } from '../styles';

interface OrderCardProps {
    order: ProductionOrder;
}

// ============================================
// HELPER COMPONENTS
// ============================================

const SpecRow: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => {
    if (value === undefined || value === null || value === '' || value === '---') return null;
    return (
        <View style={styles.specRow}>
            <Text style={styles.specLabel}>{label}</Text>
            <Text style={styles.specValue}>{value}</Text>
        </View>
    );
};

const formatDate = (dateString?: string) => {
    if (!dateString || dateString === '---') return '';
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

// ============================================
// MAIN COMPONENT
// ============================================

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
    const images = order.produtos.map(p => p.imagem).filter(Boolean) as string[];
    const prod = order.produtos[0];

    // Collect technical tags
    const techItems: string[] = [];
    if (prod.overloque) techItems.push('Overloque');
    if (prod.elastico) techItems.push('Elástico');
    if (prod.ziper) techItems.push('Zíper');
    if (prod.alcinha) techItems.push('Alcinha');
    if (prod.toalha_pronta) techItems.push('Toalha Pronta');
    if (prod.terceirizado) techItems.push('Terceirizado');
    if (prod.tipo_acabamento && prod.tipo_acabamento !== 'nenhum') techItems.push(prod.tipo_acabamento);
    if (prod.quantidade_ilhos) techItems.push(`Ilhós: ${prod.quantidade_ilhos}un`);
    if (prod.quantidade_cordinha) techItems.push(`Cordinha: ${prod.quantidade_cordinha}un`);
    if (prod.emenda) techItems.push(`Emenda: ${prod.emenda}`);

    return (
        <View style={styles.container} wrap={false}>

            {/* 1. HEADER (Full Width Metadata) */}
            <View style={styles.header}>
                <View style={styles.headerItem}>
                    <Text style={styles.headerLabel}>ID:</Text>
                    <Text style={styles.headerValue}>#{order.numero}</Text>
                </View>
                <View style={styles.headerItem}>
                    <Text style={styles.headerLabel}>Entrada:</Text>
                    <Text style={styles.headerValue}>{formatDate(order.data_entrada)}</Text>
                </View>
                <View style={styles.headerItem}>
                    <Text style={styles.headerLabel}>Entrega:</Text>
                    <Text style={styles.headerValue}>{formatDate(order.data_envio)}</Text>
                </View>
                <View style={styles.headerItem}>
                    <Text style={styles.headerLabel}>Transporte:</Text>
                    <Text style={styles.headerValue}>{order.forma_envio}</Text>
                </View>
            </View>

            {/* 2. MAIN SECTION (Two Columns) */}
            <View style={styles.mainContent}>

                {/* LEFT COLUMN: Technical (35%) */}
                <View style={styles.colLeft}>
                    <View>
                        <Text style={styles.clientTitle}>{order.cliente.toUpperCase()}</Text>
                        <Text style={styles.clientSub}>
                            {order.telefone_cliente} • {order.cidade_estado}
                        </Text>

                        <View style={styles.badgesRow}>
                            {order.is_reposicao && <View style={styles.badge}><Text>REPOSIÇÃO</Text></View>}
                            {(order as any).costura && <View style={[styles.badge, { backgroundColor: '#6A1B9A' }]}><Text>COSTURA</Text></View>}
                            <View style={[styles.badge, { backgroundColor: '#333' }]}><Text>{order.prioridade.toUpperCase()}</Text></View>
                        </View>
                    </View>

                    <View style={{ marginTop: 12 }}>
                        <View style={styles.specList}>
                            <SpecRow label="Produto" value={prod.descricao} />
                            <SpecRow label="Tipo" value={prod.tipo_producao} />
                            <SpecRow label="Material" value={prod.tecido || prod.tipo_adesivo || prod.material} />
                            <SpecRow label="Medidas" value={prod.dimensoes} />
                            <SpecRow label="Quant." value={prod.quantity} />
                        </View>

                        {techItems.length > 0 && (
                            <View style={styles.techItems}>
                                {techItems.map((item, i) => (
                                    <Text key={i} style={styles.techItem}>• {item}</Text>
                                ))}
                            </View>
                        )}

                        {(prod.observacao_item || order.observacao_pedido) && (
                            <View style={{ marginTop: 10 }}>
                                <Text style={[styles.specLabel, { marginBottom: 2 }]}>Observações:</Text>
                                <Text style={styles.techItem}>
                                    {prod.observacao_item || order.observacao_pedido}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Vendedor / Designer Info (Compact) */}
                    <View style={{ marginTop: 'auto', paddingTop: 8 }}>
                        <Text style={styles.techItem}>VENDEDOR: {order.vendedor}</Text>
                        <Text style={styles.techItem}>DESIGNER: {order.designer}</Text>
                    </View>
                </View>

                {/* RIGHT COLUMN: Preview Protagonist (65%) */}
                <View style={styles.colRight}>
                    <View style={styles.previewWrapper}>
                        {images.length > 0 ? (
                            <Image src={images[0]} style={styles.previewImage} />
                        ) : (
                            <Text style={styles.previewPlaceholder}>SEM IMAGEM / PREVIEW</Text>
                        )}
                    </View>
                    {prod.legenda_imagem && (
                        <Text style={styles.previewCaption}>{prod.legenda_imagem}</Text>
                    )}
                </View>

            </View>

            {/* 3. FOOTER (Operational Fields) */}
            <View style={styles.footer}>
                <View style={styles.footerField}>
                    <Text style={styles.footerLabel}>Data:</Text>
                    <View style={styles.footerLine} />
                </View>
                <View style={styles.footerField}>
                    <Text style={styles.footerLabel}>RIP:</Text>
                    <View style={styles.footerLine} />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 6, color: '#999' }}>Gerado: {new Date().toLocaleDateString('pt-BR')}</Text>
                </View>
            </View>

        </View>
    );
};
