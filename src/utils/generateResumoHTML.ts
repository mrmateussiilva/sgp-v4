/**
 * Gera HTML estruturado para template resumo com seções organizadas
 * Similar ao layout mostrado na imagem do usuário
 * Usa variáveis {{campo}} que serão substituídas pelo processTemplateHTML
 */

export function generateResumoHTMLStructured(): string {
  return `
<style>
  .template-page {
    width: 187mm;
    height: 280mm; /* 140mm * 2 itens = 280mm */
    max-height: 280mm;
    padding: 0;
    box-sizing: border-box;
    background: white;
    overflow: hidden !important;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    page-break-after: always !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 0;
  }
  .item-container {
    width: 100%;
    height: 140mm; /* Altura de cada item */
    max-height: 140mm;
    min-height: 140mm;
    padding: 2mm;
    border: none;
    border-bottom: 1px solid #ddd;
    border-radius: 0;
    box-sizing: border-box;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
    margin: 0;
  }
  .item-container:last-child {
    border-bottom: none;
  }
  .item-container:last-child {
    margin-bottom: 0;
  }
  .header-section {
    display: flex;
    align-items: flex-start;
    margin-bottom: 4mm;
    border-bottom: 1px solid #ddd;
    padding-bottom: 2mm;
    flex-shrink: 0;
  }
  .id-box {
    background: #f0f0f0;
    padding: 3px 6px;
    margin-right: 6px;
    font-weight: bold;
    font-size: 9pt;
    border: 1px solid #ddd;
  }
  .client-info {
    flex: 1;
    min-width: 0;
  }
  .client-name {
    font-weight: bold;
    font-size: 8pt;
    margin-bottom: 1px;
    word-wrap: break-word;
  }
  .client-details {
    font-size: 6.5pt;
    color: #666;
    word-wrap: break-word;
  }
  .delivery-info {
    text-align: right;
    font-size: 6.5pt;
    white-space: nowrap;
  }
  .priority-high {
    color: red;
    font-weight: bold;
  }
  .content-wrapper {
    display: flex;
    gap: 4mm;
    align-items: flex-start;
    flex: 1;
    min-height: 0;
  }
  .left-column {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3mm;
  }
  .right-column {
    width: 55mm;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }
  .section-title {
    font-weight: bold;
    font-size: 8pt;
    margin-bottom: 2mm;
    border-bottom: 1px solid #ddd;
    padding-bottom: 1mm;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .section-content {
    font-size: 7pt;
    line-height: 1.4;
    flex: 1;
    overflow-y: auto;
  }
  .section-content div {
    margin-bottom: 0.5mm;
  }
  .image-container {
    text-align: center;
    border: 1px solid #ddd;
    padding: 2mm;
    background: #f9f9f9;
    margin-top: 0;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }
  .image-container img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
  }
  .spec-item:empty,
  .spec-item:has-text(": "),
  .spec-item:has-text(": Não"),
  .spec-item:has-text(":  "),
  .spec-item:has-text(": 0") {
    display: none;
  }
  @media print {
    @page {
      size: 187mm 280mm; /* Largura 187mm, altura 280mm (140mm * 2) */
      margin: 0;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
    }
    .template-page {
      overflow: hidden !important;
      height: 280mm !important; /* Altura total: 140mm * 2 itens */
      max-height: 280mm !important;
      min-height: 280mm !important;
      width: 187mm !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: always !important;
      padding: 0 !important;
      margin: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 0 !important;
    }
    .template-page:last-child {
      page-break-after: auto !important;
    }
    .item-container {
      height: 140mm !important; /* Altura de cada item */
      max-height: 140mm !important;
      min-height: 140mm !important;
      width: 100% !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      overflow: hidden !important;
      flex-shrink: 0 !important;
      flex-grow: 0 !important;
      margin: 0 !important;
      padding: 2mm !important;
    }
    .item-container:nth-child(2) {
      border-top: 1px solid #ddd !important;
    }
  }
</style>
<div class="item-container">
  <!-- Cabeçalho -->
  <div class="header-section">
    <div class="id-box">#{{numero}}</div>
    <div class="client-info">
      <div class="client-name">{{cliente}}</div>
      <div class="client-details">{{telefone_cliente}} - {{cidade_estado}}</div>
    </div>
    <div class="delivery-info">
      <div>{{forma_envio}}</div>
      <div class="priority-high">{{prioridade}}</div>
    </div>
  </div>

  <!-- Conteúdo Principal -->
  <div class="content-wrapper">
    <!-- Coluna Esquerda -->
    <div class="left-column">
      <!-- Seção: Informações do Item -->
      <div style="flex-shrink: 0;">
        <div class="section-title">INFORMAÇÕES DO ITEM</div>
        <div class="section-content">
          <div>• Tipo: {{tipo_producao}}</div>
          <div>• Desc: {{item_name}}</div>
          <div>• Qtd: {{quantity}}</div>
          <div>• Dimensões: {{dimensoes}}</div>
          <div>• Área: {{metro_quadrado}} m²</div>
          <div>• Vendedor: {{vendedor}}</div>
          <div>• Designer: {{designer}}</div>
          <div>• Tecido: {{tecido}}</div>
        </div>
      </div>

      <!-- Seção: Especificações Técnicas -->
      <div style="flex: 1; min-height: 0;">
        <div class="section-title">ESPECIFICAÇÕES TÉCNICAS</div>
        <div class="section-content especificacoes-content">
          <div class="spec-item">• Overloque: {{overloque}}</div>
          <div class="spec-item">• Elástico: {{elastico}}</div>
          <div class="spec-item">• Emenda: {{emenda}}</div>
          <div class="spec-item">• Qtd Emendas: {{emenda_qtd}}</div>
          <div class="spec-item">• Zíper: {{ziper}}</div>
          <div class="spec-item">• Cordinha Extra: {{cordinha_extra}}</div>
          <div class="spec-item">• Alcinha: {{alcinha}}</div>
          <div class="spec-item">• Toalha Pronta: {{toalha_pronta}}</div>
          <div class="spec-item">• Tipo Acabamento: {{tipo_acabamento}}</div>
          <div class="spec-item">• Ilhós Qtd: {{quantidade_ilhos}}</div>
          <div class="spec-item">• Espaçamento Ilhós: {{espaco_ilhos}}</div>
          <div class="spec-item">• Cordinha Qtd: {{quantidade_cordinha}}</div>
          <div class="spec-item">• Espaçamento Cordinha: {{espaco_cordinha}}</div>
          <div class="spec-item">• Painéis Qtd: {{quantidade_paineis}}</div>
          <div class="spec-item">• Terceirizado: {{terceirizado}}</div>
          <div class="spec-item">• Acabamento Lona: {{acabamento_lona}}</div>
          <div class="spec-item">• Lona Qtd: {{quantidade_lona}}</div>
          <div class="spec-item">• Acabamento Totem: {{acabamento_totem}}</div>
          <div class="spec-item">• Acabamento Totem Outro: {{acabamento_totem_outro}}</div>
          <div class="spec-item">• Totem Qtd: {{quantidade_totem}}</div>
          <div class="spec-item">• Tipo Adesivo: {{tipo_adesivo}}</div>
          <div class="spec-item">• Adesivo Qtd: {{quantidade_adesivo}}</div>
          <div class="spec-item">• Observação: {{observacao_item}}</div>
          <div class="spec-item">• Legenda: {{legenda_imagem}}</div>
        </div>
      </div>
    </div>

    <!-- Coluna Direita: Visual do Item -->
    <div class="right-column">
      <div class="section-title">VISUAL DO ITEM</div>
      <div class="image-container">
        <img src="{{imagem}}" alt="Item" />
      </div>
    </div>
  </div>
</div>
  `.trim();
}

