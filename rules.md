# 🎯 Regras de Desenvolvimento - SGP v4

> **Regras obrigatórias, padrões e decisões de arquitetura para desenvolvimento do SGP v4**
> 
> Este documento serve como "segundo cérebro" para manter consistência, evitar bugs recorrentes e documentar decisões importantes.

---

## ⚠️ REGRAS CRÍTICAS (NUNCA VIOLAR)

### 1. Campos Monetários SEMPRE Como Strings

**REGRA ABSOLUTA:** Todos os campos monetários devem ser enviados ao backend como **strings**, não como números.

```typescript
// ❌ NUNCA FAZER - Causa erro 422
const item = {
  valor_ilhos: 150.50,        // número
  valor_cordinha: 0,          // número
  valor_painel: 200           // número
};

// ✅ SEMPRE FAZER
const item = {
  valor_ilhos: "150.50",      // string
  valor_cordinha: "0.00",     // string
  valor_painel: "200.00"      // string
};
```

**Razão:** O schema `ItemPedido` no backend (`pedidos/schema.py`) define campos monetários como `Optional[str]`, não como `float` ou `Decimal`.

**Como Garantir:**
```typescript
// Use sempre estas funções em CreateOrderComplete.tsx
const convertMonetaryFields = (item: TabItem) => ({
  valor_painel: formatMonetary(parseMonetary(item.valor_painel)),
  valor_ilhos: formatMonetary(parseMonetary(item.valor_ilhos)),
  // ... todos os campos monetários
});
```

### 2. Tauri NÃO É Backend

**REGRA ABSOLUTA:** Tauri é apenas um empacotador desktop, não processa lógica de negócio.

- ❌ **NUNCA** criar lógica de negócio no código Rust do Tauri
- ❌ **NUNCA** acessar banco de dados diretamente do Tauri
- ❌ **NUNCA** processar dados sensíveis no Tauri
- ✅ **SEMPRE** usar Tauri apenas para:
  - Sistema de arquivos (`@tauri-apps/plugin-fs`)
  - Diálogos nativos (`@tauri-apps/plugin-dialog`)
  - Requisições HTTP (`@tauri-apps/plugin-http`)
  - Atualizações (`@tauri-apps/plugin-updater`)

**Arquitetura Correta:**
```
React (UI) → HTTP → FastAPI (Lógica) → PostgreSQL (Dados)
     ↓
  Tauri (Empacotador)
```

### 3. Comunicação SEMPRE via HTTP

**REGRA ABSOLUTA:** Toda comunicação entre frontend e backend é via HTTP/REST.

- ❌ **NUNCA** comunicação direta Rust ↔ Python
- ❌ **NUNCA** comunicação direta Tauri ↔ PostgreSQL
- ✅ **SEMPRE** React → Axios → HTTP → FastAPI
- ✅ **SEMPRE** usar Bearer Token para autenticação

### 4. Tipos TypeScript SEMPRE Sincronizados com Pydantic

**REGRA ABSOLUTA:** Tipos do frontend devem corresponder exatamente aos schemas do backend.

```python
# Backend: pedidos/schema.py
class ItemPedido(SQLModel):
    valor_ilhos: Optional[str] = None
    quantidade_paineis: Optional[str] = None
```

```typescript
// Frontend: src/types/index.ts
interface OrderItem {
  valor_ilhos?: string;
  quantidade_paineis?: string;
}
```

### 5. Validação SEMPRE no Backend E Frontend

**REGRA ABSOLUTA:** Nunca confiar apenas em validação do frontend.

- ✅ Validar no frontend (UX - feedback imediato)
- ✅ Validar no backend (Segurança - fonte da verdade)
- ❌ **NUNCA** validar apenas no frontend
- ❌ **NUNCA** confiar em dados do frontend sem validar

---

## 🚫 PROIBIÇÕES ABSOLUTAS

### Código

- ❌ **NUNCA** usar `any` no TypeScript (usar `unknown` se necessário)
- ❌ **NUNCA** usar `@ts-ignore` sem comentário explicativo
- ❌ **NUNCA** commitar código com `console.log` de debug
- ❌ **NUNCA** commitar código comentado (deletar ou documentar)
- ❌ **NUNCA** usar `var` (usar `const` ou `let`)
- ❌ **NUNCA** mutar props diretamente em React
- ❌ **NUNCA** fazer requisições sem tratamento de erro

