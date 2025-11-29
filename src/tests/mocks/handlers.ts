/**
 * MSW handlers para mockar chamadas da API durante testes
 */
import { http, HttpResponse } from 'msw';

// MSW intercepta requisições relativas também, então podemos usar paths relativos
// ou absolutos. Vamos usar paths que correspondem ao que o código faz.
export const handlers = [
  // GET /api/notificacoes/ultimos
  http.get('*/api/notificacoes/ultimos', () => {
    return HttpResponse.json({
      ultimo_id: 1,
      timestamp: new Date().toISOString(),
    });
  }),

  // GET /api/pedidos
  http.get('*/api/pedidos', ({ request }) => {
    const url = new URL(request.url);
    const cliente = url.searchParams.get('cliente');
    const status = url.searchParams.get('status');
    const data_inicio = url.searchParams.get('data_inicio');
    const data_fim = url.searchParams.get('data_fim');

    let pedidos = [
      {
        id: 1,
        numero: '001',
        cliente: 'João Silva',
        data_entrada: '2024-01-15',
        data_entrega: '2024-01-20',
        status: 'pendente',
        valor_total: '1000.00',
        items: [
          {
            id: 1,
            descricao: 'Painel promocional',
            largura: '2.0',
            altura: '1.5',
            imagem: '/home/user/img.png',
          },
        ],
      },
      {
        id: 2,
        numero: '002',
        cliente: 'Maria Santos',
        data_entrada: '2024-01-16',
        data_entrega: '2024-01-21',
        status: 'em_producao',
        valor_total: '1500.00',
        items: [],
      },
    ];

    // Aplicar filtros
    if (cliente) {
      pedidos = pedidos.filter((p) =>
        p.cliente.toLowerCase().includes(cliente.toLowerCase())
      );
    }
    if (status) {
      pedidos = pedidos.filter((p) => p.status === status);
    }
    if (data_inicio) {
      pedidos = pedidos.filter((p) => p.data_entrada >= data_inicio);
    }
    if (data_fim) {
      pedidos = pedidos.filter((p) => p.data_entrada <= data_fim);
    }

    return HttpResponse.json(pedidos);
  }),

  // GET /api/pedidos/:id
  http.get('*/api/pedidos/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id: Number(id),
      numero: '001',
      cliente: 'João Silva',
      data_entrada: '2024-01-15',
      data_entrega: '2024-01-20',
      status: 'pendente',
      valor_total: '1000.00',
      items: [
        {
          id: 1,
          descricao: 'Painel promocional',
          largura: '2.0',
          altura: '1.5',
        },
      ],
    });
  }),

  // POST /api/pedidos
  http.post('*/api/pedidos', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        id: 1,
        ...body,
        data_criacao: new Date().toISOString(),
        ultima_atualizacao: new Date().toISOString(),
      },
      { status: 200 }
    );
  }),

  // PATCH /api/pedidos/:id
  http.patch('*/api/pedidos/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    return HttpResponse.json({
      id: Number(id),
      ...body,
      ultima_atualizacao: new Date().toISOString(),
    });
  }),

  // DELETE /api/pedidos/:id
  http.delete('*/api/pedidos/:id', () => {
    return HttpResponse.json({ message: 'Pedido deletado com sucesso' });
  }),

  // GET /api/fichas/:id (se existir)
  http.get('*/api/fichas/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id: Number(id),
      numero: '001',
      cliente: 'João Silva',
      items: [],
    });
  }),
];

