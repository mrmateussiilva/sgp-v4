# Changelog - SGP v4

## [1.2.3] - 2026-02-05

### 🐛 Corrigido
- **Erro 422 na Criação de Pedidos**: Resolvido erro crítico de validação que impedia a criação de novos pedidos.
  - Campos monetários agora são enviados como strings formatadas (`"0.00"`) em vez de números, conforme esperado pelo backend.
  - Função `convertMonetaryFields` atualizada para usar `formatMonetary(parseMonetary(...))`.
  - Corrigidos valores de fallback em casos especiais (Canga, Impressão 3D).
- **Deduplicação de Itens no Relatório de Fechamentos**: Corrigido bug que causava perda de dados no relatório.
  - Itens com `id=null` agora usam índice como chave alternativa, evitando sobrescrita.
  - Todos os itens de pedidos com múltiplos produtos agora aparecem corretamente.
  - Discrepâncias financeiras causadas por itens faltantes foram eliminadas.
- **Erros de Build TypeScript**: Resolvidos todos os erros de compilação relacionados a tipos monetários.
  - Interfaces `OrderItem`, `CreateOrderItemRequest`, `UpdateOrderItemRequest` e `OrderItemFicha` atualizadas para usar `string`.
  - Mappers de dados (`mapItemFromApi`) ajustados para normalizar valores como strings via `toCurrencyString`.
  - Lógica de criação de fichas de reposição corrigida para usar `"0.00"` em vez de `0`.

### 📚 Documentação
- **Guia de Tipos de Produção**: Adicionada seção completa em `agents.md` documentando:
  - Regras críticas de validação para campos monetários.
  - Todos os 7 tipos de produção suportados (Painel, Totem, Lona, Adesivo, Canga, Impressão 3D, Mochilinha).
  - Guia passo-a-passo para adicionar novos tipos de produção.
  - Bugs comuns e como evitá-los.
  - Checklist completo de implementação.

### 🔧 Melhorado
- **Consistência de Dados**: Sistema agora trata valores monetários de forma uniforme em todas as camadas (API, Mappers, Componentes).
- **Robustez de Validação**: Backend e frontend totalmente sincronizados quanto ao formato esperado de campos monetários.

## [1.2.2] - 2026-02-03

### 🔧 Melhorado
- **Otimização do Dashboard**: Refatoração da lógica de busca de métricas para maior eficiência.
- **Sincronização de Versão**: Atualização global da versão do sistema para 1.2.2.

## [1.2.1] - 2026-02-02

### ✨ Adicionado
- **Relatórios Analíticos Completos**: Implementada a lógica de agrupamento para as combinações Designer × Vendedor e Vendedor × Designer que estavam pendentes no sistema.

### 🐛 Corrigido
- **Cálculo Universal de Quantidade**: Correção crítica no cálculo de subtotais de fechamento. O sistema agora extrai e multiplica corretamente quantidades de qualquer campo de produção (Mochilinhas, Lonas, Painéis, Adesivos, etc.), garantindo precisão total quando a quantidade é maior que um.
- **Processamento Local de Relatórios**: Migração da lógica de geração de fechamentos para o frontend (Client-side), eliminando discrepâncias de arredondamento e erros de cálculo provenientes do banco de dados legado.

## [1.2.0] - 2026-02-02

### ✨ Adicionado
- **Dashboard de Gestão de Produção**: Nova interface completa para monitoramento industrial.
  - **KPI Cards**: Métricas de Volume Total, Taxa de Sucesso, Alertas e Top Máquina.
  - **Gráfico de Volume**: Visualização de barras dos últimos 7 dias via Recharts.
  - **Auto-Refresh (Modo Zap)**: Atualização automática inteligente a cada 1 ou 5 minutos.
  - **Exportação CSV**: Download instantâneo de registros filtrados para Excel/Planilhas.
  - **Filtro de Material**: Novo seletor dinâmico baseado nos insumos utilizados.
