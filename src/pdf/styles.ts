import { StyleSheet } from '@react-pdf/renderer';

// ============================================
// DESIGN CONSTANTS - Wireframe Industrial Form
// ============================================

export const SPACING = {
    xs: 4,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
};

export const FONT_SIZES = {
    xs: 7,
    sm: 8,
    md: 9,
    lg: 10,
    xl: 12,
    huge: 20,
};

export const BORDER = {
    frame: 2,
    field: 1,
    thin: 0.5,
};

export const RADIUS = {
    frame: 16,
    field: 4,
};

export const COLORS = {
    frameBorder: '#1a1a1a',
    fieldBorder: '#666666',
    text: '#000000',
    textLight: '#666666',
    previewBg: '#f5f5f5',
};

// ============================================
// STYLES - Industrial Form with Frame
// ============================================

export const styles = StyleSheet.create({
    page: {
        padding: 0,
        backgroundColor: '#FFFFFF',
        fontFamily: 'Helvetica',
    },

    // Outer frame container
    frameContainer: {
        width: '100%',
        height: '148mm',
        padding: '6mm',
    },

    // Inner bordered frame
    frame: {
        width: '100%',
        height: '100%',
        borderWidth: BORDER.frame,
        borderColor: COLORS.frameBorder,
        borderRadius: RADIUS.frame,
        padding: SPACING.xl,
        flexDirection: 'column',
    },

    // ============================================
    // TOP FIELDS ROW (4 fields)
    // ============================================
    topFieldsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
        gap: SPACING.md,
    },
    topField: {
        flex: 1,
    },
    fieldLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textLight,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    fieldValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        borderBottomWidth: BORDER.thin,
        borderBottomColor: COLORS.fieldBorder,
        paddingBottom: 2,
        minHeight: 14,
    },

    // ============================================
    // CLIENT HEADER
    // ============================================
    clientSection: {
        marginBottom: SPACING.lg,
    },
    clientName: {
        fontSize: FONT_SIZES.huge,
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
        lineHeight: 1.2,
    },
    clientMetaRow: {
        flexDirection: 'row',
        gap: SPACING.lg,
        marginBottom: SPACING.xs,
    },
    clientMeta: {
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
    },
    vendorDesigner: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textLight,
    },

    // ============================================
    // DESCRIPTION & TYPE ROW
    // ============================================
    descTypeRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    descField: {
        flex: 2,
    },
    typeField: {
        flex: 1,
    },

    // ============================================
    // MAIN GRID (55/45)
    // ============================================
    mainGrid: {
        flexDirection: 'row',
        gap: SPACING.xl,
        flex: 1,
    },
    leftColumn: {
        width: '55%',
        flexDirection: 'column',
    },
    rightColumn: {
        width: '45%',
        flexDirection: 'column',
    },

    // ============================================
    // TECHNICAL INFO SECTION
    // ============================================
    sectionTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        marginBottom: SPACING.md,
        textTransform: 'uppercase',
    },
    techField: {
        marginBottom: SPACING.sm,
    },
    techFieldRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    techLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textLight,
    },
    techValue: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
    },

    // List items
    techList: {
        marginTop: SPACING.sm,
    },
    techItem: {
        fontSize: FONT_SIZES.sm,
        marginBottom: 3,
        lineHeight: 1.3,
    },

    // ============================================
    // PREVIEW BOX (Large, right column)
    // ============================================
    previewBox: {
        borderWidth: BORDER.field,
        borderColor: COLORS.fieldBorder,
        borderRadius: RADIUS.field,
        backgroundColor: COLORS.previewBg,
        flex: 1,
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
        fontSize: FONT_SIZES.md,
        color: '#CCCCCC',
    },

    // ============================================
    // FOOTER (RIP/DATA)
    // ============================================
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.lg,
        gap: SPACING.xl,
    },
    footerField: {
        flex: 1,
    },
    underlineField: {
        fontSize: FONT_SIZES.md,
        fontWeight: 'bold',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.text,
        paddingBottom: 4,
        minHeight: 18,
    },

    // Badges
    badge: {
        backgroundColor: '#000000',
        color: '#FFFFFF',
        padding: '2px 6px',
        fontSize: FONT_SIZES.xs,
        fontWeight: 'bold',
        marginLeft: 8,
        borderRadius: 2,
    },
});
