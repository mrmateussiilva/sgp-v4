import { invoke } from '@tauri-apps/api/core';

export interface OrderItem {
    numero: string;
    cliente: string;
    telefone_cliente?: string;
    cidade_estado?: string;
    descricao: string;
    dimensoes: string;
    quantity: number;
    material: string;
    tipo_producao: string;
    data_envio: string;
    prioridade: string;
    forma_envio: string;
    imagem?: string;
    observacao_pedido?: string;
    observacao_item?: string;
    is_reposicao: boolean;
    designer?: string;
    vendedor?: string;
}

export interface PdfGenerationRequest {
    items: OrderItem[];
    template_html: string;
}

/**
 * Generates a production PDF using Tauri's headless Chrome backend
 * Items are automatically grouped into pages of 2
 * @param items - Array of order items to include in the PDF
 * @param templateHtml - HTML template string (should use {{#each pages}} structure)
 * @returns Path to the generated PDF file
 */
export async function generateProductionPdf(
    items: OrderItem[],
    templateHtml: string
): Promise<string> {
    try {
        const pdfPath = await invoke<string>('generate_production_pdf', {
            request: {
                items,
                template_html: templateHtml,
            } as PdfGenerationRequest,
        });

        return pdfPath;
    } catch (error) {
        console.error('Failed to generate PDF:', error);
        throw new Error(`PDF generation failed: ${error}`);
    }
}

/**
 * Loads the production template HTML from file
 * @returns Template HTML string
 */
export async function loadProductionTemplate(): Promise<string> {
    try {
        const response = await fetch('/template-resumo-improved.html');
        if (!response.ok) {
            throw new Error(`Failed to load template: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error('Failed to load template:', error);
        throw new Error(`Template loading failed: ${error}`);
    }
}

/**
 * Complete workflow: Load template and generate PDF
 * @param items - Array of order items
 * @returns Path to generated PDF
 */
export async function generateAndSaveProductionPdf(
    items: OrderItem[]
): Promise<string> {
    const template = await loadProductionTemplate();
    return await generateProductionPdf(items, template);
}