- **Limites Flexíveis**: 
  - Backend agora suporta consultas de até 50.000 registros.
  - Seletor de limite na interface (100, 500, 1.000, 5.000, 10.000) para controle total do usuário.

### 🔧 Melhorado
- **Performance de Imagens**: Otimização no carregamento lazy e autenticado de previews de produção.
- **Escalabilidade**: Backend agora utiliza limites e offsets maiores por padrão.

### 🐛 Corrigido
- **Duplicidade de Logs**: Implementada lógica de **Upsert** na troca de máquinas. Atribuir um item a uma nova máquina agora atualiza o log existente em vez de criar um duplicado.
- **Integridade de Dados**: Limpeza automática de registros duplicados legados no banco de dados.

## [1.1.0] - 2026-01-31

### ✨ Adicionado
- **Gestão de Máquinas**: Sistema completo para cadastro e gerenciamento de máquinas de produção (Impressoras, Calandras, etc).
  - Nova interface administrativa para CRUD de máquinas.
  - Endpoint de API dedicado para integração com o backend.
- **Painel de Produção por Máquina**: Nova visualização de "Produção Maquinas" para monitoramento em tempo real do que está sendo produzido em cada equipamento.
- **Novos Formas de Produção**:
  - Implementado suporte para "Mesa de Babado".
  - Refinamento completo do formulário de "Impressão 3D".
- **Componente RemoteImage**: Novo componente para carregamento seguro e otimizado de imagens remotas.
- **Documentação PWA**: Adicionados guias de estilo e implementação para transformar o sistema em um Progressive Web App.

### 🔧 Melhorado
- **Formulários de Acabamento**: Reestruturação dos campos de produção para maior clareza e precisão nos dados técnicos.
- **Fichas de Produção (PDF)**: Melhorias no layout e na organização das informações nas fichas industriais e térmicas.
- **Scroll Area Customizada**: Implementação de scrollbar temática consistente em toda a aplicação.

### 🐛 Corrigido
- **Erros de Build (TypeScript)**: Resolvidos problemas de tipagem nos mappers de pedidos que impediam a compilação.
- **Importações Limpas**: Removidos diversos ícones e componentes importados mas não utilizados (ex: `MonitorPlay`).
- **Persistência de Campos**: Garantido que campos de RIP e Data de Impressão sejam salvos e exibidos corretamente.

## [1.0.20] - 2026-01-27

### ✨ Adicionado
- **Filtro de Pedidos Prontos no Relatório de Envios**: Implementada a funcionalidade de filtrar apenas pedidos com status "Pronto".
  - Novo controle Checkbox na interface de filtros do relatório.
  - Filtragem eficiente realizada no frontend preservando performance original.
  - Integração total com a exportação para PDF e visualização em tela.

### 🔧 Melhorado
- **Persistência de Dados**: Robustecimento do sistema de salvamento e carregamento de acabamentos (Mochilinhas/Bolsinhas).
- **Exibição em Relatórios**: Melhorias na formatação e exibição de acabamentos técnicos.

### 🐛 Corrigido
- **Bug de Zeramento de Valor**: Corrigido conflito que resetava valores unitários em certos fluxos.
- **Erro de Variável**: Resolvido `ReferenceError` no modal de visualização de pedido.

## [1.0.19] - 2026-01-25

### ✨ Adicionado
- **Regra de Negócio de Reposição**: Implementada a funcionalidade de escolha entre manter valores originais ou zerar valores (Cortesia).
  - Novo fluxo de criação de ficha de reposição com diálogo de confirmação.
  - Opção "Cortesia (Zero Vinte)" que zera preços unitários e frete.
  - Adição automática de tag "[REPOSIÇÃO CORTESIA]" nas observações.

### 🎨 UI/UX
- **Redesenho do Modal de Reposição**: Novo layout premium e intuitivo com ícones dinâmicos e destaque para a opção recomendada.
- **Melhoria de Legibilidade**: Ajustes no layout de texto para evitar cortes em descrições longas.

