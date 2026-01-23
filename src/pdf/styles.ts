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
        fontSize: 12, // Standardized for V2
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 6,
        marginTop: SPACING.lg, // More breathing room
        borderBottomWidth: 1.2,
        borderBottomColor: COLORS.text,
        paddingBottom: 3,
        letterSpacing: 0.5,
    },
    kvRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3, // More vertical space
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.borderLight,
    },
    kvLabel: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textSecondary, // Higher contrast
        fontWeight: 'normal',
    },
    kvValue: {
        fontSize: FONT_SIZES.meta,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'right',
    },
    techList: {
        marginTop: SPACING.sm,
    },
    techItem: {
        fontSize: 12, // Vital info, same as title size for clarity
        color: COLORS.text,
        fontWeight: 'bold',
        marginBottom: 4,
        paddingLeft: 4,
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
