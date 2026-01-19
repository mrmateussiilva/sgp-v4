import React from 'react';
import { Document, Page } from '@react-pdf/renderer';
import { ProductionOrder } from './groupOrders';
import { OrderCard } from './components/OrderCard';
import { styles } from './styles';

interface ProductionReportPDFProps {
    pedidos: ProductionOrder[];
}

/**
 * Componente principal do Relatório de Controle de Produção.
 * Renderiza os pedidos em formato A4, garantindo que pedidos não sejam quebrados entre páginas.
 */
export const ProductionReportPDF: React.FC<ProductionReportPDFProps> = ({ pedidos }) => {
    return (
        <Document
            title={`Relatório de Produção - ${new Date().toLocaleDateString()}`}
            author="SGP-v4"
            creator="React-PDF"
        >
            <Page size="A4" style={styles.page}>
                {pedidos.map((pedido) => (
                    <OrderCard key={pedido.id} order={pedido} />
                ))}
            </Page>
        </Document>
    );
};
