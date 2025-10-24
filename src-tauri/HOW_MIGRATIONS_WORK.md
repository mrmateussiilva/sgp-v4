# 🔍 Como o Sistema Sabe que Precisa Rodar Migrações

## 📋 **Visão Geral**

O sistema de migrações do SGP v4 tem **múltiplas camadas de configuração** que determinam quando e como as migrações são executadas. Vou explicar cada uma delas:

---

## 🎯 **1. Configuração Principal: Variáveis de Ambiente**

### **Arquivo: `.env`**
```bash
DATABASE_URL=postgresql://postgres:MJs119629@192.168.15.9:5432/sgp
RUN_MIGRATIONS=true          # ← CONTROLE PRINCIPAL DAS MIGRAÇÕES
APP_ENV=development          # ← AMBIENTE DA APLICAÇÃO
RUST_LOG=info
SESSION_TIMEOUT_HOURS=12
CACHE_TTL_SECONDS=300
```

### **Variável Chave: `RUN_MIGRATIONS`**
- **`true`**: Executa migrações automaticamente
- **`false`**: Pula execução de migrações
- **Padrão**: `true` se não definida

---

## 🏗️ **2. Fluxo de Decisão no Código**

### **Arquivo: `src/main.rs` (Linhas 126-134)**
```rust
// Controlar execução de migrações via variáveis de ambiente
// Padrão: em produção, não roda migrações; em desenvolvimento, roda.
let app_env = env::var("APP_ENV").unwrap_or_else(|_| "development".to_string());
let run_migrations_env = env::var("RUN_MIGRATIONS").ok();
let run_migrations = match run_migrations_env.as_deref() {
    Some("true") | Some("1") => true,
    Some("false") | Some("0") => false,
    _ => app_env != "production",  // ← LÓGICA PADRÃO
};
```

### **Lógica de Decisão:**
1. **Se `RUN_MIGRATIONS` está definida**: Usa o valor da variável
2. **Se `RUN_MIGRATIONS` não está definida**: 
   - **Development**: Executa migrações (`true`)
   - **Production**: Não executa migrações (`false`)

---

## 🔧 **3. Sistema Duplo de Configuração**

### **A. Configuração via `.env` (Prioritária)**
```rust
// src/main.rs - Linhas 62-67
match crate::env_loader::load_env_file() {
    Ok(_) => info!("Arquivo .env carregado com sucesso"),
    Err(e) => {
        error!("Erro ao carregar arquivo .env: {}. Usando variáveis de ambiente do sistema.", e);
    }
}
```

### **B. Configuração via `db_config.json` (Alternativa)**
```rust
// src/main.rs - Linhas 32-59
if let Ok(Some(db_config)) = load_db_config() {
    info!("Configuração de banco encontrada em db_config.json");
    let db_url = db_config.to_database_url();
    
    // Definir DATABASE_URL para o sistema de migrações
    std::env::set_var("DATABASE_URL", &db_url);
    
    match try_connect_db().await {
        Ok(pool) => {
            info!("Conexão estabelecida usando configuração de db_config.json");
            // ... continua com migrações
        }
    }
}
```

---

## 📊 **4. Ordem de Prioridade das Configurações**

### **1º Prioridade: `db_config.json`**
```json
{
  "host": "192.168.15.9",
  "port": "5432",
  "user": "postgres",
  "password": "MJs119629",
  "database": "sgp"
}
```

### **2º Prioridade: `.env`**
```bash
DATABASE_URL=postgresql://postgres:MJs119629@192.168.15.9:5432/sgp
RUN_MIGRATIONS=true
```

### **3º Prioridade: Variáveis de Ambiente do Sistema**
```bash
export DATABASE_URL="postgresql://postgres:MJs119629@192.168.15.9:5432/sgp"
export RUN_MIGRATIONS=true
```

---

## 🚀 **5. Fluxo de Execução das Migrações**

### **Passo 1: Carregamento de Configuração**
```rust
// src/main.rs - Linha 100
let (pool, config) = match try_connect_with_migrations().await {
    Ok((pool, config)) => (pool, config),
    Err(e) => {
        error!("Falha ao conectar ao banco de dados: {}", e);
        // ... modo de configuração
    }
};
```

### **Passo 2: Decisão de Execução**
```rust
// src/main.rs - Linhas 136-188
if run_migrations {
    info!("Verificando migrações pendentes (APP_ENV={}, RUN_MIGRATIONS={:?})...", app_env, run_migrations_env);
    // ... executa migrações
} else {
    info!("Pulado: execução de migrações (APP_ENV={}, RUN_MIGRATIONS={:?})", app_env, run_migrations_env);
}
```

