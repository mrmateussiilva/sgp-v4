/**
 * Gerador de PDF para Relatório de Pedidos usando PDFMake
 * Gera PDF 100% no client-side com layout de 3 itens por página A4
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions, Content, StyleDictionary, TableCell } from 'pdfmake/interfaces';
import { isTauri } from './isTauri';

// Configurar fontes
pdfMake.vfs = pdfFonts.vfs;

// ============================================================================
// TIPOS
// ============================================================================

export interface ItemRelatorio {
  numero: string;
  cliente: string;
  telefone_cliente?: string;
  cidade_estado?: string;
  descricao: string;
  dimensoes?: string;
  quantity?: number;
  material?: string;
  emenda_label?: string;
  emenda_qtd?: number;
  tipo_producao: 'painel' | 'totem' | 'lona' | 'adesivo' | 'tecido' | string;
  
  // Campos específicos por tipo
  acabamentos_painel?: string;
  overloque?: string;
  elastico?: string;
  ilhos_resumo?: string;
  cordinha_resumo?: string;
  quantidade_paineis?: number;
  
  acabamento_totem_resumo?: string;
  acabamento_totem_outro?: string;
  quantidade_totem?: number;
  
  acabamento_lona?: string;
  quantidade_lona?: number;
  quantidade_ilhos?: number;
  espaco_ilhos?: string;
  quantidade_cordinha?: number;
  espaco_cordinha?: string;
  
  tipo_adesivo?: string;
  quantidade_adesivo?: number;
  
  // Opcionais gerais
  observacao_item?: string;
  designer?: string;
  vendedor?: string;
  imagem?: string;
  legenda_imagem?: string;
}

// ============================================================================
// CONSTANTES DE ESTILO
// ============================================================================

const CORES = {
  fundoEscuro: '#1f2937',
  textoEscuro: '#111827',
  textoCinza: '#6b7280',
  textoNormal: '#1f2937',
  tituloSecao: '#374151',
  borda: '#d1d5db',
  fundoCinzaClaro: '#f9fafb',
  observacaoFundo: '#fef3c7',
  observacaoTexto: '#92400e',
  bordaObservacao: '#f59e0b',
};

const ESTILOS: StyleDictionary = {
  numeroPedido: {
    fontSize: 13,
    bold: true,
    color: '#ffffff',
  },
  nomeCliente: {
    fontSize: 12,
    bold: true,
    color: CORES.textoEscuro,
  },
  contato: {
    fontSize: 10,
    color: CORES.textoCinza,
  },
  tituloSecao: {
    fontSize: 10,
    bold: true,
    color: CORES.tituloSecao,
  },
  descricaoProduto: {
    fontSize: 10,
    bold: true,
    color: CORES.textoNormal,
  },
  textoNormal: {
    fontSize: 10,
    color: CORES.textoNormal,
  },
  label: {
    fontSize: 10,
    bold: true,
    color: CORES.textoEscuro,
  },
  observacao: {
    fontSize: 9,
    color: CORES.observacaoTexto,
  },
  legenda: {
    fontSize: 9,
    color: CORES.textoCinza,
    italics: true,
    alignment: 'center' as const,
  },
};

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Converte URL de imagem para Base64
 */
async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    // Se já é Base64, retornar diretamente
    if (url.startsWith('data:image')) {
      return url;
    }
    
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    console.warn('[pdfGenerator] Falha ao carregar imagem:', url);
    return null;
  }
}

/**
 * Verifica se um valor é válido (não nulo, undefined, ou string vazia)
 */
function isValid(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '' && value !== 'Não' && value !== 'Nenhum';
  if (typeof value === 'number') return value > 0;
  return true;
}

/**
 * Formata valor para exibição, retornando string vazia se inválido
 */
function formatValue(value: unknown): string {
  if (!isValid(value)) return '';
  return String(value);
}

/**
 * Agrupa itens em páginas de 3
 */
function agruparEmPaginas<T>(itens: T[], itensPorPagina: number = 3): T[][] {
  const paginas: T[][] = [];
  for (let i = 0; i < itens.length; i += itensPorPagina) {
    paginas.push(itens.slice(i, i + itensPorPagina));
  }
  return paginas;
}

