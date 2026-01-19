import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
    page: {
        padding: 0,
        backgroundColor: '#FFFFFF',
        fontFamily: 'Helvetica',
    },
    orderContainer: {
        width: '100%',
        minHeight: '148.5mm', // Metade do A4
        padding: '5mm',
        borderBottomWidth: 1,
        borderBottomColor: '#DDDDDD',
        display: 'flex',
        flexDirection: 'column',
    },
    // Sub-blocos para garantir que não quebrem
    noBreak: {
        // Note: react-pdf doesn't support wrap: false in StyleSheet, 
        // it's a prop on the View component.
    },
    header: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '7mm',
        borderBottomWidth: 1,
        borderBottomColor: '#DDDDDD',
        marginBottom: '2mm',
    },
    headerItem: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    hLabel: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#666666',
        textTransform: 'uppercase',
    },
    hValue: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#000000',
    },
    mainSection: {
        display: 'flex',
        flexDirection: 'row',
        gap: '3mm',
        flex: 1,
    },
    colLeft: {
        width: '90mm',
        display: 'flex',
        flexDirection: 'column',
    },
    pedidoBox: {
        height: '22mm',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        marginBottom: '2mm',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    },
    pedidoNumero: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#000000',
    },
    badgeReposicao: {
        backgroundColor: '#FF6B35',
        color: '#FFFFFF',
        padding: '1px 4px',
        fontSize: 7,
        fontWeight: 'bold',
        marginLeft: 4,
        borderRadius: 2,
    },
    clienteInfo: {
        marginTop: 2,
    },
    clienteNome: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    clienteTags: {
        fontSize: 8,
        color: '#666666',
        marginTop: 1,
    },
    tipoBadge: {
        marginTop: 2,
        padding: '1px 4px',
        fontSize: 7,
        fontWeight: 'bold',
        borderWidth: 1,
        borderRadius: 2,
        alignSelf: 'flex-start',
    },
    prodNome: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        borderLeftWidth: 2,
        borderLeftColor: '#1976D2',
        paddingLeft: '2mm',
        marginBottom: '2mm',
    },
    infoGrid: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: '2mm',
    },
    qtyBox: {
        alignItems: 'flex-end',
    },
    qtyLabel: {
        fontSize: 7,
        color: '#999999',
    },
    qtyValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#D32F2F',
    },
    techSection: {
        borderLeftWidth: 2,
        borderLeftColor: '#E0E0E0',
        paddingLeft: '2mm',
        marginBottom: '2mm',
    },
    techItem: {
        fontSize: 8,
        marginBottom: 2,
    },
    obsContainer: {
        marginTop: 'auto',
        paddingTop: '2mm',
    },
    obsBox: {
        borderLeftWidth: 3,
        paddingLeft: '2mm',
        marginBottom: 4,
    },
    obsTitle: {
        fontSize: 7,
        fontWeight: 'bold',
        color: '#666666',
        textTransform: 'uppercase',
        marginBottom: 1,
    },
    obsText: {
        fontSize: 7,
        lineHeight: 1.2,
    },
    colRight: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    imgTitle: {
        fontSize: 7,
        fontWeight: 'bold',
        color: '#999999',
        textAlign: 'center',
        marginBottom: '1mm',
    },
    imgBox: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#DDDDDD',
        borderRadius: 3,
        backgroundColor: '#FAFAFA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    noImg: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#CCCCCC',
    },
    imgCaption: {
        fontSize: 8,
        color: '#666666',
        textAlign: 'center',
        marginTop: '1mm',
        fontStyle: 'italic',
    },
    footer: {
        height: '8mm',
        borderTopWidth: 1,
        borderTopColor: '#DDDDDD',
        marginTop: '2mm',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        fontSize: 7,
    },
    footerItem: {
        flex: 1,
    },
    footerLabel: {
        fontSize: 7,
        color: '#999999',
    },
    footerValue: {
        fontSize: 8,
        fontWeight: 'bold',
    }
});
