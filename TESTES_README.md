# 📋 Suíte Completa de Testes Automatizados - SGP

Esta documentação descreve a suíte completa de testes automatizados criada para o projeto SGP, cobrindo tanto o backend Python quanto o frontend React + Tauri.

## 🎯 Objetivo

Garantir estabilidade, evitar regressões e impedir que bugs já reportados pelo user tester voltem a acontecer.

## 📁 Estrutura de Testes

### Backend (Python)

Localização: `/home/mateus/Projetcs/api-sgp/tests/`

```
tests/
├── __init__.py
├── conftest.py              # Fixtures globais (SQLite em memória, cliente HTTP)
├── test_pedidos.py          # Testes de criação, listagem, filtros de pedidos
├── test_notificacoes.py     # Testes de notificações (ultimo_id, timestamp)
├── test_validacoes.py       # Testes de validação de campos
└── README.md                # Documentação dos testes do backend
```

### Frontend (React + Tauri)

Localização: `/home/mateus/Projetcs/Testes/sgp_v4/src/tests/`

```
src/tests/
├── mocks/
│   ├── handlers.ts          # Handlers MSW para mockar API
│   └── server.ts            # Configuração do servidor MSW
├── components/
│   ├── FichaForm.test.tsx           # Testes do FormPainelCompleto
│   ├── ImagemModal.test.tsx         # Testes do modal de imagem
│   └── FechamentoTable.test.tsx     # Testes da tabela de fechamentos
├── hooks/
│   └── useNotifications.test.tsx   # Testes do hook de notificações
├── views/
│   ├── FichasView.test.tsx          # Testes da view de fichas
│   └── FechamentoView.test.tsx      # Testes da view de fechamentos
├── utils/
│   └── pathNormalize.test.ts        # Testes de normalização de paths
├── setup.ts                 # Configuração global (MSW, mocks Tauri)
├── test-utils.tsx           # Utilitários de renderização
└── README.md                # Documentação dos testes do frontend
```

## 🚀 Como Executar

### Backend

```bash
cd /home/mateus/Projetcs/api-sgp

# Instalar dependências (se necessário)
pip install -r requirements.txt

# Rodar todos os testes
pytest tests/

# Rodar testes específicos
pytest tests/test_pedidos.py
pytest tests/test_notificacoes.py -v

# Com coverage
pytest tests/ --cov=. --cov-report=html
```

### Frontend

```bash
cd /home/mateus/Projetcs/Testes/sgp_v4

# Instalar dependências (incluindo MSW)
pnpm install

# Rodar todos os testes
pnpm test

# Rodar em modo watch
pnpm test --watch

# Rodar testes específicos
pnpm test pathNormalize
pnpm test useNotifications
```

## ✅ Testes Implementados

### Backend

#### test_pedidos.py
- ✅ Criação de pedido com sucesso
- ✅ Incremento de ULTIMO_PEDIDO_ID
- ✅ IDs sequenciais crescentes
- ✅ Listagem de pedidos
- ✅ Filtro por nome do cliente
- ✅ Filtro por data de entrada
- ✅ Filtro por status
- ✅ Obter pedido por ID
- ✅ Atualização de pedido
- ✅ Deleção de pedido
- ✅ Pedidos com items complexos (acabamento)

#### test_notificacoes.py
- ✅ Retorna ultimo_id correto
- ✅ ultimo_id muda após criar pedido
- ✅ Timestamp válido (ISO8601)
- ✅ Incremento sequencial

#### test_validacoes.py
- ✅ Validação de campos obrigatórios
- ✅ Validação de datas inválidas
- ✅ Validação de filtros (data_inicio > data_fim)
- ✅ Erros ao atualizar/deletar pedido inexistente
- ✅ Valores padrão aplicados corretamente

### Frontend

#### useNotifications.test.tsx
- ✅ Polling a cada 5s (com fake timers)
- ✅ Detecção de novo pedido (ultimo_id muda)
- ✅ Emite evento "novo_pedido"
- ✅ Não emite evento se ultimo_id não mudou
- ✅ Não quebra app se API falhar
- ✅ Não inicia polling se API não configurada

