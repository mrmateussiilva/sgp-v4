/**
 * Gera PDF 100% no client-side com layout de 2 itens por página A4
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions, Content, StyleDictionary } from 'pdfmake/interfaces';
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
  observacao_pedido?: string;
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
    fontSize: 11,
    color: CORES.textoCinza,
  },
  tituloSecao: {
    fontSize: 11,
    bold: true,
    color: CORES.tituloSecao,
  },
  descricaoProduto: {
    fontSize: 12,
    bold: true,
    color: CORES.textoNormal,
  },
  textoNormal: {
    fontSize: 11,
    color: CORES.textoNormal,
  },
  label: {
    fontSize: 11,
    bold: true,
    color: CORES.textoEscuro,
  },
  observacao: {
    fontSize: 10,
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
 * Agrupa itens em páginas de 2
 */
function agruparEmPaginas<T>(itens: T[], itensPorPagina: number = 2): T[][] {
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
function gerarObservacao(observacao?: string, label: string = 'Observação'): Content | null {
  if (!isValid(observacao)) return null;

  return {
    table: {
      widths: ['*'],
      body: [[
        {
          text: [
            { text: `⚠ ${label}: `, bold: true, decoration: 'underline' },
            { text: observacao || '' },
          ],
          style: 'observacao',
          margin: [8, 8, 8, 8],
        }
      ]],
    },
    layout: {
      fillColor: () => '#F0FDF4', // Verde bem claro para destacar
      hLineWidth: () => 1,
      vLineWidth: (i: number) => i === 0 ? 4 : 1,
      hLineColor: () => '#22c55e',
      vLineColor: () => '#22c55e',
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 8, 0, 8],
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
          { text: item.designer || '', style: 'textoNormal' },
        ],
        width: '*',
      } : { text: '', width: '*' },
      hasVendedor ? {
        text: [
          { text: 'Vendedor: ', style: 'label' },
          { text: item.vendedor || '', style: 'textoNormal' },
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
        { text: item.material || '', style: 'textoNormal' },
      ],
      margin: [0, 0, 0, 2],
    });
  }

  if (isValid(item.emenda_label)) {
    conteudo.push({
      text: [
        { text: 'Emenda: ', style: 'label' },
        { text: item.emenda_label || '', style: 'textoNormal' },
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

  // Observações
  const obsPedido = gerarObservacao(item.observacao_pedido, 'OBSERVAÇÃO PEDIDO');
  if (obsPedido) {
    conteudo.push(obsPedido);
  }

  const obsItem = gerarObservacao(item.observacao_item, 'OBSERVAÇÃO ITEM');
  if (obsItem) {
    conteudo.push(obsItem);
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
    width: 180,
    height: 180,
    alignment: 'center',
    margin: [0, 0, 0, 5],
  });

  // Legenda
  if (isValid(item.legenda_imagem)) {
    conteudo.push({
      text: item.legenda_imagem || '',
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
  // Se colunaDireita existe, criar layout em 2 colunas
  // Type assertion necessária porque pdfmake aceita Content em columns
  const corpo: Content = colunaDireita ? ({
    columns: [
      Object.assign({}, colunaEsquerda, { width: '*' }),
      { width: 10, text: '' }, // Espaçador
      Object.assign({}, colunaDireita, { width: 210 }),
    ],
  } as Content) : colunaEsquerda;

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
 * Gera uma página com até 2 itens
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
  // Agrupar itens em páginas de 2
  const paginas = agruparEmPaginas(itens, 2);

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
      fontSize: 12,
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

function getByteLength(data: ArrayBuffer | ArrayBufferView): number {
  return data instanceof ArrayBuffer ? data.byteLength : data.byteLength;
}

/**
 * Salva PDF usando API do Tauri
 * @returns Caminho do arquivo salvo ou null se cancelado
 */
async function salvarPDFTauri(pdfDocGenerator: any, nomeArquivo: string, abrirAposSalvar: boolean = false): Promise<string | null> {
  return new Promise((resolve, reject) => {
    console.log('[pdfGenerator] 📦 Iniciando getBuffer do PDFMake...');

    // Tentar usar getBuffer primeiro
    if (typeof pdfDocGenerator.getBuffer === 'function') {
      pdfDocGenerator.getBuffer(async (buffer: ArrayBuffer | ArrayBufferView) => {
        console.log('[pdfGenerator] 📦 Buffer recebido via getBuffer, tamanho:', buffer ? getByteLength(buffer) : 'null');
        await processarESalvarPDF(buffer, nomeArquivo, abrirAposSalvar, resolve, reject);
      });
    } else {
      // Fallback: usar getBlob e converter
      console.log('[pdfGenerator] 📦 getBuffer não disponível, usando getBlob...');
      pdfDocGenerator.getBlob(async (blob: Blob) => {
        console.log('[pdfGenerator] 📦 Blob recebido, tamanho:', blob?.size || 'desconhecido');
        if (!blob) {
          reject(new Error('Falha ao gerar blob do PDF'));
          return;
        }

        // Converter Blob para ArrayBuffer e depois para Uint8Array
        const arrayBuffer = await blob.arrayBuffer();
        await processarESalvarPDF(arrayBuffer, nomeArquivo, abrirAposSalvar, resolve, reject);
      });
    }
  });
}

async function processarESalvarPDF(
  buffer: ArrayBuffer | ArrayBufferView,
  nomeArquivo: string,
  abrirAposSalvar: boolean,
  resolve: (value: string | null) => void,
  reject: (reason?: any) => void
): Promise<void> {
  try {
    console.log('[pdfGenerator] 📥 Importando APIs do Tauri...');
    // Importar APIs do Tauri apenas quando necessário
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');

    console.log('[pdfGenerator] 💾 Abrindo diálogo de salvar...');
    // Abrir diálogo para escolher onde salvar
    const filePath = await save({
      defaultPath: nomeArquivo,
      filters: [{
        name: 'PDF',
        extensions: ['pdf']
      }]
    });

    console.log('[pdfGenerator] 💾 Diálogo retornou:', filePath || 'null (cancelado)');

    if (!filePath) {
      console.log('[pdfGenerator] ❌ Usuário cancelou o salvamento');
      resolve(null);
      return;
    }

    console.log('[pdfGenerator] 🔄 Convertendo buffer para Uint8Array...');
    // Converter buffer para Uint8Array (compatível com ArrayBuffer e views)
    let uint8Array: Uint8Array;
    if (buffer instanceof ArrayBuffer) {
      uint8Array = new Uint8Array(buffer);
    } else if (buffer instanceof Uint8Array) {
      uint8Array = buffer;
    } else {
      uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }

    console.log('[pdfGenerator] 💾 Salvando arquivo em:', filePath, 'tamanho:', uint8Array.length, 'bytes');
    // Salvar arquivo
    await writeFile(filePath, uint8Array);

    console.log('[pdfGenerator] ✅ PDF salvo com sucesso:', filePath);

    // Abrir arquivo no visualizador padrão se solicitado
    if (abrirAposSalvar) {
      try {
        console.log('[pdfGenerator] 📂 Abrindo PDF no visualizador padrão...');
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
    console.error('[pdfGenerator] ❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
    reject(error);
  }
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
 * Abre diálogo de impressão do PDF
 * No Tauri: salva e abre o arquivo (usuário pode imprimir pelo visualizador)
 * No navegador: usa open() do pdfmake
 */
export async function imprimirPDF(itens: ItemRelatorio[]): Promise<void> {
  if (!itens || itens.length === 0) {
    throw new Error('Nenhum item fornecido para gerar o PDF');
  }

  console.log('[pdfGenerator] Gerando PDF para impressão...', { totalItens: itens.length });

  try {
    const docDefinition = await gerarDocDefinition(itens);
    console.log('[pdfGenerator] Documento gerado');

    if (isTauriEnvironment()) {
      // No Tauri: usar printPdf() que salva e abre o arquivo
      // O usuário pode então imprimir pelo visualizador padrão do sistema
      console.log('[pdfGenerator] 🖥️ Tauri: salvando e abrindo PDF para impressão');
      const filePath = await printPdf(docDefinition, 'relatorio-pedidos-para-imprimir.pdf');
      if (filePath) {
        console.log('[pdfGenerator] ✅ PDF salvo e aberto. Você pode imprimir através do visualizador padrão.');
      } else {
        console.log('[pdfGenerator] ℹ️ Usuário cancelou a operação');
      }
    } else {
      // No navegador: usar open() do pdfmake que abre diretamente
      console.log('[pdfGenerator] 🌐 Navegador: usando open() do pdfmake...');
      const pdfDoc = pdfMake.createPdf(docDefinition);
      pdfDoc.open();
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

// ============================================================================
// FUNÇÃO PROFISSIONAL DE IMPRESSÃO
// ============================================================================

/**
 * Imprime PDF usando window.print() em nova janela/iframe
 * Funciona tanto no Tauri quanto no navegador
 */
export async function printPdfWindowPrint(
  docDefinition: TDocumentDefinitions
): Promise<void> {
  try {
    console.log('[printPdfWindowPrint] 📄 Gerando PDF...');
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);

    // Obter blob do PDF - tentar getBase64 primeiro (mais confiável)
    console.log('[printPdfWindowPrint] 📦 Tentando obter PDF via getBase64...');
    let blob: Blob;

    try {
      // Primeiro tentar getBase64 (mais confiável)
      const base64 = await new Promise<string>((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.warn('[printPdfWindowPrint] ⚠️ Timeout no getBase64, tentando getBlob...');
            reject(new Error('Timeout no getBase64'));
          }
        }, 15000); // Timeout menor para getBase64

        pdfDocGenerator.getBase64((base64: string) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);

          if (!base64) {
            reject(new Error('Falha ao gerar base64 do PDF'));
            return;
          }

          resolve(base64);
        });
      });

      console.log('[printPdfWindowPrint] ✅ Base64 recebido, convertendo para blob...');
      // Converter base64 para blob
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: 'application/pdf' });
      console.log('[printPdfWindowPrint] ✅ Blob criado a partir de base64, tamanho:', blob.size, 'bytes');

    } catch (base64Error) {
      console.warn('[printPdfWindowPrint] ⚠️ getBase64 falhou, tentando getBlob...', base64Error);

      // Fallback: tentar getBlob
      blob = await new Promise<Blob>((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error('Timeout ao gerar blob do PDF - Tanto getBase64 quanto getBlob falharam'));
          }
        }, 30000);

        pdfDocGenerator.getBlob((blob: Blob | null) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);

          if (!blob) {
            reject(new Error('Falha ao gerar blob do PDF'));
            return;
          }

          resolve(blob);
        });
      });

      console.log('[printPdfWindowPrint] ✅ Blob recebido via getBlob, tamanho:', blob.size, 'bytes');
    }

    console.log('[printPdfWindowPrint] ✅ PDF gerado, tamanho:', blob.size, 'bytes');

    // Criar URL do blob
    const blobUrl = URL.createObjectURL(blob);
    console.log('[printPdfWindowPrint] 📄 URL do blob criada');

    if (isTauriEnvironment()) {
      // No Tauri: criar iframe temporário para imprimir
      console.log('[printPdfWindowPrint] 🖥️ Tauri: criando iframe para impressão...');

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.width = '100vw';
      iframe.style.height = '100vh';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.zIndex = '999999';
      iframe.style.border = 'none';
      iframe.style.display = 'none'; // Ocultar inicialmente

      document.body.appendChild(iframe);

      iframe.onload = () => {
        console.log('[printPdfWindowPrint] 📄 PDF carregado no iframe, chamando print()...');
        try {
          // Aguardar um pouco para garantir que o PDF carregou
          setTimeout(() => {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
              console.log('[printPdfWindowPrint] ✅ print() chamado');

              // Limpar após um tempo
              setTimeout(() => {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
                URL.revokeObjectURL(blobUrl);
              }, 1000);
            }
          }, 500);
        } catch (error) {
          console.error('[printPdfWindowPrint] ❌ Erro ao chamar print():', error);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          URL.revokeObjectURL(blobUrl);
        }
      };

      iframe.onerror = () => {
        console.error('[printPdfWindowPrint] ❌ Erro ao carregar PDF no iframe');
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(blobUrl);
      };

      iframe.src = blobUrl;

    } else {
      // No navegador: usar window.open e print()
      console.log('[printPdfWindowPrint] 🌐 Navegador: abrindo nova janela para impressão...');
      const printWindow = window.open(blobUrl, '_blank');

      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            // Limpar URL após impressão
            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
            }, 1000);
          }, 500);
        };
      } else {
        console.error('[printPdfWindowPrint] ❌ Não foi possível abrir nova janela');
        URL.revokeObjectURL(blobUrl);
        throw new Error('Popup bloqueado. Permita popups para este site.');
      }
    }
  } catch (error) {
    console.error('[printPdfWindowPrint] ❌ Erro:', error);
    throw error;
  }
}

