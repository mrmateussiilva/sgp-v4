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