#### FichaForm.test.tsx (FormPainelCompleto)
- ✅ Renderiza campos obrigatórios
- ✅ Chama onDataChange quando campo alterado
- ✅ Desativa campo desconto quando descontoAtivo=false
- ✅ Valida campos obrigatórios
- ✅ Calcula valores corretamente
- ✅ Permite selecionar vendedor

#### ImagemModal.test.tsx
- ✅ Abre modal corretamente
- ✅ Modal NÃO fecha sozinho
- ✅ Normaliza path Linux → Windows
- ✅ Exibe placeholder quando arquivo não existe
- ✅ Fecha modal quando botão X é clicado

#### FechamentoTable.test.tsx
- ✅ Renderiza dados do relatório
- ✅ Aplica filtro por nome
- ✅ Renderiza totais corretamente
- ✅ Não quebra com dados vazios
- ✅ Aplica filtros de data

#### pathNormalize.test.ts
- ✅ Retorna string vazia para path inválido
- ✅ Preserva base64 images
- ✅ Preserva URLs HTTP/HTTPS
- ✅ Normaliza separadores Windows para Unix
- ✅ Remove espaços extras
- ✅ Valida paths corretamente

#### FichasView.test.tsx
- ✅ Renderiza lista inicial
- ✅ Exibe mensagem quando lista vazia
- ✅ Atualiza ao criar novo pedido

#### FechamentoView.test.tsx
- ✅ Renderiza view de fechamentos
- ✅ Aplica filtros corretamente
- ✅ Calcula totais corretamente

## 🔧 Tecnologias Utilizadas

### Backend
- **pytest**: Framework de testes
- **pytest-asyncio**: Suporte a testes assíncronos
- **httpx**: Cliente HTTP para testes
- **SQLite em memória**: Banco isolado para cada teste

### Frontend
- **Vitest**: Framework de testes
- **React Testing Library**: Testes de componentes React
- **MSW (Mock Service Worker)**: Mock de chamadas HTTP
- **jsdom**: Ambiente DOM para testes

## 🎨 Características Principais

### Backend
- ✅ Banco SQLite em memória (isolado por teste)
- ✅ Fixtures automáticas (engine, session, client)
- ✅ Limpeza automática do banco entre testes
- ✅ Testes assíncronos completos
- ✅ Não depende de intranet ou banco real

### Frontend
- ✅ MSW mocka todas as chamadas HTTP
- ✅ Fake timers para testar polling
- ✅ Mocks completos da API Tauri
- ✅ Providers globais (BrowserRouter, Toast)
- ✅ Testes isolados e independentes

## 📝 Notas Importantes

1. **Não altera código de produção**: Todos os testes foram criados sem modificar a arquitetura existente
2. **Isolamento**: Cada teste é independente e não interfere nos outros
3. **Mocks completos**: Tanto backend quanto frontend usam mocks para não depender de serviços externos
4. **Cobertura**: Testes cobrem os principais fluxos e bugs reportados

## 🐛 Bugs Testados (Prevenção de Regressão)

- ✅ Modal de imagem não fecha sozinho
- ✅ Normalização de paths Linux/Windows
- ✅ Polling de notificações funciona corretamente
- ✅ Validação de campos obrigatórios
- ✅ Filtros de fechamentos funcionam
- ✅ Reabertura de fichas concluídas
- ✅ Campos desativados quando necessário

## 📚 Documentação Adicional

- `api-sgp/tests/README.md`: Documentação detalhada dos testes do backend
- `src/tests/README.md`: Documentação detalhada dos testes do frontend

## 🔄 Próximos Passos (Opcional)

1. Configurar GitHub Actions para rodar testes automaticamente
2. Adicionar coverage reports
3. Adicionar mais testes de edge cases
4. Testes de integração end-to-end

---

**Criado em**: 2024  
**Status**: ✅ Completo e funcional

