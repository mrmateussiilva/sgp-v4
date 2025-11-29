import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { OrderWithItems } from '../types';
import { useToast } from '@/hooks/use-toast';
import PedidoForm from '../components/PedidoForm';

export default function PedidoEditView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [pedido, setPedido] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPedido = async () => {
      if (!id) {
        toast({
          title: 'Erro',
          description: 'ID do pedido não fornecido.',
          variant: 'destructive',
        });
        navigate('/dashboard/orders');
        return;
      }

      try {
        setLoading(true);
        const orderId = parseInt(id, 10);
        
        if (isNaN(orderId)) {
          throw new Error('ID do pedido inválido');
        }

        const loadedPedido = await api.getOrderById(orderId);
        setPedido(loadedPedido);
      } catch (error) {
        console.error('Erro ao carregar pedido:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o pedido.',
          variant: 'destructive',
        });
        navigate('/dashboard/orders');
      } finally {
        setLoading(false);
      }
    };

    loadPedido();
  }, [id, navigate, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg">Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (!pedido) {
    return null;
  }

  return <PedidoForm mode="edit" pedido={pedido} />;
}

