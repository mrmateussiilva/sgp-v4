import { StyleSheet } from '@react-pdf/renderer';

// ============================================
// DESIGN CONSTANTS - Preview Protagonist
// ============================================

export const META_COL_WIDTH = '34%';
export const PREVIEW_COL_WIDTH = '66%';

export const SPACING = {
    xs: 3,
    sm: 5,
    md: 8,
    lg: 12,
    xl: 18,
};

export const FONT_SIZES = {
    label: 7,
    meta: 9,
    value: 10,
    title: 18, // Reduced from previous versions to not compete with image
};

export const COLORS = {
    text: '#000000',
    textMuted: '#666666',
    borderLight: '#E5E5E5',
    previewBg: '#FDFDFD',
};

export const RADIUS = {
    preview: 16,
};

// ============================================
// STYLES - Proof Sheet Aesthetic
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
        padding: '6mm',
        flexDirection: 'row',
        gap: SPACING.xl,
    },

    // ============================================
    // LEFT COLUMN: COMPACT METADATA (34%)
    // ============================================
    colMeta: {
        width: META_COL_WIDTH,
        flexDirection: 'column',
        justifyContent: 'space-between',
    },

    // Client Info
    clientArea: {
        marginBottom: SPACING.lg,
    },
    orderId: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    clientName: {
        fontSize: FONT_SIZES.title,
        fontWeight: 'bold',
        marginBottom: 2,
        lineHeight: 1.1,
    },
    clientDetails: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
    },

    // Technical Specs (Compact legend block)
    techBlock: {
        marginTop: SPACING.md,
        flex: 1,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.label,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    kvRow: {
        flexDirection: 'row',
        marginBottom: 3,
        fontSize: FONT_SIZES.meta,
    },
    kvLabel: {
        color: COLORS.textMuted,
        width: '40%',
    },
    kvValue: {
        fontWeight: 'bold',
        width: '60%',
    },

    // Technical Items (Short list)
    techList: {
        marginTop: SPACING.sm,
    },
    techItem: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        marginBottom: 1,
    },

    // Logistics Footer (Within Meta Column)
    metaFooter: {
        borderTopWidth: 0.5,
        borderTopColor: COLORS.borderLight,
        paddingTop: SPACING.sm,
    },
    logisticItem: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        marginBottom: 2,
    },

    // ============================================
    // RIGHT COLUMN: PROTAGONIST PREVIEW (66%)
    // ============================================
    colPreview: {
        width: PREVIEW_COL_WIDTH,
        flexDirection: 'column',
    },
    previewContainer: {
        flex: 1, // Occupies most vertical space
        borderWidth: 0.5,
        borderColor: COLORS.borderLight,
        borderRadius: RADIUS.preview,
        backgroundColor: COLORS.previewBg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    previewImage: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
    },
    previewPlaceholder: {
        fontSize: FONT_SIZES.meta,
        color: '#D0D0D0',
        letterSpacing: 1,
    },
    previewLabel: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: SPACING.sm,
        fontStyle: 'italic',
    },

    // ============================================
    // RODAPE OPERACIONAL (Bottom Anchor)
    // ============================================
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.md,
        gap: SPACING.xl,
    },
    lineField: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 5,
        flex: 1,
    },
    fieldLabel: {
        fontSize: FONT_SIZES.label,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    fieldLine: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.text,
        minHeight: 12,
    },

    // Badges (Short)
    badge: {
        backgroundColor: '#000000',
        color: '#FFFFFF',
        padding: '1px 4px',
        fontSize: FONT_SIZES.label,
        fontWeight: 'bold',
        borderRadius: 1,
        marginLeft: 4,
    },
});