### Arquitetura

- ❌ **NUNCA** usar `services/api.ts` (arquivo legado, usar `src/api/`)
- ❌ **NUNCA** criar componentes sem tipos de props
- ❌ **NUNCA** criar endpoints sem documentação
- ❌ **NUNCA** fazer queries SQL diretas (usar SQLAlchemy ORM)
- ❌ **NUNCA** armazenar senhas em plain text
- ❌ **NUNCA** expor tokens ou secrets no código

### Git

- ❌ **NUNCA** commitar diretamente na `main`
- ❌ **NUNCA** fazer force push em branches compartilhadas
- ❌ **NUNCA** commitar `node_modules/` ou `.env`
- ❌ **NUNCA** commitar arquivos de build (`dist/`, `target/`)

---

## 📋 PADRÕES OBRIGATÓRIOS

### Estrutura de Código

#### Novos Endpoints (API)

**Ordem obrigatória:**

1. **Backend primeiro** (FastAPI)
   ```python
   # pedidos/router.py
   @router.get("/api/pedidos/novo-endpoint")
   async def novo_endpoint():
       pass
   ```

2. **Schema Pydantic**
   ```python
   # pedidos/schema.py
   class NovoSchema(SQLModel):
       campo: str
   ```

3. **Tipos TypeScript**
   ```typescript
   // src/api/types/index.ts
   export interface NovoTipo {
     campo: string;
   }
   ```

4. **Função de Endpoint**
   ```typescript
   // src/api/endpoints/orders.ts
   export const novoEndpoint = async (): Promise<NovoTipo> => {
     const response = await apiClient.get('/api/pedidos/novo-endpoint');
     return response.data;
   };
   ```

#### Novos Componentes React

**Template obrigatório:**

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { MinhaProps } from '@/types';

interface NovoComponenteProps {
  titulo: string;
  onSave: (data: MinhaProps) => void;
}

export const NovoComponente = ({ titulo, onSave }: NovoComponenteProps) => {
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(data);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <Button onClick={handleSave} disabled={loading}>
        Salvar
      </Button>
    </div>
  );
};
```

#### Novos Tipos de Produção

**Checklist obrigatório:**

1. [ ] Adicionar campos no schema backend (`ItemPedido`)
2. [ ] Adicionar tipos TypeScript (`OrderItem`)
3. [ ] Atualizar `convertMonetaryFields` com novos campos monetários
4. [ ] Adicionar lógica de processamento em `handleConfirmSave`
5. [ ] Adicionar validação em `validateItemComplete`
6. [ ] Adicionar cálculo em `calcularValorItens`
7. [ ] Testar criação de pedido
8. [ ] Testar edição de pedido
9. [ ] Testar relatório de fechamento
10. [ ] Verificar que valores aparecem corretamente
11. [ ] Confirmar que não há erro 422

**Referência:** Ver seção "Tipos de Produção e Processamento de Valores" em `agents.md`

---

## 🎨 CONVENÇÕES DE CÓDIGO

### Nomenclatura

```typescript
// Componentes: PascalCase
const OrderList = () => {};
const CreateOrderComplete = () => {};

// Funções: camelCase
const fetchOrders = () => {};
const calculateTotal = () => {};

// Constantes: UPPER_SNAKE_CASE
const API_TIMEOUT = 30000;
const DEFAULT_PAGE_SIZE = 20;

// Interfaces/Types: PascalCase
interface OrderItem {}
type OrderStatus = 'pendente' | 'pronto';

// Arquivos:
// - Componentes: PascalCase (OrderList.tsx)
// - Utilitários: camelCase (formatDate.ts)
// - Hooks: camelCase com 'use' (useOrders.ts)
```

### Organização de Imports

**Ordem obrigatória:**

```typescript
// 1. React e bibliotecas externas
import { useState, useEffect } from 'react';
import axios from 'axios';

