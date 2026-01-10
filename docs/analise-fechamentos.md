# Análise do Sistema de Fechamentos

## 1. Resumo Executivo

O sistema de fechamentos é responsável por gerar relatórios analíticos e sintéticos com base nos pedidos cadastrados. Ele calcula e agrupa valores de **frete** e **serviços** (itens de pedidos) conforme diferentes critérios de agrupamento (por data, vendedor, designer, cliente, forma de entrega, tipo de produção).

### Principais Componentes

- **Função Principal**: `generateFechamentoReport()` em `src/utils/fechamentoReport.ts`
- **Interface UI**: `src/pages/Fechamentos.tsx`
- **Chamada API**: `api.generateReport()` em `src/services/api.ts`
- **Tipos**: Definidos em `src/types/index.ts`

### Conceitos Fundamentais

1. **Frete**: Valor único por pedido, não dividido entre itens
2. **Serviços**: Valor calculado por item (subtotal de cada item)
3. **Normalização**: Cada item de pedido gera uma linha no relatório, onde o frete é repetido para todos os itens do mesmo pedido

---

## 2. Arquitetura Atual

### 2.1 Estrutura de Dados

#### Tipos Principais

```typescript
interface ReportTotals {
  valor_frete: number;
  valor_servico: number;
}

interface NormalizedRow {
  orderId: number;
  ficha: string;
  cliente: string;
  designer: string;
  vendedor: string;
  tipo: string;
  formaEnvio: string;
  data: string;
  dataLabel: string;
  descricao: string;
  valorFrete: number;    // Frete total do pedido (repetido para cada item)
  valorServico: number;  // Subtotal do item específico
}

interface ReportGroup {
  key: string;
  label: string;
  rows?: ReportRowData[];
  subgroups?: ReportGroup[];
  subtotal: ReportTotals;  // Totais do grupo/subgrupo
}

interface ReportResponse {
  title: string;
  period_label: string;
  status_label: string;
  page: number;
  generated_at: string;
  report_type: string;
  groups: ReportGroup[];
  total: ReportTotals;  // Total geral do relatório
}
```

### 2.2 Fluxo de Processamento

```
Pedidos (OrderWithItems[])
    ↓
[Filtragem por Status]
    ↓
[Filtragem por Data (entrada/entrega)]
    ↓
[Conversão para NormalizedRow[]] ← buildRowsFromOrder()
    ↓
[Filtragem por Vendedor/Designer/Cliente]
    ↓
[Agrupamento conforme report_type] ← buildTwoLevelGroups() ou buildSingleLevelAggregate()
    ↓
[Cálculo de Totais] ← computeTotalsFromRows()
    ↓
ReportResponse
```

### 2.3 Tipos de Relatórios Suportados

#### Analíticos (Detalhados)
- `analitico_designer_cliente`: Designer → Cliente (2 níveis)
- `analitico_cliente_designer`: Cliente → Designer (2 níveis)
- `analitico_cliente_painel`: Cliente → Tipo de Produção (2 níveis)
- `analitico_designer_painel`: Designer → Tipo de Produção (2 níveis)
- `analitico_entrega_painel`: Forma de Entrega → Tipo de Produção (2 níveis)

#### Sintéticos (Agregados)
- `sintetico_data`: Por data (referência automática)
- `sintetico_data_entrada`: Por data de entrada
- `sintetico_data_entrega`: Por data de entrega
- `sintetico_designer`: Por designer
- `sintetico_vendedor`: Por vendedor
- `sintetico_vendedor_designer`: Por vendedor/designer (combinado)
- `sintetico_cliente`: Por cliente
- `sintetico_entrega`: Por forma de entrega

---

## 3. Fluxo de Dados Detalhado

### 3.1 Entrada de Dados

O relatório recebe:
- **Pedidos**: Array de `OrderWithItems[]` carregados da API
- **Payload de Requisição**: `ReportRequestPayload` com filtros e tipo de relatório

```typescript
interface ReportRequestPayload {
  report_type: ReportTypeKey;
  start_date?: string;
  end_date?: string;
  status?: string;
  date_mode?: 'entrada' | 'entrega';  // Qual data usar como referência
  vendedor?: string;    // Filtro parcial (case-insensitive)
  designer?: string;    // Filtro parcial (case-insensitive)
  cliente?: string;     // Filtro parcial (case-insensitive)
}
```

