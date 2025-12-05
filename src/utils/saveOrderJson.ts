/**
 * Utilitário para salvar dados de pedidos em arquivos JSON
 */

import { OrderWithItems } from '../types';
import { writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';

/**
 * Salva os dados completos de um pedido em um arquivo JSON
 * Os arquivos são salvos em: Documentos/SGP_Pedidos/
 * @param order - Pedido completo com todos os dados
 * @returns Promise que resolve quando o arquivo é salvo
 */
export async function saveOrderToJson(order: OrderWithItems): Promise<void> {
  try {
    const subdirectory = 'SGP_Pedidos';

    // Criar nome do arquivo com timestamp e ID do pedido
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const orderId = order.id || 'novo';
    const orderNumber = order.numero || orderId.toString();
    const filename = `${subdirectory}/pedido-${orderNumber}-${timestamp}.json`;

    // Preparar dados para salvar (remover referências circulares se houver)
    const orderData = {
      ...order,
      savedAt: new Date().toISOString(),
      savedBy: 'SGP System',
      version: '1.0',
    };

    // Converter para JSON formatado
    const jsonContent = JSON.stringify(orderData, null, 2);

    // Salvar arquivo usando Tauri FS API
    // Salvar na pasta de documentos do usuário
    await writeTextFile(filename, jsonContent, {
      baseDir: BaseDirectory.Document,
    });

    console.log(`[saveOrderToJson] ✅ Pedido ${orderNumber} salvo em: ${filename}`);
  } catch (error) {
    console.error('[saveOrderToJson] ❌ Erro ao salvar pedido em JSON:', error);
    // Não lançar erro para não interromper o fluxo de salvamento
    // Apenas logar o erro
  }
}

/**
 * Salva os dados de um pedido em um diretório específico
 * @param order - Pedido completo com todos os dados
 * @param directory - Diretório base (padrão: Document)
 * @param subdirectory - Subdiretório opcional (ex: 'pedidos', 'backups')
 * @returns Promise que resolve quando o arquivo é salvo
 */
export async function saveOrderToJsonInDirectory(
  order: OrderWithItems,
  directory: BaseDirectory = BaseDirectory.Document,
  subdirectory?: string
): Promise<void> {
  try {
    // Criar nome do arquivo com timestamp e ID do pedido
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const orderId = order.id || 'novo';
    const orderNumber = order.numero || orderId;
    
    // Se houver subdiretório, incluir no caminho
    const filepath = subdirectory 
      ? `${subdirectory}/pedido-${orderNumber}-${timestamp}.json`
      : `pedido-${orderNumber}-${timestamp}.json`;

    // Preparar dados para salvar
    const orderData = {
      ...order,
      savedAt: new Date().toISOString(),
      savedBy: 'SGP System',
    };

    // Converter para JSON formatado
    const jsonContent = JSON.stringify(orderData, null, 2);

    // Salvar arquivo
    await writeTextFile(filepath, jsonContent, {
      baseDir: directory,
    });

    console.log(`[saveOrderToJson] ✅ Pedido ${orderNumber} salvo em: ${filepath}`);
  } catch (error) {
    console.error('[saveOrderToJson] ❌ Erro ao salvar pedido em JSON:', error);
    // Não lançar erro para não interromper o fluxo de salvamento
  }
}

