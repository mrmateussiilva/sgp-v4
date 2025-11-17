# 📋 Plano de Redefinição do Sistema de Atualização de Fichas

## 📊 Análise do Sistema Atual

### Estado Atual
1. **Geração de Fichas:**
   - Fichas são geradas sob demanda quando o usuário clica em "Ficha de Serviço"
   - Uma ficha é gerada por item do pedido
   - Componente `FichaDeServico.tsx` renderiza a ficha
   - `printOrderServiceForm.ts` gera HTML para impressão
   - Dados são buscados via `api.getOrderFicha(orderId)`

2. **Estrutura de Dados:**
   - `OrderFicha` - Interface principal da ficha
   - `OrderItemFicha` - Interface dos itens da ficha
   - Fichas são derivadas de `OrderWithItems`

3. **Fluxo Atual:**
   ```
   Usuário clica "Ficha de Serviço" 
   → Carrega dados do pedido via API
   → Renderiza componente FichaDeServico
   → Usuário pode imprimir
   ```

### Problemas Identificados

1. **❌ Sem Cache:**
   - Fichas são geradas toda vez que solicitadas
   - Não há armazenamento local de fichas geradas
   - Performance pode ser afetada com muitos pedidos

2. **❌ Sem Sincronização:**
   - Fichas não são atualizadas automaticamente quando pedido muda
   - Usuário pode ver ficha desatualizada
   - Não há notificação de mudanças

3. **❌ Sem Versionamento:**
   - Não há histórico de versões de fichas
   - Não é possível ver versões anteriores
   - Não há rastreamento de mudanças

4. **❌ Sem Validação:**
   - Não há verificação se ficha está atualizada
   - Não há alertas de dados inconsistentes
   - Não há validação de integridade

5. **❌ Sem Integração em Tempo Real:**
   - Não usa WebSocket para atualizações
   - Mudanças em outros clientes não refletem na ficha
   - Sincronização manual necessária

---

## 🎯 Objetivos da Redefinição

### Objetivos Principais
1. ✅ **Sistema de Cache Inteligente**
   - Cache local de fichas geradas
   - Invalidação automática quando pedido muda
   - Cache persistente (localStorage/IndexedDB)

2. ✅ **Atualização Automática**
   - Detecção de mudanças no pedido
   - Atualização automática de fichas em cache
   - Notificações de atualizações

3. ✅ **Versionamento e Histórico**
   - Histórico de versões de fichas
   - Comparação entre versões
   - Timestamp de cada versão

4. ✅ **Integração em Tempo Real**
   - WebSocket para atualizações instantâneas
   - Sincronização multi-usuário
   - Notificações de mudanças

5. ✅ **Validação e Integridade**
   - Validação de dados antes de gerar ficha
   - Verificação de consistência
   - Alertas de dados faltantes

---

## 🏗️ Arquitetura Proposta

### 1. Camada de Dados (Data Layer)

#### 1.1 Store de Fichas (FichaStore)
```typescript
interface FichaState {
  // Cache de fichas
  fichasCache: Map<number, CachedFicha>;
  
  // Histórico de versões
  fichaVersions: Map<number, FichaVersion[]>;
  
  // Estado de sincronização
  syncStatus: Map<number, SyncStatus>;
  
  // Métodos
  getFicha(orderId: number): Promise<OrderFicha>;
  invalidateFicha(orderId: number): void;
  updateFicha(orderId: number, ficha: OrderFicha): void;
  getFichaVersions(orderId: number): FichaVersion[];
  compareVersions(orderId: number, version1: number, version2: number): DiffResult;
}
```

#### 1.2 Estruturas de Dados
```typescript
interface CachedFicha {
  orderId: number;
  ficha: OrderFicha;
  version: number;
  generatedAt: Date;
  lastUpdated: Date;
  hash: string; // Hash para detectar mudanças
  isValid: boolean;
}

interface FichaVersion {
  version: number;
  orderId: number;
  ficha: OrderFicha;
  timestamp: Date;
  changedBy?: string;
  changes?: string[]; // Lista de campos alterados
  hash: string;
}

interface SyncStatus {
  orderId: number;
  isSyncing: boolean;
  lastSync: Date | null;
  hasPendingChanges: boolean;
  error?: string;
}
```

### 2. Camada de Serviços (Service Layer)

#### 2.1 FichaService
```typescript
class FichaService {
  // Geração
  generateFicha(orderId: number): Promise<OrderFicha>;
  generateFichaFromOrder(order: OrderWithItems): OrderFicha;
  
  // Cache
  getCachedFicha(orderId: number): CachedFicha | null;
  cacheFicha(orderId: number, ficha: OrderFicha): void;
  invalidateCache(orderId: number): void;
  clearCache(): void;
  
  // Validação
  validateFicha(ficha: OrderFicha): ValidationResult;
  checkFichaIntegrity(orderId: number): IntegrityCheck;
  
  // Versionamento
  createVersion(orderId: number, ficha: OrderFicha): FichaVersion;
  getVersions(orderId: number): FichaVersion[];
  compareVersions(v1: FichaVersion, v2: FichaVersion): DiffResult;
  
  // Sincronização
  syncFicha(orderId: number): Promise<void>;
  markAsChanged(orderId: number): void;
}
```

