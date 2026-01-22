import { StyleSheet } from '@react-pdf/renderer';

// ============================================
// DESIGN CONSTANTS - Proof Sheet (V2 Refined)
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
    meta: 8.5,
    value: 9.5,
    title: 20, // Right in the 18-22pt range
};

export const COLORS = {
    text: '#000000',
    textMuted: '#666666',
    borderLight: '#EEEEEE',
    previewBg: '#FAFAFA',
};

export const RADIUS = {
    preview: 14, // 14-18 range
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
    // LEFT COLUMN: COMPACT LEGEND (34%)
    // ============================================
    colMeta: {
        width: META_COL_WIDTH,
        flexDirection: 'column',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },

    // Client Info
    clientArea: {
        marginBottom: SPACING.lg,
    },
    orderIdText: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    clientName: {
        fontSize: FONT_SIZES.title,
        fontWeight: 'bold',
        marginBottom: 3,
        lineHeight: 1.1,
        color: COLORS.text,
    },
    clientSubText: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        lineHeight: 1.2,
    },

    // Technical Specs (Legend style)
    techSection: {
        marginTop: SPACING.md,
        flex: 1,
    },
    legendTitle: {
        fontSize: FONT_SIZES.label,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: COLORS.text,
        marginBottom: SPACING.sm,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.borderLight,
        paddingBottom: 2,
    },
    kvRow: {
        flexDirection: 'row',
        marginBottom: 3,
    },
    kvLabel: {
        fontSize: FONT_SIZES.meta,
        color: COLORS.textMuted,
        width: '35%',
    },
    kvValue: {
        fontSize: FONT_SIZES.value,
        fontWeight: 'bold',
        width: '65%',
    },

    // Technical Details Sub-columns (Rule 6)
    techColumnsRow: {
        flexDirection: 'row',
        marginTop: SPACING.sm,
        gap: 8,
    },
    techColumn: {
        flex: 1,
        flexDirection: 'column',
    },
    techItem: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        marginBottom: 2,
    },

    // Logistics Legend (Ancorado no final da coluna esquerda)
    metaFooter: {
        marginTop: SPACING.lg,
        paddingTop: SPACING.sm,
        borderTopWidth: 0.5,
        borderTopColor: COLORS.borderLight,
    },
    footerMetaText: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        marginBottom: 2,
        textTransform: 'uppercase',
    },

    // ============================================
    // RIGHT COLUMN: PROTAGONIST PREVIEW (66%)
    // ============================================
    colPreview: {
        width: PREVIEW_COL_WIDTH,
        flexDirection: 'column',
    },
    previewContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: RADIUS.preview,
        backgroundColor: COLORS.previewBg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl, // Breathing space for image
    },
    previewImage: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
    },
    previewCaption: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: SPACING.sm,
        fontStyle: 'italic',
    },

    // ============================================
    // FOOTER FIELDS (RIP/DATA)
    // ============================================
    footerFieldsRow: {
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
        color: COLORS.text,
    },
    fieldLine: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.text,
        minHeight: 12,
    },

    // Minimal Badge
    badgeSmall: {
        backgroundColor: '#000000',
        color: '#FFFFFF',
        padding: '1px 4px',
        fontSize: 6, // Very small
        fontWeight: 'bold',
        borderRadius: 1,
        marginLeft: 4,
        alignSelf: 'center',
    },
});