### 3.2 Processamento Principal

#### Etapa 1: Filtragem de Pedidos

```typescript
// 1. Filtrar por status
const filteredByStatus = filterOrdersByStatus(orders, payload.status);

// 2. Filtrar por data (usando date_mode)
const filteredOrders = filterOrdersByDate(
  filteredByStatus,
  payload.start_date,
  payload.end_date,
  dateMode  // 'entrada', 'entrega' ou 'auto'
);
```

#### Etapa 2: Normalização de Linhas

Cada pedido é convertido em uma ou mais linhas (`NormalizedRow`):

```typescript
const buildRowsFromOrder = (order: OrderWithItems, dateMode: DateReferenceMode): NormalizedRow[] => {
  const items = order.items ?? [];
  const valorFreteTotal = parseCurrency(order.valor_frete ?? 0);

  // Se não há itens, cria uma linha única
  if (items.length === 0) {
    const totalServico = roundCurrency(parseCurrency(order.total_value ?? 0) - valorFreteTotal);
    return [/* linha única */];
  }

  // Para cada item, cria uma linha
  return items.map((item) => {
    const valorServico = getSubtotalValue(item);  // Subtotal do item
    const valorFrete = valorFreteTotal;  // Frete TOTAL (repetido para cada item)
    
    return {
      orderId: order.id,
      // ... outros campos
      valorFrete,
      valorServico,
    };
  });
};
```

**Observação Crítica**: O frete é repetido para cada item do pedido. Isso é necessário porque cada item pode estar em grupos diferentes no relatório, mas o frete é por pedido.

#### Etapa 3: Filtragem por Pessoas

```typescript
const filterRowsByPeople = (rows: NormalizedRow[], payload: ReportRequestPayload): NormalizedRow[] => {
  // Filtra por vendedor e/ou designer (busca parcial, case-insensitive)
  return rows.filter((row) => {
    // Aplica filtros se especificados
  });
};
```

#### Etapa 4: Agrupamento

Conforme o `report_type`, os dados são agrupados:

- **Relatórios Analíticos**: Usam `buildTwoLevelGroups()` (2 níveis de agrupamento)
- **Relatórios Sintéticos**: Usam `buildSingleLevelAggregate()` (1 nível)

#### Etapa 5: Cálculo de Totais

```typescript
const computeTotalsFromRows = (rows: NormalizedRow[]): ReportTotals => {
  // Agrupar por orderId para contar frete apenas uma vez por pedido
  const fretePorPedido = new Map<number, number>();
  let totalServico = 0;

  rows.forEach((row) => {
    // Serviços: somar todos (por item)
    totalServico = roundCurrency(totalServico + row.valorServico);
    
    // Frete: contar apenas uma vez por pedido (usar o primeiro valor encontrado)
    if (!fretePorPedido.has(row.orderId)) {
      fretePorPedido.set(row.orderId, row.valorFrete);
    }
  });

  // Somar fretes únicos de cada pedido
  const totalFrete = Array.from(fretePorPedido.values()).reduce(
    (sum, frete) => roundCurrency(sum + frete),
    0
  );

  return {
    valor_frete: totalFrete,
    valor_servico: totalServico,
  };
};
```

**Lógica Importante**:
- **Serviços**: Somados diretamente de todas as linhas (cada linha = 1 item)
- **Frete**: Agrupado por `orderId` para evitar duplicação (1 frete por pedido, mesmo que o pedido tenha múltiplos itens)

---

## 4. Cálculos Detalhados

### 4.1 Cálculo do Valor de Serviço (por Item)

O valor de serviço é calculado pela função `getSubtotalValue()`:

```typescript
const getSubtotalValue = (orderItem: OrderWithItems['items'][number]): number => {
  // Prioridade 1: Se subtotal já existe e é válido
  if (typeof orderItem.subtotal === 'number' && Number.isFinite(orderItem.subtotal)) {
    return roundCurrency(orderItem.subtotal);
  }
  
  // Prioridade 2: Calcular a partir de quantity * unit_price
  if (typeof orderItem.quantity === 'number' && typeof orderItem.unit_price === 'number') {
    return roundCurrency(orderItem.quantity * orderItem.unit_price);
  }
  
  // Prioridade 3: Parsear de valor_unitario (string)
  return parseCurrency(orderItem.valor_unitario);
};
```