#### 2.2 FichaSyncService
```typescript
class FichaSyncService {
  // WebSocket
  subscribeToOrderChanges(orderId: number): () => void;
  handleOrderUpdate(orderId: number, changes: OrderChanges): void;
  
  // Sincronização
  syncOnOrderUpdate(orderId: number): Promise<void>;
  batchSync(orderIds: number[]): Promise<void>;
  
  // Notificações
  notifyFichaUpdated(orderId: number, version: number): void;
  notifyFichaInvalidated(orderId: number, reason: string): void;
}
```

### 3. Camada de UI (UI Layer)

#### 3.1 Componentes
```typescript
// Componente principal melhorado
<FichaDeServico 
  orderId={number}
  autoUpdate={boolean}
  showVersionHistory={boolean}
  onUpdate={callback}
/>

// Indicador de status
<FichaStatusIndicator 
  orderId={number}
  showSyncStatus={boolean}
/>

// Histórico de versões
<FichaVersionHistory 
  orderId={number}
  onVersionSelect={callback}
/>

// Comparador de versões
<FichaVersionDiff 
  orderId={number}
  version1={number}
  version2={number}
/>
```

---

## 🔄 Fluxos Propostos

### Fluxo 1: Geração de Ficha (Primeira Vez)
```
1. Usuário solicita ficha
2. Verifica cache local
3. Se não existe no cache:
   a. Busca pedido via API
   b. Valida dados do pedido
   c. Gera ficha
   d. Calcula hash
   e. Salva no cache
   f. Cria versão inicial
   g. Retorna ficha
4. Se existe no cache:
   a. Verifica se está válida (hash)
   b. Se válida, retorna do cache
   c. Se inválida, regenera (passo 3)
```

### Fluxo 2: Atualização Automática
```
1. Pedido é atualizado (via WebSocket ou ação do usuário)
2. FichaSyncService detecta mudança
3. Marca ficha como inválida no cache
4. Notifica componentes que usam a ficha
5. Se ficha está aberta:
   a. Mostra notificação de atualização disponível
   b. Usuário pode atualizar manualmente ou automático
6. Gera nova versão da ficha
7. Salva no cache e histórico
8. Atualiza UI
```

### Fluxo 3: Sincronização em Tempo Real
```
1. WebSocket recebe evento de mudança no pedido
2. FichaSyncService identifica pedido afetado
3. Verifica se ficha está em cache
4. Se está em cache:
   a. Compara hash atual com novo hash
   b. Se diferente, invalida cache
   c. Notifica usuário
5. Se ficha está aberta:
   a. Pergunta se deseja atualizar
   b. Ou atualiza automaticamente (configurável)
```

### Fluxo 4: Versionamento
```
1. Toda vez que ficha é gerada/atualizada:
   a. Cria nova versão
   b. Calcula hash
   c. Identifica campos alterados (diff)
   d. Salva no histórico
2. Histórico mantém últimas N versões (configurável)
3. Versões antigas podem ser visualizadas
4. Comparação entre versões disponível
```

---

## 📦 Estrutura de Arquivos Proposta

```
src/
├── store/
│   └── fichaStore.ts          # Zustand store para fichas
│
├── services/
│   ├── fichaService.ts        # Serviço principal de fichas
│   ├── fichaSyncService.ts    # Serviço de sincronização
│   └── fichaValidationService.ts # Validação de fichas
│
├── hooks/
│   ├── useFicha.ts            # Hook principal para fichas
│   ├── useFichaSync.ts        # Hook para sincronização
│   ├── useFichaVersions.ts    # Hook para versionamento
│   └── useFichaCache.ts       # Hook para cache
│
├── components/
│   ├── ficha/
│   │   ├── FichaDeServico.tsx        # Componente principal (melhorado)
│   │   ├── FichaStatusIndicator.tsx # Indicador de status
│   │   ├── FichaVersionHistory.tsx   # Histórico de versões
│   │   ├── FichaVersionDiff.tsx      # Comparador de versões
│   │   ├── FichaUpdateNotification.tsx # Notificação de atualização
│   │   └── FichaCacheManager.tsx     # Gerenciador de cache (admin)
│   │
│   └── ... (componentes existentes)
│
├── utils/
│   ├── ficha/
│   │   ├── fichaGenerator.ts         # Geração de fichas
│   │   ├── fichaHasher.ts            # Cálculo de hash
│   │   ├── fichaDiff.ts              # Comparação de fichas
│   │   ├── fichaValidator.ts         # Validação
│   │   └── fichaCache.ts             # Gerenciamento de cache
│   │
│   └── ... (utils existentes)
│
└── types/
    └── ficha.ts               # Tipos relacionados a fichas
```

