# Configuração de Banco de Dados - SGP v4

## 🎯 Funcionalidade Implementada

O sistema agora possui uma **tela de fallback** que é exibida automaticamente quando não consegue conectar ao banco de dados na inicialização.

## ⚙️ Como Funciona

### 1. **Detecção Automática**
- Ao iniciar a aplicação, o sistema verifica se consegue conectar ao banco
- Se falhar, mostra automaticamente a tela de configuração
- Se conectar com sucesso, abre a aplicação normalmente

### 2. **Tela de Configuração**
- Interface limpa e intuitiva para configurar conexão
- Campos: Host, Porta, Usuário, Senha, Nome do Banco
- Botão "Testar Conexão" para validar antes de salvar
- Botão "Salvar e Reconectar" para aplicar configurações
- Botão "Limpar Configuração" para remover configurações salvas

### 3. **Persistência**
- Configurações são salvas em `db_config.json` no diretório da aplicação
- Prioridade: `db_config.json` > `.env` > variáveis de ambiente
- Após salvar, o sistema reconecta automaticamente

## 🔧 Arquivos Modificados

### Backend (Rust)
- `src-tauri/src/commands/database.rs` - Novos comandos Tauri
- `src-tauri/src/commands/mod.rs` - Registro do módulo database
- `src-tauri/src/main.rs` - Lógica de fallback na inicialização

### Frontend (React)
- `src/pages/DatabaseConnection.tsx` - Tela de configuração
- `src/App.tsx` - Lógica de detecção e fallback

## 🔧 Correção de Erro - sessionToken e Pool<Postgres>

**Problemas identificados**: 
1. O comando `get_clientes` requer autenticação (`sessionToken`), mas estávamos tentando usá-lo para testar conexão antes do login.
2. `Pool<Postgres>` não pode ser usado diretamente como parâmetro de comando Tauri porque não implementa `Deserialize`.

**Soluções implementadas**:
- Criado comando `test_db_connection_with_pool` que usa `State<'_, PgPool>` (forma correta no Tauri)
- Atualizada lógica de verificação no frontend para usar `test_db_connection` com URL construída
- Removido import não utilizado `DbConfig` do main.rs
- Simplificada abordagem: usar apenas `test_db_connection` para testes de conectividade
- **Corrigido erro de configuração**: Sistema agora usa `db_config.json` para criar configuração completa, evitando erro de `DB_USER` não definida

## 🔧 Correção Adicional - Erro de Configuração

**Problema**: Após conectar com sucesso usando `db_config.json`, o sistema tentava carregar configurações do `.env` para migrações e falhava com "DB_USER deve estar definida no arquivo .env".

**Solução**: 
- Modificada função `try_connect_to_database()` para retornar tanto o pool quanto a configuração
- Quando conecta via `db_config.json`, cria uma configuração `AppConfig` completa
- Elimina dependência do `.env` quando usando configuração salva
- Sistema funciona completamente independente do arquivo `.env`

## 🚀 Comandos Tauri Disponíveis

```rust
// Testar conexão com banco usando URL
test_db_connection(db_url: String) -> Result<(), String>

// Testar conexão com pool existente (sem autenticação)
test_db_connection_with_pool(pool: PgPool) -> Result<(), String>

// Salvar configuração
save_db_config(config: DbConfig) -> Result<(), String>

// Carregar configuração salva
load_db_config() -> Result<Option<DbConfig>, String>

// Remover configuração
delete_db_config() -> Result<(), String>
```

## 📋 Estrutura DbConfig

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DbConfig {
    pub host: String,      // Ex: "localhost"
    pub port: String,       // Ex: "5432"
    pub user: String,       // Ex: "postgres"
    pub password: String,   // Senha do banco
    pub database: String,   // Ex: "sgp"
}
```

## 🎨 Interface da Tela de Configuração

- **Design**: Card centralizado com gradiente de fundo
- **Campos**: Inputs com labels claras
- **Status**: Indicadores visuais de teste de conexão
- **Botões**: Ações principais com estados de loading
- **Responsivo**: Funciona em diferentes tamanhos de tela

## ✅ Critérios de Aceite Atendidos

- ✅ Tela de fallback exibida automaticamente quando banco não conecta
- ✅ Usuário pode configurar host, porta, usuário, senha e nome do banco
- ✅ Teste de conexão antes de salvar
- ✅ Configurações salvas localmente
- ✅ Reconexão automática após salvar
- ✅ Interface limpa e responsiva
- ✅ Funciona offline (não trava o app)

## 🔄 Fluxo de Funcionamento

1. **Inicialização**: App verifica conexão com banco
2. **Falha**: Mostra tela de configuração
3. **Configuração**: Usuário preenche dados e testa
4. **Salvamento**: Configuração salva em `db_config.json`
5. **Reconexão**: Sistema tenta conectar novamente
6. **Sucesso**: App principal é carregada normalmente

## 🛠️ Como Testar

1. **Simular falha de conexão**:
   - Pare o PostgreSQL
   - Inicie a aplicação
   - Deve aparecer a tela de configuração

2. **Configurar banco**:
   - Preencha os dados corretos
   - Clique em "Testar Conexão"
   - Clique em "Salvar e Reconectar"

3. **Verificar funcionamento**:
   - App deve reconectar automaticamente
   - Deve abrir a aplicação principal normalmente

## 📁 Arquivo de Configuração

O arquivo `db_config.json` será criado no diretório raiz da aplicação:

```json
{
  "host": "localhost",
  "port": "5432",
  "user": "postgres",
  "password": "sua_senha",
  "database": "sgp"
}
```

## 🔒 Segurança

- Senhas são salvas em texto plano no arquivo local
- Arquivo `db_config.json` deve ser protegido adequadamente
- Considerar usar criptografia para senhas em produção

---

**Resultado**: Sistema robusto que não trava quando há problemas de conexão com banco, permitindo ao usuário configurar e reconectar facilmente.
