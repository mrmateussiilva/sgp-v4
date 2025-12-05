import React, { useState } from 'react';
import { OrderWithItems } from '../types';
import FichaDeServico from './FichaDeServico';
import { FileText } from 'lucide-react';

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
      className="px-2 sm:px-3 py-1.5 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
      title="Gerar Ficha de Serviço"
    >
      <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
      <span className="hidden sm:inline">Ficha de Serviço</span>
      <span className="sm:hidden">Ficha</span>
    </button>
  );
};

export default FichaDeServicoButton;