// ============================================================================
// GERAÇÃO DE CONTEÚDO
// ============================================================================

/**
 * Gera bullets de especificações conforme tipo de produção
 */
function gerarBulletsPorTipo(item: ItemRelatorio): Content[] {
  const bullets: Content[] = [];
  const tipo = item.tipo_producao?.toLowerCase() || '';
  
  const addBullet = (label: string, value: unknown) => {
    const formatted = formatValue(value);
    if (formatted) {
      bullets.push({
        text: [
          { text: '• ', color: CORES.textoCinza, bold: true },
          { text: `${label}: `, style: 'label' },
          { text: formatted, style: 'textoNormal' },
        ],
        margin: [0, 1, 0, 1],
      });
    }
  };
  
  switch (tipo) {
    case 'painel':
    case 'tecido':
      addBullet('Acabamentos', item.acabamentos_painel);
      addBullet('Overloque', item.overloque);
      addBullet('Elástico', item.elastico);
      addBullet('Ilhós', item.ilhos_resumo);
      addBullet('Cordinha', item.cordinha_resumo);
      addBullet('Qtd. Painéis', item.quantidade_paineis);
      break;
      
    case 'totem':
      addBullet('Acabamento', item.acabamento_totem_resumo);
      if (isValid(item.acabamento_totem_outro)) {
        addBullet('Obs. Acabamento', item.acabamento_totem_outro);
      }
      addBullet('Qtd. Totens', item.quantidade_totem);
      break;
      
    case 'lona':
      addBullet('Acabamento Lona', item.acabamento_lona);
      addBullet('Qtd. Lonas', item.quantidade_lona);
      addBullet('Ilhós', item.quantidade_ilhos);
      addBullet('Espaçamento Ilhós', item.espaco_ilhos);
      addBullet('Cordinha', item.quantidade_cordinha);
      addBullet('Espaçamento Cordinha', item.espaco_cordinha);
      break;
      
    case 'adesivo':
      addBullet('Tipo Adesivo', item.tipo_adesivo);
      addBullet('Qtd. Adesivos', item.quantidade_adesivo);
      break;
  }
  
  return bullets;
}

/**
 * Gera seção de observação destacada
 */
function gerarObservacao(observacao?: string): Content | null {
  if (!isValid(observacao)) return null;
  
  return {
    table: {
      widths: ['*'],
      body: [[
        {
          text: [
            { text: '⚠ Observação: ', bold: true },
            { text: observacao },
          ],
          style: 'observacao',
          margin: [8, 5, 8, 5],
        }
      ]],
    },
    layout: {
      fillColor: () => CORES.observacaoFundo,
      hLineWidth: () => 0,
      vLineWidth: (i: number) => i === 0 ? 3 : 0,
      vLineColor: () => CORES.bordaObservacao,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 5, 0, 5],
  };
}

/**
 * Gera linha de Designer/Vendedor em 2 colunas
 */
function gerarDesignerVendedor(item: ItemRelatorio): Content | null {
  const hasDesigner = isValid(item.designer);
  const hasVendedor = isValid(item.vendedor);
  
  if (!hasDesigner && !hasVendedor) return null;
  
  return {
    columns: [
      hasDesigner ? {
        text: [
          { text: 'Designer: ', style: 'label' },
          { text: item.designer, style: 'textoNormal' },
        ],
        width: '*',
      } : { text: '', width: '*' },
      hasVendedor ? {
        text: [
          { text: 'Vendedor: ', style: 'label' },
          { text: item.vendedor, style: 'textoNormal' },
        ],
        width: '*',
      } : { text: '', width: '*' },
    ],
    margin: [0, 5, 0, 0],
  };
}

/**
 * Gera coluna esquerda com descrição e especificações
 */
