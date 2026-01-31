import React from 'react';
import {
    Document,
    Page,
    View,
    Text,
    Image,
    StyleSheet,
} from '@react-pdf/renderer';

// Tipos
export interface ProductionItem {
    numero: string;
    cliente: string;
    telefone_cliente?: string;
    cidade_estado?: string;
    descricao: string;
    dimensoes: string;
    quantity: number;
    material: string;
    tipo_producao: string;
    data_envio: string;
    prioridade: string;
    forma_envio: string;
    imagem?: string;
    observacao_pedido?: string;
    observacao_item?: string;
    is_reposicao: boolean;
    designer?: string;
    vendedor?: string;
}

// Estilos
const styles = StyleSheet.create({
    page: {
        padding: 0,
        backgroundColor: '#ffffff',
        fontFamily: 'Helvetica',
    },
    item: {
        height: '148.5mm', // 297mm / 2 = 148.5mm (exatamente metade da página A4)
        padding: '5mm',
        borderBottom: '0.5pt solid #ddd',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3,
        paddingBottom: 2,
        borderBottom: '1pt solid #444',
        fontSize: 9,
    },
    headerItem: {
        flexDirection: 'row',
        gap: 2,
    },
    headerLabel: {
        fontFamily: 'Helvetica-Bold',
        color: '#666',
        textTransform: 'uppercase',
    },
    headerValue: {
        fontFamily: 'Helvetica-Bold',
        color: '#000',
    },
    prioridadeAlta: {
        color: '#d32f2f',
    },
    prioridadeMedia: {
        color: '#f57c00',
    },
    prioridadeBaixa: {
        color: '#388e3c',
    },
    mainContent: {
        flexDirection: 'row',
        gap: 3,
        flex: 1,
    },
    leftColumn: {
        flex: 2,
        display: 'flex',
        flexDirection: 'column',
    },
    rightColumn: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    pedidoBox: {
        marginBottom: 2,
    },
    pedidoNumero: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        color: '#1976d2',
        marginBottom: 2,
    },
    reposicaoBadge: {
        backgroundColor: '#ff9800',
        color: '#fff',
        padding: '1mm',
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        marginLeft: 2,
    },
    clienteNome: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 1,
    },
    clienteInfo: {
        fontSize: 9,
        color: '#666',
    },
    tipoBadge: {
        backgroundColor: '#4caf50',
        color: '#fff',
        padding: '1mm',
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    produtoNome: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 2,
    },
    infoGrid: {
        flexDirection: 'row',
        gap: 2,
        marginBottom: 2,
    },
    infoItem: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 7,
        color: '#666',
        textTransform: 'uppercase',
        marginBottom: 1,
    },
    infoValue: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
    },
    qtyBox: {
        backgroundColor: '#e3f2fd',
        padding: 2,
        textAlign: 'center',
    },
    qtyLabel: {
        fontSize: 7,
        color: '#1976d2',
        fontFamily: 'Helvetica-Bold',
    },
    qty: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: '#1976d2',
    },
    techSection: {
        marginBottom: 2,
    },
    techItem: {
        flexDirection: 'row',
        fontSize: 9,
        marginBottom: 1,
    },
    techLabel: {
        fontFamily: 'Helvetica-Bold',
        marginRight: 2,
    },
    specs: {
        fontSize: 8,
        lineHeight: 1.4,
    },
    specItem: {
        marginBottom: 1,
    },
    obsContainer: {
        marginTop: 2,
    },
    obs: {
        backgroundColor: '#fff3e0',
        padding: 2,
        marginBottom: 1,
        fontSize: 8,
    },
    obsTitle: {
        fontFamily: 'Helvetica-Bold',
        marginBottom: 1,
    },
    imageBox: {
        border: '1pt solid #ddd',
        backgroundColor: '#fafafa',
        padding: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '110mm',
    },
    image: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
    },
    noImage: {
        fontSize: 10,
        color: '#999',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
        paddingTop: 2,
        borderTop: '1pt solid #444',
        fontSize: 8,
    },
    footerItem: {
        flexDirection: 'column',
    },
    footerLabel: {
        fontSize: 7,
        color: '#666',
        textTransform: 'uppercase',
        marginBottom: 1,
    },
    footerValue: {
        fontFamily: 'Helvetica-Bold',
    },
});