/**
 * Fluxo profissional de impressão:
 * 1. Gera PDF usando pdfmake
 * 2. Abre diálogo para escolher onde salvar
 * 3. Salva PDF no disco usando API do Tauri
 * 4. Abre o arquivo no SO (que permite escolher impressora ou salvar como PDF)
 * 
 * @param docDefinition - Definição do documento PDF (TDocumentDefinitions do pdfmake)
 * @param nomeArquivoPadrao - Nome padrão do arquivo (opcional, padrão: 'documento.pdf')
 * @returns Promise<string | null> - Caminho do arquivo salvo ou null se cancelado
 * 
 * @example
 * ```typescript
 * const docDefinition = {
 *   content: [{ text: 'Hello World' }]
 * };
 * 
 * const caminho = await printPdf(docDefinition, 'meu-documento.pdf');
 * if (caminho) {
 *   console.log('PDF salvo em:', caminho);
 * } else {
 *   console.log('Usuário cancelou');
 * }
 * ```
 */
export async function printPdf(
  docDefinition: TDocumentDefinitions,
  nomeArquivoPadrao: string = 'documento.pdf'
): Promise<string | null> {
  // Verificar se está rodando no Tauri
  if (!isTauriEnvironment()) {
    throw new Error('printPdf() só funciona no ambiente Tauri. Use as funções de navegador para web.');
  }

  try {
    // 1. Gerar PDF usando pdfmake
    console.log('[printPdf] 📄 Gerando PDF...');
    console.log('[printPdf] 📄 Verificando docDefinition...', {
      temContent: !!docDefinition.content,
      temStyles: !!docDefinition.styles,
      pageSize: docDefinition.pageSize || 'A4'
    });

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    console.log('[printPdf] ✅ PDF generator criado');
    console.log('[printPdf] 🔍 Métodos disponíveis:', {
      temGetBuffer: typeof pdfDocGenerator.getBuffer === 'function',
      temGetBlob: typeof pdfDocGenerator.getBlob === 'function',
      temDownload: typeof pdfDocGenerator.download === 'function',
      temOpen: typeof pdfDocGenerator.open === 'function',
      temPrint: typeof pdfDocGenerator.print === 'function'
    });

    // 2. Obter buffer do PDF - tentar getBase64 primeiro (mais confiável)
    console.log('[printPdf] 📦 Tentando obter PDF via getBase64...');
    let buffer: Uint8Array;

    try {
      // Primeiro tentar getBase64 (mais confiável e rápido)
      const base64 = await new Promise<string>((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.warn('[printPdf] ⚠️ Timeout no getBase64, tentando getBlob...');
            reject(new Error('Timeout no getBase64'));
          }
        }, 30000); // Timeout de 30 segundos

        pdfDocGenerator.getBase64((base64: string) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);

          if (!base64) {
            reject(new Error('Falha ao gerar base64 do PDF'));
            return;
          }

          resolve(base64);
        });
      });

      console.log('[printPdf] ✅ Base64 recebido, convertendo para Uint8Array...');
      // Converter base64 para Uint8Array
      const binaryString = atob(base64);
      buffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        buffer[i] = binaryString.charCodeAt(i);
      }
      console.log('[printPdf] ✅ Buffer criado a partir de base64, tamanho:', buffer.length, 'bytes');

    } catch (base64Error) {
      console.warn('[printPdf] ⚠️ getBase64 falhou, tentando getBlob...', base64Error);

      // Fallback: tentar getBlob
      buffer = await new Promise<Uint8Array>((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.error('[printPdf] ❌ TIMEOUT: getBlob não retornou em 30 segundos');
            reject(new Error('Timeout ao obter PDF - Tanto getBase64 quanto getBlob falharam (60s total)'));
          }
        }, 30000);

        console.log('[printPdf] 📦 Chamando getBlob()...');
        try {
          pdfDocGenerator.getBlob((blob: Blob | null) => {
            if (resolved) {
              console.log('[printPdf] ⚠️ Callback já foi resolvido, ignorando...');
              return;
            }

            resolved = true;
            clearTimeout(timeout);

            console.log('[printPdf] 📦 Blob recebido:', {
              existe: !!blob,
              tamanho: blob?.size || 0,
              tipo: blob?.type || 'desconhecido'
            });

            if (!blob) {
              console.error('[printPdf] ❌ Blob é null ou undefined');
              reject(new Error('Falha ao gerar blob do PDF - blob é null'));
              return;
            }

            console.log('[printPdf] 🔄 Convertendo blob para ArrayBuffer...');
            blob.arrayBuffer()
              .then((arrayBuffer) => {
                const uint8Array = new Uint8Array(arrayBuffer);
                console.log('[printPdf] ✅ Blob convertido para Uint8Array, tamanho:', uint8Array.length, 'bytes');
                resolve(uint8Array);
              })
              .catch((error) => {
                console.error('[printPdf] ❌ Erro ao converter blob para ArrayBuffer:', error);
                reject(new Error(`Erro ao converter blob: ${error}`));
              });
          });

          console.log('[printPdf] ✅ getBlob() chamado, aguardando callback...');
        } catch (error) {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          console.error('[printPdf] ❌ Erro ao chamar getBlob:', error);
          reject(new Error(`Erro ao chamar getBlob: ${error}`));
        }
      });

      console.log('[printPdf] ✅ Buffer recebido via getBlob, tamanho:', buffer.length, 'bytes');
    }

    console.log('[printPdf] ✅ PDF gerado, tamanho:', buffer.length, 'bytes');

    // 3. Abrir diálogo para escolher onde salvar
    console.log('[printPdf] 💾 Abrindo diálogo de salvar...');
    const { save } = await import('@tauri-apps/plugin-dialog');

    const filePath = await save({
      defaultPath: nomeArquivoPadrao,
      filters: [{
        name: 'PDF',
        extensions: ['pdf']
      }]
    });

    // 4. Verificar se usuário cancelou
    if (!filePath) {
      console.log('[printPdf] ❌ Usuário cancelou o salvamento');
      return null;
    }

    // 5. Salvar arquivo no disco
    console.log('[printPdf] 💾 Salvando arquivo em:', filePath);
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    await writeFile(filePath, buffer);

    console.log('[printPdf] ✅ PDF salvo com sucesso:', filePath);

    // 6. Abrir arquivo no sistema operacional
    // O SO vai abrir no visualizador padrão que permite imprimir ou salvar como PDF
    console.log('[printPdf] 🖨️ Abrindo PDF no sistema operacional...');
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(filePath);

    console.log('[printPdf] ✅ PDF aberto. Usuário pode escolher impressora ou salvar como PDF.');

    return filePath;
  } catch (error) {
    console.error('[printPdf] ❌ Erro no fluxo de impressão:', error);
    throw error;
  }
}
