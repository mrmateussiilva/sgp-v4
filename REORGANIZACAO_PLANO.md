# Plano de Reorganização do Frontend

## Estrutura Proposta

```
src/
├── components/
│   ├── ui/                    # Componentes UI base (mantém como está)
│   ├── orders/                # Componentes relacionados a pedidos
│   │   ├── OrderList.tsx
│   │   ├── OrderForm.tsx
│   │   ├── OrderDetails.tsx
│   │   ├── OrderViewModal.tsx
│   │   ├── OrderQuickEditDialog.tsx
│   │   ├── OrderKanbanBoard.tsx
│   │   ├── OrderHistory.tsx
│   │   ├── OrderPrintManager.tsx
│   │   └── CreateOrderComplete.tsx
│   ├── clients/                # Componentes relacionados a clientes
│   │   └── ClienteAutocomplete.tsx
│   ├── production/             # Componentes de produção
│   │   ├── FormAdesivoProducao.tsx
│   │   ├── FormLonaProducao.tsx
│   │   ├── FormPainelCompleto.tsx
│   │   ├── FormTotemProducao.tsx
│   │   ├── FichaDeServico.tsx
│   │   ├── FichaDeServicoButton.tsx
│   │   ├── FichaDeServicoEditor.tsx
│   │   └── FichaDeServicoIntegrationExample.tsx
│   ├── forms/                  # Componentes de formulário reutilizáveis
│   │   ├── SelectDesigner.tsx
│   │   ├── SelectVendedor.tsx
│   │   └── PedidoForm.tsx
│   ├── analytics/              # Componentes de analytics (mantém como está)
│   ├── layout/                 # Componentes de layout
│   │   ├── DashboardMenuItem.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── ThemeToggle.tsx
│   ├── status/                 # Componentes de status/indicadores
│   │   ├── ConnectionStatus.tsx
│   │   ├── AutoRefreshStatus.tsx
│   │   ├── BroadcastStatusPanel.tsx
│   │   ├── EditingIndicator.tsx
│   │   └── SmoothTableWrapper.tsx
│   ├── pdf/                    # Componentes PDF (mantém como está)
│   └── debug/                  # Componentes de debug/teste
│       ├── EventTestPanel.tsx
│       ├── TauriEventTest.tsx
│       └── NotificationDebugPanel.tsx
│
├── utils/
│   ├── images/                 # Utilitários de imagem
│   │   ├── imageLoader.ts
│   │   ├── imageResizer.ts
│   │   ├── imageUploader.ts
│   │   ├── imageUploadHelper.ts
│   │   ├── imagePreview.ts
│   │   └── localImageManager.ts
│   ├── pdf/                    # Utilitários de PDF
│   │   ├── pdfGenerator.ts
│   │   ├── pdfReportAdapter.ts
│   │   └── reactPdfPrinter.ts
│   ├── print/                  # Utilitários de impressão
│   │   ├── printOrder.ts
│   │   ├── printOrderServiceForm.ts
│   │   └── printTemplate.ts
│   ├── reports/                # Utilitários de relatórios
│   │   ├── fechamentoReport.ts
│   │   └── exportUtils.ts
│   └── core/                   # Utilitários core
│       ├── config.ts
│       ├── date.ts
│       ├── logger.ts
│       ├── path.ts
│       ├── cache.ts
│       ├── errorHandler.ts
│       ├── alert.ts
│       ├── isTauri.ts
│       ├── devtools.ts
│       └── manifestUrl.ts
│
├── hooks/
│   ├── orders/                 # Hooks relacionados a pedidos
│   │   ├── useOrderEvents.ts
│   │   └── useEditingTracker.ts
│   ├── notifications/         # Hooks de notificações
│   │   ├── useNotifications.ts
│   │   ├── useRealtimeNotifications.ts
│   │   └── notificationManager.ts
│   └── core/                   # Hooks core
│       ├── use-toast.ts
│       ├── useAutoRefresh.ts
│       ├── useAutoUpdateCheck.tsx
│       ├── useDebounce.ts
│       ├── useKeyboardShortcuts.ts
│       ├── useGlobalBroadcast.ts
│       └── useUser.ts
│
├── services/                   # Mantém como está
├── store/                      # Mantém como está
├── types/                      # Mantém como está
├── pages/                      # Mantém como está
├── contexts/                   # Mantém como está
├── lib/                        # Mantém como está
└── mappers/                    # Mantém como está
```

## Mudanças Principais

1. **Componentes agrupados por domínio**: orders, clients, production, forms, etc.
2. **Utils organizados por funcionalidade**: images, pdf, print, reports, core
3. **Hooks agrupados por domínio**: orders, notifications, core
4. **Componentes de debug separados**: pasta debug/ para não poluir produção
5. **Layout separado**: componentes de layout em pasta própria

## Ordem de Execução

1. Criar estrutura de pastas
2. Mover arquivos
3. Atualizar imports
4. Testar compilação
5. Commit