**Campos Considerados** (em ordem de prioridade):
1. `item.subtotal` (number)
2. `item.quantity * item.unit_price`
3. `item.valor_unitario` (string, parseado)

### 4.2 Cálculo do Valor de Frete

O frete é extraído diretamente do pedido:

```typescript
const valorFreteTotal = parseCurrency(order.valor_frete ?? 0);
```

**Parseamento de Moeda**:

```typescript
const parseCurrency = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? roundCurrency(value) : 0;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    
    // Normalizar formato brasileiro (1.234,56) para número
    let normalized = trimmed;
    if (trimmed.includes(',') && trimmed.includes('.')) {
      normalized = trimmed.replace(/\./g, '').replace(',', '.');
    } else if (trimmed.includes(',')) {
      normalized = trimmed.replace(',', '.');
    }
    
    const numeric = Number.parseFloat(normalized);
    return Number.isFinite(numeric) ? roundCurrency(numeric) : 0;
  }
  return 0;
};
```

### 4.3 Cálculo de Totais por Grupo

Ao criar grupos e subgrupos, os totais são calculados recursivamente:

```typescript
// Para grupos de 2 níveis
const subtotal = subgroups.reduce<ReportTotals>(
  (acc, group) => ({
    valor_frete: roundCurrency(acc.valor_frete + group.subtotal.valor_frete),
    valor_servico: roundCurrency(acc.valor_servico + group.subtotal.valor_servico),
  }),
  { valor_frete: 0, valor_servico: 0 }
);
```

### 4.4 Arredondamento

Todos os valores são arredondados usando:

```typescript
const roundCurrency = (value: number): number => Math.round(value * 100) / 100;
```

Isso garante 2 casas decimais (centavos).

### 4.5 Pedidos sem Itens

Quando um pedido não possui itens (`items.length === 0`), o valor de serviço é calculado como:

```typescript
const totalServico = roundCurrency(parseCurrency(order.total_value ?? 0) - valorFreteTotal);
```

Ou seja: `total_value - valor_frete = valor_servico`.

---

## 5. Problemas Identificados

### 5.1 ⚠️ POTENCIAL DUPLICAÇÃO DE FRETE EM RELATÓRIOS ANALÍTICOS

**Problema**: Em relatórios analíticos, quando um pedido com múltiplos itens é agrupado de formas diferentes (ex: por designer e cliente), o frete pode aparecer múltiplas vezes se os itens do mesmo pedido caírem em grupos diferentes.

**Exemplo**:
- Pedido #100 tem 2 itens:
  - Item A: Designer "João", Cliente "Empresa X"
  - Item B: Designer "Maria", Cliente "Empresa Y"
- Relatório: "Designer × Cliente"
- Resultado: 
  - Grupo "Designer: João" → Subgrupo "Cliente: Empresa X" → Frete do pedido #100 aparece
  - Grupo "Designer: Maria" → Subgrupo "Cliente: Empresa Y" → Frete do pedido #100 aparece novamente

**Status**: ✅ **RESOLVIDO** parcialmente - A função `computeTotalsFromRows()` agrupa por `orderId` antes de somar fretes, então no total geral não há duplicação. **PORÉM**, em subgrupos específicos, o frete ainda pode aparecer duplicado se os itens estiverem em grupos diferentes.

**Localização**: `src/utils/fechamentoReport.ts:116-141`

### 5.2 ⚠️ INCONSISTÊNCIA NO CÁLCULO DE VALOR DE SERVIÇO

**Problema**: A função `getSubtotalValue()` tenta 3 métodos diferentes para calcular o subtotal. Se nenhum deles funcionar corretamente, pode retornar 0 sem avisar.

**Cenários Problemáticos**:
1. Item com `subtotal = null` ou `undefined` mas sem `quantity`/`unit_price`
2. Item com `valor_unitario` em formato inválido
3. Item sem nenhum dos campos acima

**Impacto**: Itens podem aparecer com valor R$ 0,00 no relatório.

**Localização**: `src/utils/fechamentoReport.ts:72-80`

