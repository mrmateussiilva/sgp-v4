import { ProductionOrder } from '../groupOrders';

export const mockOrders: ProductionOrder[] = [
    {
        id: 1,
        numero: '12345',
        cliente: 'Cliente Teste ABC',
        telefone_cliente: '(11) 98888-7777',
        cidade_estado: 'São Paulo/SP',
        data_envio: '2024-05-20',
        prioridade: 'Alta',
        forma_envio: 'Transportadora XYZ',
        is_reposicao: false,
        designer: 'João Arte',
        vendedor: 'Maria Vendas',
        observacao_pedido: 'Entregar no período da manhã. Cuidado com o manuseio.',
        produtos: [
            {
                id: 101,
                descricao: 'Banner Lona 440g Arraiá',
                dimensoes: '100 x 200',
                quantity: 2,
                material: 'Lona 440g',
                observacao_item: 'Acabamento em bastão e corda.',
                imagem: 'https://via.placeholder.com/300x200',
                tipo_producao: 'lona'
            }
        ]
    },
    {
        id: 2,
        numero: '12346',
        cliente: 'Empresa Eventos S/A',
        telefone_cliente: '(11) 5555-4444',
        cidade_estado: 'Campinas/SP',
        data_envio: '2024-05-21',
        prioridade: 'Normal',
        forma_envio: 'Retira no local',
        is_reposicao: true,
        designer: 'Carlos Designer',
        vendedor: 'Ana Comercial',
        produtos: [
            {
                id: 102,
                descricao: 'Adesivo Vinil Brilho - Logo',
                dimensoes: '50 x 50',
                quantity: 100,
                material: 'Vinil Brilho',
                imagem: 'https://via.placeholder.com/200x200',
                tipo_producao: 'adesivo'
            },
            {
                id: 103,
                descricao: 'Painel Tecido Sublimado',
                dimensoes: '300 x 250',
                quantity: 1,
                material: 'Tecido Oxford',
                observacao_item: 'Fazer bainha para elástico.',
                imagem: 'https://via.placeholder.com/400x300',
                tipo_producao: 'painel'
            }
        ]
    },
    {
        id: 3,
        numero: '12347',
        cliente: 'Loja Sem Imagem',
        data_envio: '2024-05-22',
        prioridade: 'Baixa',
        forma_envio: 'Sedex',
        is_reposicao: false,
        produtos: [
            {
                id: 104,
                descricao: 'Cavalete de Madeira',
                dimensoes: '60 x 90',
                quantity: 1,
                material: 'Madeira/Lona',
                tipo_producao: 'totem'
            }
        ]
    }
];
