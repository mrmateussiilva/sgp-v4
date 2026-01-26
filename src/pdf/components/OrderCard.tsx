import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { ProductionOrder } from '../groupOrders';
import { styles, COLORS } from '../styles';

interface OrderCardProps {
    order: ProductionOrder;
}

// ============================================
// HELPER COMPONENTS (V2 Adjusted)
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
            <Text style={styles.kvLabel}>{label}</Text>
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
// MAIN COMPONENT: 3-SECTION INDUSTRIAL V2
// ============================================

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
    const images = order.produtos.map(p => p.imagem).filter(Boolean) as string[];
    const prod = order.produtos[0];

    // Collect technical tags (Vital Info)
    const techItems: string[] = [];
    if (prod.overloque) techItems.push('OVERLOQUE');
    if (prod.elastico) techItems.push('ELÁSTICO');
    if (prod.ziper) techItems.push('ZÍPER');
    if (prod.alcinha) techItems.push('ALCINHA');
    if (prod.terceirizado) techItems.push('TERCEIRIZADO');
    const tipoAcabamento = prod.tipo_acabamento || (prod as any).tipo_alcinha;
    if (tipoAcabamento && tipoAcabamento !== 'nenhum') {
        const isMochilinha = prod.tipo_producao?.toLowerCase().includes('mochilinha') || prod.tipo_producao?.toLowerCase().includes('bolsinha');
        if (isMochilinha) {
            const ac = String(tipoAcabamento).toLowerCase().trim();
            const alcaLabel = ac === 'alca' ? 'ALÇA' :
                ac === 'cordinha' ? 'CORDINHA' :
                    ac === 'alca_cordinha' ? 'ALÇA + CORDINHA' : ac.toUpperCase();
            techItems.push(`ACABAMENTO: ${alcaLabel}`);
        } else {
            techItems.push(String(tipoAcabamento).toUpperCase());
        }
    }

    return (
        <View style={styles.container} wrap={false}>

            {/* SEÇÃO 1: CABEÇALHO (Meta & Identification) */}
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <HeaderItem label="PEDIDO" value={`#${order.numero}`} />
                        {order.is_reposicao && <View style={styles.badge}><Text>REPOSIÇÃO</Text></View>}
                    </View>
                    <HeaderItem label="ENTRADA" value={formatDate(order.data_entrada)} />
                    <HeaderItem label="ENTREGA" value={formatDate(order.data_envio)} />
                    <HeaderItem label="FRETE" value={order.forma_envio.toUpperCase()} />
                </View>

                <View style={styles.headerBottomRow}>
                    <Text style={styles.clientName}>{order.cliente.toUpperCase()}</Text>
                    <View style={{ flexDirection: 'row', gap: 15 }}>
                        <Text style={styles.hValue}>{order.telefone_cliente || ''}</Text>
                        <Text style={styles.hValue}>{order.cidade_estado || ''}</Text>
                    </View>
                </View>
            </View>

            {/* SEÇÃO 2: CORPO (Tech & Preview) */}
            <View style={styles.body}>

                {/* Coluna Esquerda: Técnica (45%) */}
                <View style={styles.colLeft}>
                    <Text style={styles.techTitle}>Especificações Gerais</Text>
                    <SpecRow label="Produto" value={prod.descricao} />
                    <SpecRow label="Tipo Produção" value={prod.tipo_producao} />
                    <SpecRow label="Tecido" value={prod.tecido || prod.tipo_adesivo || prod.material} />
                    <SpecRow label="Dimensões" value={prod.dimensoes} />
                    <SpecRow label="Vendedor" value={order.vendedor} />
                    <SpecRow label="Designer" value={order.designer} />
                    <SpecRow label="Quantidade" value={prod.quantity} />

                    {techItems.length > 0 && (
                        <>
                            <Text style={styles.techTitle}>Acabamento / Costura</Text>
                            <View style={styles.techList}>
                                {techItems.map((item, i) => (
                                    <Text key={i} style={styles.techItem}>✓ {item}</Text>
                                ))}
                            </View>
                        </>
                    )}

                    {(prod.observacao_item || order.observacao_pedido) && (
                        <>
                            <Text style={[styles.techTitle, { marginTop: 12 }]}>Observações</Text>
                            <Text style={[styles.techItem, { fontWeight: 'normal', color: COLORS.textMuted, fontSize: 10, marginTop: 4, paddingLeft: 6 }]}>
                                {prod.observacao_item || order.observacao_pedido}
                            </Text>
                        </>
                    )}
                </View>

                {/* Coluna Direita: Preview (55%) */}
                <View style={styles.colRight}>
                    <View style={styles.previewWrapper}>
                        {images.length > 0 ? (
                            <Image src={images[0]} style={styles.previewImage} />
                        ) : (
                            <Text style={styles.previewPlaceholder}>ESTE ITEM NÃO POSSUI PREVIEW TÉCNICO</Text>
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
                    <Text style={styles.footerLabel}>Data de Impressão:</Text>
                    <View style={styles.footerLine} />
                </View>
                <View style={styles.footerField}>
                    <Text style={styles.footerLabel}>RIP:</Text>
                    <View style={styles.footerLine} />
                </View>
                <View style={{ flex: 0.5, alignItems: 'flex-end', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 7, color: COLORS.textMuted }}>SGP-V4 | {new Date().toLocaleDateString('pt-BR')}</Text>
                </View>
            </View>

        </View>
    );
};