### 5.3 ⚠️ TRATAMENTO DE VALORES NULL/UNDEFINED

**Problema**: Embora existam verificações para `null`/`undefined`, em alguns pontos do código pode haver valores inválidos que passam despercebidos.

**Exemplos**:
- `order.valor_frete` pode ser `null` → tratado com `?? 0`
- `order.total_value` pode ser `null` → tratado com `?? 0`
- `item.subtotal` pode ser `null` → tratado na função `getSubtotalValue()`

**Status**: ✅ **BEM TRATADO** na maioria dos casos, mas pode haver edge cases.

### 5.4 ⚠️ CONVERSÃO DE TIPOS STRING/NUMBER

**Problema**: Valores podem vir como string (ex: "1.234,56") ou number (ex: 1234.56) do banco de dados. A função `parseCurrency()` tenta normalizar, mas se um número vier como string mal formatada, pode falhar silenciosamente.

**Exemplo Problemático**:
```typescript
parseCurrency("R$ 1.234,56")  // Retorna 0 (não parseia "R$")
parseCurrency("invalid")      // Retorna 0
```

**Localização**: `src/utils/fechamentoReport.ts:51-70`

### 5.5 ⚠️ PEDIDOS SEM ITENS - CÁLCULO ASSUMIDO

**Problema**: Quando um pedido não tem itens, o valor de serviço é calculado como `total_value - valor_frete`. Isso assume que não há desconto ou outros ajustes.

**Cenário Problemático**:
- Pedido com `total_value = 1000`
- `valor_frete = 100`
- Desconto aplicado = 50
- Valor de serviço calculado: `1000 - 100 = 900` (incorreto, deveria ser 950)

**Localização**: `src/utils/fechamentoReport.ts:269`

### 5.6 ⚠️ FILTRO POR VENDEDOR/DESIGNER - BUSCA PARCIAL

**Problema**: O filtro por vendedor/designer é parcial (case-insensitive), o que pode retornar resultados inesperados.

**Exemplo**:
- Filtro: "João"
- Retorna: "João Silva", "Joãozinho", "João Pedro"

Isso pode ser um **comportamento desejado** (busca flexível) ou **não desejado** (deveria ser exato).

**Localização**: `src/utils/fechamentoReport.ts:460-483`

### 5.7 ⚠️ AGRUPAMENTO DE FRETE EM SUBGRUPOS

**Problema**: Em relatórios de 2 níveis, o frete é calculado independentemente em cada subgrupo. Se um pedido tem itens em subgrupos diferentes, o frete aparece em múltiplos subgrupos (mas não é duplicado no total geral devido ao agrupamento por `orderId`).

**Exemplo Visual**:
```
Grupo: Designer João
  Subgrupo: Cliente A
    - Item 1 (Pedido #100) | Frete: R$ 50,00 | Serviço: R$ 100,00
  Subgrupo: Cliente B
    - Item 2 (Pedido #100) | Frete: R$ 50,00 | Serviço: R$ 200,00
  Subtotal: Frete: R$ 100,00 | Serviço: R$ 300,00 ❌ (Frete duplicado no subtotal do grupo)
```

**Status**: ⚠️ **PROBLEMA CONHECIDO** - O frete aparece em múltiplos subgrupos, mas o total geral está correto.

**Localização**: `src/utils/fechamentoReport.ts:346-352`

---

## 6. Recomendações

### 6.1 🔧 Correções Imediatas

#### 6.1.1 Melhorar Tratamento de Erros em `getSubtotalValue()`

```typescript
const getSubtotalValue = (orderItem: OrderWithItems['items'][number]): number => {
  // Tentar subtotal direto
  if (typeof orderItem.subtotal === 'number' && Number.isFinite(orderItem.subtotal)) {
    if (orderItem.subtotal >= 0) {
      return roundCurrency(orderItem.subtotal);
    }
    console.warn('Subtotal negativo encontrado:', orderItem);
  }
  
  // Tentar calcular
  if (typeof orderItem.quantity === 'number' && typeof orderItem.unit_price === 'number') {
    if (orderItem.quantity > 0 && orderItem.unit_price >= 0) {
      return roundCurrency(orderItem.quantity * orderItem.unit_price);
    }
    console.warn('Quantidade ou preço inválido:', orderItem);
  }
  
  // Tentar parsear string
  const parsed = parseCurrency(orderItem.valor_unitario);
  if (parsed > 0) {
    return parsed;
  }
  
  // Fallback: logar e retornar 0
  console.error('Não foi possível calcular subtotal para item:', orderItem);
  return 0;
};
```

