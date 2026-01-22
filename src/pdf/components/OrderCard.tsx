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

const FieldInline: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
    <View style={styles.inlineField}>
        <Text style={styles.labelSmall}>{label}</Text>
        <Text style={styles.valueSemibold}>{value || '---'}</Text>
    </View>
);

const FieldBlock: React.FC<{ label: string; value: string | number | undefined; style?: any }> = ({ label, value, style }) => (
    <View style={[styles.blockField, style]}>
        <Text style={styles.blockLabel}>{label}</Text>
        <Text style={styles.blockValue}>{value || '---'}</Text>
    </View>
);

const KVRow: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => {
    if (!value || value === '---') return null;
    return (
        <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>{label}</Text>
            <Text style={styles.kvValue}>{value}</Text>
        </View>
    );
};

const LineField: React.FC<{ label: string }> = ({ label }) => (
    <View style={styles.lineField}>
        <Text style={styles.lineLabel}>{label}</Text>
        <View style={styles.lineUnder} />
    </View>
);

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
// MAIN COMPONENT
// ============================================

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
        techSpecs.push(`Ilhós: ${prod.quantidade_ilhos}un${prod.espaco_ilhos ? ` (${prod.espaco_ilhos})` : ''}`);
    if (prod.quantidade_cordinha)
        techSpecs.push(`Cordinha: ${prod.quantidade_cordinha}un${prod.espaco_cordinha ? ` (${prod.espaco_cordinha})` : ''}`);
    if (prod.emenda)
        techSpecs.push(`Emenda: ${prod.emenda} (${prod.emenda_qtd || 1}x)`);

    return (
        <View style={styles.container} wrap={false}>

            {/* TOP ROW - Distribution */}
            <View style={styles.topRow}>
                <FieldInline label="id pedido:" value={`#${order.numero}`} />
                <FieldInline label="Data entrada:" value={formatDate(order.data_entrada)} />
                <FieldInline label="Data entrega:" value={formatDate(order.data_envio)} />
                <FieldInline label="Transporte:" value={order.forma_envio} />
            </View>

            {/* CLIENT HEADER */}
            <View style={styles.clientHeader}>
                <Text style={styles.clientName}>{order.cliente.toUpperCase()}</Text>

                <View style={styles.clientSubRow}>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>telefone:</Text>
                        <Text style={styles.metaValue}>{order.telefone_cliente || '---'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>cidade:</Text>
                        <Text style={styles.metaValue}>{order.cidade_estado || '---'}</Text>
                    </View>
                </View>

                <Text style={styles.vendorDesigner}>
                    vendedor: {order.vendedor || '---'} • designer: {order.designer || '---'}
                </Text>
            </View>

            {/* DESCRIPTION & TYPE AREA */}
            <View style={styles.descTypeArea}>
                <View style={styles.descTypeRow}>
                    <FieldBlock label="Descrição:" value={prod.descricao} style={{ flex: 2 }} />
                    <FieldBlock label="Tipo:" value={prod.tipo_producao.toUpperCase()} style={{ flex: 1 }} />
                </View>
                <View style={styles.hairline} />
            </View>

            {/* MAIN GRID (58/42) */}
            <View style={styles.mainGrid}>

                {/* LEFT COLUMN - Technical */}
                <View style={styles.colLeft}>
                    <Text style={styles.sectionTitle}>Informações técnicas</Text>

                    <KVRow label="Dimensões" value={prod.dimensoes} />
                    <KVRow label="Material" value={prod.tecido || prod.tipo_adesivo || prod.material} />
                    <KVRow label="Quantidade" value={`${prod.quantity}${prod.quantidade_paineis ? ` (${prod.quantidade_paineis} un)` : ''}`} />

                    {techSpecs.length > 0 && (
                        <View style={styles.techList}>
                            <Text style={styles.blockLabel}>Acabamentos e detalhes</Text>
                            {techSpecs.map((spec, i) => (
                                <Text key={i} style={styles.techItem}>• {spec}</Text>
                            ))}
                        </View>
                    )}

                    {/* Observations Row */}
                    {(prod.observacao_item || order.observacao_pedido) && (
                        <View style={styles.obsArea}>
                            <Text style={styles.obsLabel}>Observações</Text>
                            {prod.observacao_item && (
                                <Text style={styles.obsText}>• {prod.observacao_item}</Text>
                            )}
                            {order.observacao_pedido && (
                                <Text style={styles.obsText}>• {order.observacao_pedido}</Text>
                            )}
                        </View>
                    )}
                </View>

                {/* RIGHT COLUMN - Preview */}
                <View style={styles.colRight}>
                    <View style={styles.previewWrapper}>
                        <Text style={styles.previewLabel}>preview do modelo</Text>
                        <View style={styles.previewBox}>
                            {images.length > 0 ? (
                                <Image src={images[0]} style={styles.previewImage} />
                            ) : (
                                <Text style={styles.previewPlaceholder}>SEM IMAGEM</Text>
                            )}
                        </View>
                        {prod.legenda_imagem && (
                            <Text style={[styles.metaLabel, { marginTop: 4, textAlign: 'center' }]}>
                                {prod.legenda_imagem}
                            </Text>
                        )}
                    </View>
                </View>
            </View>

            {/* FOOTER (Underline Fields) */}
            <View style={styles.footer}>
                <LineField label="Data:" />
                <LineField label="RIP:" />
            </View>

        </View>
    );
};
