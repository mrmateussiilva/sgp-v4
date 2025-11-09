# 📦 Instalação e Configuração do SGP v4 - Windows 10

## 🚀 Instalação Rápida

### 1. Instalar o Aplicativo

Execute o instalador gerado:
```
sgp-sistema-de-gerenciamento-de-pedidos_1.0.0_x64_en-US.msi
```

### 2. Configurar o Banco de Dados

O aplicativo procura o arquivo `.env` nos seguintes locais (em ordem de prioridade):

#### 🎯 **Locais Recomendados para Windows:**

1. **Diretório do executável** (mais comum):
   ```
   C:\Program Files\SGP Sistema de Gerenciamento de Pedidos\.env
   ```

2. **Diretório de dados do usuário**:
   ```
   %APPDATA%\sgp\.env
   C:\Users\[USUARIO]\AppData\Roaming\sgp\.env
   ```

3. **Diretório de configuração do usuário**:
   ```
   %LOCALAPPDATA%\sgp\.env
   C:\Users\[USUARIO]\AppData\Local\sgp\.env
   ```

4. **Diretório de documentos**:
   ```
   %USERPROFILE%\Documents\sgp\.env
   C:\Users\[USUARIO]\Documents\sgp\.env
   ```

5. **Diretório atual** (onde você executa o aplicativo):
   ```
   .env
   ```

## 🔧 Configuração do Banco de Dados

### 1. Criar o arquivo .env

```cmd
# Copiar o template (usando PowerShell)
Copy-Item env.example "%APPDATA%\sgp\.env"

# Editar com suas credenciais
notepad "%APPDATA%\sgp\.env"
```

### 2. Configuração Básica

```env
# URL completa do banco (RECOMENDADO)
DATABASE_URL=postgresql://usuario:senha@localhost:5432/sgp_v4

# OU configurações individuais
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

# Timeout da sessão (horas)
SESSION_TIMEOUT_HOURS=12

# TTL do cache (segundos)
CACHE_TTL_SECONDS=300

# Nível de log
RUST_LOG=info
```

## 🎯 Exemplos de Instalação

### Instalação para Usuário Único

```cmd
# 1. Instalar o aplicativo (executar o .msi)

# 2. Criar diretório de configuração
mkdir "%APPDATA%\sgp"

# 3. Configurar banco de dados
copy env.example "%APPDATA%\sgp\.env"
notepad "%APPDATA%\sgp\.env"

# 4. Executar o aplicativo
# (será criado um atalho no menu Iniciar)
```

### Instalação para Sistema (Múltiplos Usuários)

```cmd
# 1. Instalar o aplicativo (executar o .msi como Administrador)

# 2. Criar diretório de configuração do sistema
mkdir "C:\Program Files\SGP Sistema de Gerenciamento de Pedidos"

# 3. Configurar banco de dados
copy env.example "C:\Program Files\SGP Sistema de Gerenciamento de Pedidos\.env"
notepad "C:\Program Files\SGP Sistema de Gerenciamento de Pedidos\.env"
```

## 🔍 Verificação da Configuração

O aplicativo mostrará logs informativos sobre onde encontrou o arquivo `.env`:

```
INFO sgp_v4: Arquivo .env encontrado em: C:\Users\Usuario\AppData\Roaming\sgp\.env
INFO sgp_v4: Arquivo .env carregado com sucesso de: C:\Users\Usuario\AppData\Roaming\sgp\.env
INFO sgp_v4: Configurações carregadas com sucesso
INFO sgp_v4: URL do banco: postgresql://usuario:***@localhost:5432/sgp_v4
INFO sgp_v4: Conexão com banco de dados estabelecida!
```

## 🆘 Solução de Problemas

### Erro: "Arquivo .env não encontrado"

1. Verifique se o arquivo existe em um dos locais listados
2. Verifique as permissões do arquivo
3. Execute o aplicativo do diretório onde está o `.env`

### Erro: "Falha ao conectar com o banco de dados"

1. Verifique se o PostgreSQL está rodando
2. Confirme as credenciais no arquivo `.env`
3. Teste a conexão manualmente:
   ```cmd
   psql -h localhost -p 5432 -U usuario -d sgp_v4
   ```

### Erro: "DATABASE_URL deve estar definida"

1. Verifique se `DATABASE_URL` ou `DB_USER`/`DB_PASSWORD` estão definidos
2. Confirme que não há espaços extras no arquivo `.env`
3. Verifique se o arquivo `.env` está sendo carregado corretamente

## 📞 Suporte

Para mais informações, consulte:
- `env.example` - Template de configuração
- `CONFIGURACAO_BANCO.md` - Guia detalhado de configuração
- Logs da aplicação para diagnóstico
