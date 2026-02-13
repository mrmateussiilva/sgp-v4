/**
 * Template HTML customizado para impressão de fichas
 * Garante exatamente 2 itens por página A4 com altura fixa de 148.5mm
 */

export const CUSTOM_PRINT_TEMPLATE = `
<div class="item" style="
  height: 148.5mm !important;
  max-height: 148.5mm !important;
  min-height: 148.5mm !important;
  overflow: hidden !important;
  page-break-inside: avoid !important;
  padding: 8mm;
  border: 1px solid #ddd;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
">
  <!-- Header com informações do pedido -->
  <div class="header" style="margin-bottom: 4mm; padding-bottom: 3mm; border-bottom: 2px solid #333;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2mm;">
      <div style="font-size: 16px; font-weight: bold;">{{numero}}</div>
      <div style="font-size: 14px; font-weight: bold; background: #333; color: white; padding: 2mm 4mm;">{{cliente}}</div>
    </div>
    <div style="display: flex; gap: 4mm; font-size: 13px; flex-wrap: wrap;">
      <div><strong>Data Envio:</strong> {{data_entrega}}</div>
      <div><strong>Prioridade:</strong> {{prioridade}}</div>
      <div><strong>Forma Envio:</strong> {{forma_envio}}</div>
    </div>
  </div>

  <!-- Corpo principal com descrição e imagem -->
  <div class="body" style="flex: 1; display: flex; gap: 4mm; overflow: hidden;">
    <!-- Coluna esquerda: Descrição -->
    <div class="description" style="flex: 1; overflow: hidden;">
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 2mm;">{{item_name}}</div>
      <div style="font-size: 13px; line-height: 1.4;">
        <div><strong>Descrição:</strong> {{descricao}}</div>
        <div><strong>Dimensões:</strong> {{dimensoes}}</div>
        <div><strong>Quantidade:</strong> {{quantity}}</div>
        <div><strong>Material:</strong> {{tecido}}</div>
        <div><strong>Designer:</strong> {{designer}}</div>
        <div><strong>Vendedor:</strong> {{vendedor}}</div>
        
        <!-- Especificações técnicas -->
        <div style="margin-top: 2mm;">
          <div><strong>Overloque:</strong> {{overloque}}</div>
          <div><strong>Elástico:</strong> {{elastico}}</div>
          <div><strong>Emenda:</strong> {{emenda}}</div>
          <div><strong>Qtd. Emendas:</strong> {{emenda_qtd}}</div>
          <div><strong>Ilhós:</strong> {{ilhos_display}}</div>
          <div><strong>Cordinha:</strong> {{cordinha_display}}</div>
        </div>
      </div>
    </div>

    <!-- Coluna direita: Imagem -->
    <div class="image-container" style="width: 85mm; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd; background: #f9f9f9;">
      <img src="{{imagem}}" alt="Produto" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
    </div>
  </div>

  <!-- Footer com observações e campos de anotação -->
  <div class="footer" style="margin-top: 3mm; padding-top: 3mm; border-top: 2px solid #333;">
    <!-- Observações -->
    {{#if observacao}}
    <div style="margin-bottom: 2mm; padding: 2mm; background: #f0fdf4; border-left: 4px solid #22c55e;">
      <strong style="text-decoration: underline;">OBSERVAÇÃO PEDIDO:</strong> {{observacao}}
    </div>
    {{/if}}
    {{#if observacao_item}}
    <div style="margin-bottom: 2mm; padding: 2mm; background: #f0fdf4; border-left: 4px solid #22c55e;">
      <strong style="text-decoration: underline;">OBSERVAÇÃO ITEM:</strong> {{observacao_item}}
    </div>
    {{/if}}
    
    <!-- Campos de anotação manual -->
    <div style="display: flex; gap: 4mm; font-size: 13px;">
      <div style="flex: 1;"><strong>MAQUINA RIP:</strong> _______________</div>
      <div style="flex: 1;"><strong>DATA DE IMPRESSÃO:</strong> _______________</div>
    </div>
  </div>
</div>
`;

export const CUSTOM_PRINT_CSS = `
@page {
  size: A4 portrait;
  margin: 0;
}

* {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 0;
  font-size: 13px;
  line-height: 1.4;
  color: #000;
  background: white;
}

.template-page {
  width: 210mm;
  min-height: 297mm;
  background: white;
  page-break-after: always;
}

.template-page:last-child {
  page-break-after: auto;
}

.items-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.item {
  height: 148.5mm !important;
  max-height: 148.5mm !important;
  min-height: 148.5mm !important;
  overflow: hidden !important;
  page-break-inside: avoid !important;
}

@media print {
  body {
    font-size: 13px !important;
  }
  
  .item {
    height: 148.5mm !important;
    max-height: 148.5mm !important;
    min-height: 148.5mm !important;
  }
}
`;
