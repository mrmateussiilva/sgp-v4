# Configuração do Banco de Dados - SGP v4

## Visão Geral

O SGP v4 foi projetado para ler configurações do banco de dados de um arquivo `.env` externo, permitindo configurar a conexão após o build do executável.

## Configuração Rápida

### 1. Arquivo de Configuração

O aplicativo procura por um arquivo `.env` no mesmo diretório do executável. Se não existir, você pode criar um baseado no arquivo `env.example`.

### 2. Configuração do Banco

Você tem duas opções para configurar o banco de dados:

#### Opção 1: URL Completa (Recomendado)
```env
DATABASE_URL=postgresql://usuario:senha@host:porta/nome_do_banco
```

#### Opção 2: Variáveis Individuais
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sgp_v4
DB_USER=usuario
DB_PASSWORD=senha
```

### 3. Configurações Opcionais

```env
# Máximo de conexões simultâneas
DB_MAX_CONNECTIONS=5

# Timeout da sessão em horas
SESSION_TIMEOUT_HOURS=12

# TTL do cache em segundos
CACHE_TTL_SECONDS=300

# Nível de log
RUST_LOG=info
```

## Exemplo de Configuração

```env
# Configuração básica
DATABASE_URL=postgresql://sgp_user:minhasenha123@localhost:5432/sgp_v4

# Configurações opcionais
SESSION_TIMEOUT_HOURS=8
CACHE_TTL_SECONDS=600
RUST_LOG=info
```

## Processo de Build e Distribuição

1. **Build**: Execute `./build.sh` ou `npm run tauri build`
2. **Configuração**: Copie `env.example` para `.env` e configure
3. **Execução**: Execute o aplicativo - ele lerá automaticamente o `.env`

## Solução de Problemas

### Erro: "DATABASE_URL deve estar definida"
- Verifique se o arquivo `.env` existe no diretório do executável
- Confirme se `DATABASE_URL` ou `DB_USER`/`DB_PASSWORD` estão definidos

### Erro: "Falha ao conectar com o banco de dados"
- Verifique se o PostgreSQL está rodando
- Confirme se as credenciais estão corretas
- Teste a conexão manualmente: `psql -h host -p porta -U usuario -d nome_do_banco`

### Arquivo .env não é encontrado
- Certifique-se de que o arquivo `.env` está no mesmo diretório do executável
- Verifique se o nome do arquivo está correto (`.env`, não `env`)

## Segurança

- **Nunca** commite o arquivo `.env` no controle de versão
- Use senhas fortes para o banco de dados
- Mantenha o arquivo `.env` com permissões restritivas (600)

## Suporte

Para mais informações, consulte:
- `env.example` - Template de configuração
- `build.sh` - Script de build automatizado
- Logs da aplicação para diagnóstico de problemas
