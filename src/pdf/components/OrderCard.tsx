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

const HeaderItem: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
    <View style={styles.headerItem}>
        <Text style={styles.hLabel}>{label}:</Text>
        <Text style={styles.hValue}>{value || '---'}</Text>
    </View>
);

const SpecRow: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => {
    if (value === undefined || value === null || value === '' || value === '---') return null;
    return (
        <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>{label}:</Text>
            <Text style={styles.kvValue}>{value}</Text>
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
// MAIN COMPONENT: 3-SECTION INDUSTRIAL
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
    if (prod.terceirizado) techItems.push('Terceirizado');
    if (prod.tipo_acabamento && prod.tipo_acabamento !== 'nenhum') techItems.push(prod.tipo_acabamento);
    if (prod.quantidade_ilhos) techItems.push(`Ilhós: ${prod.quantidade_ilhos}`);
    if (prod.quantidade_cordinha) techItems.push(`Cord.: ${prod.quantidade_cordinha}`);
    if (prod.emenda) techItems.push(`Emenda: ${prod.emenda}`);

    return (
        <View style={styles.container} wrap={false}>

            {/* SEÇÃO 1: CABEÇALHO (Meta & Identification) */}
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <HeaderItem label="ORDEM" value={`#${order.numero}`} />
                    <HeaderItem label="ENTRADA" value={formatDate(order.data_entrada)} />
                    <HeaderItem label="ENTREGA" value={formatDate(order.data_envio)} />
                    <HeaderItem label="TRANSPORTE" value={order.forma_envio} />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={styles.clientName}>{order.cliente.toUpperCase()}</Text>
                        {order.is_reposicao && <View style={styles.badge}><Text>REPOSIÇÃO</Text></View>}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Text style={styles.hValue}>{order.telefone_cliente || ''}</Text>
                        <Text style={styles.hValue}>{order.cidade_estado || ''}</Text>
                    </View>
                </View>
            </View>

            {/* SEÇÃO 2: CORPO (Tech & Preview) */}
            <View style={styles.body}>

                {/* Coluna Esquerda: Técnica (34%) */}
                <View style={styles.colLeft}>
                    <Text style={styles.techTitle}>Especificações Técnicas</Text>
                    <SpecRow label="Produto" value={prod.descricao} />
                    <SpecRow label="Tipo" value={prod.tipo_producao} />
                    <SpecRow label="Material" value={prod.tecido || prod.tipo_adesivo || prod.material} />
                    <SpecRow label="Medidas" value={prod.dimensoes} />
                    <SpecRow label="Quantidade" value={prod.quantity} />

                    {techItems.length > 0 && (
                        <>
                            <Text style={styles.techTitle}>Acabamentos / Costura</Text>
                            <View style={styles.techList}>
                                {techItems.map((item, i) => (
                                    <Text key={i} style={styles.techItem}>• {item}</Text>
                                ))}
                            </View>
                        </>
                    )}

                    {(prod.observacao_item || order.observacao_pedido) && (
                        <>
                            <Text style={styles.techTitle}>Observações</Text>
                            <Text style={styles.techItem}>
                                {prod.observacao_item || order.observacao_pedido}
                            </Text>
                        </>
                    )}

                    <View style={{ marginTop: 'auto', paddingTop: 10, borderTopWidth: 0.5, borderTopColor: '#DDD' }}>
                        <Text style={styles.techItem}>Vendedor: {order.vendedor}</Text>
                        <Text style={styles.techItem}>Designer: {order.designer}</Text>
                    </View>
                </View>

                {/* Coluna Direita: Preview (66%) */}
                <View style={styles.colRight}>
                    <View style={styles.previewWrapper}>
                        {images.length > 0 ? (
                            <Image src={images[0]} style={styles.previewImage} />
                        ) : (
                            <Text style={styles.previewPlaceholder}>ESTE ITEM NÃO POSSUI PREVIEW</Text>
                        )}
                    </View>
                    {prod.legenda_imagem && (
                        <Text style={styles.previewCaption}>{prod.legenda_imagem}</Text>
                    )}
                </View>
            </View>

            {/* SEÇÃO 3: RODAPÉ (Operational) */}
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
