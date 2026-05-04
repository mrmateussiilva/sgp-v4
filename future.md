# Plano Futuro De Arquitetura

## Objetivo

Separar a arquitetura do projeto em dois modos de operacao:

```text
Web/PWA
React -> Axios -> API Python -> Banco

Desktop Tauri
React -> invoke -> Rust -> Banco
```

O frontend React continua sendo a interface comum, mas a origem dos dados muda conforme o ambiente.

## Contexto

O projeto nasceu como um aplicativo desktop, usando Tauri/Rust para fornecer a janela e recursos nativos, com React no frontend. Depois evoluiu para tambem atender clientes Web e PWA, que acessam a API pela internet usando Cloudflare Tunnel.

A proposta futura e manter:

- Web/PWA conectando na API Python.
- Desktop Tauri conectando diretamente ao banco pela rede local via Rust.
- React compartilhado entre os dois modos sempre que possivel.

## Fronteiras Da Arquitetura

### Compartilhado

- Telas React.
- Componentes visuais.
- Layout.
- Fluxos de interface.
- Tipos de dominio, quando possivel.
- Validacoes simples de formulario.

### Especifico Por Ambiente

- Acesso a dados.
- Autenticacao real.
- Permissoes.
- Regras de negocio criticas.
- Upload/download de arquivos.
- Relatorios.
- Sincronizacao.
- Conexao com API ou banco.

## Arquitetura Alvo

O React nao deve chamar `apiClient` diretamente de forma espalhada pelo projeto. O ideal e criar uma camada intermediaria por dominio.

Exemplo conceitual:

```text
Tela React
  -> orderService
    -> WebOrderRepository usando Axios
    -> DesktopOrderRepository usando Tauri invoke
```

Cada dominio deve ter um contrato comum:

```ts
interface OrdersDataSource {
  list(params): Promise<Order[]>;
  get(id): Promise<Order>;
  create(payload): Promise<Order>;
  update(id, payload): Promise<Order>;
  delete(id): Promise<void>;
}
```

E implementacoes separadas:

```text
orders.web.ts       -> usa Axios/API Python
orders.desktop.ts   -> usa invoke/Rust
```

O seletor escolhe a implementacao conforme o ambiente:

```ts
export const ordersDataSource = isTauri()
  ? desktopOrdersDataSource
  : webOrdersDataSource;
```

A regra principal: a UI nao deve saber se os dados vieram da API Python ou do Rust local.

## Rust Como Backend Do Desktop

Hoje o Rust ja possui comandos Tauri, mas parte da comunicacao ainda funciona como ponte HTTP para a API. A evolucao desejada e transformar o Rust em backend real para o desktop.

Estrutura sugerida:

```text
src-tauri/src/
  main.rs
  db/
    mod.rs
    pool.rs
    migrations.rs
  repositories/
    orders.rs
    customers.rs
    resources.rs
  services/
    orders.rs
    customers.rs
    auth.rs
    reports.rs
  commands/
    orders.rs
    customers.rs
    resources.rs
    auth.rs
```

Fluxo esperado:

```text
React invoke
  -> command Rust
    -> service Rust
      -> repository Rust
        -> banco
```

Evitar SQL direto dentro dos comandos Tauri. Comandos Tauri devem receber parametros, chamar services e devolver respostas.

## Stack Rust Para Banco

Recomendacao inicial: `sqlx`.

Motivos:

- Combina bem com Tauri async.
- Permite controle direto do SQL.
- Facilita mapear structs.
- Possui suporte a migrations.
- Tem menos abstracao implicita que um ORM tradicional.

Exemplo:

```rust
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Pedido {
    pub id: i64,
    pub cliente_id: i64,
    pub status: String,
}
```

## Banco E Migrations

Se API Python e Rust Desktop vao acessar o mesmo banco, o schema precisa ser tratado como fonte unica de verdade.

Opcoes:

1. Manter migrations no backend Python.
2. Criar migrations SQL compartilhadas.
3. Migrar ownership das migrations para Rust.

Recomendacao inicial: criar migrations SQL compartilhadas quando possivel.

Pontos de cuidado:

- API Python e Rust devem enxergar o mesmo schema.
- Alteracoes no banco precisam ser compativeis com versoes em uso.
- Desktop antigo nao pode quebrar ao acessar schema novo.
- Deve existir uma estrategia de versionamento minimo do banco.

## Autenticacao E Permissoes

No Web/PWA, a autenticacao continua via API Python.

No Desktop, sera necessario definir:

- Se havera login local.
- Se os usuarios serao consultados diretamente no banco.
- Como validar senha.
- Se permissoes serao as mesmas da API.
- Como armazenar sessao local.
- Como proteger credenciais de banco.

Fluxo sugerido:

```text
React Login
  -> invoke("auth_login")
    -> Rust consulta usuario/senha no banco
    -> retorna sessao local
```

Mesmo em rede local, o desktop nao deve ter acesso irrestrito sem controle de permissao.

## Ordem De Migracao Por Dominio