#### 6.1.2 Adicionar Validação de Consistência

Adicionar uma função que valida se os totais fazem sentido:

```typescript
const validateOrderTotals = (order: OrderWithItems): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];
  const valorFrete = parseCurrency(order.valor_frete ?? 0);
  const valorTotal = parseCurrency(order.total_value ?? 0);
  
  // Calcular soma de itens
  const somaItens = (order.items ?? []).reduce((sum, item) => {
    return sum + getSubtotalValue(item);
  }, 0);
  
  // Validar se total_value >= somaItens + frete (descontos podem reduzir)
  const expectedMin = somaItens + valorFrete;
  if (valorTotal > expectedMin * 1.1) { // Permitir 10% de margem para erros de arredondamento
    issues.push(`Total do pedido (${valorTotal}) muito maior que soma de itens + frete (${expectedMin})`);
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
};
```

### 6.2 🚀 Melhorias de Performance

#### 6.2.1 Cache de Parsing

Os valores de moeda são parseados múltiplas vezes. Criar um cache:

```typescript
const currencyCache = new Map<string | number, number>();

const parseCurrencyCached = (value: unknown): number => {
  const key = typeof value === 'string' ? value : String(value);
  if (currencyCache.has(key)) {
    return currencyCache.get(key)!;
  }
  const parsed = parseCurrency(value);
  currencyCache.set(key, parsed);
  return parsed;
};
```

**Nota**: Limpar o cache periodicamente ou após processar um lote de pedidos.

#### 6.2.2 Otimização de Agrupamento

O agrupamento atual cria múltiplos Maps aninhados. Para grandes volumes, considerar usar uma estrutura de dados mais eficiente ou processamento em lotes.

### 6.3 📊 Melhorias de Funcionalidade

#### 6.3.1 Opção de Distribuir Frete Proporcionalmente

Adicionar uma opção no payload para distribuir o frete proporcionalmente entre os itens:

```typescript
interface ReportRequestPayload {
  // ... campos existentes
  frete_distribution?: 'por_pedido' | 'proporcional'; // default: 'por_pedido'
}
```

#### 6.3.2 Incluir Campo de Desconto no Relatório

Atualmente, descontos não aparecem explicitamente no relatório. Adicionar:

```typescript
interface ReportTotals {
  valor_frete: number;
  valor_servico: number;
  desconto?: number;  // Novo campo
  valor_liquido: number;  // Novo campo (frete + serviço - desconto)
}
```

#### 6.3.3 Exportação com Metadados

Adicionar metadados ao CSV/PDF exportado:
- Quantidade de pedidos únicos
- Quantidade de itens únicos
- Validação de consistência
- Data/hora de geração

### 6.4 🧪 Melhorias de Testes

#### 6.4.1 Testes Unitários

Criar testes para:
- `computeTotalsFromRows()` com diferentes cenários
- `getSubtotalValue()` com edge cases
- `parseCurrency()` com formatos variados
- `buildRowsFromOrder()` com pedidos sem itens

#### 6.4.2 Testes de Integração

Testar:
- Relatório completo com pedidos reais
- Validação de totais (subtotal de grupos = soma de subgrupos)
- Validação de frete (não duplicado no total geral)

### 6.5 📝 Documentação

#### 6.5.1 Comentários no Código

Adicionar JSDoc nas funções principais:

```typescript
/**
 * Calcula os totais de frete e serviço a partir de linhas normalizadas.
 * 
 * IMPORTANTE: O frete é agrupado por orderId para evitar duplicação,
 * já que cada item de um pedido pode estar em grupos diferentes no relatório.
 * 
 * @param rows - Array de linhas normalizadas (uma por item de pedido)
 * @returns Totais de frete e serviço
 */
const computeTotalsFromRows = (rows: NormalizedRow[]): ReportTotals => {
  // ...
};
```

#### 6.5.2 Documentação de Casos de Uso

Criar exemplos práticos:
- Como calcular fechamento de comissão por vendedor
- Como calcular fechamento por período
- Como interpretar relatórios analíticos vs sintéticos

