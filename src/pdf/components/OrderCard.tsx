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

/** Formata tipo de emenda para exibição e monta texto com quantidade quando houver */
const formatEmendaDisplay = (emenda?: string, emendaQtd?: string): string | undefined => {
    if (!emenda || String(emenda).toLowerCase().trim() === 'sem-emenda') return undefined;
    const tipo = String(emenda).toLowerCase().trim();
    const label =
        tipo === 'horizontal' ? 'Horizontal' :
            tipo === 'vertical' ? 'Vertical' :
                tipo === 'com-emenda' ? 'Sim' : emenda;
    const qtd = emendaQtd?.trim();
    const qtdNum = qtd ? (parseInt(qtd, 10) || 0) : 0;
    if (qtdNum > 0) return `${label} (${qtd} emenda${qtdNum !== 1 ? 's' : ''})`;
    return label;
};

/** Anexa "cm" ao espaçamento se for só número (ex.: "20" → "20cm", "15cm" → "15cm") */
const withCm = (esp: string): string =>
    /cm$/i.test(esp.trim()) ? esp.trim() : `${esp.trim()} cm`;

/** Formata ilhós para exibição: quantidade e opcionalmente "a cada X cm" (ex.: "10 ilhós a cada 20 cm") */
const formatIlhosDisplay = (quantidade?: string, espaco?: string): string | undefined => {
    const q = quantidade?.trim();
    if (!q) return undefined;
    const esp = espaco?.trim();
    return esp ? `${q} ilhós a cada ${withCm(esp)}` : `${q} ilhós`;
};

/** Formata cordinha para exibição: quantidade e opcionalmente "a cada X cm" (ex.: "2 cordinhas a cada 10 cm") */
const formatCordinhaDisplay = (quantidade?: string, espaco?: string): string | undefined => {
    const q = quantidade?.trim();
    if (!q) return undefined;
    const esp = espaco?.trim();
    return esp ? `${q} cordinhas a cada ${withCm(esp)}` : `${q} cordinhas`;
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
    const acLower = tipoAcabamento ? String(tipoAcabamento).toLowerCase().trim() : '';
    const isIlhosOuCordinha = acLower === 'ilhos' || acLower === 'cordinha' || acLower === 'alca_cordinha';
    if (tipoAcabamento && tipoAcabamento !== 'nenhum' && !isIlhosOuCordinha) {
        const isMochilinha = prod.tipo_producao?.toLowerCase().includes('mochilinha') || prod.tipo_producao?.toLowerCase().includes('bolsinha');
        if (isMochilinha) {
            const alcaLabel = acLower === 'alca' ? 'ALÇA' : acLower.toUpperCase();
            techItems.push(`ACABAMENTO: ${alcaLabel}`);
        } else {
            techItems.push(String(tipoAcabamento).toUpperCase());
        }
    }

    return (
        <View style={styles.container} wrap={false}>

            {/* SEÇÃO 1: CABEÇALHO (Meta & Identification) */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 6 }}>
                    <HeaderItem
                        label="PEDIDO"
                        value={`#${order.numero}`}
                    />
                    {order.item_index && (
                        <View style={styles.itemBadge}>
                            <Text style={styles.counterValue}>
                                {order.item_index}/{order.total_items}
                            </Text>
                        </View>
                    )}
                    {order.is_reposicao && <View style={styles.badge}><Text>REPOSIÇÃO</Text></View>}
                    <HeaderItem label="ENT." value={formatDate(order.data_entrada)} />
                    <HeaderItem label="ENTRG." value={formatDate(order.data_envio)} />
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, maxWidth: 160, overflow: 'hidden' }}>
                        <Text style={styles.hLabel}>FR.:</Text>
                        <Text style={[styles.hValue, { maxLines: 1 }]}>
                            {order.forma_envio.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.headerBottomRow}>
                    <Text style={styles.clientName}>
                        {order.cliente.length > 30
                            ? order.cliente.substring(0, 30).toUpperCase()
                            : order.cliente.toUpperCase()}
                    </Text>
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
                    <SpecRow label="Perfil de Cor" value={prod.perfil_cor} />
                    <SpecRow label="Fornecedor Tecido" value={prod.tecido_fornecedor} />
                    <SpecRow
                        label="Emenda"
                        value={formatEmendaDisplay(prod.emenda, prod.emenda_qtd)}
                    />
                    <SpecRow
                        label="Ilhós"
                        value={formatIlhosDisplay(prod.quantidade_ilhos, prod.espaco_ilhos)}
                    />
                    <SpecRow
                        label="Cordinha"
                        value={formatCordinhaDisplay(prod.quantidade_cordinha, prod.espaco_cordinha)}
                    />
                    {prod.cordinha_extra && (
                        <SpecRow label="Cordinha extra" value="Sim" />
                    )}

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
            {/* <View style={styles.footer}>
                <View style={styles.footerField}>
                    <Text style={styles.footerLabel}>Data de Impressão:</Text>
                    <Text style={styles.hValue}>{prod.data_impressao || ''}</Text>
                    {!prod.data_impressao && <View style={styles.footerLine} />}
                </View>
                <View style={styles.footerField}>
                    <Text style={styles.footerLabel}>RIP:</Text>
                    <Text style={styles.hValue}>{prod.rip_maquina || ''}</Text>
                    {!prod.rip_maquina && <View style={styles.footerLine} />}
                </View>
                <View style={{ flex: 0.5, alignItems: 'flex-end', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 7, color: COLORS.textMuted }}>SGP-V4 | {new Date().toLocaleDateString('pt-BR')}</Text>
                </View>
            </View> */}

        </View>
    );
};
