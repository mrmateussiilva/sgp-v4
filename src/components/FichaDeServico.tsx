import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { OrderFicha, OrderItemFicha } from '../types';
import { getItemDisplayEntries } from '@/utils/order-item-display';
import { normalizeImagePath, isValidImagePath } from '@/utils/path';
import { loadAuthenticatedImage, revokeImageUrl } from '@/utils/imageLoader';

interface FichaDeServicoProps {
  orderId: number;
  sessionToken: string;
  onClose?: () => void;
}

const FichaDeServico: React.FC<FichaDeServicoProps> = ({ 
  orderId, 
  sessionToken, 
  onClose
}) => {
  const [orderData, setOrderData] = useState<OrderFicha | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadOrderData();
  }, [orderId, sessionToken]);

  // Cleanup: revogar blob URLs quando o componente for desmontado
  useEffect(() => {
    return () => {
      imageUrls.forEach((blobUrl, imagePath) => {
        revokeImageUrl(imagePath);
      });
    };
  }, [imageUrls]);

  const loadOrderData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await api.getOrderFicha(orderId);
      
      setOrderData(data);
      
      // Carregar imagens autenticadas
      const imageUrlMap = new Map<string, string>();
      console.log('[FichaDeServico] 📸 Carregando imagens dos itens:', data.items.map(item => ({
        itemId: item.id,
        itemName: item.item_name,
        imagem: item.imagem
      })));
      
      for (const item of data.items) {
        if (item.imagem && isValidImagePath(item.imagem)) {
          try {
            console.log(`[FichaDeServico] 🔄 Carregando imagem do item ${item.id}:`, item.imagem);
            const blobUrl = await loadAuthenticatedImage(item.imagem);
            imageUrlMap.set(item.imagem, blobUrl);
            console.log(`[FichaDeServico] ✅ Imagem do item ${item.id} carregada com sucesso`);
          } catch (err) {
            console.error(`[FichaDeServico] ❌ Erro ao carregar imagem do item ${item.id}:`, {
              imagem: item.imagem,
              error: err
            });
            // Continuar mesmo se uma imagem falhar
          }
        } else {
          console.log(`[FichaDeServico] ⚠️ Item ${item.id} não tem imagem válida:`, item.imagem);
        }
      }
      console.log('[FichaDeServico] 📊 Total de imagens carregadas:', imageUrlMap.size);
      setImageUrls(imageUrlMap);
    } catch (err) {
      console.error('Erro ao carregar dados da ficha:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | string): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const formatDimensions = (item: OrderItemFicha): string => {
    if (item.largura && item.altura) {
      const dimensoes = `${item.largura} x ${item.altura}`;
      if (item.metro_quadrado) {
        return `${dimensoes} = ${item.metro_quadrado} m²`;
      }
      return dimensoes;
    }
    return '';
  };

  const getFormaPagamento = (formaPagamentoId?: number): string => {
    if (!formaPagamentoId) return 'A definir';
    // Aqui você pode implementar uma lógica para buscar o nome da forma de pagamento
    return 'PIX'; // Placeholder
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando ficha de serviço...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">Erro ao carregar ficha de serviço</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadOrderData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600">Nenhum dado encontrado</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4">
      {/* Controles */}
      <div className="max-w-4xl mx-auto mb-6 print:hidden">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">
            Ficha de Serviço - OS #{orderData.numero || orderData.id}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              🖨️ Imprimir Ficha
            </button>
          </div>
        </div>
      </div>

      {/* Fichas de Serviço - Uma por item */}
      <div className="max-w-4xl mx-auto space-y-6">
        {orderData.items.map((item) => {
          const detailEntries = getItemDisplayEntries(item as any, {
            omitKeys: ['observacao', 'subtotal'],
          });

          return (
            <div key={item.id} className="ficha-container">
            {/* Cabeçalho */}
            <div className="ficha-header">
              <div className="ficha-title">EMISSÃO FICHA DE SERVIÇO</div>
              <div className="ficha-dates">
                <span className="date-label">Entrada:</span>
                <span className="date-value">{formatDate(orderData.data_entrada)}</span>
                <span className="date-separator">|</span>
                <span className="date-label">Entrega:</span>
                <span className="date-value">{formatDate(orderData.data_entrega)}</span>
              </div>
              <div className="ficha-customer-info">
                <span className="customer-name">{orderData.cliente || 'Não informado'}</span>
                <span className="customer-phone">{orderData.telefone_cliente || ''}</span>
                <span className="customer-location">
                  {[orderData.cidade_cliente, orderData.estado_cliente]
                    .filter(Boolean)
                    .join(' - ') || 'Não informado'}
                </span>
              </div>
            </div>

            {/* Corpo da Ficha */}
            <div className="ficha-body">
              <table className="ficha-table">
                <tbody>
                  <tr>
                    <td className="field-label">Nro. OS:</td>
                    <td className="field-value">{orderData.numero || orderData.id}</td>
                  </tr>
                  <tr>
                    <td className="field-label">Descrição:</td>
                    <td className="field-value">{item.item_name}</td>
                  </tr>
                  <tr>
                    <td className="field-label">Tamanho:</td>
                    <td className="field-value">{formatDimensions(item)}</td>
                  </tr>
                  <tr>
                    <td className="field-label">Arte / Designer / Exclusiva / Vr. Arte:</td>
                    <td className="field-value">
                      {item.designer || ''} / {item.vendedor || ''} / / 
                    </td>
                  </tr>
                  <tr>
                    <td className="field-label">RIP / Máquina / Impressão / Data Impressão:</td>
                    <td className="field-value">/ / / </td>
                  </tr>
                  <tr>
                    <td className="field-label">Tecido / Ilhós / Emendas / Overloque / Elástico:</td>
                    <td className="field-value">
                      {item.tecido || ''} / {item.quantidade_ilhos || ''} / {item.emenda || ''} / 
                      {item.overloque ? 'Sim' : ''} / {item.elastico ? 'Sim' : ''}
                    </td>
                  </tr>
                  <tr>
                    <td className="field-label">Revisão / Expedição:</td>
                    <td className="field-value">/ </td>
                  </tr>
                  <tr>
                    <td className="field-label">Forma de Envio / Pagamento:</td>
                    <td className="field-value">
                      {orderData.forma_envio || ''} / {getFormaPagamento(orderData.forma_pagamento_id)}
                    </td>
                  </tr>
                  <tr className="financial-row">
                    <td className="field-label">Valores:</td>
                    <td className="field-value financial-values">
                      <div className="financial-line">
                        <span>Tecido:</span>
                        <span>{formatCurrency(item.subtotal)}</span>
                      </div>
                      <div className="financial-line">
                        <span>Outros:</span>
                        <span>R$ 0,00</span>
                      </div>
                      <div className="financial-line">
                        <span>SubTotal:</span>
                        <span>{formatCurrency(item.subtotal)}</span>
                      </div>
                      <div className="financial-line">
                        <span>Frete:</span>
                        <span>{formatCurrency(orderData.valor_frete || 0)}</span>
                      </div>
                      <div className="financial-line total-line">
                        <span>Total:</span>
                        <span>{formatCurrency(orderData.total_value)}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Seção de Imagem */}
            {item.imagem && isValidImagePath(item.imagem) && (
              <div className="ficha-image-section">
                <div className="ficha-image-container">
                  {(() => {
                    const blobUrl = imageUrls.get(item.imagem);
                    const fallbackUrl = normalizeImagePath(item.imagem);
                    const imageSrc = blobUrl || fallbackUrl;
                    
                    console.log('[FichaDeServico] 🖼️ Renderizando imagem:', {
                      itemId: item.id,
                      originalPath: item.imagem,
                      blobUrl,
                      fallbackUrl,
                      finalSrc: imageSrc
                    });
                    
                    return (
                      <img
                        src={imageSrc}
                        alt={`Imagem do item ${item.item_name}`}
                        className="ficha-image"
                        onError={(event) => {
                          console.error('[FichaDeServico] ❌ Erro ao exibir imagem:', {
                            itemId: item.id,
                            originalPath: item.imagem,
                            blobUrl: imageUrls.get(item.imagem),
                            normalizedPath: normalizeImagePath(item.imagem),
                            finalSrc: imageSrc,
                            error: event
                          });
                          const target = event.currentTarget as HTMLImageElement;
                          target.style.display = 'none';
                          const placeholder = target.parentElement?.querySelector('.ficha-image-placeholder');
                          if (placeholder) {
                            (placeholder as HTMLElement).style.display = 'flex';
                          }
                        }}
                        onLoad={() => {
                          console.log('[FichaDeServico] ✅ Imagem exibida com sucesso:', {
                            itemId: item.id,
                            originalPath: item.imagem,
                            blobUrl: imageUrls.get(item.imagem),
                            finalSrc: imageSrc
                          });
                        }}
                      />
                    );
                  })()}
                  <div className="ficha-image-placeholder" style={{ display: 'none' }}>
                    <span>Imagem não disponível</span>
                  </div>
                </div>
                {item.legenda_imagem && (
                  <div className="ficha-image-caption">
                    {item.legenda_imagem}
                  </div>
                )}
              </div>
            )}

            {detailEntries.length > 0 && (
              <div className="ficha-details">
                <h4 className="ficha-details-title">Detalhes informados no cadastro do item</h4>
                <div className="ficha-details-grid">
                  {detailEntries.map((entry) => (
                    <div key={entry.key} className="ficha-detail-card">
                      <span className="ficha-detail-label">{entry.label}</span>
                      <span className="ficha-detail-value">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rodapé */}
            <div className="ficha-footer">
              <div className="observations">
                <div className="field-label">Observações:</div>
                <div className="field-value">
                  {orderData.observacao || item.observacao || ''}
                </div>
              </div>
              <div className="signature-section">
                <div className="signature-line"></div>
                <div className="signature-label">Assinatura</div>
              </div>
            </div>
            </div>
          );
        })}
      </div>

      {/* Estilos CSS */}
      <style>{`
        .ficha-container {
          width: 100%;
          max-width: 190mm;
          margin: 0 auto 8mm auto;
          border: 1px solid #999;
          background: #fff;
          font-family: 'Courier New', 'Roboto Mono', monospace;
          font-size: 11pt;
          line-height: 1.2;
          color: #000;
        }

        .ficha-header {
          padding: 4mm 6mm 3mm 6mm;
          border-bottom: 1px solid #999;
        }

        .ficha-title {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 3mm;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ficha-dates {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 6px;
          margin-bottom: 2mm;
          font-size: 10pt;
        }

        .date-label {
          font-weight: bold;
        }

        .date-value {
          font-family: monospace;
        }

        .date-separator {
          color: #999;
        }

        .ficha-customer-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12pt;
          font-weight: bold;
        }

        .customer-name {
          flex: 1;
        }

        .customer-phone {
          margin: 0 8px;
        }

        .customer-location {
          font-size: 10pt;
          font-weight: normal;
        }

        .ficha-body {
          padding: 3mm 6mm;
        }

        .ficha-table {
          width: 100%;
          border-collapse: collapse;
        }

        .ficha-table td {
          padding: 2mm;
          border: 1px solid #999;
          vertical-align: top;
          font-size: 10pt;
        }

        .field-label {
          font-weight: bold;
          width: 45%;
          background: #f8f8f8;
          border-right: 1px solid #999;
        }

        .field-value {
          width: 55%;
        }

        .financial-row .field-value {
          padding: 1mm;
        }

        .financial-values {
          display: flex;
          flex-direction: column;
          gap: 1mm;
        }

        .financial-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1mm 2mm;
          border: 1px solid #ccc;
          background: #fafafa;
          font-family: monospace;
          font-size: 9pt;
        }

        .financial-line.total-line {
          font-weight: bold;
          background: #e8e8e8;
          border: 2px solid #999;
        }

        .ficha-image-section {
          padding: 3mm 6mm;
          border-top: 1px solid #999;
          background: #fff;
        }

        .ficha-image-container {
          position: relative;
          width: 100%;
          max-width: 100%;
          height: 80mm;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #999;
          background: #fafafa;
          margin-bottom: 2mm;
        }

        .ficha-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .ficha-image-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          color: #999;
          font-size: 10pt;
        }

        .ficha-image-caption {
          text-align: center;
          font-size: 10pt;
          color: #333;
          padding: 2mm;
          background: #f8f8f8;
          border: 1px solid #ddd;
        }

        .ficha-details {
          padding: 3mm 6mm 1mm 6mm;
          background: #f6f8fb;
          border-top: 1px solid #d0d8e5;
        }

        .ficha-details-title {
          margin: 0 0 3mm 0;
          font-size: 11pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #1e293b;
        }

        .ficha-details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(48mm, 1fr));
          gap: 2mm;
        }

        .ficha-detail-card {
          background: #fff;
          border: 1px solid #d6dce8;
          border-radius: 4px;
          padding: 2mm;
          min-height: 18mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 1mm;
        }

        .ficha-detail-label {
          font-size: 8pt;
          font-weight: bold;
          text-transform: uppercase;
          color: #475569;
          letter-spacing: 0.4px;
        }

        .ficha-detail-value {
          font-size: 10pt;
          color: #0f172a;
          word-break: break-word;
        }

        .ficha-footer {
          padding: 3mm 6mm 4mm 6mm;
          border-top: 1px solid #999;
        }

        .observations {
          margin-bottom: 4mm;
        }

        .observations .field-label {
          font-weight: bold;
          margin-bottom: 1mm;
          display: block;
          font-size: 10pt;
        }

        .observations .field-value {
          min-height: 12mm;
          border: 1px solid #999;
          padding: 2mm;
          background: #fff;
          font-size: 10pt;
        }

        .signature-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 4mm;
        }

        .signature-line {
          width: 60mm;
          height: 1px;
          border-bottom: 1px solid #000;
          margin-bottom: 1mm;
        }

        .signature-label {
          font-size: 9pt;
          font-weight: bold;
          text-transform: uppercase;
        }

        /* Estilos para impressão */
        @media print {
          body {
            padding: 0;
            margin: 0;
          }

          .ficha-container {
            max-width: 190mm;
            margin: 0 auto 5mm auto;
            page-break-inside: avoid;
          }

          .ficha-container:last-child {
            margin-bottom: 0;
          }

          .ficha-header,
          .ficha-body,
          .ficha-image-section,
          .ficha-footer {
            page-break-inside: avoid;
          }

          /* Garantir que duas fichas caibam por página */
          .ficha-container {
            max-height: 130mm;
            overflow: hidden;
          }
        }

        /* Responsivo */
        @media screen and (max-width: 768px) {
          .ficha-customer-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 2mm;
          }

          .ficha-dates {
            justify-content: center;
          }

          .ficha-table td {
            padding: 2mm;
          }

          .field-label {
            width: 35%;
          }

          .field-value {
            width: 65%;
          }
        }
      `}</style>
    </div>
  );
};

export default FichaDeServico;
