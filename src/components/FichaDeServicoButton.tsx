import React, { useState } from 'react';
import { OrderWithItems, OrderFicha } from '../types';
import FichaDeServico from './FichaDeServico';
import FichaDeServicoEditor from './FichaDeServicoEditor';
import { Edit, FileText } from 'lucide-react';

interface FichaDeServicoButtonProps {
  order: OrderWithItems;
  sessionToken: string;
}

const FichaDeServicoButton: React.FC<FichaDeServicoButtonProps> = ({ 
  order, 
  sessionToken 
}) => {
  const [showFicha, setShowFicha] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editedFichaData, setEditedFichaData] = useState<OrderFicha | null>(null);

  const handleOpenFicha = () => {
    setShowFicha(true);
  };

  const handleCloseFicha = () => {
    setShowFicha(false);
    setEditedFichaData(null);
  };

  const handleOpenEditor = () => {
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
  };

  const handleSaveEditedFicha = (editedFicha: OrderFicha) => {
    setEditedFichaData(editedFicha);
    setShowEditor(false);
    setShowFicha(true);
  };

  if (showFicha) {
    return (
      <FichaDeServico
        orderId={order.id}
        sessionToken={sessionToken}
        onClose={handleCloseFicha}
        editedFichaData={editedFichaData}
      />
    );
  }

  return (
    <>
      <div className="flex gap-1 sm:gap-2">
        <button
          onClick={handleOpenEditor}
          className="px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          title="Editar e Gerar Ficha de Serviço"
        >
          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Editar Ficha</span>
          <span className="sm:hidden">Editar</span>
        </button>
        <button
          onClick={handleOpenFicha}
          className="px-2 sm:px-3 py-1.5 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          title="Gerar Ficha de Serviço"
        >
          <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Ficha</span>
          <span className="sm:hidden">Ficha</span>
        </button>
      </div>
      {showEditor && (
        <FichaDeServicoEditor
          orderId={order.id}
          isOpen={showEditor}
          onClose={handleCloseEditor}
          onSave={handleSaveEditedFicha}
        />
      )}
    </>
  );
};

export default FichaDeServicoButton;
