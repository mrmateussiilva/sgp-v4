import { useParams } from 'react-router-dom';
import CreateOrderComplete from '../components/CreateOrderComplete';

/**
 * View para editar um pedido existente.
 * O componente CreateOrderComplete detecta automaticamente o ID da rota
 * e entra em modo de edição, carregando os dados do pedido.
 */
export default function PedidoEditView() {
  const { id } = useParams<{ id?: string }>();
  
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Editando o pedido #{id}</h1>
      </div>
      <CreateOrderComplete mode="edit" />
    </div>
  );
}

