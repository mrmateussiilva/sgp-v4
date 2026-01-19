import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { ProductionOrder } from '../groupOrders';
import { styles } from '../styles';

interface OrderCardProps {
    order: ProductionOrder;
}

const formatDate = (dateString?: string) => {
    if (!dateString) return '---';
    // Tenta capturar YYYY-MM-DD
    const isoMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const [, y, m, d] = isoMatch;
        return `${d}/${m}/${y}`;
    }
    // Tenta capturar DD/MM/YYYY se já vier formatado mas talvez com lixo
    const brMatch = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) {
        const [, d, m, y] = brMatch;
        return `${d}/${m}/${y}`;
    }
    return dateString;
};

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
    // Pegar a primeira imagem disponível ou as imagens dos produtos
    const images = order.produtos
        .map(p => p.imagem)
        .filter(Boolean) as string[];

    const prod = order.produtos[0]; // Como agora é um por card, pegamos o primeiro

    return (
        <View style={styles.orderContainer} wrap={false}>
            {/* HEADER */}
            <View style={styles.header}>
                <View style={[styles.headerItem, { flex: 1 }]}>
                    <Text style={styles.hLabel}>Entrada: </Text>
                    <Text style={styles.hValue}>{formatDate(order.data_entrada)}</Text>
                </View>
                <View style={[styles.headerItem, { flex: 1 }]}>
                    <Text style={styles.hLabel}>Envio: </Text>
                    <Text style={styles.hValue}>{formatDate(order.data_envio)}</Text>
                </View>
                <View style={[styles.headerItem, { flex: 1 }]}>
                    <Text style={styles.hLabel}>Prioridade: </Text>
                    <Text style={[styles.hValue, { color: getPriorityColor(order.prioridade) }]}>
                        {order.prioridade.toUpperCase()}
                    </Text>
                </View>
                <View style={[styles.headerItem, { flex: 1.5 }]}>
                    <Text style={styles.hLabel}>Transporte: </Text>
                    <Text style={styles.hValue}>{order.forma_envio}</Text>
                </View>
            </View>

            {/* MAIN SECTION */}
            <View style={styles.mainSection}>
                {/* COLUNA ESQUERDA */}
                <View style={styles.colLeft}>
                    <View style={styles.pedidoBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.pedidoNumero}>#{order.numero}</Text>
                            {order.is_reposicao && (
                                <View style={styles.badgeReposicao}>
                                    <Text style={{ fontSize: 7, color: 'white' }}>REPOSIÇÃO</Text>
                                </View>
                            )}
                            {(order as any).costura && (
                                <View style={[styles.badgeReposicao, { backgroundColor: '#9C27B0' }]}>
                                    <Text style={{ fontSize: 7, color: 'white' }}>COSTURA🧵</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.clienteInfo}>
                            <Text style={styles.clienteNome}>{order.cliente}</Text>
                            <Text style={styles.clienteTags}>
                                {order.telefone_cliente && `${order.telefone_cliente} `}
                                {order.cidade_estado && `| ${order.cidade_estado}`}
                            </Text>
                        </View>
                    </View>

                    {/* INFORMAÇÕES DO PRODUTO */}
                    <View style={{ marginBottom: 5 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                            <View style={[styles.tipoBadge, { borderColor: '#1976D2', color: '#1976D2' }]}>
                                <Text style={{ fontSize: 7 }}>{prod.tipo_producao.toUpperCase()}</Text>
                            </View>
                            <Text style={[styles.prodNome, { marginBottom: 0, borderLeftWidth: 0, paddingLeft: 4 }]}>
                                {prod.descricao}
                            </Text>
                        </View>

                        <View style={styles.infoGrid}>
                            <View>
                                <Text style={styles.hLabel}>Dimensões</Text>
                                <Text style={styles.hValue}>{prod.dimensoes}</Text>
                                <Text style={[styles.hLabel, { marginTop: 2 }]}>Material/Tecido</Text>
                                <Text style={[styles.hValue, { fontSize: 8 }]}>
                                    {prod.tecido || prod.tipo_adesivo || prod.material || 'Não especificado'}
                                </Text>
                            </View>
                            <View style={styles.qtyBox}>
                                <Text style={styles.qtyLabel}>QTD</Text>
                                <Text style={styles.qtyValue}>{prod.quantity}</Text>
                                {prod.quantidade_paineis && (
                                    <Text style={{ fontSize: 7, color: '#666' }}>({prod.quantidade_paineis} un)</Text>
                                )}
                            </View>
                        </View>

                        {/* DETALHES TÉCNICOS / ACABAMENTOS */}
                        <View style={styles.techSection}>
                            <View style={styles.techGrid}>
                                {prod.tipo_producao.toLowerCase() === 'costura' && <TechBadge label="Produção" value="COSTURA 🧵" />}
                                {prod.tecido && <TechBadge label="Tecido" value={prod.tecido} />}
                                {prod.overloque && <TechBadge label="✅ Overloque" />}
                                {prod.elastico && <TechBadge label="✅ Elástico" />}
                                {prod.ziper && <TechBadge label="✅ Zíper" />}
                                {prod.alcinha && <TechBadge label="✅ Alcinha" />}
                                {prod.toalha_pronta && <TechBadge label="✅ Toalha Pronta" />}
                                {prod.terceirizado && <TechBadge label="⚠️ Terceirizado" />}

                                {prod.acabamento_lona && <TechBadge label="Acab. Lona" value={prod.acabamento_lona} />}
                                {prod.tipo_adesivo && <TechBadge label="Material" value={prod.tipo_adesivo} />}
                                {prod.acabamento_totem && <TechBadge label="Acab. Totem" value={prod.acabamento_totem} />}
                                {prod.acabamento_totem_outro && <TechBadge label="Extra" value={prod.acabamento_totem_outro} />}

                                {prod.tipo_acabamento && prod.tipo_acabamento !== 'nenhum' && (
                                    <TechBadge label="Acabamento" value={prod.tipo_acabamento} />
                                )}

                                {prod.quantidade_ilhos && (
                                    <TechBadge
                                        label="Ilhós"
                                        value={`${prod.quantidade_ilhos}un${prod.espaco_ilhos ? ` (Esp: ${prod.espaco_ilhos})` : ''}`}
                                    />
                                )}

                                {prod.quantidade_cordinha && (
                                    <TechBadge
                                        label="Cordinha"
                                        value={`${prod.quantidade_cordinha}un${prod.espaco_cordinha ? ` (Esp: ${prod.espaco_cordinha})` : ''}`}
                                    />
                                )}

                                {prod.emenda && (
                                    <TechBadge label="Emenda" value={`${prod.emenda} (${prod.emenda_qtd || 1}x)`} />
                                )}

                                {prod.metro_quadrado && (
                                    <TechBadge label="M²" value={`${prod.metro_quadrado}m²`} />
                                )}
                            </View>
                        </View>

                        {prod.observacao_item && (
                            <View style={[styles.obsBox, { borderLeftColor: '#FF9800', marginTop: 4 }]}>
                                <Text style={styles.obsTitle}>⚙️ Instruções do Item</Text>
                                <Text style={styles.obsText}>{prod.observacao_item}</Text>
                            </View>
                        )}
                    </View>

                    {/* OBSERVAÇÃO DO PEDIDO */}
                    {order.observacao_pedido && (
                        <View style={styles.obsContainer}>
                            <View style={[styles.obsBox, { borderLeftColor: '#2196F3' }]}>
                                <Text style={styles.obsTitle}>📋 Observações do Pedido</Text>
                                <Text style={styles.obsText}>{order.observacao_pedido}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* COLUNA DIREITA - IMAGEM */}
                <View style={styles.colRight}>
                    <Text style={styles.imgTitle}>Visualização da Arte</Text>
                    <View style={styles.imgBox}>
                        {images.length > 0 ? (
                            <View style={{ width: '100%', height: '100%', padding: 2 }}>
                                {images.slice(0, 1).map((img, i) => (
                                    <Image
                                        key={i}
                                        src={img}
                                        style={styles.image}
                                    />
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.noImg}>SEM PRÉVIA</Text>
                        )}
                    </View>
                    {prod?.legenda_imagem && (
                        <Text style={styles.imgCaption}>{prod.legenda_imagem}</Text>
                    )}
                </View>
            </View>

            {/* FOOTER */}
            <View style={styles.footer}>
                <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>Designer x Vendedor</Text>
                    <Text style={styles.footerValue}>{order.designer || '---'} x {order.vendedor || '---'}</Text>
                </View>
                <View style={[styles.footerItem, { alignItems: 'flex-end', flex: 1.2 }]}>
                    <Text style={styles.footerLabel}>Controle de Produção</Text>
                    <Text style={{ fontSize: 8 }}>RIP: _______ DATA: __/__/__</Text>
                </View>
            </View>
        </View>
    );
};

const TechBadge = ({ label, value }: { label: string; value?: string }) => (
    <View style={styles.techBadge}>
        <Text style={styles.techLabel}>{label}{value ? ': ' : ''}</Text>
        {value && <Text style={styles.techValue}>{value}</Text>}
    </View>
);

function getPriorityColor(priority: string): string {
    const p = priority.toLowerCase();
    if (p === 'alta') return '#D32F2F';
    if (p === 'média' || p === 'media') return '#F57F17';
    if (p === 'baixa') return '#388E3C';
    return '#000000';
}
