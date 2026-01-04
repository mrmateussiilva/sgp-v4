import { printOrderServiceForm } from './printOrderServiceForm';
import { OrderWithItems, OrderStatus } from '../types';

// Dados de exemplo para testar a ficha de serviço
export const testOrderData: OrderWithItems = {
  id: 12345,
  numero: 'OS-2024-001',
  customer_name: 'João Silva',
  cliente: 'João Silva',
  address: 'Rua das Flores, 123',
  cidade_cliente: 'São Paulo',
  estado_cliente: 'SP',
  telefone_cliente: '(11) 99999-9999',
  data_entrada: '2024-01-15',
  data_entrega: '2024-01-20',
  total_value: 850.00,
  valor_total: 850.00,
  valor_frete: 50.00,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  status: OrderStatus.Pendente,
  prioridade: 'Normal',
  forma_envio: 'Sedex',
  forma_pagamento_id: 1,
  observacao: 'Cliente solicitou urgência na entrega. Verificar qualidade do tecido antes da impressão.',
  financeiro: false,
  conferencia: false,
  sublimacao: false,
  costura: false,
  expedicao: false,
  pronto: false,
  items: [
    {
      id: 1,
      order_id: 12345,
      item_name: 'Painel Personalizado',
      quantity: 2,
      unit_price: 400.00,
      subtotal: 800.00,
      tipo_producao: 'painel',
      descricao: 'Painel para festa de aniversário infantil',
      largura: '1.50',
      altura: '2.00',
      metro_quadrado: '3.00',
      vendedor: 'Maria Santos',
      designer: 'Carlos Oliveira',
      tecido: 'Vinil 440g',
      overloque: true,
      elastico: false,
      tipo_acabamento: 'ilhos',
      quantidade_ilhos: '8',
      espaco_ilhos: '15cm',
      valor_ilhos: '80.00',
      quantidade_cordinha: '',
      espaco_cordinha: '',
      valor_cordinha: '',
      observacao: 'Verificar se o design está centralizado',
      imagem: 'https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=Painel+Teste',
      quantidade_paineis: '2',
      valor_unitario: '400.00',
      emenda: 'sem-emenda',
      emenda_qtd: '',
      emendaQtd: '',
      terceirizado: false,
      acabamento_lona: '',
      valor_lona: '',
      quantidade_lona: '',
      outros_valores_lona: '',
      tipo_adesivo: '',
      valor_adesivo: '',
      quantidade_adesivo: '',
      outros_valores_adesivo: '',
      ziper: false,
      cordinha_extra: false,
      alcinha: false,
      toalha_pronta: false,
      acabamento_totem: '',
      acabamento_totem_outro: '',
      valor_totem: '',
      quantidade_totem: '',
      outros_valores_totem: ''
    }
  ]
};

// Função para testar a geração da ficha de serviço
export const testServiceForm = async () => {
  console.log('Testando geração da ficha de serviço...');
  await printOrderServiceForm(testOrderData);
};

// Função para testar no console do navegador
export const testInBrowser = () => {
  if (typeof window !== 'undefined') {
    (window as any).testServiceForm = testServiceForm;
    (window as any).testOrderData = testOrderData;
    console.log('Funções de teste disponíveis:');
    console.log('- testServiceForm() - Gera a ficha de serviço');
    console.log('- testOrderData - Dados de exemplo do pedido');
  }
};