---

## 🔧 Implementação Detalhada

### Fase 1: Fundação (Semanas 1-2)

#### 1.1 Criar Store de Fichas
- [ ] Implementar `fichaStore.ts` com Zustand
- [ ] Estruturas de dados: `CachedFicha`, `FichaVersion`, `SyncStatus`
- [ ] Métodos básicos: get, set, invalidate, clear

#### 1.2 Criar FichaService
- [ ] Método `generateFicha()` - geração de fichas
- [ ] Método `validateFicha()` - validação básica
- [ ] Método `calculateHash()` - hash para detecção de mudanças
- [ ] Integração com API existente

#### 1.3 Sistema de Cache
- [ ] Cache em memória (Map)
- [ ] Cache persistente (localStorage/IndexedDB)
- [ ] Estratégia de invalidação
- [ ] Limpeza automática de cache antigo

### Fase 2: Versionamento (Semanas 3-4)

#### 2.1 Sistema de Versões
- [ ] Estrutura de versionamento
- [ ] Criação automática de versões
- [ ] Armazenamento de histórico
- [ ] Limite de versões mantidas

#### 2.2 Comparação de Versões
- [ ] Algoritmo de diff entre versões
- [ ] Identificação de campos alterados
- [ ] Visualização de diferenças
- [ ] Componente de comparação

### Fase 3: Sincronização (Semanas 5-6)

#### 3.1 FichaSyncService
- [ ] Integração com WebSocket
- [ ] Detecção de mudanças em pedidos
- [ ] Invalidação automática de cache
- [ ] Notificações de atualização

#### 3.2 Atualização Automática
- [ ] Lógica de atualização em background
- [ ] Atualização sob demanda
- [ ] Configurações de atualização (auto/manual)
- [ ] Indicadores visuais de status

### Fase 4: UI e UX (Semanas 7-8)

#### 4.1 Componentes Melhorados
- [ ] Refatorar `FichaDeServico.tsx`
- [ ] Adicionar indicadores de status
- [ ] Notificações de atualização
- [ ] Botões de ação (atualizar, ver histórico, etc.)

#### 4.2 Histórico de Versões
- [ ] Componente de histórico
- [ ] Visualização de versões
- [ ] Comparação visual
- [ ] Restauração de versões

### Fase 5: Validação e Integridade (Semanas 9-10)

#### 5.1 Validação Avançada
- [ ] Validação de dados obrigatórios
- [ ] Verificação de consistência
- [ ] Alertas de dados faltantes
- [ ] Sugestões de correção

#### 5.2 Integridade
- [ ] Verificação de hash
- [ ] Detecção de corrupção
- [ ] Recuperação automática
- [ ] Logs de integridade

### Fase 6: Otimização e Testes (Semanas 11-12)

#### 6.1 Performance
- [ ] Otimização de cache
- [ ] Lazy loading de versões
- [ ] Debounce em atualizações
- [ ] Memoização de componentes

#### 6.2 Testes
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes de performance
- [ ] Testes de sincronização

---

## 🎨 Melhorias de UX Propostas

### 1. Indicadores Visuais
- **Badge de Status:**
  - 🟢 Atualizada
  - 🟡 Desatualizada (atualização disponível)
  - 🔴 Erro (precisa regenerar)
  - ⚪ Carregando

### 2. Notificações
- **Toast quando ficha é atualizada:**
  - "Ficha #123 foi atualizada"
  - Botão "Ver mudanças"
  
- **Notificação quando pedido muda:**
  - "O pedido #123 foi modificado. Deseja atualizar a ficha?"
  - Botões: "Atualizar Agora" | "Mais Tarde"

### 3. Histórico de Versões
- **Timeline visual:**
  - Versões ordenadas por data
  - Indicador de versão atual
  - Preview de cada versão
  - Botão de comparação

### 4. Comparação de Versões
- **Diff visual:**
  - Campos alterados destacados
  - Valores antigos vs novos
  - Side-by-side ou unified diff
  - Export de diff

---

## ⚙️ Configurações Propostas

### Configurações do Usuário
```typescript
interface FichaSettings {
  // Atualização automática
  autoUpdate: boolean;
  autoUpdateInterval: number; // minutos
  
  // Cache
  cacheEnabled: boolean;
  cacheMaxSize: number; // número de fichas
  cacheTTL: number; // horas
  
  // Versionamento
  maxVersions: number;
  versionHistoryEnabled: boolean;
  
  // Notificações
  notifyOnUpdate: boolean;
  notifyOnChange: boolean;
  
  // Sincronização
  syncOnWebSocket: boolean;
  syncOnFocus: boolean;
}
```

