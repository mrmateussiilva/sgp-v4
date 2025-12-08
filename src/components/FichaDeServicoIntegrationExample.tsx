// Exemplo de integração do componente FichaDeServico no OrderViewModal
// 
// Para integrar o novo componente FichaDeServico no OrderViewModal existente,
// siga estes passos:

// 1. Importe o componente FichaDeServicoButton no OrderViewModal.tsx:
/*
import FichaDeServicoButton from './FichaDeServicoButton';
*/

// 2. Substitua o botão atual da ficha de serviço (linha ~678) por:
/*
<FichaDeServicoButton 
  order={order} 
  sessionToken={sessionToken} // Você precisará passar o sessionToken como prop
/>
*/

// 3. Remova a função handlePrintServiceForm e o import printOrderServiceForm:
/*
// Remover estas linhas:
import { printOrderServiceForm } from '../utils/printOrderServiceForm';

const handlePrintServiceForm = () => {
  const formaPagamentoNome = getFormaPagamentoNome(order.forma_pagamento_id);
  const enrichedOrder = {
    ...order,
    forma_pagamento_nome:
      formaPagamentoNome && formaPagamentoNome !== 'Não informado'
        ? formaPagamentoNome
        : undefined,
  };
  await printOrderServiceForm(enrichedOrder);
};
*/

// 4. Adicione sessionToken como prop no OrderViewModalProps:
/*
interface OrderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithItems | null;
  sessionToken: string; // Adicionar esta linha
}
*/

// 5. Exemplo completo da seção de botões:
/*
<DialogHeader>
  <DialogTitle className="flex items-center justify-between">
    <span>Pedido #{order.numero || order.id}</span>
    <div className="flex gap-2">
      <Button onClick={handlePrint} variant="outline" size="sm">
        <Printer className="h-4 w-4 mr-2" />
        Imprimir
      </Button>
      <FichaDeServicoButton 
        order={order} 
        sessionToken={sessionToken} 
      />
      <Button onClick={onClose} variant="outline" size="sm">
        <X className="h-4 w-4" />
      </Button>
    </div>
  </DialogTitle>
</DialogHeader>
*/

// 6. Para usar o componente standalone (sem modal):
/*
import React from 'react';
import FichaDeServico from './components/FichaDeServico';

const MyComponent = () => {
  const sessionToken = 'your-session-token';
  const orderId = 123;

  return (
    <FichaDeServico
      orderId={orderId}
      sessionToken={sessionToken}
      onClose={() => console.log('Ficha fechada')}
    />
  );
};
*/

// 7. Para usar apenas o botão (sem modal):
/*
import React from 'react';
import FichaDeServicoButton from './components/FichaDeServicoButton';

const MyComponent = ({ order, sessionToken }) => {
  return (
    <FichaDeServicoButton 
      order={order} 
      sessionToken={sessionToken} 
    />
  );
};
*/

export {};
