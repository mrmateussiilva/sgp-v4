/**
 * Utilitário para salvar dados de pedidos em arquivos JSON
 * Salva no mesmo padrão da API: appDataDir/media/pedidos/
 */

import { OrderWithItems } from '../types';
import { writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';

/**
 * Salva os dados completos de um pedido em um arquivo JSON
 * Os arquivos são salvos em: appDataDir/media/pedidos/ (mesmo padrão da API)
 * @param order - Pedido completo com todos os dados
 * @returns Promise que resolve quando o arquivo é salvo
 */
export async function saveOrderToJson(order: OrderWithItems): Promise<void> {
  try {
    // Obter diretório de dados da aplicação (equivalente ao PROJECT_ROOT da API)
    const dataDir = await appDataDir();
    
    // Criar estrutura de pastas igual à API: media/pedidos/
    const mediaDir = await join(dataDir, 'media');
    const pedidosDir = await join(mediaDir, 'pedidos');
    
    // Criar diretórios se não existirem
    try {
      await mkdir(mediaDir, { recursive: true });
      await mkdir(pedidosDir, { recursive: true });
    } catch (error) {
      // Ignorar erro se diretório já existir
      console.log('[saveOrderToJson] Diretórios já existem ou erro ao criar:', error);
    }

    // Criar nome do arquivo com timestamp e ID do pedido
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const orderId = order.id || 'novo';
    const orderNumber = order.numero || orderId.toString();
    const filename = `pedido-${orderNumber}-${timestamp}.json`;
    const filepath = await join(pedidosDir, filename);

    // Preparar dados para salvar (remover referências circulares se houver)
    const orderData = {
      ...order,
      savedAt: new Date().toISOString(),
      savedBy: 'SGP System',
      version: '1.0',
    };

    // Converter para JSON formatado
    const jsonContent = JSON.stringify(orderData, null, 2);

    // Salvar arquivo usando caminho absoluto
    await writeTextFile(filepath, jsonContent);

    console.log(`[saveOrderToJson] ✅ Pedido ${orderNumber} salvo em: ${filepath}`);
  } catch (error) {
    console.error('[saveOrderToJson] ❌ Erro ao salvar pedido em JSON:', error);
    // Não lançar erro para não interromper o fluxo de salvamento
    // Apenas logar o erro
  }
}

/**
 * Salva os dados de um pedido em um diretório específico dentro de media/
 * @param order - Pedido completo com todos os dados
 * @param subdirectory - Subdiretório dentro de media/ (ex: 'pedidos', 'backups')
 * @returns Promise que resolve quando o arquivo é salvo
 */
export async function saveOrderToJsonInDirectory(
  order: OrderWithItems,
  subdirectory: string = 'pedidos'
): Promise<void> {
  try {
    // Obter diretório de dados da aplicação
    const dataDir = await appDataDir();
    
    // Criar estrutura: media/{subdirectory}/
    const mediaDir = await join(dataDir, 'media');
    const targetDir = await join(mediaDir, subdirectory);
    
    // Criar diretórios se não existirem
    try {
      await mkdir(mediaDir, { recursive: true });
      await mkdir(targetDir, { recursive: true });
    } catch (error) {
      // Ignorar erro se diretório já existir
      console.log('[saveOrderToJson] Diretórios já existem ou erro ao criar:', error);
    }

    // Criar nome do arquivo com timestamp e ID do pedido
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const orderId = order.id || 'novo';
    const orderNumber = order.numero || orderId.toString();
    const filename = `pedido-${orderNumber}-${timestamp}.json`;
    const filepath = await join(targetDir, filename);

    // Preparar dados para salvar
    const orderData = {
      ...order,
      savedAt: new Date().toISOString(),
      savedBy: 'SGP System',
      version: '1.0',
    };

    // Converter para JSON formatado
    const jsonContent = JSON.stringify(orderData, null, 2);

    // Salvar arquivo
    await writeTextFile(filepath, jsonContent);

    console.log(`[saveOrderToJson] ✅ Pedido ${orderNumber} salvo em: ${filepath}`);
  } catch (error) {
    console.error('[saveOrderToJson] ❌ Erro ao salvar pedido em JSON:', error);
    // Não lançar erro para não interromper o fluxo de salvamento
  }
}