### **Passo 3: Execução das Migrações**
```rust
// src/main.rs - Linhas 140-184
loop {
    match MIGRATOR.run(&pool).await {
        Ok(()) => break,
        Err(MigrateError::VersionMissing(version)) => {
            // ... tratamento de erro
        }
        Err(MigrateError::VersionMismatch(version)) => {
            // ... tratamento de erro
        }
        Err(other) => {
            panic!("Falha ao aplicar migrações do banco de dados: {other}");
        }
    }
}
```

---

## 🔍 **6. Como Verificar se Migrações Serão Executadas**

### **A. Verificar Variáveis de Ambiente**
```bash
echo "RUN_MIGRATIONS: $RUN_MIGRATIONS"
echo "APP_ENV: $APP_ENV"
echo "DATABASE_URL: $DATABASE_URL"
```

### **B. Verificar Arquivo .env**
```bash
cat .env | grep RUN_MIGRATIONS
cat .env | grep APP_ENV
```

### **C. Verificar db_config.json**
```bash
cat db_config.json
```

---

## 🎛️ **7. Controles de Configuração Disponíveis**

### **Variáveis de Ambiente Principais**
```bash
# Controle principal das migrações
RUN_MIGRATIONS=true/false

# Ambiente da aplicação
APP_ENV=development/production

# URL do banco de dados
DATABASE_URL=postgresql://user:password@host:port/database

# Configurações opcionais
SESSION_TIMEOUT_HOURS=12
CACHE_TTL_SECONDS=300
RUST_LOG=info
```

### **Configuração via db_config.json**
```json
{
  "host": "192.168.15.9",
  "port": "5432",
  "user": "postgres",
  "password": "MJs119629",
  "database": "sgp"
}
```

---

## 📈 **8. Exemplos de Configuração**

### **Desenvolvimento (Executa Migrações)**
```bash
# .env
RUN_MIGRATIONS=true
APP_ENV=development
DATABASE_URL=postgresql://postgres:MJs119629@192.168.15.9:5432/sgp
```

### **Produção (Não Executa Migrações)**
```bash
# .env
RUN_MIGRATIONS=false
APP_ENV=production
DATABASE_URL=postgresql://postgres:MJs119629@192.168.15.9:5432/sgp
```

### **Teste (Executa Migrações)**
```bash
# .env
RUN_MIGRATIONS=true
APP_ENV=test
DATABASE_URL=postgresql://postgres:MJs119629@192.168.15.9:5432/sgp_test
```

---

## 🎯 **9. Resumo da Lógica de Decisão**

### **O Sistema Decide Executar Migrações Quando:**

1. **`RUN_MIGRATIONS=true`** (explícito)
2. **`RUN_MIGRATIONS` não está definida** E **`APP_ENV != "production"`**
3. **`APP_ENV=development`** (padrão)

### **O Sistema NÃO Executa Migrações Quando:**

1. **`RUN_MIGRATIONS=false`** (explícito)
2. **`RUN_MIGRATIONS` não está definida** E **`APP_ENV = "production"`**

---

## 🔧 **10. Como Alterar o Comportamento**

### **Para Executar Migrações:**
```bash
# Opção 1: Editar .env
echo "RUN_MIGRATIONS=true" >> .env

# Opção 2: Variável de ambiente
export RUN_MIGRATIONS=true

# Opção 3: Alterar APP_ENV
echo "APP_ENV=development" >> .env
```

### **Para NÃO Executar Migrações:**
```bash
# Opção 1: Editar .env
echo "RUN_MIGRATIONS=false" >> .env

# Opção 2: Variável de ambiente
export RUN_MIGRATIONS=false

# Opção 3: Alterar APP_ENV para production
echo "APP_ENV=production" >> .env
```

---

## 🎉 **Conclusão**

### **O Sistema Sabe que Precisa Rodar Migrações Através de:**

1. **✅ Variável `RUN_MIGRATIONS`** no arquivo `.env`
2. **✅ Variável `APP_ENV`** para determinar o ambiente
3. **✅ Configuração dupla** via `.env` e `db_config.json`
4. **✅ Lógica de decisão** no código (`src/main.rs`)
5. **✅ Sistema de prioridades** entre diferentes fontes de configuração

### **Configuração Atual do Seu Sistema:**
- **`RUN_MIGRATIONS=true`** ← **Executa migrações**
- **`APP_ENV=development`** ← **Ambiente de desenvolvimento**
- **`DATABASE_URL`** ← **Configurado via .env**

**Portanto, o sistema está configurado para executar migrações automaticamente!** 🚀