// 2. Componentes UI (Shadcn)
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

// 3. Componentes internos
import { OrderList } from '@/components/OrderList';

// 4. Hooks customizados
import { useOrders } from '@/hooks/useOrders';

// 5. Utilitários e helpers
import { formatDate } from '@/utils/date';
import { formatCurrency } from '@/utils/currency';

// 6. Tipos
import type { Order, OrderItem } from '@/types';

// 7. Estilos (se necessário)
import './styles.css';
```

### Estrutura de Funções

```typescript
// 1. Props/Params com tipos
interface Props {
  orderId: number;
  onSuccess: () => void;
}

// 2. Função com tipo de retorno explícito
export const processOrder = async ({ orderId, onSuccess }: Props): Promise<void> => {
  // 3. Validação de entrada
  if (!orderId || orderId <= 0) {
    throw new Error('ID do pedido inválido');
  }

  // 4. Lógica principal
  try {
    const order = await fetchOrder(orderId);
    await updateOrder(order);
    onSuccess();
  } catch (error) {
    // 5. Tratamento de erro
    console.error('Erro ao processar pedido:', error);
    throw error;
  }
};
```

### Comentários

```typescript
// ✅ BOM - Explica "por quê"
// Usar string porque backend espera Optional[str], não float
const valor = "150.50";

// ✅ BOM - Documenta decisão importante
// IMPORTANTE: Não usar deduplicação por ID quando id=null
// Usar índice como fallback para evitar sobrescrever itens
const key = item.id != null ? item.id : `__index_${index}`;

// ❌ RUIM - Explica "o quê" (óbvio pelo código)
// Incrementa contador
counter++;