---

## 🔐 Segurança e Performance

### Segurança
- [ ] Validação de permissões para acessar fichas
- [ ] Sanitização de dados antes de exibir
- [ ] Proteção contra XSS em dados da ficha
- [ ] Logs de acesso a fichas

### Performance
- [ ] Cache inteligente (LRU)
- [ ] Lazy loading de versões antigas
- [ ] Debounce em atualizações frequentes
- [ ] Web Workers para geração de hash
- [ ] Virtualização de listas de versões

---

## 📊 Métricas e Monitoramento

### Métricas a Rastrear
- Tempo de geração de ficha
- Taxa de cache hit/miss
- Frequência de atualizações
- Número de versões por ficha
- Erros de validação
- Tempo de sincronização

### Logs
- Geração de fichas
- Invalidações de cache
- Atualizações via WebSocket
- Erros de validação
- Acessos a versões antigas

---

## 🚀 Migração do Sistema Atual

### Estratégia de Migração
1. **Fase de Coexistência:**
   - Novo sistema roda paralelo ao antigo
   - Feature flag para ativar novo sistema
   - Testes A/B

2. **Migração Gradual:**
   - Migrar componente por componente
   - Manter compatibilidade com código antigo
   - Rollback fácil se necessário

3. **Migração de Dados:**
   - Converter fichas existentes para novo formato
   - Criar versões iniciais para fichas antigas
   - Validar integridade após migração

---

## 📝 Checklist de Implementação

### Pré-requisitos
- [ ] Definir estrutura de dados final
- [ ] Aprovar arquitetura proposta
- [ ] Configurar ambiente de desenvolvimento
- [ ] Criar branch de desenvolvimento

### Fase 1: Fundação
- [ ] Store de fichas
- [ ] FichaService básico
- [ ] Sistema de cache
- [ ] Testes unitários

### Fase 2: Versionamento
- [ ] Sistema de versões
- [ ] Comparação de versões
- [ ] Histórico de versões
- [ ] Testes de versionamento

### Fase 3: Sincronização
- [ ] FichaSyncService
- [ ] Integração WebSocket
- [ ] Atualização automática
- [ ] Testes de sincronização

### Fase 4: UI/UX
- [ ] Componentes melhorados
- [ ] Indicadores visuais
- [ ] Notificações
- [ ] Testes de UI

### Fase 5: Validação
- [ ] Validação avançada
- [ ] Verificação de integridade
- [ ] Alertas e sugestões
- [ ] Testes de validação

### Fase 6: Finalização
- [ ] Otimizações
- [ ] Testes completos
- [ ] Documentação
- [ ] Deploy

---

## 🎯 Resultados Esperados

### Benefícios Imediatos
- ✅ Fichas carregam mais rápido (cache)
- ✅ Fichas sempre atualizadas (sincronização)
- ✅ Histórico de mudanças (versionamento)
- ✅ Melhor UX (notificações, indicadores)

### Benefícios de Longo Prazo
- ✅ Escalabilidade (cache reduz carga no servidor)
- ✅ Rastreabilidade (histórico completo)
- ✅ Confiabilidade (validação e integridade)
- ✅ Manutenibilidade (código organizado)

---

## ❓ Questões para Decisão

1. **Cache Persistente:**
   - Usar localStorage ou IndexedDB?
   - Qual tamanho máximo de cache?
   - Estratégia de limpeza?

2. **Versionamento:**
   - Quantas versões manter por ficha?
   - Versões ilimitadas ou limitadas?
   - Compactação de versões antigas?

3. **Atualização Automática:**
   - Sempre automática ou com confirmação?
   - Atualizar em background ou foreground?
   - Estratégia quando usuário está editando?

4. **WebSocket:**
   - Atualizar todas as fichas ou apenas abertas?
   - Debounce em atualizações rápidas?
   - Fallback se WebSocket falhar?

5. **Performance:**
   - Limite de fichas em cache?
   - Lazy loading de versões?
   - Web Workers para processamento pesado?

---

## 📚 Referências e Padrões

### Padrões de Design
- **Observer Pattern:** Para notificações de atualização
- **Strategy Pattern:** Para diferentes estratégias de cache
- **Factory Pattern:** Para geração de fichas
- **Singleton Pattern:** Para serviços globais

### Bibliotecas Sugeridas
- **Zustand:** Store (já em uso)
- **immer:** Para imutabilidade
- **date-fns:** Para manipulação de datas
- **diff-match-patch:** Para comparação de textos
- **crypto-js:** Para hash (ou Web Crypto API)

---

**Última atualização:** $(date)
**Versão do plano:** 1.0
**Status:** 📋 Planejamento Completo - Aguardando Aprovação