// Helper: Agrupar itens em páginas de 2
function chunkItems(items: ProductionItem[], size: number = 2): ProductionItem[][] {
    const chunks: ProductionItem[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

// Componente: Item Individual
const ProductionItemView: React.FC<{ item: ProductionItem }> = ({ item }) => {
    const prioridadeStyle =
        item.prioridade === 'Alta'
            ? styles.prioridadeAlta
            : item.prioridade === 'Média'
                ? styles.prioridadeMedia
                : styles.prioridadeBaixa;

    return (
        <View style={styles.item}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerItem}>
                    <Text style={styles.headerLabel}>Data Envio:</Text>
                    <Text style={styles.headerValue}>{item.data_envio}</Text>
                </View>
                <View style={styles.headerItem}>
                    <Text style={styles.headerLabel}>Prioridade:</Text>
                    <Text style={[styles.headerValue, prioridadeStyle]}>
                        {item.prioridade}
                    </Text>
                </View>
                <View style={styles.headerItem}>
                    <Text style={styles.headerLabel}>Transporte:</Text>
                    <Text style={styles.headerValue}>{item.forma_envio}</Text>
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
                {/* Left Column */}
                <View style={styles.leftColumn}>
                    {/* Pedido e Cliente */}
                    <View style={styles.pedidoBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.pedidoNumero}>#{item.numero}</Text>
                            {item.is_reposicao && (
                                <Text style={styles.reposicaoBadge}>REPOSIÇÃO</Text>
                            )}
                        </View>
                        <Text style={styles.clienteNome}>{item.cliente}</Text>
                        {item.telefone_cliente && (
                            <Text style={styles.clienteInfo}>{item.telefone_cliente}</Text>
                        )}
                        {item.cidade_estado && (
                            <Text style={styles.clienteInfo}>{item.cidade_estado}</Text>
                        )}
                        <Text style={styles.tipoBadge}>{item.tipo_producao}</Text>
                    </View>

                    {/* Produto */}
                    <Text style={styles.produtoNome}>{item.descricao}</Text>

                    {/* Info Grid */}
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Dimensões</Text>
                            <Text style={styles.infoValue}>{item.dimensoes}</Text>
                        </View>
                        <View style={styles.qtyBox}>
                            <Text style={styles.qtyLabel}>QTD</Text>
                            <Text style={styles.qty}>{item.quantity}</Text>
                        </View>
                    </View>

                    {/* Ficha Técnica */}
                    <View style={styles.techSection}>
                        <View style={styles.techItem}>
                            <Text style={styles.techLabel}>Material:</Text>
                            <Text>{item.material}</Text>
                        </View>
                    </View>

                    {/* Observações */}
                    {(item.observacao_pedido || item.observacao_item) && (
                        <View style={styles.obsContainer}>
                            {item.observacao_pedido && (
                                <View style={styles.obs}>
                                    <Text style={styles.obsTitle}>📋 Observações do Pedido</Text>
                                    <Text>{item.observacao_pedido}</Text>
                                </View>
                            )}
                            {item.observacao_item && (
                                <View style={styles.obs}>
                                    <Text style={styles.obsTitle}>⚙️ Observações de Produção</Text>
                                    <Text>{item.observacao_item}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Right Column - Image */}
                <View style={styles.rightColumn}>
                    <View style={styles.imageBox}>
                        {item.imagem ? (
                            <Image src={item.imagem} style={styles.image} />
                        ) : (
                            <Text style={styles.noImage}>SEM PRÉVIA</Text>
                        )}
                    </View>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>Designer</Text>
                    <Text style={styles.footerValue}>{item.designer || '—'}</Text>
                </View>
                <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>Vendedor</Text>
                    <Text style={styles.footerValue}>{item.vendedor || '—'}</Text>
                </View>
            </View>
        </View>
    );
};

// Componente Principal: Documento PDF
export const ProductionSheetPDF: React.FC<{ items: ProductionItem[] }> = ({
    items,
}) => {
    const pages = chunkItems(items, 2); // 2 itens por página

    return (
        <Document>
            {pages.map((pageItems, pageIndex) => (
                <Page key={pageIndex} size="A4" style={styles.page}>
                    {pageItems.map((item, itemIndex) => (
                        <ProductionItemView key={itemIndex} item={item} />
                    ))}
                </Page>
            ))}
        </Document>
    );
};
