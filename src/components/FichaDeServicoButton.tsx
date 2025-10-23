import React, { useState } from 'react';
import { OrderWithItems } from '../types';
import FichaDeServico from './FichaDeServico';

interface FichaDeServicoButtonProps {
  order: OrderWithItems;
  sessionToken: string;
}

const FichaDeServicoButton: React.FC<FichaDeServicoButtonProps> = ({ 
  order, 
  sessionToken 
}) => {
  const [showFicha, setShowFicha] = useState(false);

  const handleOpenFicha = () => {
    setShowFicha(true);
  };

  const handleCloseFicha = () => {
    setShowFicha(false);
  };

  if (showFicha) {
    return (
      <FichaDeServico
        orderId={order.id}
        sessionToken={sessionToken}
        onClose={handleCloseFicha}
      />
    );
  }

  return (
    <button
      onClick={handleOpenFicha}
      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
      title="Gerar Ficha de Serviço"
    >
      📋 Ficha de Serviço
    </button>
  );
};

export default FichaDeServicoButton;