function gerarColunaEsquerda(item: ItemRelatorio): Content {
  const conteudo: Content[] = [];
  
  // Seção DESCRIÇÃO
  conteudo.push({
    text: 'DESCRIÇÃO',
    style: 'tituloSecao',
    margin: [0, 0, 0, 5],
    decoration: 'underline',
    decorationColor: CORES.borda,
  });
  
  conteudo.push({
    text: item.descricao || 'Sem descrição',
    style: 'descricaoProduto',
    margin: [0, 0, 0, 3],
  });
  
  if (isValid(item.dimensoes)) {
    conteudo.push({
      text: `Dimensões: ${item.dimensoes}`,
      style: 'textoNormal',
      margin: [0, 0, 0, 2],
    });
  }
  
  if (isValid(item.quantity)) {
    conteudo.push({
      text: `Quantidade: ${item.quantity}`,
      style: 'textoNormal',
      margin: [0, 0, 0, 8],
    });
  }
  
  // Seção ESPECIFICAÇÕES TÉCNICAS
  conteudo.push({
    text: 'ESPECIFICAÇÕES TÉCNICAS',
    style: 'tituloSecao',
    margin: [0, 5, 0, 5],
    decoration: 'underline',
    decorationColor: CORES.borda,
  });
  
  // Material e Emenda
  if (isValid(item.material)) {
    conteudo.push({
      text: [
        { text: 'Material: ', style: 'label' },
        { text: item.material, style: 'textoNormal' },
      ],
      margin: [0, 0, 0, 2],
    });
  }
  
  if (isValid(item.emenda_label)) {
    conteudo.push({
      text: [
        { text: 'Emenda: ', style: 'label' },
        { text: item.emenda_label, style: 'textoNormal' },
      ],
      margin: [0, 0, 0, 2],
    });
  }
  
  if (isValid(item.emenda_qtd) && item.emenda_qtd && item.emenda_qtd > 0) {
    conteudo.push({
      text: `Qtd. Emendas: ${item.emenda_qtd}`,
      style: 'textoNormal',
      margin: [0, 0, 0, 2],
    });
  }
  
  // Bullets específicos por tipo
  const bullets = gerarBulletsPorTipo(item);
  if (bullets.length > 0) {
    conteudo.push({
      stack: bullets,
      margin: [0, 3, 0, 0],
    });
  }
  
  // Observação
  const obs = gerarObservacao(item.observacao_item);
  if (obs) {
    conteudo.push(obs);
  }
  
  // Designer/Vendedor
  const dv = gerarDesignerVendedor(item);
  if (dv) {
    conteudo.push(dv);
  }
  
  return {
    stack: conteudo,
  };
}

/**
 * Gera coluna direita com visualização da imagem
 */
async function gerarColunaDireita(item: ItemRelatorio): Promise<Content | null> {
  if (!isValid(item.imagem)) return null;
  
  // Converter imagem para base64 se necessário
  const imagemBase64 = await imageUrlToBase64(item.imagem!);
  if (!imagemBase64) return null;
  
  const conteudo: Content[] = [];
  
  // Título
  conteudo.push({
    text: 'VISUALIZAÇÃO',
    style: 'tituloSecao',
    alignment: 'center',
    margin: [0, 0, 0, 8],
  });
  
  // Imagem
  conteudo.push({
    image: imagemBase64,
    width: 90,
    height: 90,
    alignment: 'center',
    margin: [0, 0, 0, 5],
  });
  
  // Legenda
  if (isValid(item.legenda_imagem)) {
    conteudo.push({
      text: item.legenda_imagem,
      style: 'legenda',
    });
  }
  
  return {
    table: {
      widths: ['*'],
      body: [[
        {
          stack: conteudo,
          margin: [8, 8, 8, 8],
        }
      ]],
    },
    layout: {
      fillColor: () => CORES.fundoCinzaClaro,
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => CORES.borda,
      vLineColor: () => CORES.borda,
    },
  };
}

/**
 * Gera cabeçalho do item com número, cliente e contato
 */