// ❌ RUIM - Código comentado sem explicação
// const oldFunction = () => { ... }
```

---

## 🔧 DECISÕES DE ARQUITETURA

### Por que Zustand e não Redux?

**Decisão:** Usar Zustand para gerenciamento de estado global

**Razões:**
- ✅ Mais leve (~1KB vs ~10KB do Redux)
- ✅ Menos boilerplate (sem actions, reducers, etc.)
- ✅ API mais simples e intuitiva
- ✅ Suficiente para o escopo do projeto
- ✅ Middleware de persistência integrado

**Quando reavaliar:** Se o projeto crescer significativamente e precisar de DevTools avançadas

### Por que Tauri e não Electron?

**Decisão:** Usar Tauri v2 como framework desktop

**Razões:**
- ✅ Executável muito menor (~3MB vs ~150MB do Electron)
- ✅ Melhor performance (Rust vs Node.js)
- ✅ Menor uso de memória
- ✅ Rust é mais seguro que JavaScript
- ✅ Atualizações automáticas integradas

**Quando reavaliar:** Nunca, a menos que Tauri seja descontinuado

### Por que FastAPI e não Flask/Django?

**Decisão:** Usar FastAPI para backend

**Razões:**
- ✅ Validação automática com Pydantic
- ✅ Documentação automática (Swagger/OpenAPI)
- ✅ Async nativo (melhor performance)
- ✅ Type hints nativos
- ✅ WebSocket integrado

**Quando reavaliar:** Nunca para este projeto

### Por que PostgreSQL e não MySQL/MongoDB?

**Decisão:** Usar PostgreSQL como banco de dados

**Razões:**
- ✅ Melhor suporte a JSON (JSONB)
- ✅ Transações ACID robustas
- ✅ Extensões poderosas (uuid-ossp, etc.)
- ✅ Melhor performance em queries complexas
- ✅ Open source e gratuito

**Quando reavaliar:** Nunca para este projeto

### Por que Shadcn UI e não Material-UI/Ant Design?

**Decisão:** Usar Shadcn UI para componentes

**Razões:**
- ✅ Componentes copiados para o projeto (não dependência)
- ✅ Total controle e customização
- ✅ Baseado em Radix UI (acessibilidade)
- ✅ Integração perfeita com Tailwind CSS
- ✅ Sem bundle size adicional

**Quando reavaliar:** Nunca, a menos que precise de componentes muito específicos

---

## 🐛 BUGS CONHECIDOS E SOLUÇÕES

### Bug 1: Erro 422 - Unprocessable Entity

**Sintoma:** Backend rejeita pedido com erro 422 "Input should be a valid string"

**Causa:** Campos monetários enviados como números em vez de strings

**Solução Permanente:**
```typescript
// Sempre usar convertMonetaryFields
const convertMonetaryFields = (item: TabItem) => ({
  valor_ilhos: formatMonetary(parseMonetary(item.valor_ilhos)),
  valor_cordinha: formatMonetary(parseMonetary(item.valor_cordinha)),
  // ... todos os campos monetários
});
```

**Prevenção:** Adicionar validação no TypeScript que force strings

### Bug 2: Itens Duplicados/Sobrescritos no Relatório

**Sintoma:** Apenas 1 item aparece em vez de múltiplos no relatório de fechamento

**Causa:** Deduplicação usando `item.id` quando todos os itens têm `id=null`

**Solução Permanente:**
```typescript
// Usar índice como fallback
items.forEach((item, index) => {
  const key = item.id != null ? item.id : `__index_${index}`;
  itemsById.set(key, item);
});
```

**Prevenção:** Sempre garantir que itens tenham IDs únicos ou usar índice

### Bug 3: Valores Zerados no Relatório

**Sintoma:** Subtotais aparecem como R$ 0,00 no relatório de fechamento

**Causa:** Função `parseCurrencyCached` retorna 0 para valores inválidos ou vazios

**Solução Permanente:**
```typescript
// Garantir que valor_unitario seja sempre string válida
const valor = item.valor_unitario || "0.00";
```

**Prevenção:** Validar campos monetários antes de salvar

### Bug 4: WebSocket Desconecta Frequentemente

**Sintoma:** Notificações em tempo real param de funcionar

**Causa:** Timeout de conexão ou rede instável

**Solução Permanente:**
- Reconexão automática já implementada em `realtimeOrders.ts`
- Aumentar timeout se necessário
- Implementar heartbeat/ping-pong

**Prevenção:** Monitorar logs de conexão WebSocket

### Bug 5: Sessão Expira Muito Rápido

**Sintoma:** Usuário é deslogado constantemente

**Causa:** TTL muito curto (padrão: 8 horas)

**Solução Permanente:**
```typescript
// Ajustar em authStore.ts
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas
```

**Prevenção:** Implementar refresh token no futuro

---

## 📝 CHECKLIST DE PULL REQUEST

### Antes de Commitar

- [ ] Código compila sem erros TypeScript (`npm run build`)
- [ ] Todos os testes passam (`npm test`)
- [ ] Lint passa sem warnings (`npm run lint`)
- [ ] Formatação aplicada (`npm run format`)
- [ ] Testado manualmente no ambiente de desenvolvimento
- [ ] Testado em diferentes cenários (happy path + edge cases)
- [ ] Documentação atualizada (se necessário)
- [ ] `agents.md` atualizado (se mudou arquitetura)
- [ ] `rules.md` atualizado (se criou nova regra)
- [ ] Sem `console.log` de debug esquecidos
- [ ] Sem código comentado sem explicação
- [ ] Sem TODOs sem issue correspondente

### Mensagem de Commit

**Formato obrigatório:**

```
tipo(escopo): descrição curta

Descrição detalhada do que foi feito e por quê.

Fixes #123
```

**Tipos permitidos:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `refactor`: Refatoração de código
- `docs`: Mudanças em documentação
- `style`: Formatação, ponto e vírgula, etc.
- `test`: Adição ou correção de testes
- `chore`: Tarefas de manutenção

**Exemplos:**
```
feat(orders): adicionar tipo de produção "canga"

Implementa novo tipo de produção com campos específicos:
- quantidade_canga
- valor_canga
- baininha (boolean)

Inclui validação e cálculo de valores.

Fixes #456
```

```
fix(reports): corrigir valores zerados no relatório de fechamento

Problema: parseCurrencyCached retornava 0 para strings vazias
Solução: Usar "0.00" como fallback antes de parsear

