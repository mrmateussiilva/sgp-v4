import { StyleSheet } from '@react-pdf/renderer';

// ============================================
// DESIGN CONSTANTS - 3-Section Industrial
// ============================================

export const COL_LEFT_WIDTH = '45%';
export const COL_RIGHT_WIDTH = '55%';

export const SPACING = {
    xs: 4,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
};

export const FONT_SIZES = {
    label: 9,
    meta: 11,
    value: 12,
    title: 16,
};

export const COLORS = {
    text: '#000000',
    textMuted: '#666666',
    border: '#CCCCCC',
    borderLight: '#EEEEEE',
    previewBg: '#FAFAFA',
};

// ============================================
// STYLES - 3-Section Vertical Layout
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
    // SEÇÃO 1: CABEÇALHO (Full Width)
    // ============================================
    header: {
        borderBottomWidth: 1,
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
        gap: SPACING.xl,
    },
    headerItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 3,
    },
    hLabel: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
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
    },

    // ============================================
    // SEÇÃO 2: CORPO (Duas Colunas)
    // ============================================
    body: {
        flex: 1,
        flexDirection: 'row',
        gap: SPACING.lg,
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
        fontSize: FONT_SIZES.label,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
        marginTop: SPACING.md,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        paddingBottom: 2,
    },
    kvRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.borderLight,
    },
    kvLabel: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
    },
    kvValue: {
        fontSize: FONT_SIZES.meta,
        fontWeight: 'bold',
    },
    techList: {
        marginTop: SPACING.sm,
    },
    techItem: {
        fontSize: FONT_SIZES.label,
        color: COLORS.textMuted,
        marginBottom: 2,
    },

    // Coluna Direita: Preview Protagonista
    previewWrapper: {
        flex: 1,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        borderRadius: 14,
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
        fontSize: 8,
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
    // SEÇÃO 3: RODAPÉ (Full Width)
    // ============================================
    footer: {
        marginTop: SPACING.md,
        paddingTop: SPACING.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: SPACING.xl,
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
        textTransform: 'uppercase',
    },
    footerLine: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.text,
        minHeight: 10,
    },
    badge: {
        backgroundColor: '#000000',
        color: '#FFFFFF',
        paddingHorizontal: 3,
        paddingVertical: 1,
        fontSize: 6,
        fontWeight: 'bold',
        borderRadius: 1,
        marginLeft: 4,
    },
});
