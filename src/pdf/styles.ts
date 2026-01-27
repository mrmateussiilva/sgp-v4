import { StyleSheet } from '@react-pdf/renderer';

// ============================================
// DESIGN CONSTANTS - 3-Section Industrial V2 (Readability)
// ============================================

export const COL_LEFT_WIDTH = '45%';
export const COL_RIGHT_WIDTH = '55%';

export const SPACING = {
    xs: 4,
    sm: 6,
    md: 10,
    lg: 16, // Increased for better rhythm
    xl: 24, // Increased for better rhythm
};

export const FONT_SIZES = {
    label: 10, // Increased from 9 for better legibility
    meta: 11,
    value: 12,
    title: 18, // Increased from 16 for better header dominance
};

export const COLORS = {
    text: '#000000',
    textSecondary: '#333333', // Darker than previous Muted for better contrast
    textMuted: '#555555',     // Darker than previous for better contrast
    border: '#999999',        // Darker border for clear separation
    borderLight: '#DDDDDD',
    previewBg: '#F8F8F8',
    sectionHeaderBg: '#F0F0F0', // NEW for V3
    calloutBg: '#FAFAFA',       // NEW for V3
};

// ============================================
// STYLES - 3-Section Vertical Layout V2
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
        padding: '8mm', // Increased padding
        flexDirection: 'column',
    },

    // ============================================
    // SEÇÃO 1: CABEÇALHO (Full Width)
    // ============================================
    header: {
        borderBottomWidth: 1.5, // Thicker
        borderBottomColor: COLORS.text,
        paddingBottom: SPACING.md,
        marginBottom: SPACING.md,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    headerBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginTop: 4,
    },
    headerItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    hLabel: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        fontWeight: 'normal',
    },
    hValue: {
        fontSize: FONT_SIZES.meta,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    clientName: {
        fontSize: FONT_SIZES.title,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        flex: 1,
        marginRight: 10,
        height: 22,
        overflow: 'hidden',
    },

    // ============================================
    // SEÇÃO 2: CORPO (Duas Colunas)
    // ============================================
    body: {
        flex: 1,
        flexDirection: 'row',
        gap: SPACING.xl, // Increased gap
    },
    colLeft: {
        width: COL_LEFT_WIDTH,
        flexDirection: 'column',
    },
    colRight: {
        width: COL_RIGHT_WIDTH,
        flexDirection: 'column',
    },

    // Coluna Esquerda: Técnica
    techTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: SPACING.md,
        paddingHorizontal: 6,
        paddingVertical: 3,
        backgroundColor: COLORS.sectionHeaderBg,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.text,
        letterSpacing: 0.5,
    },
    kvRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.borderLight,
    },
    kvLabel: {
        width: 85, // Fixed width for tabular alignment (V3)
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        fontWeight: 'normal',
        textTransform: 'uppercase',
    },
    kvValue: {
        flex: 1,
        fontSize: FONT_SIZES.meta,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'left', // Changed to left for better tabular flow
        paddingLeft: 4,
    },
    techList: {
        marginTop: SPACING.sm,
        paddingLeft: 4,
    },
    techItem: {
        fontSize: 11,
        color: COLORS.text,
        fontWeight: 'bold',
        marginBottom: 2,
    },

    // Coluna Direita: Preview Protagonista
    previewWrapper: {
        flex: 1,
        borderWidth: 0.8,
        borderColor: COLORS.border,
        borderRadius: 16,
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
        fontSize: 10,
        color: '#BBBBBB',
        fontWeight: 'bold',
    },
    previewCaption: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: 6,
        fontStyle: 'italic',
    },

    // ============================================
    // SEÇÃO 3: RODAPÉ (Operational)
    // ============================================
    footer: {
        marginTop: SPACING.lg,
        paddingTop: SPACING.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: SPACING.xl,
        borderTopWidth: 0.5,
        borderTopColor: COLORS.borderLight,
    },
    footerField: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    footerLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    footerLine: {
        flex: 1,
        borderBottomWidth: 1.5, // Thicker for manual writing
        borderBottomColor: COLORS.text,
        minHeight: 14,
    },
    badge: {
        backgroundColor: '#000000',
        color: '#FFFFFF',
        paddingHorizontal: 4,
        paddingVertical: 2,
        fontSize: 8, // Larger badge text
        fontWeight: 'bold',
        borderRadius: 2,
        marginLeft: 6,
    },
});