Nao migrar tudo de uma vez. Ordem sugerida:

1. Configuracao de conexao desktop.
2. Clientes.
3. Recursos auxiliares.
4. Pedidos.
5. Fechamentos e relatorios.
6. Uploads, imagens e arquivos.
7. Atualizacoes e changelog.

### Configuracao De Conexao Desktop

- Tela para configurar banco local/rede.
- Teste de conexao.
- Persistencia local da configuracao via Tauri.
- Mensagens claras para banco indisponivel.

### Clientes

Bom primeiro dominio para validar a arquitetura.

- CRUD mais isolado.
- Menor risco do que pedidos.
- Permite testar Rust + banco + frontend.

### Recursos Auxiliares

Migrar depois de clientes:

- Vendedores.
- Designers.
- Materiais.
- Formas de pagamento.
- Formas de envio.
- Maquinas.
- Tipos de producao.

### Pedidos

Migrar somente depois que a base estiver validada.

Pontos sensiveis:

- Itens do pedido.
- Status.
- Edicoes concorrentes.
- Salvamento de JSON.
- Impressao.
- Imagens/anexos.
- Calculos.
- Regras de permissao.

### Fechamentos E Relatorios

Migrar depois dos pedidos.

Pontos de cuidado:

- Queries complexas.
- Consistencia dos resultados entre Python e Rust.
- Performance.
- Filtros e agregacoes.

## Modo De Compatibilidade

Durante a transicao, o desktop pode suportar tres modos:

```text
web/pwa        -> API Python
desktop-api    -> Tauri usando API Python
desktop-rust   -> Tauri usando Rust direto no banco
```

Exemplo:

```ts
const runtimeMode =
  isTauri() && config.desktopBackend === 'rust'
    ? 'desktop-rust'
    : isTauri()
      ? 'desktop-api'
      : 'web';
```

Isso permite testar o backend Rust em algumas maquinas antes de tornar o comportamento padrao.

## Contratos E Tipos

Python e Rust devem devolver o mesmo formato para o React.

Regra:

```text
PedidoDTO vindo da API Python
PedidoDTO vindo do Rust
precisam ter o mesmo formato para o React
```

Evitar condicionais de ambiente espalhadas na UI. Se houver diferencas, elas devem ser resolvidas na camada de data source.

## Testes Necessarios

Testes recomendados:

- Unitarios dos repositories Rust.
- Services Rust com banco de teste.
- Comandos Tauri quando possivel.
- Frontend mockando data sources.
- Testes de contrato comparando respostas Python vs Rust.

Casos obrigatorios:

- Criar pedido.
- Editar pedido.
- Mudar status.
- Excluir ou cancelar pedido.
- Criar cliente.
- Gerar fechamento.
- Validar permissoes.
- Falha de conexao com banco.
- Schema incompatibile.
- Usuario sem permissao.

## Deploy

### Web/PWA

```text
Deploy frontend web + API Python + Cloudflare Tunnel
```

### Desktop

```text
Build Tauri
  -> inclui frontend React
  -> Rust conecta direto ao banco da rede
  -> config local por maquina
```

O instalador desktop precisa considerar:

- Onde salvar configuracao.
- Como testar conexao.
- Como atualizar.
- Como lidar com banco indisponivel.
- Como exibir erro claro para usuario.

## Riscos Principais

- Regra de negocio duplicada entre Python e Rust.
- Schema muda e um dos lados quebra.
- Desktop antigo acessa banco novo.
- Permissoes diferentes entre web e desktop.
- Relatorio Python e Rust retornam resultados diferentes.
- Pedidos criados por desktop e web com comportamentos diferentes.
- Conexao direta ao banco expor credenciais.
- Rede local instavel.
- Concorrencia em edicao de pedido.

## Mitigacoes

- Migrations controladas.
- Versionamento minimo de schema.
- Tela de diagnostico no desktop.
- Testes de contrato.
- DTOs iguais.
- Logs estruturados no Rust.
- Transacoes no banco.
- Feature flag para ativar backend Rust.

## Proximos Passos Praticos

1. Mapear todos os usos de `apiClient` no frontend.
2. Agrupar chamadas por dominio: pedidos, clientes, recursos, auth e relatorios.
3. Criar interfaces de data source no frontend.
4. Migrar clientes para usar `customersDataSource`.
5. Implementar `customers.web.ts` com Axios.
6. Implementar `customers.desktop.ts` com `invoke`.
7. Criar comandos Rust reais para clientes acessando o banco.
8. Validar no desktop com banco de teste.
9. Repetir o padrao para recursos auxiliares.
10. Migrar pedidos somente depois da base estar estavel.

## Decisao Recomendada

Nao remover a API Python agora.

Manter:

- API Python como backend oficial para Web/PWA.
- Rust como backend local do Desktop.
- React compartilhado.
- Contratos iguais para evitar divergencia na UI.

O primeiro passo real de implementacao deve ser criar a camada `DataSource/Repository` no frontend e migrar um dominio pequeno, preferencialmente `clientes`.
