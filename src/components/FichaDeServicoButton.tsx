import React, { useState } from 'react';
import { OrderWithItems } from '../types';
import FichaDeServico from './FichaDeServico';
import { FileText } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';

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

  return (
    <>
      <button
        onClick={handleOpenFicha}
        className="px-2 sm:px-3 py-1.5 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
        title="Gerar Ficha de Serviço"
      >
        <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Ficha de Serviço</span>
        <span className="sm:hidden">Ficha</span>
      </button>

      <Dialog open={showFicha} onOpenChange={setShowFicha}>
        <DialogContent className="w-[95vw] h-[95vh] max-w-none max-h-none overflow-hidden flex flex-col p-0" size="full">
          <div className="flex-1 overflow-y-auto">
            <FichaDeServico
              orderId={order.id}
              sessionToken={sessionToken}
              onClose={handleCloseFicha}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FichaDeServicoButton;
