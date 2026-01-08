/**
 * EXEMPLO DE USO DA FUNÇÃO printReactPdf()
 * 
 * Este arquivo mostra exemplos de como usar a função printReactPdf()
 * com diferentes componentes React-PDF.
 */

import { printReactPdf, saveReactPdf } from './reactPdfPrinter';
import { FichaProducaoPDF } from '@/components/pdf/FichaProducaoPDF';
import type { OrderItem } from '../types';

/**
 * EXEMPLO DE USO:
 * 
 * ```typescript
 * import { printReactPdf, saveReactPdf } from '@/utils/reactPdfPrinter';
 * import { FichaProducaoPDF } from '@/components/pdf/FichaProducaoPDF';
 * import type { OrderItem } from '@/types';
 * 
 * // Em um componente React ou função
 * const handlePrintFicha = async (item: OrderItem) => {
 *   try {
 *     const caminho = await printReactPdf(item, FichaProducaoPDF);
 *     
 *     if (caminho) {
 *       console.log('✅ PDF salvo e aberto em:', caminho);
 *       // O PDF já foi aberto no visualizador padrão
 *       // Usuário pode imprimir ou salvar através do visualizador
 *     } else {
 *       console.log('❌ Usuário cancelou');
 *     }
 *   } catch (error) {
 *     console.error('Erro ao gerar PDF:', error);
 *   }
 * };
 * 
 * // Ou apenas salvar sem abrir
 * const handleSaveFicha = async (item: OrderItem) => {
 *   try {
 *     const caminho = await saveReactPdf(item, FichaProducaoPDF);
 *     if (caminho) {
 *       console.log('✅ PDF salvo em:', caminho);
 *     }
 *   } catch (error) {
 *     console.error('Erro ao salvar PDF:', error);
 *   }
 * };
 * 
 * // Exemplo em um componente React
 * function MyComponent() {
 *   const item: OrderItem = {
 *     id: 1,
 *     item_name: 'Painel Personalizado',
 *     quantity: 2,
 *     // ... outros campos
 *   };
 * 
 *   return (
 *     <button onClick={() => handlePrintFicha(item)}>
 *       Imprimir Ficha
 *     </button>
 *   );
 * }
 * ```
 */

// Exportar função de exemplo para uso direto
export const exemploUsoPrintFicha = async (item: OrderItem) => {
  try {
    const caminho = await printReactPdf(item, FichaProducaoPDF);
    
    if (caminho) {
      console.log('✅ PDF salvo e aberto em:', caminho);
      return caminho;
    } else {
      console.log('❌ Usuário cancelou');
      return null;
    }
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
};

// Exportar função de exemplo para salvar apenas
export const exemploUsoSaveFicha = async (item: OrderItem) => {
  try {
    const caminho = await saveReactPdf(item, FichaProducaoPDF);
    if (caminho) {
      console.log('✅ PDF salvo em:', caminho);
      return caminho;
    }
    return null;
  } catch (error) {
    console.error('Erro ao salvar PDF:', error);
    throw error;
  }
};
