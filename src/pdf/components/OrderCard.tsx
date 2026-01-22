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

const Field: React.FC<{ label: string; value: string | number | undefined; style?: any }> = ({ label, value, style }) => (
    <View style={[styles.topField, style]}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value || ''}</Text>
    </View>
);

const UnderlineField: React.FC<{ label: string }> = ({ label }) => (
    <View style={styles.footerField}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.underlineField} />
    </View>
);

const TechFieldRow: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => {
    if (!value || value === '---') return null;
    return (
        <View style={styles.techFieldRow}>
            <Text style={styles.techLabel}>{label}:</Text>
            <Text style={styles.techValue}>{value}</Text>
        </View>
    );
};

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
    if (prod.acabamento_lona) techSpecs.push(`Acabamento Lona: ${prod.acabamento_lona}`);
    if (prod.acabamento_totem) techSpecs.push(`Acabamento Totem: ${prod.acabamento_totem}`);
    if (prod.tipo_acabamento && prod.tipo_acabamento !== 'nenhum')
        techSpecs.push(`Acabamento: ${prod.tipo_acabamento}`);
    if (prod.quantidade_ilhos)
        techSpecs.push(`Ilhós: ${prod.quantidade_ilhos}un${prod.espaco_ilhos ? ` (${prod.espaco_ilhos})` : ''}`);
    if (prod.quantidade_cordinha)
        techSpecs.push(`Cordinha: ${prod.quantidade_cordinha}un${prod.espaco_cordinha ? ` (${prod.espaco_cordinha})` : ''}`);
    if (prod.emenda)
        techSpecs.push(`Emenda: ${prod.emenda} (${prod.emenda_qtd || 1}x)`);

    return (
        <View style={styles.frameContainer} wrap={false}>
            <View style={styles.frame}>

                {/* TOP FIELDS ROW (4 fields) */}
                <View style={styles.topFieldsRow}>
                    <Field label="ID Pedido" value={`#${order.numero}`} />
                    <Field label="Data Entrada" value={formatDate(order.data_entrada)} />
                    <Field label="Data Entrega" value={formatDate(order.data_envio)} />
                    <Field label="Transporte" value={order.forma_envio} />
                </View>

                {/* CLIENT HEADER */}
                <View style={styles.clientSection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.clientName}>{order.cliente}</Text>
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

                    <View style={styles.clientMetaRow}>
                        {order.telefone_cliente && (
                            <View style={styles.clientMeta}>
                                <Text style={styles.metaLabel}>Tel:</Text>
                                <Text style={styles.metaValue}>{order.telefone_cliente}</Text>
                            </View>
                        )}
                        {order.cidade_estado && (
                            <View style={styles.clientMeta}>
                                <Text style={styles.metaLabel}>Cidade:</Text>
                                <Text style={styles.metaValue}>{order.cidade_estado}</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.vendorDesigner}>
                        Vendedor: {order.vendedor || '---'} • Designer: {order.designer || '---'}
                    </Text>
                </View>

                {/* DESCRIPTION & TYPE ROW */}
                <View style={styles.descTypeRow}>
                    <View style={styles.descField}>
                        <Text style={styles.fieldLabel}>Descrição</Text>
                        <Text style={styles.fieldValue}>{prod.descricao}</Text>
                    </View>
                    <View style={styles.typeField}>
                        <Text style={styles.fieldLabel}>Tipo</Text>
                        <Text style={styles.fieldValue}>{prod.tipo_producao.toUpperCase()}</Text>
                    </View>
                </View>

                {/* MAIN GRID (55/45) */}
                <View style={styles.mainGrid}>

                    {/* LEFT COLUMN - Technical Info */}
                    <View style={styles.leftColumn}>
                        <Text style={styles.sectionTitle}>Informações Técnicas</Text>

                        <TechFieldRow label="Dimensões" value={prod.dimensoes} />
                        <TechFieldRow
                            label="Material"
                            value={prod.tecido || prod.tipo_adesivo || prod.material}
                        />
                        <TechFieldRow
                            label="Quantidade"
                            value={`${prod.quantity}${prod.quantidade_paineis ? ` (${prod.quantidade_paineis} un)` : ''}`}
                        />

                        {techSpecs.length > 0 && (
                            <>
                                <Text style={[styles.fieldLabel, { marginTop: 10, marginBottom: 4 }]}>
                                    Acabamentos e Detalhes
                                </Text>
                                <View style={styles.techList}>
                                    {techSpecs.map((spec, i) => (
                                        <Text key={i} style={styles.techItem}>• {spec}</Text>
                                    ))}
                                </View>
                            </>
                        )}

                        {/* Observations */}
                        {(prod.observacao_item || order.observacao_pedido) && (
                            <>
                                <Text style={[styles.fieldLabel, { marginTop: 10, marginBottom: 4 }]}>
                                    Observações
                                </Text>
                                <View style={styles.techList}>
                                    {prod.observacao_item && (
                                        <Text style={styles.techItem}>• {prod.observacao_item}</Text>
                                    )}
                                    {order.observacao_pedido && (
                                        <Text style={styles.techItem}>• {order.observacao_pedido}</Text>
                                    )}
                                </View>
                            </>
                        )}
                    </View>

                    {/* RIGHT COLUMN - Preview */}
                    <View style={styles.rightColumn}>
                        <View style={styles.previewBox}>
                            {images.length > 0 ? (
                                <Image src={images[0]} style={styles.previewImage} />
                            ) : (
                                <Text style={styles.previewPlaceholder}>SEM PREVIEW</Text>
                            )}
                        </View>
                        {prod.legenda_imagem && (
                            <Text style={[styles.metaLabel, { marginTop: 4, textAlign: 'center' }]}>
                                {prod.legenda_imagem}
                            </Text>
                        )}
                    </View>
                </View>

                {/* FOOTER (RIP/DATA) */}
                <View style={styles.footer}>
                    <UnderlineField label="Data" />
                    <UnderlineField label="RIP" />
                </View>
            </View>
        </View>
    );
};
