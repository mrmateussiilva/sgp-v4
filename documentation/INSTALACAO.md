# 📦 Instalação e Configuração do SGP v4

## 🚀 Instalação Rápida

### 1. Instalar o Aplicativo

```bash
# Para sistemas Debian/Ubuntu
sudo dpkg -i sgp-sistema-de-gerenciamento-de-pedidos_1.0.0_amd64.deb

# Para sistemas Red Hat/Fedora
sudo rpm -i sgp-sistema-de-gerenciamento-de-pedidos-1.0.0-1.x86_64.rpm
```

### 2. Configurar o Banco de Dados

O aplicativo procura o arquivo `.env` nos seguintes locais (em ordem de prioridade):

#### 🎯 **Locais Recomendados:**

1. **Diretório do executável** (mais comum):
   ```bash
   /usr/bin/.env
   ```

2. **Diretório de configuração do usuário**:
   ```bash
   ~/.sgp/.env
   ~/.config/sgp/.env
   ~/.local/share/sgp/.env
   ```

3. **Diretório de instalação**:
   ```bash
   /opt/sgp-sistema-de-gerenciamento-de-pedidos/.env
   ```

4. **Diretório atual** (onde você executa o aplicativo):
   ```bash
   ./env
   ```

## 🔧 Configuração do Banco de Dados

### 1. Criar o arquivo .env

```bash
# Copiar o template
cp env.example .env

# Editar com suas credenciais
nano .env
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

```bash
# 1. Instalar o aplicativo
sudo dpkg -i sgp-sistema-de-gerenciamento-de-pedidos_1.0.0_amd64.deb

# 2. Criar diretório de configuração
mkdir -p ~/.sgp

# 3. Configurar banco de dados
cp env.example ~/.sgp/.env
nano ~/.sgp/.env

# 4. Executar o aplicativo
sgp-sistema-de-gerenciamento-de-pedidos
```

### Instalação para Sistema (Múltiplos Usuários)

```bash
# 1. Instalar o aplicativo
sudo dpkg -i sgp-sistema-de-gerenciamento-de-pedidos_1.0.0_amd64.deb

# 2. Criar diretório de configuração do sistema
sudo mkdir -p /opt/sgp-sistema-de-gerenciamento-de-pedidos

# 3. Configurar banco de dados
sudo cp env.example /opt/sgp-sistema-de-gerenciamento-de-pedidos/.env
sudo nano /opt/sgp-sistema-de-gerenciamento-de-pedidos/.env

# 4. Executar o aplicativo
sgp-sistema-de-gerenciamento-de-pedidos
```

## 🔍 Verificação da Configuração

O aplicativo mostrará logs informativos sobre onde encontrou o arquivo `.env`:

```
INFO sgp_v4: Arquivo .env encontrado em: /home/usuario/.sgp/.env
INFO sgp_v4: Arquivo .env carregado com sucesso de: /home/usuario/.sgp/.env
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
   ```bash
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