### 🐛 Corrigido
- **Validação de Fichas Zeradas**: Corrigido impedimento que bloqueava o salvamento de pedidos com valor total igual a zero em casos de reposição.

## [1.0.18] - 2026-01-23

### 🎨 UI/UX
- **Refinamento PDF (V2)**: Melhoria completa na hierarquia e legibilidade da ficha industrial.
  - Adição de cabeçalhos de seção destacados com cores neutras.
  - Alinhamento tabular de itens técnicos com larguras fixas.
  - Reorganização do cabeçalho com badges de "REPOSIÇÃO" mais visíveis.
  - Padronização de rótulos operacionais (ENTRADA, ENTREGA, FRETE).

### 📊 Relatórios
- **Relatório de Envios**: Otimização do filtro por data de entrega no frontend.
  - Janela de busca ampliada para capturar pedidos antigos com entregas futuras.
  - Remoção do limite de 20 pedidos por página para relatórios.

## [1.0.17] - 2026-01-22

### 🎨 UI/UX
- **Refinamento PDF**: Melhorias na visibilidade da ficha de produção.
  - Aumento da fonte de detalhes técnicos para 16pt com maior espaçamento.
  - Adição de marcadores (bullet points) na lista de acabamentos.
  - Remoção da informação de M² por redundância.
  - Aumento e destaque das informações de contato e localização do cliente.

## [1.0.16] - 2026-01-21

### 🎨 UI/UX
- **Layout PDF**: Ajustes e melhorias na estrutura de visualização e impressão de pedidos.

## [1.0.15] - 2026-01-20

### 🎨 UI/UX
- **Refinamento Admin & Sidebar**: Reestruturação completa seguindo estilo ERP funcional.
  - Sidebar organizada em blocos lógicos: **OPERACIONAL**, **GESTÃO** e **SISTEMA**.
  - Admin redesenhado como índice de atalhos compactos e horizontais.
  - Otimização de densidade, alinhamento de ícones e largura de layout (max-w-5xl).
- **Linguagem Operacional**: Revisão de labels para um tom mais direto e objetivo.

### 🔄 Updater (Sistema de Atualização)
- **Robustez na Busca**: Adição de `User-Agent` e sistema de fallback automático.
  - Fallback automático para `CHANGELOG.md` bruto caso a Release do GitHub esteja vazia ou inacessível.
- **Extração Inteligente**: Melhoria na resiliência do processamento de markdown no frontend.

### 🐛 Corrigido
- **Build Errors**: Removidos imports não utilizados em `PainelDesempenho.tsx` que bloqueavam o build.
- **Rust Backend**: Corrigido erro de escopo de macro (`warn!`) no gerenciador de atualizações.

## [1.0.14] - 2026-01-18

### ✨ Adicionado
- **Pipeline de Produção**: Nova visualização linear e sequencial para gestão do fluxo de trabalho.
  - Substituição do Quadro Kanban por um Pipeline corporativo robusto.
  - Funcionalidade nativa de Arrastar e Soltar (Drag & Drop).
  - Cards enriquecidos com dados de entrega, urgência, vendedor e envio.
- **Restrição de Acesso**: Visão de Pipeline restrita exclusivamente para usuários Administradores.

### 🔧 Melhorado
- **Estabilidade do Logout**: Otimização do processo de saída para evitar telas de erro de conexão e tratamento robusto de respostas vazias no adaptador Tauri.
- **Visibilidade de Modais**: Unificação da lógica de renderização para garantir que todos os diálogos de ação funcionem em qualquer visualização.
- **UI Premium**: Restauração de componentes Shadcn e efeitos de micro-interação (hover) nos cards de produção.

## [1.0.12] - 2026-01-16

### ✨ Adicionado
- **Tela de Changelog após Atualização**: Agora após uma atualização ser instalada, o sistema exibe automaticamente um modal com todas as mudanças da nova versão
  - Busca o CHANGELOG.md diretamente do repositório
  - Extrai automaticamente apenas a seção da versão instalada
  - Interface moderna e responsiva com renderização de markdown