function gerarCabecalhoItem(item: ItemRelatorio): Content {
  // Montar linha de contato
  const contato: string[] = [];
  if (isValid(item.telefone_cliente)) contato.push(item.telefone_cliente!);
  if (isValid(item.cidade_estado)) contato.push(item.cidade_estado!);
  const contatoStr = contato.join(' • ');
  
  return {
    columns: [
      // Pill do número
      {
        table: {
          body: [[
            {
              text: item.numero || '000000000',
              style: 'numeroPedido',
              margin: [10, 6, 10, 6],
            }
          ]],
        },
        layout: {
          fillColor: () => CORES.fundoEscuro,
          hLineWidth: () => 0,
          vLineWidth: () => 0,
        },
        width: 'auto',
      },
      // Info do cliente
      {
        stack: [
          {
            text: item.cliente || 'Cliente não informado',
            style: 'nomeCliente',
            margin: [10, 0, 0, 2],
          },
          contatoStr ? {
            text: contatoStr,
            style: 'contato',
            margin: [10, 0, 0, 0],
          } : { text: '' },
        ],
        width: '*',
      },
    ],
    margin: [0, 0, 0, 10],
  };
}

/**
 * Gera um item completo do relatório
 */
async function gerarItem(item: ItemRelatorio, isLast: boolean): Promise<Content> {
  const cabecalho = gerarCabecalhoItem(item);
  const colunaEsquerda = gerarColunaEsquerda(item);
  const colunaDireita = await gerarColunaDireita(item);
  
  // Corpo com colunas
  const corpo: Content = colunaDireita ? {
    columns: [
      { ...colunaEsquerda, width: '*' },
      { width: 10, text: '' }, // Espaçador
      { ...colunaDireita, width: 130 },
    ],
  } : colunaEsquerda;
  
  // Estrutura do item
  const itemContent: Content[] = [cabecalho, corpo];
  
  // Container com borda
  const itemContainer: Content = {
    table: {
      widths: ['*'],
      body: [[
        {
          stack: itemContent,
          margin: [12, 10, 12, 10],
        }
      ]],
    },
    layout: {
      hLineWidth: () => 1.5,
      vLineWidth: () => 1.5,
      hLineColor: () => CORES.borda,
      vLineColor: () => CORES.borda,
    },
    margin: isLast ? [0, 0, 0, 0] : [0, 0, 0, 8],
  };
  
  return itemContainer;
}

/**
 * Gera uma página com até 3 itens
 */
async function gerarPagina(itens: ItemRelatorio[], isLastPage: boolean): Promise<Content[]> {
  const conteudo: Content[] = [];
  
  for (let i = 0; i < itens.length; i++) {
    const isLastItem = i === itens.length - 1;
    const itemContent = await gerarItem(itens[i], isLastItem);
    conteudo.push(itemContent);
  }
  
  // Quebra de página se não for a última
  if (!isLastPage) {
    conteudo.push({ text: '', pageBreak: 'after' });
  }
  
  return conteudo;
}

// ============================================================================
// FUNÇÕES PÚBLICAS
// ============================================================================

/**
 * Gera definição do documento PDF
 */
async function gerarDocDefinition(itens: ItemRelatorio[]): Promise<TDocumentDefinitions> {
  // Agrupar itens em páginas de 3
  const paginas = agruparEmPaginas(itens, 3);
  
  // Gerar conteúdo de cada página
  const conteudo: Content[] = [];
  for (let i = 0; i < paginas.length; i++) {
    const isLastPage = i === paginas.length - 1;
    const paginaContent = await gerarPagina(paginas[i], isLastPage);
    conteudo.push(...paginaContent);
  }
  
  return {
    pageSize: 'A4',
    pageMargins: [40, 30, 40, 30],
    content: conteudo,
    styles: ESTILOS,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      lineHeight: 1.3,
    },
  };
}

/**
 * Detecta se está rodando no Tauri
 */
function isTauriEnvironment(): boolean {
  return isTauri();
}

/**
 * Salva PDF usando API do Tauri
 * @returns Caminho do arquivo salvo ou null se cancelado
 */
