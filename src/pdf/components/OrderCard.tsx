import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { ProductionOrder } from '../groupOrders';
import { styles } from '../styles';

interface OrderCardProps {
    order: ProductionOrder;
}

// ============================================
// HELPER COMPONENTS (Minimized)
// ============================================

const KVRow: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => {
    if (!value || value === '---') return null;
    return (
        <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>{label}:</Text>
            <Text style={styles.kvValue}>{value}</Text>
        </View>
    );
};

const LineField: React.FC<{ label: string }> = ({ label }) => (
    <View style={styles.lineField}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.fieldLine} />
    </View>
);

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

    // Collect technical items
    const techItems: string[] = [];
    if (prod.overloque) techItems.push('Overloque');
    if (prod.elastico) techItems.push('Elástico');
    if (prod.ziper) techItems.push('Zíper');
    if (prod.alcinha) techItems.push('Alcinha');
    if (prod.terceirizado) techItems.push('Terceirizado');

    // Add finishing if exists
    if (prod.tipo_acabamento && prod.tipo_acabamento !== 'nenhum')
        techItems.push(prod.tipo_acabamento);

    return (
        <View style={styles.container} wrap={false}>

            {/* LEFT COLUMN: MINIMAL METADATA (34%) */}
            <View style={styles.colMeta}>

                <View>
                    {/* Identification */}
                    <View style={styles.clientArea}>
                        <Text style={styles.orderId}>PEDIDO #{order.numero}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={styles.clientName}>{order.cliente.toUpperCase()}</Text>
                            {order.is_reposicao && <View style={styles.badge}><Text>REPOS</Text></View>}
                        </View>
                        <Text style={styles.clientDetails}>
                            {order.telefone_cliente} • {order.cidade_estado}
                        </Text>
                    </View>

                    {/* Technical Legend */}
                    <View style={styles.techBlock}>
                        <Text style={styles.sectionTitle}>Especificações</Text>
                        <KVRow label="Produtos" value={prod.descricao} />
                        <KVRow label="Tipo" value={prod.tipo_producao} />
                        <KVRow label="Material" value={prod.tecido || prod.tipo_adesivo || prod.material} />
                        <KVRow label="Medidas" value={prod.dimensoes} />
                        <KVRow label="Quant." value={prod.quantity} />

                        {techItems.length > 0 && (
                            <View style={styles.techList}>
                                {techItems.map((item, i) => (
                                    <Text key={i} style={styles.techItem}>• {item}</Text>
                                ))}
                            </View>
                        )}

                        {/* Observations (Shortened) */}
                        {(prod.observacao_item || order.observacao_pedido) && (
                            <View style={{ marginTop: 10 }}>
                                <Text style={styles.sectionTitle}>Vendedor/Obs</Text>
                                <Text style={styles.techItem} numberOfLines={3}>
                                    {prod.observacao_item || order.observacao_pedido}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Logistics Legend */}
                <View style={styles.metaFooter}>
                    <Text style={styles.logisticItem}>VENDEDOR: {order.vendedor}</Text>
                    <Text style={styles.logisticItem}>DESIGNER: {order.designer}</Text>
                    <Text style={styles.logisticItem}>ENTRADA: {formatDate(order.data_entrada)}</Text>
                    <Text style={styles.logisticItem}>PREVISÃO: {formatDate(order.data_envio)}</Text>
                </View>
            </View>

            {/* RIGHT COLUMN: PROTAGONIST PREVIEW (66%) */}
            <View style={styles.colPreview}>
                <View style={styles.previewContainer}>
                    {images.length > 0 ? (
                        <Image src={images[0]} style={styles.previewImage} />
                    ) : (
                        <Text style={styles.previewPlaceholder}>REVISAR ARTE / SEM IMAGEM</Text>
                    )}
                </View>

                {prod.legenda_imagem && (
                    <Text style={styles.previewLabel}>{prod.legenda_imagem}</Text>
                )}

                {/* OPERATIONAL RODAPE (Integrated into preview column base) */}
                <View style={styles.footerRow}>
                    <LineField label="DATA:" />
                    <LineField label="RIP:" />
                </View>
            </View>

        </View>
    );
};
