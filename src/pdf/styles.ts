import { StyleSheet } from '@react-pdf/renderer';

// ============================================
// DESIGN CONSTANTS - V3 (Row-Based Card Layout)
// ============================================

export const SPACING = {
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
};

export const FONT_SIZES = {
    xs: 7,
    sm: 8,
    md: 9,
    lg: 10,
    xl: 12,
    title: 16,
};

export const COLORS = {
    primary: '#1565C0',
    secondary: '#C62828',
    border: '#DDDDDD',
    borderDark: '#999999',
    text: '#000000',
    textSecondary: '#444444',
    textMuted: '#666666',
    bgCard: '#FAFAFA',
    bgHeader: '#F5F5F5',
    warning: '#FFF9C4',
    warningBorder: '#FBC02D',
    reposicao: '#FF6B35',
};

export const CARD_HEIGHT = {
    preview: '55mm',
    ripData: '35mm',
};

// ============================================
// STYLES
// ============================================

export const styles = StyleSheet.create({
    // Container
    page: {
        padding: 0,
        backgroundColor: '#FFFFFF',
        fontFamily: 'Helvetica',
    },
    orderContainer: {
        width: '100%',
        height: '148mm',
        padding: '5mm',
        flexDirection: 'column',
    },

    // ============================================
    // ROW 1: HEADER (Full Width)
    // ============================================
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1.5,
        borderBottomColor: COLORS.text,
        marginBottom: SPACING.lg,
    },
    headerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    hLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
    },
    hValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.text,
    },

    // ============================================
    // LAYOUT STRUCTURE
    // ============================================
    row: {
        flexDirection: 'row',
        gap: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    col55: {
        width: '55%',
        flexDirection: 'column',
    },
    col45: {
        width: '45%',
        flexDirection: 'column',
    },

    // ============================================
    // CARD COMPONENT
    // ============================================
    card: {
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard,
        padding: SPACING.md,
        height: '100%',
    },
    cardTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        marginBottom: SPACING.sm,
        paddingBottom: SPACING.xs,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },

    // ============================================
    // ROW 2: PEDIDO/CLIENTE + LOGÍSTICA
    // ============================================
    pedidoNumero: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: SPACING.xs,
    },
    clienteNome: {
        fontSize: FONT_SIZES.title,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: SPACING.xs,
    },
    clienteTags: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    badgeReposicao: {
        backgroundColor: COLORS.reposicao,
        color: '#FFFFFF',
        padding: '2px 6px',
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        marginLeft: 6,
        borderRadius: 2,
    },

    // Logistics card (right side row 2)
    logisticRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
        paddingBottom: SPACING.xs,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
    },
    logisticLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
    },
    logisticValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },

    // ============================================
    // ROW 3: ESPECIFICAÇÕES + PREVIEW
    // ============================================
    prodNome: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        backgroundColor: COLORS.primary,
        color: '#FFFFFF',
        padding: '3 6',
        marginBottom: SPACING.md,
    },

    // Label-Value pairs
    labelValueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: SPACING.xs,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
    },
    lvLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
    },
    lvValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.text,
    },

    // Quantity highlight
    qtyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        borderWidth: 1,
        borderColor: COLORS.secondary,
        padding: SPACING.sm,
        marginTop: SPACING.sm,
    },
    qtyLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: COLORS.secondary,
        textTransform: 'uppercase',
    },
    qtyValue: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },

    // Preview card (fixed height)
    previewCard: {
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#FFFFFF',
        height: CARD_HEIGHT.preview,
        flexDirection: 'column',
    },
    previewTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: COLORS.text,
        backgroundColor: COLORS.bgHeader,
        textAlign: 'center',
        paddingVertical: SPACING.xs,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        textTransform: 'uppercase',
    },
    previewImageContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.sm,
    },
    previewImage: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
    },
    previewCaption: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        textAlign: 'center',
        padding: SPACING.xs,
        fontStyle: 'italic',
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
    },

    // ============================================
    // ROW 4: ACABAMENTOS + RIP/DATA
    // ============================================
    techGrid: {
        flexDirection: 'column',
        gap: 2,
    },
    techItem: {
        fontSize: FONT_SIZES.sm,
        marginBottom: 2,
    },
    techLabel: {
        fontWeight: 'bold',
        color: COLORS.textSecondary,
    },

    // Observations
    obsBox: {
        marginTop: SPACING.md,
        padding: SPACING.sm,
        backgroundColor: COLORS.warning,
        borderWidth: 1,
        borderColor: COLORS.warningBorder,
        borderLeftWidth: 3,
    },
    obsTitle: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        color: '#E65100',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    obsText: {
        fontSize: FONT_SIZES.sm,
        lineHeight: 1.2,
        color: COLORS.text,
    },

    // RIP/DATA card (fixed height, structured)
    ripDataCard: {
        borderWidth: 1.5,
        borderColor: COLORS.borderDark,
        backgroundColor: '#FFFFFF',
        padding: SPACING.md,
        height: CARD_HEIGHT.ripData,
        justifyContent: 'space-between',
    },
    ripDataTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: COLORS.text,
        textTransform: 'uppercase',
        marginBottom: SPACING.sm,
    },
    ripDataField: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
    },

    // ============================================
    // ROW 5: FOOTER (Full Width)
    // ============================================
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.sm,
        marginTop: 'auto',
    },
    footerLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    footerValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
    },

    // Debug mode
    debug: {
        borderWidth: 1,
        borderColor: 'magenta',
        borderStyle: 'dashed',
    },
});
