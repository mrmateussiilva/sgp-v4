import CreateOrderComplete from '../components/CreateOrderComplete';

/**
 * View para editar um pedido existente.
 * O componente CreateOrderComplete detecta automaticamente o ID da rota
 * e entra em modo de edição, carregando os dados do pedido.
 */
export default function PedidoEditView() {
  return <CreateOrderComplete mode="edit" />;
}

