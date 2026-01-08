/**
 * Função para imprimir ficha de produção usando @react-pdf/renderer
 * Gera PDF, salva usando APIs do Tauri e abre no visualizador padrão
 */

import type React from 'react';
import { isTauri } from './isTauri';
import type { OrderItem } from '../types';

/**
 * Interface para o componente de PDF do React-PDF
 * Você deve criar um componente React que renderiza a ficha de produção
 */
export interface ReactPdfDocumentProps {
  item: OrderItem;
}

/**
 * Tipo para o componente de documento React-PDF
 */
export type ReactPdfDocumentComponent = React.ComponentType<ReactPdfDocumentProps>;

/**
 * Imprime uma ficha de produção usando React-PDF
 * 
 * @param item - Item do pedido para gerar a ficha
 * @param DocumentComponent - Componente React que renderiza o PDF usando React-PDF
 * @param nomeArquivoPadrao - Nome padrão do arquivo (opcional)
 * @returns Promise<string | null> - Caminho do arquivo salvo ou null se cancelado
 * 
 * @example
 * ```typescript
 * import { Document, Page, Text } from '@react-pdf/renderer';
 * 
 * const FichaProducao = ({ item }: { item: OrderItem }) => (
 *   <Document>
 *     <Page>
 *       <Text>Ficha de Produção - {item.item_name}</Text>
 *     </Page>
 *   </Document>
 * );
 * 
 * await printReactPdf(item, FichaProducao);
 * ```
 */
export async function printReactPdf(
  item: OrderItem,
  DocumentComponent: ReactPdfDocumentComponent,
  nomeArquivoPadrao: string = `ficha-producao-${item.id}.pdf`
): Promise<string | null> {
  // Verificar se está rodando no Tauri
  if (!isTauri()) {
    throw new Error('printReactPdf() só funciona no ambiente Tauri. Use renderToBuffer() e download() para web.');
  }

  try {
    console.log('[printReactPdf] 📄 Gerando PDF usando React-PDF...', { itemId: item.id });

    // Importar React-PDF dinamicamente (lazy load)
    const { renderToBuffer } = await import('@react-pdf/renderer');
    const React = await import('react');
    const { createElement } = React;

    // Renderizar o documento React-PDF para buffer
    console.log('[printReactPdf] 🎨 Renderizando componente React-PDF...');
    const pdfBuffer = await renderToBuffer(
      createElement(DocumentComponent, { item })
    );

    console.log('[printReactPdf] ✅ PDF gerado, tamanho:', pdfBuffer.length, 'bytes');

    // Importar APIs do Tauri
    console.log('[printReactPdf] 📥 Importando APIs do Tauri...');
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const { open } = await import('@tauri-apps/plugin-shell');

    // Converter buffer para Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);

    // Abrir diálogo para escolher onde salvar
    console.log('[printReactPdf] 💾 Abrindo diálogo de salvar...');
    const filePath = await save({
      defaultPath: nomeArquivoPadrao,
      filters: [{
        name: 'PDF',
        extensions: ['pdf']
      }]
    });

    // Verificar se usuário cancelou
    if (!filePath) {
      console.log('[printReactPdf] ❌ Usuário cancelou o salvamento');
      return null;
    }

    // Salvar arquivo no disco
    console.log('[printReactPdf] 💾 Salvando arquivo em:', filePath);
    await writeFile(filePath, uint8Array);
    
    console.log('[printReactPdf] ✅ PDF salvo com sucesso:', filePath);

    // Abrir arquivo no sistema operacional
    // O SO vai abrir no visualizador padrão que permite imprimir ou salvar como PDF
    console.log('[printReactPdf] 🖨️ Abrindo PDF no sistema operacional...');
    await open(filePath);
    
    console.log('[printReactPdf] ✅ PDF aberto. Usuário pode escolher impressora ou salvar como PDF.');

    return filePath;
  } catch (error) {
    console.error('[printReactPdf] ❌ Erro no fluxo de impressão:', error);
    throw error;
  }
}

/**
 * Versão simplificada que apenas gera e salva o PDF sem abrir
 * Útil quando você quer apenas salvar o arquivo
 */
export async function saveReactPdf(
  item: OrderItem,
  DocumentComponent: ReactPdfDocumentComponent,
  nomeArquivoPadrao: string = `ficha-producao-${item.id}.pdf`
): Promise<string | null> {
  // Verificar se está rodando no Tauri
  if (!isTauri()) {
    throw new Error('saveReactPdf() só funciona no ambiente Tauri.');
  }

  try {
    console.log('[saveReactPdf] 📄 Gerando PDF usando React-PDF...', { itemId: item.id });

    // Importar React-PDF dinamicamente
    const { renderToBuffer } = await import('@react-pdf/renderer');
    const React = await import('react');
    const { createElement } = React;

    // Renderizar para buffer
    const pdfBuffer = await renderToBuffer(
      createElement(DocumentComponent, { item })
    );

    console.log('[saveReactPdf] ✅ PDF gerado, tamanho:', pdfBuffer.length, 'bytes');

    // Importar APIs do Tauri
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');

    // Converter para Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);

    // Abrir diálogo de salvar
    const filePath = await save({
      defaultPath: nomeArquivoPadrao,
      filters: [{
        name: 'PDF',
        extensions: ['pdf']
      }]
    });

    if (!filePath) {
      console.log('[saveReactPdf] ❌ Usuário cancelou');
      return null;
    }

    // Salvar arquivo
    await writeFile(filePath, uint8Array);
    console.log('[saveReactPdf] ✅ PDF salvo:', filePath);

    return filePath;
  } catch (error) {
    console.error('[saveReactPdf] ❌ Erro:', error);
    throw error;
  }
}
