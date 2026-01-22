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
// MAIN COMPONENT: PROOF SHEET (V2 Refined)
// ============================================

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
    const images = order.produtos.map(p => p.imagem).filter(Boolean) as string[];
    const prod = order.produtos[0];

    // Collect technical details
    const techItems: string[] = [];
    if (prod.overloque) techItems.push('Overloque');
    if (prod.elastico) techItems.push('Elástico');
    if (prod.ziper) techItems.push('Zíper');
    if (prod.alcinha) techItems.push('Alcinha');
    if (prod.toalha_pronta) techItems.push('Toalha Pronta');
    if (prod.terceirizado) techItems.push('Terceirizado');

    if (prod.tipo_acabamento && prod.tipo_acabamento !== 'nenhum')
        techItems.push(`Acab: ${prod.tipo_acabamento}`);

    if (prod.quantidade_ilhos) techItems.push(`Ilhós: ${prod.quantidade_ilhos}un`);
    if (prod.quantidade_cordinha) techItems.push(`Cord.: ${prod.quantidade_cordinha}un`);
    if (prod.emenda) techItems.push(`Emenda: ${prod.emenda}`);

    // Split tech items into two columns (Rule 6)
    const midPoint = Math.ceil(techItems.length / 2);
    const techCol1 = techItems.slice(0, midPoint);
    const techCol2 = techItems.slice(midPoint);

    return (
        <View style={styles.container} wrap={false}>

            {/* LEFT COLUMN: MINIMALIST LEGEND (34%) */}
            <View style={styles.colMeta}>

                <View>
                    {/* Identification */}
                    <View style={styles.clientArea}>
                        <Text style={styles.orderIdText}>FICHA DE PRODUÇÃO #{order.numero}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={styles.clientName}>{order.cliente.toUpperCase()}</Text>
                            {order.is_reposicao && <View style={styles.badgeSmall}><Text>REPOS</Text></View>}
                            {(order as any).costura && <View style={[styles.badgeSmall, { backgroundColor: '#6A1B9A' }]}><Text>COST</Text></View>}
                        </View>
                        <Text style={styles.clientSubText}>
                            {order.telefone_cliente} • {order.cidade_estado}
                        </Text>
                    </View>

                    {/* Technical Legend */}
                    <View style={styles.techSection}>
                        <Text style={styles.legendTitle}>Especificações Técnicas</Text>
                        <KVRow label="Produto" value={prod.descricao} />
                        <KVRow label="Tipo" value={prod.tipo_producao} />
                        <KVRow label="Material" value={prod.tecido || prod.tipo_adesivo || prod.material} />
                        <KVRow label="Medidas" value={prod.dimensoes} />
                        <KVRow label="Quant." value={prod.quantity} />

                        {techItems.length > 0 && (
                            <View style={styles.techColumnsRow}>
                                <View style={styles.techColumn}>
                                    {techCol1.map((item, i) => (
                                        <Text key={i} style={styles.techItem}>• {item}</Text>
                                    ))}
                                </View>
                                {techCol2.length > 0 && (
                                    <View style={styles.techColumn}>
                                        {techCol2.map((item, i) => (
                                            <Text key={i} style={styles.techItem}>• {item}</Text>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Observations Legend */}
                        {(prod.observacao_item || order.observacao_pedido) && (
                            <View style={{ marginTop: 12 }}>
                                <Text style={styles.legendTitle}>Observações</Text>
                                <Text style={styles.techItem} numberOfLines={4}>
                                    {prod.observacao_item || order.observacao_pedido}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Logistics Legend (Anchored bottom left) */}
                <View style={styles.metaFooter}>
                    <Text style={styles.footerMetaText}>Vendedor: {order.vendedor}</Text>
                    <Text style={styles.footerMetaText}>Designer: {order.designer}</Text>
                    <Text style={styles.footerMetaText}>Entrada: {formatDate(order.data_entrada)}</Text>
                    <Text style={styles.footerMetaText}>Previsão: {formatDate(order.data_envio)}</Text>
                    <Text style={[styles.footerMetaText, { marginTop: 4, fontWeight: 'bold' }]}>
                        Transp: {order.forma_envio}
                    </Text>
                </View>
            </View>

            {/* RIGHT COLUMN: PROTAGONIST PREVIEW (66%) */}
            <View style={styles.colPreview}>
                <View style={styles.previewContainer}>
                    {images.length > 0 ? (
                        <Image src={images[0]} style={styles.previewImage} />
                    ) : (
                        <Text style={styles.previewPlaceholder}>ESTE ITEM NÃO POSSUI PREVIEW</Text>
                    )}
                </View>

                {prod.legenda_imagem && (
                    <Text style={styles.previewCaption}>{prod.legenda_imagem}</Text>
                )}

                {/* OPERATIONAL FOOTER (RIP/DATA) */}
                <View style={styles.footerFieldsRow}>
                    <LineField label="DATA:" />
                    <LineField label="RIP:" />
                </View>
            </View>

        </View>
    );
};