async function salvarPDFTauri(pdfDocGenerator: any, nomeArquivo: string, abrirAposSalvar: boolean = false): Promise<string | null> {
  return new Promise((resolve, reject) => {
    pdfDocGenerator.getBuffer(async (buffer: Buffer | ArrayBuffer | Uint8Array) => {
      try {
        // Importar APIs do Tauri apenas quando necessário
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeBinaryFile } = await import('@tauri-apps/plugin-fs');

        // Abrir diálogo para escolher onde salvar
        const filePath = await save({
          defaultPath: nomeArquivo,
          filters: [{
            name: 'PDF',
            extensions: ['pdf']
          }]
        });

        if (!filePath) {
          console.log('[pdfGenerator] ❌ Usuário cancelou o salvamento');
          resolve(null);
          return;
        }

        // Converter buffer para Uint8Array (compatível com Buffer, ArrayBuffer e Uint8Array)
        let uint8Array: Uint8Array;
        if (buffer instanceof Uint8Array) {
          uint8Array = buffer;
        } else if (buffer instanceof ArrayBuffer) {
          uint8Array = new Uint8Array(buffer);
        } else {
          // Buffer do Node.js ou similar
          uint8Array = new Uint8Array(buffer);
        }

        // Salvar arquivo
        await writeBinaryFile(filePath, uint8Array);

        console.log('[pdfGenerator] ✅ PDF salvo com sucesso:', filePath);

        // Abrir arquivo no visualizador padrão se solicitado
        if (abrirAposSalvar) {
          try {
            const { open } = await import('@tauri-apps/plugin-shell');
            await open(filePath);
            console.log('[pdfGenerator] 📂 PDF aberto no visualizador padrão');
          } catch (openError) {
            console.warn('[pdfGenerator] ⚠️ Não foi possível abrir o arquivo automaticamente:', openError);
          }
        }

        resolve(filePath);
      } catch (error) {
        console.error('[pdfGenerator] ❌ Erro ao salvar PDF:', error);
        reject(error);
      }
    });
  });
}

/**
 * Baixa o PDF gerado (compatível com Tauri e navegador)
 */
export async function baixarPDF(itens: ItemRelatorio[], nomeArquivo: string = 'relatorio-pedidos.pdf'): Promise<void> {
  if (!itens || itens.length === 0) {
    throw new Error('Nenhum item fornecido para gerar o PDF');
  }

  const docDefinition = await gerarDocDefinition(itens);
  const pdfDoc = pdfMake.createPdf(docDefinition);

  if (isTauriEnvironment()) {
    console.log('[pdfGenerator] 🖥️ Rodando no Tauri, usando API nativa');
    await salvarPDFTauri(pdfDoc, nomeArquivo, false);
  } else {
    console.log('[pdfGenerator] 🌐 Rodando no navegador, usando download()');
    pdfDoc.download(nomeArquivo);
  }
}

/**
 * Abre o PDF em uma nova aba para visualização/impressão (navegador) ou salva e abre (Tauri)
 */
