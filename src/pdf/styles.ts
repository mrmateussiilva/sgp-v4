import { StyleSheet } from '@react-pdf/renderer';

// ============================================
// DESIGN CONSTANTS - Header-Tech-Preview
// ============================================

export const LEFT_COL_WIDTH = '35%';
export const RIGHT_COL_WIDTH = '65%';

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
    title: 16,
};

export const COLORS = {
    text: '#000000',
    textMuted: '#666666',
    border: '#DDDDDD',
    borderLight: '#EEEEEE',
    previewBg: '#FAFAFA',
};

// ============================================
// STYLES - Industrial Production Sheet
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
        flexDirection: 'column',
    },

    // ============================================
    // HEADER (Full Width)
    // ============================================
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.text,
        marginBottom: SPACING.md,
    },
    headerItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    headerLabel: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
    },
    headerValue: {
        fontSize: FONT_SIZES.meta,
        fontWeight: 'bold',
        color: COLORS.text,
    },

    // ============================================
    // MAIN CONTENT (Two Columns)
    // ============================================
    mainContent: {
        flex: 1,
        flexDirection: 'row',
        gap: SPACING.lg,
    },
    colLeft: {
        width: LEFT_COL_WIDTH,
        flexDirection: 'column',
    },
    colRight: {
        width: RIGHT_COL_WIDTH,
        flexDirection: 'column',
    },

    // ============================================
    // TECHNICAL COLUMN (Left)
    // ============================================
    clientTitle: {
        fontSize: FONT_SIZES.title,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 2,
        lineHeight: 1.1,
    },
    clientSub: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        marginBottom: SPACING.md,
    },

    specList: {
        flexDirection: 'column',
        gap: 4,
    },
    specRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.borderLight,
        paddingVertical: 2,
    },
    specLabel: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
    },
    specValue: {
        fontSize: FONT_SIZES.meta,
        fontWeight: 'bold',
    },

    techItems: {
        marginTop: SPACING.md,
        flexDirection: 'column',
        gap: 2,
    },
    techItem: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
    },

    // ============================================
    // PREVIEW COLUMN (Right - Protagonist)
    // ============================================
    previewWrapper: {
        flex: 1,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
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
        fontSize: FONT_SIZES.label,
        color: '#D0D0D0',
        fontWeight: 'bold',
    },
    previewCaption: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: 4,
        fontStyle: 'italic',
    },

    // ============================================
    // FOOTER (Data / RIP)
    // ============================================
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.md,
        gap: SPACING.xl,
        paddingTop: SPACING.sm,
    },
    footerField: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 5,
        flex: 1,
    },
    footerLabel: {
        fontSize: FONT_SIZES.label,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    footerLine: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.text,
        minHeight: 10,
    },

    badgesRow: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 4,
    },
    badge: {
        backgroundColor: '#000000',
        color: '#FFFFFF',
        padding: '1px 3px',
        fontSize: 6,
        fontWeight: 'bold',
        borderRadius: 1,
    },
});
