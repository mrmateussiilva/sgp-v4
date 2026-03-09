# Changelog - SGP v4

## [1.3.3] - 2026-03-08

### ✨ Melhorias
- **Salvar Pedido apenas com itens salvos**: Na tela de criação/edição de pedidos, o botão "Salvar Pedido" só fica habilitado quando não há nenhum item com mudanças não salvas. Quando desabilitado, um tooltip exibe "Salve todos os itens antes de salvar o pedido."; a validação também é aplicada no handler para evitar bypass.
- **Auto-remover alertas de erro**: Os alertas de erro (mensagens em vermelho e contornos vermelhos nos campos) na tela de criação de pedidos passam a ser removidos automaticamente após 5 segundos, mantendo a interface mais limpa.
- **Coluna de Horário de Liberação Financeira**: Nova coluna "Hr. lib." na lista de pedidos que registra e exibe o horário exato (HH:mm) em que o status Financeiro foi marcado. O dado é persistido localmente (`localStorage`) para consulta rápida durante a sessão.
- **Formatação de Horário**: Nova função utilitária `formatTimeHHmm` para exibição padronizada de horas/minutos no formato PT-BR.

## [1.3.2] - 2026-02-26

### ✨ Melhorias
- **Atalhos de teclado globais**: Navegação rápida via teclado em toda a aplicação (Ctrl+1..9 para páginas, setas ↑↓ para navegar pedidos, Enter para abrir, F1 para ajuda).
- **Badges de atalho na Sidebar**: Indicadores visuais dos atalhos disponíveis em cada item do menu.
- **Modal de Ajuda (F1)**: Novo modal listando todos os atalhos disponíveis na tela atual.

### 🐛 Corrigido
- **Zeros à esquerda no número do pedido**: Número do pedido nas fichas de impressão agora exibe sem zeros à esquerda (`#487` em vez de `#0000000487`).
- **Cabeçalho da ficha embolado**: Reestruturado o cabeçalho da ficha de produção (PDF) com espaçamento uniforme e labels abreviados (ENT., ENTRG., FR.:).

### 🔧 Melhorado
- **Layout da ficha de produção (PDF)**: Cabeçalho reorganizado em duas linhas com espaçamento uniforme. Texto de frete é truncado automaticamente quando ultrapassa o espaço disponível.

## [1.2.9] - 2026-02-24

### 🐛 Correções
- **Emenda em totem e outros tipos**: Ajustes no frontend para que emenda (e outros campos por tipo) não apareçam nem sejam persistidos para tipos que não suportam. (1) Na tela de detalhe do pedido, a seção "Emenda" só é exibida para itens dos tipos painel, genérica e lona; totem, adesivo e demais tipos não mostram mais emenda mesmo quando havia dado antigo. (2) Ao salvar, o payload não envia mais emenda/emenda_qtd para tipos fora de painel/genérica/lona, evitando gravar dado incorreto. (3) Ao abrir um pedido para edição, itens carregados do backend são normalizados: campos que não se aplicam ao tipo do item (ex.: emenda em totem) são limpos no formulário, alinhando exibição e persistência ao tipo sem alterações no backend.
- **Duplicação de itens ao trocar tipo**: Ao alterar o tipo de produção de um item para um tipo **diferente**, o item passa a ser resetado mantendo apenas descrição, medida (largura, altura, m²), designer, vendedor e imagem; valores e demais campos são limpos. Quando o tipo é o **mesmo** (ex.: ao duplicar item sem mudar tipo), todas as informações são mantidas, inclusive valor.

### ✨ Melhorias
- **Status de produção – Impressão**: Coluna "Subl." renomeada para "Imp." (Impressão). Modal de confirmação e avisos passam a exibir "Impressão" em vez de "Sublimação" (ex.: "Deseja desmarcar Impressão para o pedido #2?").
- **Tooltips nos status**: Cabeçalhos das colunas (Fin., Conf., Imp., Cost., Exp., Status) e cada checkbox/badge de status exibem tooltip com o nome completo ao passar o mouse (Financeiro, Conferência, Impressão, Costura, Expedição, Status do pedido).
- **Prioridade para usuário impressao**: Quando o usuário logado é "impressao", a lista de pedidos ordena primeiro os pedidos **sem** status Impressão marcado, depois prioridade ALTA e ID descendente, facilitando o dia a dia do setor de impressão sem alterações no backend.

## [1.2.8.9] - 2026-02-24

### 🐛 Correções
- **Duplicar item e trocar tipo de produção**: Corrigido o problema em que, ao duplicar um item (ex.: tecido) e depois alterar o tipo do item duplicado para outro (ex.: totem), o item mantinha dados específicos do tipo anterior (como emenda, quantidade de emendas). Agora, ao mudar o tipo de produção de um item, os campos que não se aplicam ao novo tipo são automaticamente limpos (ex.: emenda e emenda_qtd são resetados ao trocar para totem). A regra de quais campos pertencem a cada tipo é definida em `FIELD_ALLOWED_TYPES` e os valores padrão são aplicados na troca de tipo.

## [1.2.7] - 2026-02-23

### ✨ Novas Funcionalidades
- **Consolidação de Frete por Pedido**: Implementada a atribuição única de frete por ficha nos relatórios. Esta mudança garante que o valor total do frete não seja duplicado visualmente em pedidos com múltiplos itens, assegurando que o somatório das colunas seja idêntico ao Total Geral.