### 🔧 Melhorado
- Sistema de atualização agora salva a versão anterior antes de reiniciar
- Detecção automática de atualização ao iniciar o aplicativo

## [1.0.2] - 2025-10-14

### 🐛 Corrigido
- **Erro de autenticação**: Corrigidos hashes bcrypt das senhas de teste
  - Usuários agora usam pgcrypto do PostgreSQL para gerar hashes compatíveis
  - Senhas atualizadas no banco de dados existente
  - `init.sql` atualizado para gerar hashes corretos automaticamente

### 🔧 Melhorado
- `init.sql`: Agora usa `pgcrypto` para gerar hashes bcrypt diretamente no PostgreSQL
- Hashes mais compatíveis entre PostgreSQL e Rust bcrypt

## [1.0.1] - 2025-10-14

### 🐳 Adicionado
- **Suporte completo ao Docker** para PostgreSQL
  - `docker-compose.yml` configurado com PostgreSQL 15 Alpine
  - PgAdmin opcional via profile
  - Volume persistente para dados
  - Healthcheck automático
  - Scripts NPM para facilitar uso do Docker

### 📝 Documentação
- `DOCKER.md` - Guia completo sobre uso do Docker
- `QUICKSTART.md` - Guia de início rápido em 2 minutos
- `database/README.md` - Documentação dos scripts SQL
- `database/migrate_timestamps.sql` - Script de migração
- Atualizações no `README.md` com instruções Docker
- Seção sobre Docker no `TROUBLESHOOTING.md`

### 🔧 Scripts NPM
- `npm run docker:up` - Iniciar banco de dados
- `npm run docker:down` - Parar banco de dados
- `npm run docker:logs` - Ver logs em tempo real
- `npm run docker:reset` - Resetar banco (apaga dados)
- `npm run docker:pgadmin` - Iniciar com interface web
- `npm run db:psql` - Acessar PostgreSQL via terminal

### 🐛 Corrigido
- **Erro de tipo TIMESTAMP**: Corrigido incompatibilidade entre `TIMESTAMP` e `TIMESTAMPTZ`
  - Alterado `init.sql` para usar `TIMESTAMPTZ`
  - Criado script de migração para bancos existentes
  - Documentado solução no guia de troubleshooting

- **Erro de ícones Tauri**: Removidos ícones PNG incompatíveis da configuração
  - Mantidos apenas ícones `.icns` e `.ico`
  - Configuração atualizada em `tauri.conf.json`

### 🔄 Alterado
- `docker-compose.yml`: Removido `version` obsoleto
- `.gitignore`: Já protegia corretamente arquivos `.env`
- Estrutura de documentação reorganizada

### 📦 Arquivos Criados
```
docker-compose.yml           # Configuração Docker
src-tauri/.env.example       # Template de configuração
.dockerignore                # Otimização Docker
DOCKER.md                    # Guia Docker
QUICKSTART.md               # Início rápido
database/README.md          # Docs dos scripts SQL
database/migrate_timestamps.sql  # Script de migração
```

### ✅ Validações
- ✅ PostgreSQL rodando no Docker (porta 5432)
- ✅ Banco `sgp_database` criado automaticamente
- ✅ Tabelas com tipos corretos (`TIMESTAMPTZ`)
- ✅ Dados de teste carregados
- ✅ Conexão Rust/SQLx funcional
- ✅ Arquivo `.env` configurado

## [1.0.0] - 2025-10-14

### Lançamento Inicial
- Sistema de Gerenciamento de Pedidos desktop
- Frontend: React + TypeScript + Material-UI
- Backend: Tauri (Rust) + PostgreSQL
- Autenticação com bcrypt
- CRUD completo de pedidos
- Exportação para PDF e CSV
- Testes unitários com Vitest

