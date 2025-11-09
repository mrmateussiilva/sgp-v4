# Otimizações de Performance - SGP v4

## Resumo das Melhorias Implementadas

Este documento descreve as otimizações de performance implementadas no SGP v4 para resolver os problemas identificados nos logs de consultas lentas.

## 🎯 Problemas Identificados

- Consultas lentas (acima de 1s) em tabelas `orders`, `order_items` e `clientes`
- LEFT JOIN pesado entre `orders` e `order_items`
- SELECT * FROM clientes ORDER BY nome ASC retornando 15 mil registros
- Chamadas repetidas do frontend pedindo os mesmos dados
- Falta de caching e paginação real
- Avisos irrelevantes do WebKitGTK e Avahi

## ✅ Soluções Implementadas

### 1. Índices de Banco de Dados

**Arquivo:** `src-tauri/migrations/20250122000002_add_performance_indexes.sql`

Criados índices estratégicos para otimizar as consultas mais frequentes:

```sql
-- Índices para tabela orders
CREATE INDEX IF NOT EXISTS idx_orders_pronto ON orders (pronto);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_data_entrega ON orders (data_entrega);
CREATE INDEX IF NOT EXISTS idx_orders_cliente ON orders (cliente);

-- Índices compostos para padrões de consulta comuns
CREATE INDEX IF NOT EXISTS idx_orders_pronto_created_at ON orders (pronto, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders (status, created_at DESC);

-- Índices para tabela order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_name ON order_items (item_name);

-- Índices para tabela clientes
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes (nome);
CREATE INDEX IF NOT EXISTS idx_clientes_cidade ON clientes (cidade);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes (estado);
```

### 2. Refatoração de Queries SQLX

**Arquivo:** `src-tauri/src/commands/orders.rs`

#### Antes (JOIN pesado):
```rust
let query = r#"
    SELECT DISTINCT o.*, oi.*
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.pronto IS NULL OR o.pronto = false
    ORDER BY o.created_at DESC, oi.id ASC
    LIMIT $1 OFFSET $2
"#;
```

#### Depois (duas consultas otimizadas):
```rust
// 1ª consulta - apenas pedidos (otimizada com índices)
let orders: Vec<Order> = sqlx::query_as!(
    Order,
    r#"
    SELECT id, numero, cliente, cidade_cliente, estado_cliente, telefone_cliente,
           data_entrada, data_entrega, total_value, valor_frete, status, prioridade,
           observacao, financeiro, conferencia, sublimacao, costura, expedicao,
           forma_envio, forma_pagamento_id, pronto, created_at, updated_at
    FROM orders
    WHERE pronto IS NULL OR pronto = false
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
    "#,
    page_size,
    offset
)
.fetch_all(pool.inner())
.await?;

// 2ª consulta - itens dos pedidos retornados (otimizada com índice)
let order_ids: Vec<i32> = orders.iter().map(|o| o.id).collect();
let items: Vec<OrderItem> = if !order_ids.is_empty() {
    sqlx::query_as!(
        OrderItem,
        "SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY order_id, id",
        &order_ids
    )
    .fetch_all(pool.inner())
    .await?
} else {
    Vec::new()
};
```

### 3. Paginação Real Implementada

**Arquivo:** `src-tauri/src/commands/clientes.rs`

#### Nova função paginada:
```rust
#[tauri::command]
pub async fn get_clientes_paginated(
    pool: State<'_, PgPool>,
    sessions: State<'_, SessionManager>,
    cache: State<'_, CacheManager>,
    session_token: String,
    page: Option<i32>,
    page_size: Option<i32>,
) -> Result<PaginatedClientes, String>
```

#### Modelo de resposta paginada:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedClientes {
    pub clientes: Vec<Cliente>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}
```

### 4. Sistema de Cache Inteligente

**Arquivo:** `src-tauri/src/cache.rs`

#### Funcionalidades implementadas:
- Cache com TTL (Time To Live) configurável
- Invalidação por padrão para manter consistência
- Limpeza automática de entradas expiradas
- Suporte a tipos genéricos com serialização JSON

#### Uso nas consultas:
```rust
// Tentar buscar do cache primeiro
let cache_key = format!("pending_orders_paginated_{}_{}", page, page_size);
if let Some(cached_result) = cache.get::<PaginatedOrders>(&cache_key).await {
    return Ok(cached_result);
}

// ... executar consulta no banco ...

// Armazenar no cache por 30 segundos
cache.set(cache_key, result.clone(), Duration::from_secs(30)).await;
```

#### Invalidação automática:
```rust
// Invalidar cache quando dados são modificados
cache.invalidate_pattern("pending_orders").await;
cache.invalidate_pattern("ready_orders").await;
```

## 📊 Benefícios Esperados

### Performance de Consultas
- **Redução de 70-90%** no tempo de resposta das consultas de pedidos
- **Eliminação do problema N+1** com a estratégia de duas consultas
- **Índices otimizados** para as consultas mais frequentes

### Uso de Memória e Rede
- **Paginação real** reduz transferência de dados desnecessária
- **Cache inteligente** evita consultas repetidas ao banco
- **Limites de página** previnem sobrecarga (1-100 para pedidos, 1-200 para clientes)

### Experiência do Usuário
- **Carregamento mais rápido** das listas de pedidos e clientes
- **Navegação fluida** com paginação responsiva
- **Dados sempre atualizados** com invalidação automática de cache

## 🔧 Configurações de Cache

| Tipo de Dados | TTL | Justificativa |
|---------------|-----|---------------|
| Pedidos paginados | 30 segundos | Dados que mudam frequentemente |
| Clientes paginados | 5 minutos | Dados mais estáveis |
| Todos os clientes | 5 minutos | Para compatibilidade com código existente |

## 🚀 Próximos Passos Recomendados

1. **Monitoramento**: Implementar métricas de performance para validar melhorias
2. **Testes de Carga**: Executar testes com volumes reais de dados
3. **Otimização Adicional**: Considerar índices parciais para consultas específicas
4. **Cache Distribuído**: Para ambientes multi-instância, considerar Redis
5. **Compressão**: Implementar compressão de respostas para reduzir tráfego de rede

## 📝 Notas Técnicas

- Todas as otimizações mantêm **compatibilidade total** com funcionalidades existentes
- **Zero downtime** durante a aplicação das melhorias
- **Rollback seguro** disponível através das migrações do banco
- **Logs detalhados** para monitoramento e debugging

---

**Data da Implementação:** 22 de Janeiro de 2025  
**Versão:** SGP v4  
**Status:** ✅ Implementado e Testado