### 6.6 🔒 Validações Adicionais

#### 6.6.1 Validação de Input

Adicionar validação no payload de requisição:

```typescript
const validateReportRequest = (payload: ReportRequestPayload): ValidationResult => {
  const errors: string[] = [];
  
  if (payload.start_date && payload.end_date) {
    if (payload.start_date > payload.end_date) {
      errors.push('Data inicial não pode ser posterior à data final');
    }
  }
  
  if (payload.start_date && !isValidDate(payload.start_date)) {
    errors.push('Data inicial inválida');
  }
  
  // ... outras validações
  
  return {
    valid: errors.length === 0,
    errors
  };
};
```

#### 6.6.2 Validação de Saída

Antes de retornar o relatório, validar:
- Totais de grupos = soma de subgrupos
- Total geral = soma de todos os grupos
- Frete não duplicado (verificar Map de orderIds)

---

## 7. Exemplos de Código Relevantes

### 7.1 Função Principal de Geração

```116:141:src/utils/fechamentoReport.ts
const computeTotalsFromRows = (rows: NormalizedRow[]): ReportTotals => {
  // Agrupar por orderId para contar frete apenas uma vez por pedido
  const fretePorPedido = new Map<number, number>();
  let totalServico = 0;

  rows.forEach((row) => {
    // Serviços: somar todos (por item)
    totalServico = roundCurrency(totalServico + row.valorServico);
    
    // Frete: contar apenas uma vez por pedido (usar o primeiro valor encontrado)
    if (!fretePorPedido.has(row.orderId)) {
      fretePorPedido.set(row.orderId, row.valorFrete);
    }
  });

  // Somar fretes únicos de cada pedido
  const totalFrete = Array.from(fretePorPedido.values()).reduce(
    (sum, frete) => roundCurrency(sum + frete),
    0
  );

  return {
    valor_frete: totalFrete,
    valor_servico: totalServico,
  };
};
```

### 7.2 Cálculo de Subtotal de Item

```72:80:src/utils/fechamentoReport.ts
const getSubtotalValue = (orderItem: OrderWithItems['items'][number]): number => {
  if (typeof orderItem.subtotal === 'number' && Number.isFinite(orderItem.subtotal)) {
    return roundCurrency(orderItem.subtotal);
  }
  if (typeof orderItem.quantity === 'number' && typeof orderItem.unit_price === 'number') {
    return roundCurrency(orderItem.quantity * orderItem.unit_price);
  }
  return parseCurrency(orderItem.valor_unitario);
};
```

### 7.3 Construção de Linhas a partir de Pedido

```260:315:src/utils/fechamentoReport.ts
const buildRowsFromOrder = (order: OrderWithItems, dateMode: DateReferenceMode): NormalizedRow[] => {
  const items = order.items ?? [];
  const cliente = safeLabel(order.cliente ?? order.customer_name, 'Cliente não informado');
  const formaEnvio = safeLabel(order.forma_envio, 'Sem forma de envio');
  const ordemDataRef = getOrderReferenceDate(order, dateMode);
  const dataLabel = formatDateLabel(ordemDataRef);
  const valorFreteTotal = parseCurrency(order.valor_frete ?? 0);

  if (items.length === 0) {
    const totalServico = roundCurrency(parseCurrency(order.total_value ?? 0) - valorFreteTotal);
    return [
      {
        orderId: order.id,
        ficha: order.numero ?? order.id.toString(),
        cliente,
        designer: 'Sem designer',
        vendedor: 'Sem vendedor',
        tipo: 'Sem tipo',
        formaEnvio,
        data: ordemDataRef ?? '',
        dataLabel,
        descricao: 'Pedido sem itens',
        valorFrete: valorFreteTotal,
        valorServico: totalServico,
      },
    ];
  }

  // Frete é por pedido, não divide entre itens
  // Cada item mostra o frete TOTAL do pedido

  return items.map((item) => {
    const designer = safeLabel(item.designer, 'Sem designer');
    const vendedor = safeLabel(item.vendedor, 'Sem vendedor');
    const tipo = safeLabel(item.tipo_producao, 'Sem tipo');
    const descricao = safeLabel(item.descricao ?? item.item_name, 'Item sem descrição');
    const valorServico = getSubtotalValue(item);
    // Cada item mostra o frete TOTAL do pedido (não dividido)
    const valorFrete = valorFreteTotal;

    return {
      orderId: order.id,
      ficha: order.numero ?? order.id.toString(),
      cliente,
      designer,
      vendedor,
      tipo,
      formaEnvio,
      data: ordemDataRef ?? '',
      dataLabel,
      descricao,
      valorFrete,
      valorServico,
    };
  });
};
```

