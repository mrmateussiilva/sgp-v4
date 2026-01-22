import { StyleSheet } from '@react-pdf/renderer';

// ============================================
// DESIGN CONSTANTS - Wireframe Clean
// ============================================

export const SPACING = {
    xs: 4,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
};

export const FONT_SIZES = {
    xs: 7,
    sm: 8,
    md: 10,
    lg: 12,
    xl: 14,
    huge: 22,
};

export const COLORS = {
    text: '#000000',
    textLight: '#444444',
    textMuted: '#777777',
    borderLight: '#DDDDDD',
    borderMuted: '#EEEEEE',
    previewBg: '#F9F9F9',
};

export const RADIUS = {
    preview: 14,
};

// ============================================
// STYLES - Clean Wireframe Layout
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
    // TOP FIELDS ROW (Inline, no boxes)
    // ============================================
    topRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: SPACING.lg,
        gap: SPACING.xl,
    },
    inlineField: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 3,
    },
    labelSmall: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        textTransform: 'lowercase',
    },
    valueSemibold: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
        color: COLORS.text,
    },

    // ============================================
    // CLIENT HEADER
    // ============================================
    clientHeader: {
        marginBottom: SPACING.lg,
    },
    clientName: {
        fontSize: FONT_SIZES.huge,
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
    },
    clientSubRow: {
        flexDirection: 'row',
        gap: SPACING.lg,
        marginBottom: 2,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    metaLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    metaValue: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textLight,
    },
    vendorDesigner: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        fontStyle: 'italic',
    },

    // ============================================
    // DESCRIPTION & TYPE
    // ============================================
    descTypeArea: {
        marginBottom: SPACING.md,
    },
    descTypeRow: {
        flexDirection: 'row',
        gap: SPACING.xl,
        marginBottom: SPACING.sm,
    },
    blockField: {
        flexDirection: 'column',
    },
    blockLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginBottom: 2,
    },
    blockValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },
    hairline: {
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.borderLight,
        marginTop: SPACING.sm,
    },

    // ============================================
    // MAIN GRID (58/42)
    // ============================================
    mainGrid: {
        flexDirection: 'row',
        gap: SPACING.xl,
        flex: 1,
    },
    colLeft: {
        width: '58%',
    },
    colRight: {
        width: '42%',
    },

    // ============================================
    // TECHNICAL INFO
    // ============================================
    sectionTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: SPACING.xl,
        marginBottom: SPACING.md,
    },
    kvRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.borderMuted,
    },
    kvLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
    },
    kvValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: 'bold',
    },

    // Technical List
    techList: {
        marginTop: SPACING.md,
    },
    techItem: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textLight,
        marginBottom: 3,
    },

    // Observations
    obsArea: {
        marginTop: SPACING.lg,
    },
    obsLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    obsText: {
        fontSize: FONT_SIZES.sm,
        lineHeight: 1.4,
        color: COLORS.text,
    },

    // ============================================
    // PREVIEW BOX (Right Column)
    // ============================================
    previewWrapper: {
        flexDirection: 'column',
        height: '100%',
    },
    previewLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginBottom: 4,
        textAlign: 'right',
    },
    previewBox: {
        flex: 1,
        maxHeight: '85%',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: RADIUS.preview,
        backgroundColor: COLORS.previewBg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md,
    },
    previewImage: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
    },
    previewPlaceholder: {
        fontSize: FONT_SIZES.xs,
        color: '#BBBBBB',
    },

    // ============================================
    // FOOTER (Line Fields)
    // ============================================
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto',
        gap: SPACING.xl,
        paddingTop: SPACING.lg,
    },
    lineField: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 5,
    },
    lineLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.text,
        fontWeight: 'bold',
    },
    lineUnder: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.text,
        minHeight: 12,
    },
});
