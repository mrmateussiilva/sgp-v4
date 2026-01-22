import { StyleSheet } from '@react-pdf/renderer';

// ============================================
// DESIGN CONSTANTS - V5 (Industrial ERP Final)
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
    lg: 10,
    xl: 12,
    huge: 18,
};

export const COLORS = {
    primary: '#1565C0',
    text: '#000000',
    textSecondary: '#424242',
    textMuted: '#757575',
    border: '#E0E0E0',
    cardBg: '#FAFAFA',
    warning: '#FFF9C4',
    warningBorder: '#FBC02D',
};

// Card heights for consistent layout
export const CARD_HEIGHT = {
    preview: 180, // ~160-180pt as requested
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
    // HEADER - Minimal metadata bar
    // ============================================
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: SPACING.sm,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        marginBottom: SPACING.lg,
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
    // LAYOUT GRID
    // ============================================
    row: {
        flexDirection: 'row',
        gap: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    col55: {
        width: '55%',
    },
    col45: {
        width: '45%',
    },

    // ============================================
    // CARD SYSTEM - Consistent containers
    // ============================================
    card: {
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.cardBg,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
    },
    cardTitle: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: SPACING.md,
        paddingBottom: SPACING.xs,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
    },

    // ============================================
    // IDENTIFICATION CARD
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
    // SPECIFICATIONS CARD
    // ============================================
    productName: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        marginBottom: SPACING.md,
        lineHeight: 1.3,
    },
    specRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: SPACING.xs,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
    },
    specLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
    },
    specValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: COLORS.text,
    },

    // ============================================
    // PREVIEW CARD - Controlled size
    // ============================================
    previewCard: {
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.cardBg,
        height: CARD_HEIGHT.preview,
        marginBottom: SPACING.lg,
    },
    previewTitle: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        padding: SPACING.sm,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
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
    },

    // ============================================
    // TECHNICAL DETAILS CARD
    // ============================================
    techList: {
        marginTop: SPACING.sm,
    },
    techItem: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
        lineHeight: 1.4,
    },

    // ============================================
    // OBSERVATIONS CARD
    // ============================================
    obsCard: {
        backgroundColor: COLORS.warning,
        borderWidth: 1,
        borderColor: COLORS.warningBorder,
        borderLeftWidth: 3,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
    },
    obsText: {
        fontSize: FONT_SIZES.sm,
        lineHeight: 1.3,
        color: COLORS.text,
    },

    // ============================================
    // PRODUCTION CONTROL CARD
    // ============================================
    controlCard: {
        borderWidth: 1.5,
        borderColor: COLORS.text,
        padding: SPACING.md,
    },
    controlTitle: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: SPACING.md,
    },
    controlField: {
        fontSize: FONT_SIZES.md,
        marginBottom: SPACING.sm,
    },

    // ============================================
    // FOOTER
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
});