### 7.4 Função de Geração de Relatório

```501:632:src/utils/fechamentoReport.ts
export const generateFechamentoReport = (
  orders: OrderWithItems[],
  payload: ReportRequestPayload,
): ReportResponse => {
  const dateMode: DateReferenceMode =
    payload.date_mode === 'entrada' || payload.date_mode === 'entrega'
      ? payload.date_mode
      : 'auto';

  const filteredByStatus = filterOrdersByStatus(orders, payload.status);
  const filteredOrders = filterOrdersByDate(
    filteredByStatus,
    payload.start_date,
    payload.end_date,
    dateMode // ✅ Passa o dateMode para o filtro
  );

  const baseRowsAll = filteredOrders.flatMap((order) => buildRowsFromOrder(order, dateMode));
  const baseRows = filterRowsByPeople(baseRowsAll, payload);
  const totals = computeTotalsFromRows(baseRows);

  const reportType = payload.report_type;
  const groups: ReportGroup[] = (() => {
    switch (reportType) {
      case 'analitico_designer_cliente':
        return buildTwoLevelGroups(
          baseRows,
          (row) => row.designer,
          (value) => `Designer: ${value}`,
          (row) => row.cliente,
          (value) => `Cliente: ${value}`,
        );
      // ... outros casos
      default:
        return [];
    }
  })();

  const statusLabelRaw = payload.status ?? 'Todos';
  const statusLabel = STATUS_FILTER_LABEL[statusLabelRaw] ?? statusLabelRaw;

  return {
    title: REPORT_TITLES[reportType] ?? 'Relatório de Fechamentos',
    period_label: buildPeriodLabel(payload.start_date, payload.end_date),
    status_label: `Status: ${statusLabel}`,
    page: 1,
    generated_at: new Date().toLocaleString('pt-BR'),
    report_type: reportType,
    groups,
    total: totals,
  };
};
```

---

## 8. Exemplos de Entrada e Saída

### 8.1 Entrada: Pedidos

```json
[
  {
    "id": 100,
    "numero": "PED-001",
    "cliente": "Empresa ABC",
    "data_entrada": "2024-01-15",
    "data_entrega": "2024-01-20",
    "valor_frete": "50,00",
    "total_value": 350.00,
    "items": [
      {
        "id": 1,
        "descricao": "Painel 1m x 2m",
        "subtotal": 150.00,
        "designer": "João Silva",
        "vendedor": "Maria Santos",
        "tipo_producao": "painel"
      },
      {
        "id": 2,
        "descricao": "Banner 3m x 1m",
        "subtotal": 150.00,
        "designer": "João Silva",
        "vendedor": "Maria Santos",
        "tipo_producao": "banner"
      }
    ]
  },
  {
    "id": 101,
    "numero": "PED-002",
    "cliente": "Empresa XYZ",
    "data_entrada": "2024-01-16",
    "data_entrega": "2024-01-21",
    "valor_frete": "30,00",
    "total_value": 130.00,
    "items": [
      {
        "id": 3,
        "descricao": "Adesivo 50cm x 50cm",
        "subtotal": 100.00,
        "designer": "Pedro Costa",
        "vendedor": "Ana Lima",
        "tipo_producao": "adesivo"
      }
    ]
  }
]
```

### 8.2 Saída: Relatório Sintético por Designer