Fixes #789
```

---

## 🔄 FLUXO DE TRABALHO

### Adicionar Nova Funcionalidade

1. **Criar Issue**
   - Descrever funcionalidade
   - Adicionar labels apropriadas
   - Estimar complexidade

2. **Criar Branch**
   ```bash
   git checkout -b feature/nome-descritivo
   ```

3. **Atualizar Documentação**
   - Atualizar `agents.md` se necessário
   - Atualizar `rules.md` se criar nova regra

4. **Implementar Backend**
   - Criar endpoint em FastAPI
   - Definir schema Pydantic
   - Adicionar testes unitários

5. **Implementar Frontend**
   - Criar tipos TypeScript
   - Criar função de endpoint
   - Criar/atualizar componente
   - Adicionar testes

6. **Testar Localmente**
   - Testar happy path
   - Testar edge cases
   - Testar erros

7. **Commit e Push**
   ```bash
   git add .
   git commit -m "feat(escopo): descrição"
   git push origin feature/nome-descritivo
   ```

8. **Criar Pull Request**
   - Descrever mudanças
   - Adicionar screenshots se UI
   - Referenciar issue

### Corrigir Bug

1. **Reproduzir o Bug**
   - Documentar passos para reproduzir
   - Identificar camada (frontend/backend/db)

2. **Criar Branch**
   ```bash
   git checkout -b fix/nome-do-bug
   ```

3. **Criar Teste que Falha**
   - Escrever teste que reproduz o bug
   - Verificar que teste falha

4. **Implementar Correção**
   - Corrigir o bug
   - Verificar que teste passa

5. **Testar Manualmente**
   - Verificar que bug foi corrigido
   - Verificar que não quebrou outras funcionalidades

6. **Atualizar Documentação**
   - Adicionar bug em "Bugs Conhecidos" se relevante
   - Documentar solução

7. **Commit e Push**
   ```bash
   git commit -m "fix(escopo): descrição do bug corrigido"
   git push origin fix/nome-do-bug
   ```

### Refatoração

1. **Identificar Código para Refatorar**
   - Código duplicado
   - Código complexo
   - Código sem testes

2. **Criar Branch**
   ```bash
   git checkout -b refactor/nome-descritivo
   ```

3. **Adicionar Testes (se não existirem)**
   - Garantir cobertura antes de refatorar

4. **Refatorar**
   - Manter funcionalidade idêntica
   - Melhorar legibilidade/performance

5. **Verificar Testes**
   - Todos os testes devem continuar passando

6. **Commit e Push**
   ```bash
   git commit -m "refactor(escopo): descrição da refatoração"
   git push origin refactor/nome-descritivo
   ```

---

## 💡 BOAS PRÁTICAS

### Performance

#### Frontend
- ✅ Usar `React.memo` para componentes que re-renderizam frequentemente
- ✅ Usar `useMemo` para cálculos pesados
- ✅ Usar `useCallback` para funções passadas como props
- ✅ Lazy loading de rotas com `React.lazy()`
- ✅ Code splitting automático do Vite
- ✅ Debounce em campos de busca (300ms)
- ✅ Paginação em listas grandes (20 itens por página)
- ✅ Virtualização para listas muito grandes (react-window)

#### Backend
- ✅ Usar índices no PostgreSQL para queries frequentes
- ✅ Paginação em endpoints que retornam listas
- ✅ Cache de queries frequentes (Redis no futuro)
- ✅ Async/await para operações I/O
- ✅ Connection pooling do SQLAlchemy

### Segurança

#### Frontend
- ✅ Sempre validar inputs antes de enviar
- ✅ Sanitizar dados exibidos (React faz automaticamente)
- ✅ Nunca armazenar senhas em localStorage
- ✅ Usar HTTPS em produção
- ✅ Validar tokens antes de fazer requisições

#### Backend
- ✅ Sempre validar no backend (nunca confiar no frontend)
- ✅ Usar prepared statements (SQLAlchemy ORM)
- ✅ Hash de senhas com bcrypt
- ✅ Tokens JWT com expiração
- ✅ Rate limiting em endpoints sensíveis
- ✅ CORS configurado corretamente
- ✅ Validação de tipos com Pydantic

### UX (Experiência do Usuário)

- ✅ Loading states em todas as requisições
- ✅ Mensagens de erro claras e acionáveis
- ✅ Confirmação em ações destrutivas (deletar, cancelar)
- ✅ Feedback visual imediato (toasts, spinners)
- ✅ Desabilitar botões durante processamento
- ✅ Validação em tempo real em formulários
- ✅ Placeholders informativos
- ✅ Labels descritivas
- ✅ Mensagens de sucesso após ações

### Acessibilidade

- ✅ Usar componentes Shadcn UI (baseados em Radix - acessíveis)
- ✅ Labels em todos os inputs
- ✅ Contraste adequado de cores
- ✅ Navegação por teclado funcional
- ✅ ARIA labels quando necessário
- ✅ Foco visível em elementos interativos

### Testes

- ✅ Testar happy path (caminho feliz)
- ✅ Testar edge cases (casos extremos)
- ✅ Testar erros (como sistema se comporta)
- ✅ Mocks para APIs externas
- ✅ Testes unitários para lógica complexa
- ✅ Testes de integração para fluxos críticos
- ✅ Cobertura mínima de 70% (ideal: 80%+)

---

## 🎓 PADRÕES DE CÓDIGO ESPECÍFICOS

### Tratamento de Erros

```typescript
// ✅ BOM - Tratamento completo
const fetchOrder = async (id: number): Promise<Order> => {
  try {
    const response = await apiClient.get(`/api/pedidos/${id}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('Pedido não encontrado');
      }
      if (error.response?.status === 422) {
        throw new Error('Dados inválidos: ' + JSON.stringify(error.response.data));
      }
    }
    console.error('Erro ao buscar pedido:', error);
    throw new Error('Erro ao buscar pedido');
  }
};

// ❌ RUIM - Sem tratamento
const fetchOrder = async (id: number) => {
  const response = await apiClient.get(`/api/pedidos/${id}`);
  return response.data;
};
```

### Estado de Loading

```typescript
// ✅ BOM - Loading state e tratamento de erro
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleSave = async () => {
  setLoading(true);
  setError(null);
  try {
    await saveOrder(data);
    toast({ title: 'Pedido salvo com sucesso!' });
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Erro desconhecido');
    toast({ title: 'Erro ao salvar pedido', variant: 'destructive' });
  } finally {
    setLoading(false);
  }
};

// ❌ RUIM - Sem loading state
const handleSave = async () => {
  await saveOrder(data);
};
```

### Validação de Formulários

```typescript
// ✅ BOM - Validação completa
const validateOrder = (order: Order): string[] => {
  const errors: string[] = [];

  if (!order.cliente || order.cliente.trim().length === 0) {
    errors.push('Cliente é obrigatório');
  }

  if (!order.data_entrada) {
    errors.push('Data de entrada é obrigatória');
  }

  if (order.items.length === 0) {
    errors.push('Pedido deve ter pelo menos 1 item');
  }

  order.items.forEach((item, index) => {
    if (!item.descricao) {
      errors.push(`Item ${index + 1}: Descrição é obrigatória`);
    }
    if (parseFloat(item.valor_unitario || '0') <= 0) {
      errors.push(`Item ${index + 1}: Valor deve ser maior que zero`);
    }
  });

  return errors;
};

// ❌ RUIM - Validação incompleta
const validateOrder = (order: Order) => {
  return order.cliente && order.items.length > 0;
};
```

---

## 📊 MÉTRICAS E MONITORAMENTO

### Métricas de Código

- **Cobertura de Testes:** Mínimo 70%, ideal 80%+
- **Complexidade Ciclomática:** Máximo 10 por função
- **Tamanho de Função:** Máximo 50 linhas
- **Tamanho de Arquivo:** Máximo 500 linhas
- **Profundidade de Aninhamento:** Máximo 4 níveis

### Métricas de Performance

- **Tempo de Build:** < 30 segundos
- **Tempo de Startup:** < 3 segundos
- **Tempo de Resposta API:** < 500ms (p95)
- **Tamanho do Bundle:** < 2MB (gzipped)
- **First Contentful Paint:** < 1.5s

### Quando Refatorar

Refatorar quando:
- Função tem mais de 50 linhas
- Arquivo tem mais de 500 linhas
- Código duplicado em 3+ lugares
- Complexidade ciclomática > 10
- Difícil de testar
- Difícil de entender

---

## 🔐 SEGURANÇA E PRIVACIDADE

### Dados Sensíveis

- ❌ **NUNCA** commitar `.env` ou secrets
- ❌ **NUNCA** logar senhas ou tokens
- ❌ **NUNCA** armazenar senhas em plain text
- ✅ **SEMPRE** usar variáveis de ambiente
- ✅ **SEMPRE** hash de senhas (bcrypt)
- ✅ **SEMPRE** HTTPS em produção

### Autenticação

- ✅ Tokens JWT com expiração (8 horas padrão)
- ✅ Bearer Token em todas as requisições autenticadas
- ✅ Logout limpa token do localStorage
- ✅ Verificação de expiração ao carregar app
- ✅ Refresh automático de sessão (futuro)

### Autorização

- ✅ Verificar permissões no backend
- ✅ Ocultar UI para usuários sem permissão
- ✅ Validar `isAdmin` antes de ações administrativas
- ✅ Nunca confiar apenas em verificação do frontend

---

## 📚 RECURSOS E REFERÊNCIAS

### Documentação Interna

- **agents.md**: Documentação técnica completa do projeto
- **README.md**: Visão geral e setup
- **DOCUMENTACAO_COMPLETA.md**: Documentação detalhada (1443 linhas)
- **documentation/**: Pasta com ~37 arquivos de documentação

### Tecnologias

- [React](https://react.dev/) - Biblioteca UI
- [TypeScript](https://www.typescriptlang.org/) - Linguagem
- [Tauri](https://tauri.app/) - Framework desktop
- [Shadcn UI](https://ui.shadcn.com/) - Componentes
- [Tailwind CSS](https://tailwindcss.com/) - CSS
- [Zustand](https://zustand-demo.pmnd.rs/) - Estado
- [React Router](https://reactrouter.com/) - Roteamento
- [FastAPI](https://fastapi.tiangolo.com/) - Backend
- [PostgreSQL](https://www.postgresql.org/) - Banco de dados
- [Pydantic](https://docs.pydantic.dev/) - Validação

### Ferramentas

- [Vite](https://vitejs.dev/) - Build tool
- [Vitest](https://vitest.dev/) - Testes
- [ESLint](https://eslint.org/) - Linter
- [Prettier](https://prettier.io/) - Formatador

---

## 🔄 MANUTENÇÃO DESTE DOCUMENTO

### Quando Atualizar

Atualizar `rules.md` quando:
- ✅ Criar nova regra obrigatória
- ✅ Descobrir novo bug recorrente
- ✅ Tomar decisão de arquitetura importante
- ✅ Mudar padrão de código
- ✅ Adicionar nova proibição
- ✅ Documentar solução de problema complexo

### Como Atualizar

1. Fazer mudança necessária
2. Adicionar data da mudança
3. Commitar com mensagem descritiva
4. Comunicar time sobre mudança importante

### Histórico de Mudanças

- **2026-02-05**: Criação inicial do documento
- **2026-02-05**: Adição de seção "Tipos de Produção"

---

**Última Atualização:** 2026-02-05  
**Versão:** 1.0.0  
**Mantido por:** Equipe SGP v4

---

## 💬 Dúvidas Frequentes

**P: Posso usar `any` em casos excepcionais?**  
R: Apenas se absolutamente necessário e com comentário explicando por quê. Prefira `unknown`.

**P: Preciso escrever testes para tudo?**  
R: Sim, especialmente para lógica de negócio e cálculos. UI pode ter menos cobertura.

**P: Posso commitar direto na main em emergências?**  
R: Não. Mesmo em emergências, criar branch e PR. Pode fazer merge imediato se necessário.

**P: Como sei se devo criar nova regra?**  
R: Se o mesmo erro acontecer 2+ vezes, criar regra para prevenir.

**P: Posso usar biblioteca X?**  
R: Verificar se já não existe solução com bibliotecas atuais. Se necessário, discutir com time primeiro.
