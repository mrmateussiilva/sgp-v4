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
    const body = await request.json() as Record<string, unknown>;
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
    const body = await request.json() as Record<string, unknown>;
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
  // GET /designers/ ou /designers
  http.get(/\/designers\/?$/, () => {
    return HttpResponse.json([
      { id: 1, nome: 'Designer 1', ativo: true },
      { id: 2, nome: 'Designer 2', ativo: true },
      { id: 3, nome: 'Designer Inativo', ativo: false }
    ]);
  }),

  // GET /designers/:nome/itens
  http.get(/\/designers\/[^/]+\/itens$/, ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') || '50');
    const offset = Number(url.searchParams.get('offset') || '0');

    // Retorna uma lista de itens mockados
    const mockItems = [
      {
        item_id: 101,
        order_id: 1,
        numero_pedido: '001',
        cliente: 'Cliente A',
        tipo_producao: 'painel',
        largura: '2.0',
        altura: '1.5',
        metro_quadrado: '3.0',
        imagem: '/pedidos/1/img1.jpg',
        status_pedido: 'em_producao',
        prioridade: 'MEDIA',
        status_arte: 'aguardando',
        tecido: 'Oxford',
        vendedor: 'Vendedor A',
        comentarios: []
      },
      {
        item_id: 102,
        order_id: 2,
        numero_pedido: '002',
        cliente: 'Cliente B',
        tipo_producao: 'totem',
        largura: '1.0',
        altura: '2.0',
        metro_quadrado: '2.0',
        imagem: '/pedidos/2/img2.jpg',
        status_pedido: 'pendente',
        prioridade: 'ALTA',
        status_arte: 'liberado',
        tecido: 'Microfibra',
        vendedor: 'Vendedor B',
        comentarios: [
          { id: 'c1', autor: 'Designer 1', texto: 'Aprovado pelo cliente', data: new Date().toISOString() }
        ]
      }
    ];

    // Se offset for maior que zero, simula sem mais registros para paginação
    if (offset > 0) {
      return HttpResponse.json([]);
    }

    return HttpResponse.json(mockItems.slice(0, limit));
  }),

  // PATCH /designers/itens/:itemId/status-arte
  http.patch(/\/designers\/itens\/[^/]+\/status-arte$/, async ({ request }) => {
    const body = await request.json() as { status_arte: string };
    return HttpResponse.json({
      status_arte: body.status_arte,
      success: true
    });
  }),

  // POST /designers/itens/:itemId/comentarios
  http.post(/\/designers\/itens\/[^/]+\/comentarios$/, async ({ request }) => {
    const body = await request.json() as { texto: string; autor: string };
    
    return HttpResponse.json({
      order_id: 1,
      numero_pedido: '001',
      cliente: 'Cliente A',
      tipo_producao: 'painel',
      status_arte: 'aguardando',
      comentarios: [
        {
          id: 'new-c-id',
          autor: body.autor,
          texto: body.texto,
          data: new Date().toISOString()
        }
      ]
    });
  }),



];


