import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { ProductionOrder } from '../groupOrders';
import { styles } from '../styles';

interface OrderCardProps {
    order: ProductionOrder;
}

// ============================================
// UTILITIES
// ============================================

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
// MAIN COMPONENT: PROOF SHEET
// ============================================

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
    const images = order.produtos.map(p => p.imagem).filter(Boolean) as string[];
    const prod = order.produtos[0];

    // Collect technical tags
    const techTags: string[] = [];
    if (prod.overloque) techTags.push('Overloque');
    if (prod.elastico) techTags.push('Elástico');
    if (prod.ziper) techTags.push('Zíper');
    if (prod.tipo_acabamento && prod.tipo_acabamento !== 'nenhum') techTags.push(prod.tipo_acabamento);
    if (prod.quantidade_ilhos) techTags.push(`Ilhós: ${prod.quantidade_ilhos}`);
    if (order.is_reposicao) techTags.push('REPOSIÇÃO');

    return (
        <View style={styles.container} wrap={false}>

            {/* 1. ABSOLUTE PREVIEW (TOP - 75%) */}
            <View style={styles.previewArea}>
                {images.length > 0 ? (
                    <Image src={images[0]} style={styles.previewImage} />
                ) : (
                    <Text style={{ fontSize: 10, color: '#CCC' }}>SEM IMAGEM / PROVA</Text>
                )}
            </View>
            {prod.legenda_imagem && (
                <Text style={styles.previewCaption}>{prod.legenda_imagem}</Text>
            )}

            {/* 2. COMPACT LEGEND (BOTTOM - 25%) */}
            <View style={styles.legendArea}>

                {/* ID Header */}
                <View style={styles.idRow}>
                    <Text style={styles.orderId}>#{order.numero}</Text>
                    <Text style={styles.clientName}>{order.cliente}</Text>
                    <Text style={styles.dates}>
                        ENTRADA: {formatDate(order.data_entrada)} • ENVIO: {formatDate(order.data_envio)}
                    </Text>
                </View>

                {/* Main Specs */}
                <View style={styles.specsRow}>
                    <View style={styles.specItem}>
                        <Text style={styles.label}>Produto:</Text>
                        <Text style={styles.value}>{prod.descricao}</Text>
                    </View>
                    <View style={styles.specItem}>
                        <Text style={styles.label}>Dimensões:</Text>
                        <Text style={styles.value}>{prod.dimensoes}</Text>
                    </View>
                    <View style={styles.specItem}>
                        <Text style={styles.label}>Material:</Text>
                        <Text style={styles.value}>{prod.tecido || prod.material || '---'}</Text>
                    </View>
                    <View style={styles.specItem}>
                        <Text style={styles.label}>Qtd:</Text>
                        <Text style={styles.value}>{prod.quantity}</Text>
                    </View>
                </View>

                {/* Technical Legend */}
                <Text style={styles.techLine}>
                    DETALHES: {techTags.join(' • ') || 'Nenhum acabamento extra'}
                    {(prod.observacao_item || order.observacao_pedido) &&
                        ` | OBS: ${prod.observacao_item || order.observacao_pedido}`}
                </Text>

                {/* Operational Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerField}>
                        <Text style={styles.footerLabel}>DATA:</Text>
                        <View style={styles.footerLine} />
                    </View>
                    <View style={styles.footerField}>
                        <Text style={styles.footerLabel}>RIP:</Text>
                        <View style={styles.footerLine} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 6, color: '#999', textAlign: 'right' }}>
                            Vendedor: {order.vendedor} • Designer: {order.designer} • Transp: {order.forma_envio}
                        </Text>
                    </View>
                </View>

            </View>

        </View>
    );
};
