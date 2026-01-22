import { StyleSheet } from '@react-pdf/renderer';

// ============================================
// DESIGN CONSTANTS - V4 (Clean Hierarchy)
// ============================================

export const SPACING = {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
};

export const FONT_SIZES = {
    xs: 7,
    sm: 8,
    md: 9,
    lg: 11,
    xl: 14,
    huge: 18,
};

export const COLORS = {
    primary: '#1565C0',
    secondary: '#C62828',
    border: '#E0E0E0',
    text: '#000000',
    textSecondary: '#424242',
    textMuted: '#757575',
    bgLight: '#FAFAFA',
    warning: '#FFF9C4',
    warningBorder: '#FBC02D',
};

export const CARD_HEIGHT = {
    preview: '50mm',
};

// ============================================
// STYLES
// ============================================

export const styles = StyleSheet.create({
    page: {
        padding: 0,
        backgroundColor: '#FFFFFF',
        fontFamily: 'Helvetica',
    },
    orderContainer: {
        width: '100%',
        height: '148mm',
        padding: '6mm',
        flexDirection: 'column',
    },

    // ============================================
    // HEADER - Minimal
    // ============================================
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: SPACING.sm,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        marginBottom: SPACING.xl,
    },
    headerItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    hLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    hValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: COLORS.text,
    },

    // ============================================
    // LAYOUT
    // ============================================
    row: {
        flexDirection: 'row',
        gap: SPACING.xl,
        marginBottom: SPACING.xl,
    },
    col60: {
        width: '60%',
    },
    col40: {
        width: '40%',
    },

    // ============================================
    // SECTION TITLES (Subtle)
    // ============================================
    sectionTitle: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: SPACING.sm,
    },

    // ============================================
    // PEDIDO/CLIENTE - Hero Section
    // ============================================
    orderNumber: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        marginBottom: SPACING.xs,
    },
    clientName: {
        fontSize: FONT_SIZES.huge,
        fontWeight: 'bold',
        lineHeight: 1.2,
        marginBottom: SPACING.xs,
    },
    clientMeta: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    badge: {
        backgroundColor: '#FF6B35',
        color: '#FFFFFF',
        padding: '2px 6px',
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        marginLeft: 6,
        borderRadius: 2,
    },

    // ============================================
    // PRODUCT INFO
    // ============================================
    productName: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        marginBottom: SPACING.md,
        lineHeight: 1.3,
    },

    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: SPACING.xs,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
    },
    infoLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
    },
    infoValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        color: COLORS.text,
    },

    // Quantity - Highlighted
    qtyBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        padding: SPACING.md,
        marginTop: SPACING.md,
        marginBottom: SPACING.md,
    },
    qtyLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    qtyValue: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },

    // ============================================
    // PREVIEW - Clean, No Border Clutter
    // ============================================
    previewContainer: {
        height: CARD_HEIGHT.preview,
        backgroundColor: COLORS.bgLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    previewImage: {
        maxWidth: '95%',
        maxHeight: '95%',
        objectFit: 'contain',
    },
    previewCaption: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        textAlign: 'center',
        fontStyle: 'italic',
    },

    // ============================================
    // TECHNICAL SPECS - List Style
    // ============================================
    techList: {
        marginTop: SPACING.md,
    },
    techItem: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
        lineHeight: 1.4,
    },

    // ============================================
    // OBSERVATIONS - Minimal Warning
    // ============================================
    obsBox: {
        backgroundColor: COLORS.warning,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.warningBorder,
        padding: SPACING.md,
        marginTop: SPACING.md,
    },
    obsText: {
        fontSize: FONT_SIZES.sm,
        lineHeight: 1.3,
        color: COLORS.text,
    },

    // ============================================
    // RIP/DATA - Clean Box
    // ============================================
    ripDataBox: {
        borderWidth: 1,
        borderColor: COLORS.text,
        padding: SPACING.md,
        marginTop: SPACING.md,
    },
    ripDataField: {
        fontSize: FONT_SIZES.md,
        marginBottom: SPACING.sm,
    },

    // ============================================
    // FOOTER - Minimal
    // ============================================
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: SPACING.md,
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
        marginTop: 'auto',
    },
    footerText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },

    // Divider
    divider: {
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        marginVertical: SPACING.lg,
    },
});
