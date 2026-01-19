import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-shell';

/**
 * Salva um Blob PDF em disco usando o diálogo do Tauri e o abre no visualizador padrão.
 */
export async function saveAndOpenPdf(blob: Blob, filename: string): Promise<string | null> {
    try {
        const filePath = await save({
            defaultPath: filename,
            filters: [{
                name: 'PDF',
                extensions: ['pdf']
            }]
        });

        if (!filePath) {
            return null;
        }

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        await writeFile(filePath, uint8Array);

        // Tenta abrir o arquivo automaticamente
        try {
            await open(filePath);
        } catch (openError) {
            console.warn('Não foi possível abrir o PDF automaticamente:', openError);
        }

        return filePath;
    } catch (error) {
        console.error('Erro ao salvar/abrir PDF via Tauri:', error);
        throw error;
    }
}
/**
 * Dispara o diálogo de impressão nativo do sistema para um Blob PDF.
 */
export async function printPdfBlob(blob: Blob): Promise<void> {
    try {
        const url = URL.createObjectURL(blob);

        // Criar um iframe oculto para impressão
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;

        document.body.appendChild(iframe);

        iframe.onload = () => {
            if (iframe.contentWindow) {
                iframe.contentWindow.print();

                // Limpeza após o diálogo de impressão fechar
                // Nota: O evento 'afterprint' não é 100% confiável em todos os ambientes Tauri,
                // mas ajuda na limpeza.
                iframe.contentWindow.addEventListener('afterprint', () => {
                    document.body.removeChild(iframe);
                    URL.revokeObjectURL(url);
                }, { once: true });

                // Fallback de limpeza caso o afterprint falhe
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                        URL.revokeObjectURL(url);
                    }
                }, 60000); // 1 minuto de margem
            }
        };
    } catch (error) {
        console.error('Erro ao disparar impressão nativa:', error);
        throw error;
    }
}
