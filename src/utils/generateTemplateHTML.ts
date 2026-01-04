/**
 * Utilitário para gerar arquivo HTML a partir de templates de fichas
 */

import { FichaTemplateConfig } from '@/types';

const mmToPx = (mm: number) => mm * 3.779527559;

/**
 * Gera HTML completo para um template de ficha
 */
export function generateTemplateHTML(template: FichaTemplateConfig): string {
  // Gerar um ID único para este template para evitar conflitos de variáveis
  const templateId = `template_${template.templateType || 'default'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const pageWidthPx = mmToPx(template.width);
  const pageHeightPx = mmToPx(template.height);
  
  // Gerar CSS para os campos
  const fieldsCSS = template.fields
    .filter(field => field.visible !== false)
    .map((field) => {
      const left = mmToPx(field.x);
      const top = mmToPx(field.y);
      const width = mmToPx(field.width);
      const height = mmToPx(field.height);
      const fontSize = field.fontSize || 11;
      const fontWeight = field.bold ? 'bold' : 'normal';
      
      return `
    .field-${field.id.replace(/[^a-zA-Z0-9]/g, '-')} {
      position: absolute;
      left: ${left}px;
      top: ${top}px;
      width: ${width}px;
      height: ${height}px;
      font-size: ${fontSize}pt;
      font-weight: ${fontWeight};
      ${field.type === 'image' ? 'object-fit: contain;' : ''}
    }`;
    })
    .join('\n');

  // Gerar HTML dos campos
  const fieldsHTML = template.fields
    .filter(field => field.visible !== false)
    .map((field) => {
      const fieldClass = `field-${field.id.replace(/[^a-zA-Z0-9]/g, '-')}`;
      
      if (field.type === 'image') {
        return `    <div class="${fieldClass}">
      <img src="{{${field.key}}}" alt="${field.label}" style="width: 100%; height: 100%; object-fit: contain;" />
    </div>`;
      } else if (field.type === 'date') {
        return `    <div class="${fieldClass}">{{${field.key}|date}}</div>`;
      } else if (field.type === 'currency') {
        return `    <div class="${fieldClass}">R$ {{${field.key}|currency}}</div>`;
      } else {
        return `    <div class="${fieldClass}">{{${field.key}}}</div>`;
      }
    })
    .join('\n');

  // Escapar caracteres especiais no título
  const escapedTitle = template.title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    
    .page {
      width: ${pageWidthPx}px;
      height: ${pageHeightPx}px;
      background: white;
      position: relative;
      margin: ${mmToPx(template.marginTop)}px ${mmToPx(template.marginRight)}px ${mmToPx(template.marginBottom)}px ${mmToPx(template.marginLeft)}px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .page-content {
      position: relative;
      width: 100%;
      height: 100%;
    }
    
    ${fieldsCSS}
    
    /* Estilos para impressão */
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .page {
        margin: 0;
        box-shadow: none;
        page-break-after: always;
      }
    }
    
    /* Estilos para preview */
    .field-label {
      color: #666;
      font-size: 0.8em;
    }
    
    .field-value {
      color: #000;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="page-content">
${fieldsHTML}
    </div>
  </div>
  
  <script>
    (function() {
      // ID único para este template - usar escopo isolado
      const templateScope = '${templateId}';
      // Exemplo de dados para preview (substituir com dados reais) - nome único para evitar conflitos
      const sampleData = (function() {
        const data = {
        numero: '001',
        cliente: 'Cliente Exemplo',
        telefone_cliente: '(11) 99999-9999',
        data_entrada: '2024-01-15',
        data_entrega: '2024-01-20',
        item_name: 'Produto Exemplo',
        dimensoes: '100x200cm',
        designer: 'Designer Exemplo',
        vendedor: 'Vendedor Exemplo',
        tecido: 'Tecido Exemplo',
        quantity: 1,
        unit_price: 100.00,
        subtotal: 100.00,
        valor_frete: 20.00,
        total_value: 120.00,
        observacao: 'Observações do pedido',
        imagem: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2VtPC90ZXh0Pjwvc3ZnPg=='
        };
        return data;
      })();
      
      // Função para formatar data
      function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
      }
      
      // Função para formatar moeda
      function formatCurrency(value) {
        if (!value) return 'R$ 0,00';
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      
      // Substituir placeholders com dados de exemplo - apenas neste escopo
      const pageElement = document.querySelector('.page');
      if (pageElement) {
        pageElement.querySelectorAll('[class*="field-"]').forEach(field => {
          const html = field.innerHTML;
          let newHtml = html;
          
          // Substituir {{key}} por valores
          newHtml = newHtml.replace(/\{\{([^}|]+)(?:\|([^}]+))?\}\}/g, (match, key, format) => {
            const value = sampleData[key.trim()] || '';
            
            if (format) {
              const formatType = format.trim();
              if (formatType === 'date') {
                return formatDate(value);
              } else if (formatType === 'currency') {
                return formatCurrency(value);
              }
            }
            
            return value || match;
          });
          
          field.innerHTML = newHtml;
        });
      }
      
      // Função para preencher com dados reais (chamar quando tiver dados do pedido)
      // Usar namespace único para evitar conflitos
      const fillTemplateFn = 'fillTemplate_' + templateScope.replace(/[^a-zA-Z0-9]/g, '_');
      window[fillTemplateFn] = function(data) {
        const pageElement = document.querySelector('.page');
        if (pageElement) {
          pageElement.querySelectorAll('[class*="field-"]').forEach(field => {
            const html = field.innerHTML;
            let newHtml = html;
            
            newHtml = newHtml.replace(/\{\{([^}|]+)(?:\|([^}]+))?\}\}/g, (match, key, format) => {
              const value = data[key.trim()] || '';
              
              if (format) {
                const formatType = format.trim();
                if (formatType === 'date') {
                  return formatDate(value);
                } else if (formatType === 'currency') {
                  return formatCurrency(value);
                }
              }
              
              return value || match;
            });
            
            field.innerHTML = newHtml;
          });
        }
      };
    })();
  </script>
</body>
</html>`;

  return html;
}

/**
 * Gera HTML para ambos os templates (geral e resumo)
 */
export function generateTemplatesHTML(
  geral: FichaTemplateConfig,
  resumo: FichaTemplateConfig
): { geral: string; resumo: string } {
  return {
    geral: generateTemplateHTML(geral),
    resumo: generateTemplateHTML(resumo),
  };
}

