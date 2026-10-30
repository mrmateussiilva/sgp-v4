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

/** Formata acabamento de lona para exibição amigável */
const formatAcabamentoLonaDisplay = (acab?: string): string | undefined => {
    if (!acab) return undefined;
    const clean = acab.toLowerCase().trim();
    if (clean === 'refilar') return 'Refilar';
    if (clean === 'nao_refilar' || clean === 'não_refilar') return 'Não refilar';
    return acab;
};

/** Formata acabamento de totem para exibição amigável */
const formatAcabamentoTotemDisplay = (acab?: string, acabOutro?: string): string | undefined => {
    if (!acab) return undefined;
    const clean = acab.toLowerCase().trim();
    if (clean === 'com_pe' || clean === 'com pé' || clean === 'com pe') return 'Com pé';
    if (clean === 'sem_pe' || clean === 'sem pé' || clean === 'sem pe') return 'Sem pé';
    if (clean === 'outro') {
        const outroTrimmed = acabOutro?.trim();
        return outroTrimmed ? outroTrimmed : 'Outro';
    }
    return acab;
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

    const isTerceirizado = Boolean(
        prod.terceirizado === true ||
        String(prod.terceirizado).toLowerCase() === 'true' ||
        String(prod.terceirizado) === '1' ||
        String(prod.terceirizado).toLowerCase() === 'sim'
    );
    if (isTerceirizado) techItems.push('TERCEIRIZADO');

    const isLona = prod.tipo_producao?.toLowerCase() === 'lona';
    if (isLona && prod.acabamento_lona) {
        const acLona = String(prod.acabamento_lona).toLowerCase().trim();
        if (acLona === 'refilar') {
            techItems.push('REFILAR');
        } else if (acLona === 'nao_refilar' || acLona === 'não_refilar') {
            techItems.push('NÃO REFILAR');
        } else {
            techItems.push(acLona.toUpperCase());
        }
    }

    const isTotem = prod.tipo_producao?.toLowerCase() === 'totem';
    const acabamentoTotemDisplay = isTotem
        ? formatAcabamentoTotemDisplay(prod.acabamento_totem, prod.acabamento_totem_outro)
        : undefined;
    if (acabamentoTotemDisplay) {
        techItems.push(acabamentoTotemDisplay.toUpperCase());
    }

    const tipoAcabamento = prod.tipo_acabamento || (prod as any).tipo_alcinha;
    const acLower = tipoAcabamento ? String(tipoAcabamento).toLowerCase().trim() : '';
    const isIlhosOuCordinha = acLower === 'ilhos' || acLower === 'cordinha' || acLower === 'alca_cordinha';
    if (tipoAcabamento && tipoAcabamento !== 'nenhum' && !isIlhosOuCordinha && !isLona && !isTotem) {
        const isMochilinha = prod.tipo_producao?.toLowerCase().includes('mochilinha') || prod.tipo_producao?.toLowerCase().includes('bolsinha');
        if (isMochilinha) {
            const alcaLabel = acLower === 'alca' ? 'ALÇA' : acLower.toUpperCase();
            techItems.push(`ACABAMENTO: ${alcaLabel}`);
        } else {
            techItems.push(String(tipoAcabamento).toUpperCase());
        }
    }

    const isCostura = Boolean(prod.overloque || prod.elastico || prod.ziper || prod.alcinha);
    const techSectionTitle = isCostura ? 'Acabamento / Costura' : 'Acabamento';

    const obsPedido = (order.observacao_pedido || '').trim();
    const obsItem = (prod.observacao_item || '').trim();
    const hasObservacao = obsPedido.length > 0 || obsItem.length > 0;

    return (
        <View style={styles.container} wrap={false}>

            {/* SEÇÃO 1: CABEÇALHO (Meta & Identification) */}
            <View style={styles.header}>
                <View style={[styles.headerTopRow, { marginBottom: 6 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
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
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
                        <HeaderItem label="ENT." value={formatDate(order.data_entrada)} />
                        <HeaderItem label="ENTRG." value={formatDate(order.data_envio)} />
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, maxWidth: 160, overflow: 'hidden' }}>
                            <Text style={styles.hLabel}>FR.:</Text>
                            <Text style={[styles.hValue, { maxLines: 1 }]}>
                                {order.forma_envio.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.headerBottomRow}>
                    <Text style={styles.clientName}>
                        {order.cliente.length > 30
                            ? order.cliente.substring(0, 30).toUpperCase()
                            : order.cliente.toUpperCase()}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 15, alignItems: 'flex-end' }}>
                        {order.telefone_cliente && (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                                <Text style={styles.hLabel}>TEL:</Text>
                                <Text style={styles.hValue}>{order.telefone_cliente}</Text>
                            </View>
                        )}
                        {order.cidade_estado && (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                                <Text style={styles.hLabel}>CID:</Text>
                                <Text style={styles.hValue}>
                                    {order.cidade_estado.length > 25
                                        ? order.cidade_estado.substring(0, 25).toUpperCase()
                                        : order.cidade_estado.toUpperCase()}
                                </Text>
                            </View>
                        )}
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
                    {isLona && (
                        <SpecRow
                            label="Acabamento"
                            value={formatAcabamentoLonaDisplay(prod.acabamento_lona)}
                        />
                    )}
                    {isTotem && (
                        <SpecRow
                            label="Acabamento"
                            value={acabamentoTotemDisplay}
                        />
                    )}
                    {isTerceirizado && (
                        <SpecRow label="Terceirizado" value="Sim" />
                    )}

                    {techItems.length > 0 && (
                        <>
                            <Text style={styles.techTitle}>{techSectionTitle}</Text>
                            <View style={styles.techList}>
                                {techItems.map((item, i) => (
                                    <Text key={i} style={styles.techItem}>✓ {item}</Text>
                                ))}
                            </View>
                        </>
                    )}

                    {hasObservacao && (
                        <View style={{ marginTop: 4 }}>
                            <Text style={[styles.techTitle, { marginTop: 4, marginBottom: 3 }]}>Observações</Text>
                            <View style={{ paddingLeft: 4, gap: 2 }}>
                                {obsPedido.length > 0 && (
                                    <View style={{ marginBottom: 2 }}>
                                        <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#111111', textTransform: 'uppercase' }}>
                                            Geral (Pedido):
                                        </Text>
                                        <Text style={{ fontSize: 8, fontFamily: 'Helvetica', color: COLORS.text, marginTop: 1, lineHeight: 1.15 }}>
                                            {obsPedido}
                                        </Text>
                                    </View>
                                )}
                                {obsItem.length > 0 && (
                                    <View style={{ marginBottom: 2 }}>
                                        <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#111111', textTransform: 'uppercase' }}>
                                            Do Item:
                                        </Text>
                                        <Text style={{ fontSize: 8, fontFamily: 'Helvetica', color: COLORS.text, marginTop: 1, lineHeight: 1.15 }}>
                                            {obsItem}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
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