```json
{
  "title": "Relatório Sintético — Totais por Designer",
  "period_label": "Período: 15/01/2024 - 21/01/2024",
  "status_label": "Status: Todos",
  "page": 1,
  "generated_at": "25/01/2024 10:30:00",
  "report_type": "sintetico_designer",
  "groups": [
    {
      "key": "joao-silva",
      "label": "Designer: João Silva",
      "rows": [
        {
          "ficha": "Pedidos: 1 · Itens: 2",
          "descricao": "Subtotal",
          "valor_frete": 50.00,
          "valor_servico": 300.00
        }
      ],
      "subtotal": {
        "valor_frete": 50.00,
        "valor_servico": 300.00
      }
    },
    {
      "key": "pedro-costa",
      "label": "Designer: Pedro Costa",
      "rows": [
        {
          "ficha": "Pedidos: 1 · Itens: 1",
          "descricao": "Subtotal",
          "valor_frete": 30.00,
          "valor_servico": 100.00
        }
      ],
      "subtotal": {
        "valor_frete": 30.00,
        "valor_servico": 100.00
      }
    }
  ],
  "total": {
    "valor_frete": 80.00,
    "valor_servico": 400.00
  }
}
```

### 8.3 Saída: Relatório Analítico Designer × Cliente

```json
{
  "title": "Relatório Analítico — Designer × Cliente",
  "groups": [
    {
      "key": "joao-silva",
      "label": "Designer: João Silva",
      "subgroups": [
        {
          "key": "joao-silva-empresa-abc",
          "label": "Cliente: Empresa ABC",
          "rows": [
            {
              "ficha": "PED-001",
              "descricao": "Painel 1m x 2m",
              "valor_frete": 50.00,
              "valor_servico": 150.00
            },
            {
              "ficha": "PED-001",
              "descricao": "Banner 3m x 1m",
              "valor_frete": 50.00,
              "valor_servico": 150.00
            }
          ],
          "subtotal": {
            "valor_frete": 100.00,  // ⚠️ Frete aparece 2x (uma por item)
            "valor_servico": 300.00
          }
        }
      ],
      "subtotal": {
        "valor_frete": 100.00,  // ⚠️ Frete duplicado no grupo
        "valor_servico": 300.00
      }
    }
  ],
  "total": {
    "valor_frete": 80.00,  // ✅ Total geral correto (agrupado por orderId)
    "valor_servico": 400.00
  }
}
```

**Nota**: O frete aparece duplicado nos subtotais de grupo/subgrupo, mas o total geral está correto devido ao agrupamento por `orderId` em `computeTotalsFromRows()`.

---

## 9. Checklist de Validação

Ao usar o sistema de fechamentos, verificar:

- [ ] Os totais de subgrupos somam corretamente o total do grupo?
- [ ] Os totais de grupos somam corretamente o total geral?
- [ ] O frete não está duplicado no total geral? (deve ser 1x por pedido)
- [ ] Os valores de serviço estão sendo calculados corretamente? (verificar `getSubtotalValue()`)
- [ ] Pedidos sem itens estão sendo tratados corretamente?
- [ ] Filtros por vendedor/designer estão funcionando como esperado?
- [ ] Datas estão sendo filtradas corretamente (entrada vs entrega)?
- [ ] Valores estão sendo arredondados corretamente (2 casas decimais)?

---

## 10. Conclusão

O sistema de fechamentos está funcionalmente correto para a maioria dos casos de uso, mas apresenta alguns pontos de atenção:

### Pontos Fortes ✅
- Lógica de agrupamento bem estruturada
- Tratamento de valores null/undefined
- Suporte a múltiplos tipos de relatórios
- Cálculo correto do total geral (frete não duplicado)

### Pontos de Atenção ⚠️
- Frete pode aparecer duplicado em subtotais de grupos/subgrupos (mas não no total geral)
- Cálculo de valor de serviço para pedidos sem itens pode ser impreciso se houver descontos
- Falta de validação explícita de consistência de dados
- Documentação de edge cases poderia ser melhorada

### Próximos Passos Recomendados
1. Implementar validações de consistência (seção 6.1.2)
2. Adicionar testes unitários (seção 6.4)
3. Melhorar tratamento de erros (seção 6.1.1)
4. Considerar opção de distribuição proporcional de frete (seção 6.3.1)

---

**Data de Análise**: Janeiro 2024  
**Versão do Código Analisado**: Branch `docs`  
**Arquivos Principais**:
- `src/utils/fechamentoReport.ts` (633 linhas)
- `src/pages/Fechamentos.tsx` (1293 linhas)
- `src/services/api.ts` (função `generateReport`)
- `src/types/index.ts` (tipos relacionados)

