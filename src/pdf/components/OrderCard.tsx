import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { ProductionOrder } from '../groupOrders';
import { styles } from '../styles';

interface OrderCardProps {
    order: ProductionOrder;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
    // Pegar a primeira imagem disponível ou as imagens dos produtos
    const images = order.produtos
        .map(p => p.imagem)
        .filter(Boolean) as string[];

    return (
        <View style={styles.orderContainer} wrap={false}>
            {/* HEADER */}
            <View style={styles.header}>
                <View style={styles.headerItem}>
                    <Text style={styles.hLabel}>Data Envio: </Text>
                    <Text style={styles.hValue}>{order.data_envio}</Text>
                </View>
                <View style={styles.headerItem}>
                    <Text style={styles.hLabel}>Prioridade: </Text>
                    <Text style={[styles.hValue, { color: getPriorityColor(order.prioridade) }]}>
                        {order.prioridade.toUpperCase()}
                    </Text>
                </View>
                <View style={styles.headerItem}>
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
                        </View>
                        <View style={styles.clienteInfo}>
                            <Text style={styles.clienteNome}>{order.cliente}</Text>
                            <Text style={styles.clienteTags}>
                                {order.telefone_cliente && `${order.telefone_cliente} `}
                                {order.cidade_estado && `| ${order.cidade_estado}`}
                            </Text>
                        </View>
                    </View>

                    {/* LISTA DE PRODUTOS/ITENS */}
                    {order.produtos.map((prod) => (
                        <View key={prod.id} style={{ marginBottom: 5 }}>
                            <Text style={styles.prodNome}>{prod.descricao}</Text>
                            <View style={styles.infoGrid}>
                                <View>
                                    <Text style={styles.hLabel}>Dimensões</Text>
                                    <Text style={styles.hValue}>{prod.dimensoes}</Text>
                                    <Text style={[styles.hLabel, { marginTop: 2 }]}>Material</Text>
                                    <Text style={[styles.hValue, { fontSize: 8 }]}>{prod.material}</Text>
                                </View>
                                <View style={styles.qtyBox}>
                                    <Text style={styles.qtyLabel}>QTD</Text>
                                    <Text style={styles.qtyValue}>{prod.quantity}</Text>
                                </View>
                            </View>
                            {prod.observacao_item && (
                                <View style={[styles.obsBox, { borderLeftColor: '#FF9800' }]}>
                                    <Text style={styles.obsTitle}>⚙️ Produção</Text>
                                    <Text style={styles.obsText}>{prod.observacao_item}</Text>
                                </View>
                            )}
                        </View>
                    ))}

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
                                {/* Mostra até 2 previews se houver, ou apenas um grande */}
                                {images.slice(0, 2).map((img, i) => (
                                    <Image
                                        key={i}
                                        src={img}
                                        style={[
                                            styles.image,
                                            images.length > 1 ? { height: '48%' } : { height: '100%' }
                                        ]}
                                    />
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.noImg}>SEM PRÉVIA</Text>
                        )}
                    </View>
                    {order.produtos[0]?.legenda_imagem && (
                        <Text style={styles.imgCaption}>{order.produtos[0].legenda_imagem}</Text>
                    )}
                </View>
            </View>

            {/* FOOTER */}
            <View style={styles.footer}>
                <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>Designer</Text>
                    <Text style={styles.footerValue}>{order.designer || '---'}</Text>
                </View>
                <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>Vendedor</Text>
                    <Text style={styles.footerValue}>{order.vendedor || '---'}</Text>
                </View>
                <View style={[styles.footerItem, { alignItems: 'flex-end', flex: 1.5 }]}>
                    <Text style={styles.footerLabel}>Controle de Produção</Text>
                    <Text style={{ fontSize: 8 }}>RIP: _______ DATA: __/__/__</Text>
                </View>
            </View>
        </View>
    );
};

function getPriorityColor(priority: string): string {
    const p = priority.toLowerCase();
    if (p === 'alta') return '#D32F2F';
    if (p === 'média' || p === 'media') return '#F57F17';
    if (p === 'baixa') return '#388E3C';
    return '#000000';
}