### 🐛 Correções de Estabilidade
- **Integridade de Valores Monetários**: Corrigida uma inconsistência no processamento de valores acima de R$ 1.000,00, garantindo precisão total em transações de alto volume.
- **Persistência de Atributos de Produção**: Resolvido o problema de exibição de dados técnicos e quantidades em tipos específicos de produtos durante a edição, garantindo que todas as especificações sejam preservadas.
- **Estabilidade da Interface**: Corrigidos erros de carregamento e visualização que ocorriam em cenários específicos após a atualização dos filtros de relatórios.

### 🔧 Melhorias de Experiência e Performance
- **Interface de Relatórios Otimizada**: Reestruturação da tela de Fechamentos para um design mais limpo e produtivo. Filtros menos utilizados foram ocultados e os botões de ação foram consolidados para agilizar o fluxo de trabalho.
- **Padronização Visual**: Restauração da identidade visual primária em elementos de ação para manter a consistência com o restante do ecossistema FinderBit.
- **Robustez de Dados**: Implementação de mecanismos de segurança no carregamento de informações, garantindo a exibição correta dos dados mesmo em casos de inconsistências na fonte original.
- **Garantia de Qualidade**: Ampliação da suíte de validação automatizada, focando na integridade de cálculos financeiros e na prevenção de regressões em atualizações futuras.

## [1.2.6] - 2026-02-15

### ✨ Adicionado
- **Checkboxes de exportação no relatório de fechamento**: Cada linha do relatório possui um checkbox para selecionar quais itens incluir na exportação (PDF/CSV). Itens desmarcados não aparecem no arquivo exportado.
- **Valores em tempo real**: Subtotais e total geral do relatório são recalculados em tempo real conforme a seleção dos checkboxes.

### 🐛 Corrigido
- **Frete duplicado**: O frete passou a ser contado uma vez por ficha (pedido), e não por item, corrigindo a soma incorreta quando um pedido tinha múltiplos itens.
- **Alinhamento de cabeçalhos no PDF**: Os cabeçalhos "Vr.Frete (R$)" e "Vr.Serviços (R$)" agora ficam alinhados à direita, em linha com os valores numéricos.

## [1.2.5] - 2026-02-13

### ✨ Adicionado
- **Emenda na ficha impressa**: Emenda e quantidade de emendas passam a aparecer em todas as fichas de impressão.
  - Ficha de Serviço (tela): texto formatado (ex.: "2 emendas horizontais", "Horizontal (2)").
  - PDF da Ficha de Serviço (OrderCard): campo Emenda nas Especificações Gerais com tipo e quantidade.
  - Template customizado: Emenda, Qtd. Emendas e valor "Não" quando sem emenda.
- **Ilhós e Cordinha na ficha impressa**: Ilhós e cordinha (quantidade e espaçamento) passam a aparecer nas fichas.
  - Ficha de Serviço (tela): ilhós e cordinha formatados na célula Tecido/Ilhós/Emendas/...
  - PDF OrderCard: SpecRows para Ilhós e Cordinha (quantidade + espaço); Cordinha extra quando aplicável.
  - Template customizado: linhas Ilhós e Cordinha com placeholders `ilhos_display` e `cordinha_display`.

### 🐛 Corrigido
- **Formato de ilhós e cordinha**: Exibição alterada de "10(20)" para "10 ilhós a cada 20 cm" (e equivalente para cordinha) em todos os fluxos de impressão.
- **Duplicação em Acabamento/Costura**: Ilhós e cordinha não são mais exibidos na seção Acabamento/Costura do PDF, pois já constam em Especificações Gerais.

### 🔧 Melhorado
- **Template de impressão**: `createOrderDataMap` passa a preencher `emenda` como "Não" quando sem emenda e `emenda_qtd` como "—" quando não há emenda; adicionados `ilhos_display` e `cordinha_display` no formato "X ilhós/cordinhas a cada Y cm".

## [1.2.4] - 2026-02-06

### ✨ Adicionado
- **Validação de Material na Legenda**: Implementada validação para garantir que o material selecionado esteja contido na legenda da imagem.
  - Validação aplicada apenas quando a legenda está preenchida (não é obrigatória).
  - Verificação case-insensitive para maior flexibilidade.
  - Mensagens de erro visuais em todos os formulários quando material não está na legenda.
  - Bloqueia salvamento se material não estiver contido na legenda.

### 🐛 Corrigido
- **Bug de Cursor ao Digitar no Meio do Texto**: Corrigido problema crítico onde inserir texto no meio de strings existentes causava deslocamento do cursor.
  - Input agora usa estado local durante digitação para preservar posição do cursor.
  - Conversão para maiúsculas ocorre apenas ao perder foco (onBlur), não durante digitação.
  - Elimina problemas de cursor ao inserir texto no meio de strings existentes.
- **Digitação de Letras em Campos de Medida**: Bloqueada digitação de caracteres não numéricos nos campos de largura e altura.
  - Validação onKeyDown para bloquear letras e caracteres inválidos antes de serem digitados.
  - Permite apenas números, vírgula/ponto e teclas de controle.
  - Adicionado `inputMode='decimal'` para melhor UX em dispositivos móveis.

### 🔧 Melhorado
- **Atualização de Versão**: Versão do sistema atualizada para 1.2.4 em todos os arquivos de configuração (package.json, Cargo.toml e updater/latest.json).
- **Formulários de Criação**: Removidos campos de produção (Máquina, Impressão, Perfil, Tecido) dos formulários de criação de itens.
  - Campos de produção devem ser preenchidos apenas na visualização/edição de pedidos.
  - Aplicado em: FormPainelCompleto, FormMochilinhaProducao, FormImpressao3D, FormCangaProducao, FormMesaBabado.
  - Mantém FormProducaoFields no OrderViewModal para edição de pedidos existentes.

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

