/**
 * Componente React-PDF para Ficha de Produção
 * Gera PDF profissional de ficha de produção usando @react-pdf/renderer
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
// Font import removed - not used (commented out below)
import type { OrderItem } from '@/types';

// Registrar fontes (se necessário)
// Font.register({
//   family: 'Roboto',
//   fonts: [
//     { src: 'path/to/Roboto-Regular.ttf' },
//     { src: 'path/to/Roboto-Bold.ttf', fontWeight: 'bold' },
//   ],
// });

// Estilos do PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666666',
  },
  section: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
    textDecoration: 'underline',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontWeight: 'bold',
    width: '40%',
    color: '#333333',
  },
  value: {
    width: '60%',
    color: '#000000',
  },
  fullWidth: {
    width: '100%',
  },
  imageContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  image: {
    maxWidth: '200px',
    maxHeight: '200px',
    marginBottom: 5,
  },
  imageCaption: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#666666',
    textAlign: 'center',
  },
  observation: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#fff3cd',
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
    fontSize: 9,
  },
  observationLabel: {
    fontWeight: 'bold',
    marginBottom: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#666666',
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
    paddingTop: 10,
  },
});

/**
 * Formata valor para exibição
 */
const formatValue = (value: unknown, key?: string): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (key === 'composicao_tecidos' && typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((p: any) => `${p.item}: ${p.tecido}`).join(' | ');
      }
    } catch (e) { }
  }
  return String(value);
};

/**
 * Componente de linha de informação
 */
const InfoRow: React.FC<{ label: string; value: unknown; name?: string }> = ({ label, value, name }) => {
  const formattedValue = formatValue(value, name);
  if (formattedValue === '-' || formattedValue === 'Não' || formattedValue === '') return null;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{formattedValue}</Text>
    </View>
  );
};

/**
 * Componente principal da Ficha de Produção
 */
export const FichaProducaoPDF: React.FC<{ item: OrderItem }> = ({ item }) => {
  // Tentar carregar imagem se existir
  const hasImage = item.imagem && item.imagem.trim() !== '';
  const imageSrc = hasImage ? item.imagem : undefined;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.title}>FICHA DE PRODUÇÃO</Text>
          <Text style={styles.subtitle}>Item ID: {item.id}</Text>
        </View>

        {/* Informações Básicas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMAÇÕES BÁSICAS</Text>
          <InfoRow label="Nome do Item" value={item.item_name} />
          <InfoRow label="Quantidade" value={item.quantity} />
          <InfoRow label="Preço Unitário" value={item.unit_price ? `R$ ${Number(item.unit_price).toFixed(2)}` : undefined} />
          <InfoRow label="Subtotal" value={item.subtotal ? `R$ ${Number(item.subtotal).toFixed(2)}` : undefined} />
        </View>

        {/* Descrição */}
        {item.descricao && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DESCRIÇÃO</Text>
            <Text style={styles.value}>{item.descricao}</Text>
          </View>
        )}

        {/* Tipo de Produção e Dimensões */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ESPECIFICAÇÕES</Text>
          <InfoRow label="Tipo de Produção" value={item.tipo_producao} />
          <InfoRow label="Largura" value={item.largura} />
          <InfoRow label="Altura" value={item.altura} />
          <InfoRow label="Metro Quadrado" value={item.metro_quadrado} />
          <InfoRow label="Tecido" value={item.tecido} />
        </View>

        {/* Acabamentos (se for Painel/Tecido/Mesa Babado) */}
        {(item.tipo_producao === 'painel' || item.tipo_producao === 'tecido' || item.tipo_producao === 'mesa_babado') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACABAMENTOS</Text>
            <InfoRow label="Overloque" value={item.overloque} />
            <InfoRow label="Elástico" value={item.elastico} />
            <InfoRow label="Tipo de Acabamento" value={item.tipo_acabamento} />
            <InfoRow label="Quantidade de Ilhós" value={item.quantidade_ilhos} />
            <InfoRow label="Espaçamento Ilhós" value={item.espaco_ilhos} />
            <InfoRow label="Quantidade de Cordinha" value={item.quantidade_cordinha} />
            <InfoRow label="Espaçamento Cordinha" value={item.espaco_cordinha} />
            <InfoRow label="Quantidade de Painéis" value={item.quantidade_paineis} />
          </View>
        )}

        {/* Totem */}
        {item.tipo_producao === 'totem' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TOTEM</Text>
            <InfoRow label="Acabamento Totem" value={item.acabamento_totem} />
            <InfoRow label="Acabamento Outro" value={item.acabamento_totem_outro} />
            <InfoRow label="Quantidade de Totens" value={item.quantidade_totem} />
            <InfoRow label="Valor Totem" value={item.valor_totem} />
          </View>
        )}

        {/* Lona */}
        {item.tipo_producao === 'lona' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LONA</Text>
            <InfoRow label="Acabamento Lona" value={item.acabamento_lona} />
            <InfoRow label="Quantidade de Lonas" value={item.quantidade_lona} />
            <InfoRow label="Quantidade de Ilhós" value={item.quantidade_ilhos} />
            <InfoRow label="Espaçamento Ilhós" value={item.espaco_ilhos} />
            <InfoRow label="Quantidade de Cordinha" value={item.quantidade_cordinha} />
            <InfoRow label="Espaçamento Cordinha" value={item.espaco_cordinha} />
          </View>
        )}

        {/* Adesivo */}
        {item.tipo_producao === 'adesivo' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ADESIVO</Text>
            <InfoRow label="Tipo de Adesivo" value={item.tipo_adesivo} />
            <InfoRow label="Quantidade de Adesivos" value={item.quantidade_adesivo} />
          </View>
        )}

        {/* Emenda */}
        {item.emenda && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EMENDA</Text>
            <InfoRow label="Emenda" value={item.emenda} />
            <InfoRow label="Quantidade de Emendas" value={item.emenda_qtd || item.emendaQtd} />
          </View>
        )}

        {/* Informações Adicionais */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMAÇÕES ADICIONAIS</Text>
          <InfoRow label="Vendedor" value={item.vendedor} />
          <InfoRow label="Designer" value={item.designer} />
          <InfoRow label="Terceirizado" value={item.terceirizado} />
          <InfoRow label="Ziper" value={item.ziper} />
          <InfoRow label="Cordinha Extra" value={item.cordinha_extra} />
          <InfoRow label="Alcinha" value={item.alcinha} />
          <InfoRow label="Toalha Pronta" value={item.toalha_pronta} />
        </View>

        {/* Imagem */}
        {imageSrc && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>IMAGEM</Text>
            <View style={styles.imageContainer}>
              <Image
                src={imageSrc}
                style={styles.image}
                cache={false}
              />
              {item.legenda_imagem && (
                <Text style={styles.imageCaption}>{item.legenda_imagem}</Text>
              )}
            </View>
          </View>
        )}

        {/* Observação */}
        {item.observacao && (
          <View style={styles.observation}>
            <Text style={styles.observationLabel}>⚠ OBSERVAÇÃO:</Text>
            <Text>{item.observacao}</Text>
          </View>
        )}

        {/* Rodapé */}
        <View style={styles.footer}>
          <Text>Gerado em {new Date().toLocaleString('pt-BR')}</Text>
        </View>
      </Page>
    </Document>
  );
};

