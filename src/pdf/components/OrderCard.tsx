import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { ProductionOrder } from '../groupOrders';
import { styles, SPACING } from '../styles';

interface OrderCardProps {
    order: ProductionOrder;
}

// ============================================
// HELPER COMPONENTS
// ============================================

const Card: React.FC<{ title?: string; children: React.ReactNode; style?: any }> = ({ title, children, style }) => (
    <View style={[styles.card, style]}>
        {title && <Text style={styles.cardTitle}>{title}</Text>}
        {children}
    </View>
);

const InfoRow: React.FC<{ label: string; value: string | number | undefined | null }> = ({ label, value }) => {
    if (value === undefined || value === null || value === '' || value === '---') return null;
    return (
        <View style={styles.labelValueRow}>
            <Text style={styles.lvLabel}>{label}</Text>
            <Text style={styles.lvValue}>{String(value)}</Text>
        </View>
    );
};

const TechItem: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => {
    const hasValue = value !== undefined && value !== null && value !== '';
    return (
        <View style={styles.techItem}>
            <Text style={styles.techLabel}>• {label}{hasValue ? ': ' : ''}</Text>
            {hasValue ? <Text style={styles.lvValue}>{String(value)}</Text> : null}
        </View>
    );
};

const formatDate = (dateString?: string) => {
    if (!dateString || dateString === '---') return '---';
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

const getPriorityColor = (priority: string): string => {
    const p = priority.toLowerCase();
    if (p === 'alta') return '#D32F2F';
    if (p === 'média' || p === 'media') return '#F57F17';
    if (p === 'baixa') return '#388E3C';
    return '#000000';
};

// ============================================
// MAIN COMPONENT
// ============================================

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
    const images = order.produtos.map(p => p.imagem).filter(Boolean) as string[];
    const prod = order.produtos[0];

    // Debug mode (set to true to see grid boundaries)
    const DEBUG = false;
    const dStyle = DEBUG ? styles.debug : {};

    return (
        <View style={styles.orderContainer} wrap={false}>

            {/* ============================================ */}
            {/* ROW 1: HEADER (Full Width) */}
            {/* ============================================ */}
            <View style={styles.header}>
                <View style={styles.headerItem}>
                    <Text style={styles.hLabel}>Entrada: </Text>
                    <Text style={styles.hValue}>{formatDate(order.data_entrada)}</Text>
                </View>
                <View style={styles.headerItem}>
                    <Text style={styles.hLabel}>Envio: </Text>
                    <Text style={styles.hValue}>{formatDate(order.data_envio)}</Text>
                </View>
                <View style={styles.headerItem}>
                    <Text style={styles.hLabel}>Prioridade: </Text>
                    <Text style={[styles.hValue, { color: getPriorityColor(order.prioridade) }]}>
                        {order.prioridade.toUpperCase()}
                    </Text>
                </View>
                <View style={[styles.headerItem, { flex: 1, justifyContent: 'flex-end' }]}>
                    <Text style={styles.hLabel}>Transp: </Text>
                    <Text style={styles.hValue}>{order.forma_envio}</Text>
                </View>
            </View>

            {/* ============================================ */}
            {/* ROW 2: PEDIDO/CLIENTE + LOGÍSTICA */}
            {/* ============================================ */}
            <View style={[styles.row, dStyle]}>
                <View style={[styles.col55, dStyle]}>
                    <Card title="IDENTIFICAÇÃO DO PEDIDO">
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs }}>
                            <Text style={styles.pedidoNumero}>#{order.numero}</Text>
                            {order.is_reposicao && (
                                <View style={styles.badgeReposicao}>
                                    <Text>REPOSIÇÃO</Text>
                                </View>
                            )}
                            {(order as any).costura && (
                                <View style={[styles.badgeReposicao, { backgroundColor: '#9C27B0' }]}>
                                    <Text>COSTURA🧵</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.clienteNome}>{order.cliente}</Text>
                        <Text style={styles.clienteTags}>
                            {[order.telefone_cliente, order.cidade_estado].filter(Boolean).join(' | ')}
                        </Text>
                    </Card>
                </View>

                <View style={[styles.col45, dStyle]}>
                    <Card title="STATUS & LOGÍSTICA">
                        <View style={styles.logisticRow}>
                            <Text style={styles.logisticLabel}>Prioridade</Text>
                            <Text style={[styles.logisticValue, { color: getPriorityColor(order.prioridade) }]}>
                                {order.prioridade.toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.logisticRow}>
                            <Text style={styles.logisticLabel}>Transporte</Text>
                            <Text style={styles.logisticValue}>{order.forma_envio}</Text>
                        </View>
                        <View style={styles.logisticRow}>
                            <Text style={styles.logisticLabel}>Data Entrada</Text>
                            <Text style={styles.logisticValue}>{formatDate(order.data_entrada)}</Text>
                        </View>
                        <View style={{ ...styles.logisticRow, borderBottomWidth: 0 }}>
                            <Text style={styles.logisticLabel}>Data Envio</Text>
                            <Text style={styles.logisticValue}>{formatDate(order.data_envio)}</Text>
                        </View>
                    </Card>
                </View>
            </View>

            {/* ============================================ */}
            {/* ROW 3: ESPECIFICAÇÕES + PREVIEW */}
            {/* ============================================ */}
            <View style={[styles.row, dStyle]}>
                <View style={[styles.col55, dStyle]}>
                    <Card title="ESPECIFICAÇÕES DO PRODUTO">
                        <Text style={styles.prodNome}>{prod.descricao}</Text>

                        <InfoRow label="Tipo Produção" value={prod.tipo_producao.toUpperCase()} />
                        <InfoRow label="Dimensões" value={prod.dimensoes} />
                        <InfoRow label="Material/Tecido" value={prod.tecido || prod.tipo_adesivo || prod.material || '---'} />

                        <View style={styles.qtyRow}>
                            <Text style={styles.qtyLabel}>Quantidade</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.qtyValue}>{prod.quantity}</Text>
                                {prod.quantidade_paineis && (
                                    <Text style={{ fontSize: 8, color: '#666' }}>({prod.quantidade_paineis} un)</Text>
                                )}
                            </View>
                        </View>
                    </Card>
                </View>

                <View style={[styles.col45, dStyle]}>
                    <View style={styles.previewCard}>
                        <Text style={styles.previewTitle}>Preview do Modelo</Text>
                        <View style={styles.previewImageContainer}>
                            {images.length > 0 ? (
                                <Image src={images[0]} style={styles.previewImage} />
                            ) : (
                                <Text style={{ fontSize: 9, color: '#CCC', fontWeight: 'bold' }}>SEM IMAGEM</Text>
                            )}
                        </View>
                        {prod.legenda_imagem && (
                            <Text style={styles.previewCaption}>{prod.legenda_imagem}</Text>
                        )}
                    </View>
                </View>
            </View>

            {/* ============================================ */}
            {/* ROW 4: ACABAMENTOS + RIP/DATA */}
            {/* ============================================ */}
            <View style={[styles.row, dStyle]}>
                <View style={[styles.col55, dStyle]}>
                    <Card title="ACABAMENTOS & OBSERVAÇÕES">
                        <View style={styles.techGrid}>
                            {prod.overloque && <TechItem label="Overloque" />}
                            {prod.elastico && <TechItem label="Elástico" />}
                            {prod.ziper && <TechItem label="Zíper" />}
                            {prod.alcinha && <TechItem label="Alcinha" />}
                            {prod.toalha_pronta && <TechItem label="Toalha Pronta" />}
                            {prod.terceirizado && <TechItem label="Terceirizado" />}

                            {prod.acabamento_lona && <TechItem label="Acab. Lona" value={prod.acabamento_lona} />}
                            {prod.acabamento_totem && <TechItem label="Acab. Totem" value={prod.acabamento_totem} />}
                            {prod.tipo_acabamento && prod.tipo_acabamento !== 'nenhum' && (
                                <TechItem label="Acabamento" value={prod.tipo_acabamento} />
                            )}

                            {prod.quantidade_ilhos && (
                                <TechItem label="Ilhós" value={`${prod.quantidade_ilhos}un${prod.espaco_ilhos ? ` [${prod.espaco_ilhos}]` : ''}`} />
                            )}
                            {prod.quantidade_cordinha && (
                                <TechItem label="Cordinha" value={`${prod.quantidade_cordinha}un${prod.espaco_cordinha ? ` [${prod.espaco_cordinha}]` : ''}`} />
                            )}
                            {prod.emenda && (
                                <TechItem label="Emenda" value={`${prod.emenda} (${prod.emenda_qtd || 1}x)`} />
                            )}
                        </View>

                        {(prod.observacao_item || order.observacao_pedido) && (
                            <View style={styles.obsBox}>
                                <Text style={styles.obsTitle}>📢 OBSERVAÇÕES TÉCNICAS</Text>
                                {prod.observacao_item && <Text style={styles.obsText}>• {prod.observacao_item}</Text>}
                                {order.observacao_pedido && <Text style={styles.obsText}>• {order.observacao_pedido}</Text>}
                            </View>
                        )}
                    </Card>
                </View>

                <View style={[styles.col45, dStyle]}>
                    <View style={styles.ripDataCard}>
                        <Text style={styles.ripDataTitle}>CONTROLE DE PRODUÇÃO</Text>
                        <View>
                            <Text style={styles.ripDataField}>RIP: _________________</Text>
                            <Text style={styles.ripDataField}>DATA: ____/____/______</Text>
                            <Text style={{ fontSize: 7, color: '#666', marginTop: 4 }}>Assinatura do Operador</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* ============================================ */}
            {/* ROW 5: FOOTER (Full Width) */}
            {/* ============================================ */}
            <View style={styles.footer}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View>
                        <Text style={styles.footerLabel}>Vendedor</Text>
                        <Text style={styles.footerValue}>{order.vendedor || '---'}</Text>
                    </View>
                    <View>
                        <Text style={styles.footerLabel}>Designer</Text>
                        <Text style={styles.footerValue}>{order.designer || '---'}</Text>
                    </View>
                </View>
                <Text style={styles.footerLabel}>Gerado: {new Date().toLocaleString('pt-BR')}</Text>
            </View>
        </View>
    );
};
