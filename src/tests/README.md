# Testes do Frontend SGP

Esta pasta contém a suíte completa de testes automatizados para o frontend React + Tauri.

## Estrutura

```
tests/
├── mocks/
│   ├── handlers.ts    # Handlers MSW para mockar API
│   └── server.ts       # Configuração do servidor MSW
├── components/
│   ├── FichaForm.test.tsx
│   ├── ImagemModal.test.tsx
│   └── FechamentoTable.test.tsx
├── hooks/
│   └── useNotifications.test.tsx
├── views/
│   ├── FichasView.test.tsx
│   └── FechamentoView.test.tsx
├── utils/
│   └── pathNormalize.test.ts
├── setup.ts            # Configuração global (MSW, mocks Tauri)
└── test-utils.tsx      # Utilitários de renderização
```

## Executando os Testes

### Instalar dependências

```bash
pnpm install
# ou
npm install
```

### Instalar MSW (se não estiver instalado)

```bash
pnpm add -D msw
```

### Rodar todos os testes

```bash
pnpm test
# ou
npm test
```

### Rodar em modo watch

```bash
pnpm test --watch
```

### Rodar testes específicos

```bash
pnpm test pathNormalize
pnpm test useNotifications
```

## Características

- **MSW (Mock Service Worker)**: Mocka todas as chamadas HTTP
- **Fake Timers**: Usado para testar polling e intervalos
- **Mocks Tauri**: API do Tauri é mockada para rodar em ambiente Node
- **React Testing Library**: Para testes de componentes
- **Vitest**: Framework de testes

## Mocks

### Tauri API

- `@tauri-apps/api/event`: `emit` e `listen` mockados
- `@tauri-apps/api/core`: `invoke` mockado
- `@tauri-apps/api/shell`: `open` mockado

### API HTTP

Todos os endpoints são mockados via MSW:
- `/api/pedidos`
- `/api/notificacoes/ultimos`
- `/api/fichas/:id`

## Notas

- Os testes não dependem da intranet ou API real
- Fake timers são usados para testar polling (useNotifications)
- Componentes são renderizados com providers necessários (BrowserRouter, Toast)