export async function abrirPDF(itens: ItemRelatorio[]): Promise<void> {
  if (!itens || itens.length === 0) {
    throw new Error('Nenhum item fornecido para gerar o PDF');
  }

  console.log('[pdfGenerator] Iniciando geração de PDF...', { totalItens: itens.length });

  try {
    const docDefinition = await gerarDocDefinition(itens);
    console.log('[pdfGenerator] Documento gerado com sucesso');

    if (isTauriEnvironment()) {
      console.log('[pdfGenerator] 🖥️ Tauri detectado, salvando e abrindo');
      const pdfDoc = pdfMake.createPdf(docDefinition);
      await salvarPDFTauri(pdfDoc, 'relatorio-pedidos.pdf', true);
      return;
    }

    // Código para navegador (mantém comportamento original)
    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = pdfMake.createPdf(docDefinition);

        pdfDoc.getBlob((blob) => {
          if (!blob) {
            console.error('[pdfGenerator] Blob é null ou undefined');
            reject(new Error('Falha ao gerar blob do PDF'));
            return;
          }

          console.log('[pdfGenerator] Blob criado:', blob.size, 'bytes');

          // Criar URL do blob
          const url = URL.createObjectURL(blob);
          console.log('[pdfGenerator] URL criada:', url.substring(0, 50) + '...');

          // Tentar abrir em nova janela primeiro
          try {
            const newWindow = window.open(url, '_blank');
            if (newWindow) {
              console.log('[pdfGenerator] PDF aberto em nova janela');
              // Limpar URL após um tempo
              setTimeout(() => URL.revokeObjectURL(url), 60000);
              resolve();
              return;
            }
          } catch (err) {
            console.warn('[pdfGenerator] window.open falhou, tentando iframe:', err);
          }

          // Fallback: usar iframe
          try {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              z-index: 99999;
              border: none;
              background: white;
            `;
            iframe.src = url;

            // Botão de fechar
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '✕ Fechar';
            closeBtn.style.cssText = `
              position: fixed;
              top: 10px;
              right: 10px;
              z-index: 100000;
              padding: 10px 20px;
              background: #ef4444;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              font-weight: bold;
              box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            `;

            const cleanup = () => {
              if (iframe.parentNode) document.body.removeChild(iframe);
              if (closeBtn.parentNode) document.body.removeChild(closeBtn);
              URL.revokeObjectURL(url);
            };

            closeBtn.onclick = cleanup;
            iframe.onerror = () => {
              console.error('[pdfGenerator] Erro ao carregar PDF no iframe');
              cleanup();
              reject(new Error('Falha ao carregar PDF'));
            };

            document.body.appendChild(iframe);
            document.body.appendChild(closeBtn);
            console.log('[pdfGenerator] PDF exibido em iframe');
            resolve();
          } catch (iframeErr) {
            console.error('[pdfGenerator] Erro ao criar iframe:', iframeErr);
            // Último recurso: fazer download
            const link = document.createElement('a');
            link.href = url;
            link.download = 'relatorio-pedidos.pdf';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            resolve();
          }
        });
      } catch (error) {
        console.error('[pdfGenerator] Erro na criação do PDF:', error);
        reject(error);
      }
    });
  } catch (error) {
    console.error('[pdfGenerator] Erro ao gerar definição do documento:', error);
    throw error;
  }
}

/**
 * Abre diálogo de impressão do PDF (faz download automático)
 */
export async function imprimirPDF(itens: ItemRelatorio[]): Promise<void> {
  if (!itens || itens.length === 0) {
    throw new Error('Nenhum item fornecido para gerar o PDF');
  }

  console.log('[pdfGenerator] Gerando PDF para impressão...', { totalItens: itens.length });

  try {
    const docDefinition = await gerarDocDefinition(itens);
    console.log('[pdfGenerator] Documento gerado');

    const pdfDoc = pdfMake.createPdf(docDefinition);
    const nomeArquivo = 'relatorio-pedidos-para-imprimir.pdf';

    if (isTauriEnvironment()) {
      console.log('[pdfGenerator] 🖥️ Tauri: salvando para depois imprimir manualmente');
      const filePath = await salvarPDFTauri(pdfDoc, nomeArquivo, true);
      if (filePath) {
        console.log('[pdfGenerator] ✅ PDF salvo e aberto. Você pode imprimir através do visualizador.');
      }
    } else {
      console.log('[pdfGenerator] 🖨️ Chamando print() do PDFMake');
      pdfDoc.print();
    }
  } catch (error) {
    console.error('[pdfGenerator] Erro na impressão:', error);
    throw error;
  }
}

/**
 * Retorna o PDF como Blob para uso personalizado
 */
export async function gerarPDFBlob(itens: ItemRelatorio[]): Promise<Blob> {
  if (!itens || itens.length === 0) {
    throw new Error('Nenhum item fornecido para gerar o PDF');
  }
  
  const docDefinition = await gerarDocDefinition(itens);
  
  return new Promise((resolve, reject) => {
    pdfMake.createPdf(docDefinition).getBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Falha ao gerar PDF'));
      }
    });
  });
}

/**
 * Retorna o PDF como Base64 para uso personalizado
 */
export async function gerarPDFBase64(itens: ItemRelatorio[]): Promise<string> {
  if (!itens || itens.length === 0) {
    throw new Error('Nenhum item fornecido para gerar o PDF');
  }
  
  const docDefinition = await gerarDocDefinition(itens);
  
  return new Promise((resolve, reject) => {
    pdfMake.createPdf(docDefinition).getBase64((base64) => {
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error('Falha ao gerar PDF'));
      }
    });
  });
}

