/**
 * EXEMPLO DE USO DA FUNÇÃO printReactPdf()
 * 
 * Este arquivo mostra como criar um componente React-PDF e usá-lo
 * com a função printReactPdf().
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { printReactPdf, saveReactPdf } from './reactPdfPrinter';
import type { OrderItem } from '../types';

// Estilos para o PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 15,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  value: {
    marginBottom: 10,
  },
});

/**
 * Componente React-PDF para ficha de produção
 * Este é o componente que será renderizado como PDF
 */
export const FichaProducaoPDF = ({ item }: { item: OrderItem }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Ficha de Produção</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Item ID:</Text>
        <Text style={styles.value}>{item.id}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Nome do Item:</Text>
        <Text style={styles.value}>{item.item_name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Quantidade:</Text>
        <Text style={styles.value}>{item.quantity}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Descrição:</Text>
        <Text style={styles.value}>{item.descricao || 'Sem descrição'}</Text>
      </View>

      {item.tipo_producao && (
        <View style={styles.section}>
          <Text style={styles.label}>Tipo de Produção:</Text>
          <Text style={styles.value}>{item.tipo_producao}</Text>
        </View>
      )}

      {item.observacao && (
        <View style={styles.section}>
          <Text style={styles.label}>Observação:</Text>
          <Text style={styles.value}>{item.observacao}</Text>
        </View>
      )}
    </Page>
  </Document>
);

/**
 * EXEMPLO DE USO:
 * 
 * ```typescript
 * import { printReactPdf } from '@/utils/reactPdfPrinter';
 * import { FichaProducaoPDF } from '@/utils/reactPdfPrinter.example';
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
 * ```
 */
