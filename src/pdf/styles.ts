import { StyleSheet } from '@react-pdf/renderer';

// ============================================
// DESIGN CONSTANTS - Industrial Form
// ============================================

export const SPACING = {
    xs: 2,
    sm: 3,
    md: 6,
    lg: 10,
};

export const FONT_SIZES = {
    xs: 7,
    sm: 8,
    md: 9,
    lg: 11,
    xl: 14,
};

export const COLORS = {
    text: '#000000',
    textLight: '#666666',
    line: '#000000',
    lineThin: '#CCCCCC',
};

// ============================================
// STYLES - Industrial Production Order
// ============================================

export const styles = StyleSheet.create({
    page: {
        padding: 0,
        backgroundColor: '#FFFFFF',
        fontFamily: 'Helvetica',
    },
    container: {
        width: '100%',
        height: '148mm',
        padding: '8mm',
        flexDirection: 'column',
    },

    // ============================================
    // HEADER - Company/Document Title
    // ============================================
    docTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: SPACING.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // ============================================
    // SECTION DIVIDERS
    // ============================================
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.line,
        marginVertical: SPACING.md,
    },
    dividerThin: {
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.lineThin,
        marginVertical: SPACING.sm,
    },

    // ============================================
    // SECTION HEADERS
    // ============================================
    sectionHeader: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: SPACING.sm,
        marginTop: SPACING.sm,
    },

    // ============================================
    // METADATA ROW (Horizontal info)
    // ============================================
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    metaLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        marginRight: 4,
    },
    metaValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
    },

    // ============================================
    // CLIENT SECTION
    // ============================================
    orderNumber: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
    },
    clientName: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
    },
    clientInfo: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textLight,
        marginBottom: SPACING.xs,
    },

    // ============================================
    // PRODUCT SPECS (Inline)
    // ============================================
    specsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    specItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    specLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        textTransform: 'uppercase',
        marginRight: 4,
    },
    specValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },

    // ============================================
    // PRODUCT NAME
    // ============================================
    productName: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        marginBottom: SPACING.md,
        lineHeight: 1.2,
    },

    // ============================================
    // TECHNICAL LIST
    // ============================================
    techList: {
        marginTop: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    techItem: {
        fontSize: FONT_SIZES.sm,
        marginBottom: 2,
        lineHeight: 1.3,
    },

    // ============================================
    // TWO COLUMN LAYOUT (for preview + details)
    // ============================================
    twoCol: {
        flexDirection: 'row',
        gap: SPACING.lg,
        marginTop: SPACING.md,
    },
    col70: {
        width: '70%',
    },
    col30: {
        width: '30%',
    },

    // ============================================
    // PREVIEW (Small, reference only)
    // ============================================
    previewBox: {
        borderWidth: 1,
        borderColor: COLORS.lineThin,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    previewImage: {
        maxWidth: '95%',
        maxHeight: '95%',
        objectFit: 'contain',
    },
    previewLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        textAlign: 'center',
        marginTop: SPACING.xs,
    },

    // ============================================
    // OBSERVATIONS
    // ============================================
    obsBox: {
        borderWidth: 1,
        borderColor: COLORS.line,
        padding: SPACING.sm,
        marginTop: SPACING.md,
        marginBottom: SPACING.md,
    },
    obsLabel: {
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: SPACING.xs,
    },
    obsText: {
        fontSize: FONT_SIZES.sm,
        lineHeight: 1.3,
    },

    // ============================================
    // PRODUCTION CONTROL (Footer)
    // ============================================
    controlSection: {
        marginTop: 'auto',
        borderTopWidth: 2,
        borderTopColor: COLORS.line,
        paddingTop: SPACING.md,
    },
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    controlField: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },

    // ============================================
    // FOOTER
    // ============================================
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: 0.5,
        borderTopColor: COLORS.lineThin,
    },
    footerText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
    },

    // Badge
    badge: {
        backgroundColor: '#000000',
        color: '#FFFFFF',
        padding: '2px 4px',
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        marginLeft: 6,
    },
});
