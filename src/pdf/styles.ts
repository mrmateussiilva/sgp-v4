import { StyleSheet } from '@react-pdf/renderer';

// ============================================
// DESIGN CONSTANTS - ABSOLUTE PROOF ARTE
// ============================================

export const PREVIEW_HEIGHT = '105mm'; // ~70% of 148mm
export const LEGEND_HEIGHT = '33mm';  // ~22% of 148mm (leaving space for padding)

export const SPACING = {
    xs: 2,
    sm: 4,
    md: 8,
};

export const FONT_SIZES = {
    label: 7,
    meta: 9,
    value: 10,
    title: 12, // Minimalist title
};

export const COLORS = {
    text: '#000000',
    textMuted: '#666666',
    border: '#DDDDDD',
    bgPreview: '#F9F9F9',
};

// ============================================
// STYLES - Vertical Proof Sheet
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
        padding: '5mm',
        flexDirection: 'column',
    },

    // ============================================
    // 1. PROTAGONIST PREVIEW (TOP - 75%)
    // ============================================
    previewArea: {
        width: '100%',
        height: PREVIEW_HEIGHT,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgPreview,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    previewImage: {
        maxWidth: '98%',
        maxHeight: '98%',
        objectFit: 'contain',
    },
    previewCaption: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        marginTop: 2,
        textAlign: 'center',
    },

    // ============================================
    // 2. TECHNICAL LEGEND (BOTTOM - 25%)
    // ============================================
    legendArea: {
        width: '100%',
        height: LEGEND_HEIGHT,
        flexDirection: 'column',
        justifyContent: 'space-between',
    },

    // Identification Line
    idRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        paddingBottom: 2,
        marginBottom: 4,
    },
    orderId: {
        fontSize: FONT_SIZES.label,
        fontWeight: 'bold',
    },
    clientName: {
        fontSize: FONT_SIZES.title,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    dates: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
    },

    // Specs Grid (Single row of items)
    specsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
        marginBottom: 4,
    },
    specItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 3,
    },
    label: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
    },
    value: {
        fontSize: FONT_SIZES.meta,
        fontWeight: 'bold',
    },

    // Tech details line
    techLine: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        lineHeight: 1.2,
    },

    // ============================================
    // 3. OPERATIONAL FOOTER (RIP / DATA)
    // ============================================
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto',
        gap: 20,
    },
    footerField: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 5,
    },
    footerLabel: {
        fontSize: FONT_SIZES.label,
        fontWeight: 'bold',
    },
    footerLine: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.text,
        minHeight: 10,
    },
});
