# 🔄 Diagrama do Fluxo de Decisão das Migrações

## 📊 **Fluxo de Decisão das Migrações**

```
┌─────────────────────────────────────────────────────────────────┐
│                    INÍCIO DA APLICAÇÃO                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              CARREGAR CONFIGURAÇÕES                            │
│                                                                 │
│  1. Procurar db_config.json                                    │
│  2. Se não encontrar, carregar .env                            │
│  3. Se não encontrar, usar variáveis de ambiente               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              VERIFICAR RUN_MIGRATIONS                           │
│                                                                 │
│  RUN_MIGRATIONS está definida?                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
              ┌───────┴───────┐
              │               │
              ▼               ▼
    ┌─────────────────┐ ┌─────────────────┐
    │   SIM (true)    │ │   NÃO (false)   │
    │                 │ │                 │
    │ Executar        │ │ Verificar       │
    │ Migrações       │ │ APP_ENV         │
    └─────────────────┘ └─────────┬───────┘
                                  │
                                  ▼
                        ┌─────────────────┐
                        │  APP_ENV = ?    │
                        └─────────┬───────┘
                                  │
                          ┌───────┴───────┐
                          │               │
                          ▼               ▼
                ┌─────────────────┐ ┌─────────────────┐
                │  development    │ │   production    │
                │                 │ │                 │
                │ Executar        │ │ NÃO Executar    │
                │ Migrações       │ │ Migrações       │
                └─────────────────┘ └─────────────────┘
```

## 🎯 **Lógica de Decisão Detalhada**

### **1. Carregamento de Configuração**
```
┌─────────────────────────────────────────────────────────────────┐
│                    FONTES DE CONFIGURAÇÃO                      │
│                                                                 │
│  1. db_config.json (Prioridade 1)                              │
│     └── Carrega configurações do banco                          │
│                                                                 │
│  2. .env (Prioridade 2)                                        │
│     └── Carrega variáveis de ambiente                          │
│                                                                 │
│  3. Variáveis de Sistema (Prioridade 3)                        │
│     └── Usa variáveis já definidas no sistema                  │
└─────────────────────────────────────────────────────────────────┘
```

### **2. Decisão de Execução das Migrações**
```
┌─────────────────────────────────────────────────────────────────┐
│                    VERIFICAÇÃO RUN_MIGRATIONS                  │
│                                                                 │
│  RUN_MIGRATIONS está definida?                                 │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │    true     │    │   false     │    │  não definida │      │
│  │             │    │             │    │             │        │
│  │ Executar    │    │ NÃO Executar│    │ Verificar   │        │
│  │ Migrações   │    │ Migrações   │    │ APP_ENV     │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### **3. Verificação do Ambiente**
```
┌─────────────────────────────────────────────────────────────────┐
│                    VERIFICAÇÃO APP_ENV                         │
│                                                                 │
│  APP_ENV = ?                                                    │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │ development │    │  production │    │    test     │        │
│  │             │    │             │    │             │        │
│  │ Executar    │    │ NÃO Executar│    │ Executar    │        │
│  │ Migrações   │    │ Migrações   │    │ Migrações   │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 **Configurações Atuais do Sistema**

### **Arquivo: `.env`**
```bash
DATABASE_URL=postgresql://postgres:MJs119629@192.168.15.9:5432/sgp
RUN_MIGRATIONS=true          # ← EXECUTA MIGRAÇÕES
APP_ENV=development          # ← AMBIENTE DE DESENVOLVIMENTO
RUST_LOG=info
SESSION_TIMEOUT_HOURS=12
CACHE_TTL_SECONDS=300
```

### **Arquivo: `db_config.json`**
```json
{
  "host": "192.168.15.9",
  "port": "5432",
  "user": "postgres",
  "password": "MJs119629",
  "database": "sgp"
}
```

## 📊 **Resultado da Configuração Atual**

### **Fluxo de Decisão:**
1. **Carrega configuração**: `.env` encontrado ✅
2. **Verifica RUN_MIGRATIONS**: `true` ✅
3. **Decisão**: **EXECUTAR MIGRAÇÕES** ✅

### **Por que Executa Migrações:**
- **`RUN_MIGRATIONS=true`** está definido explicitamente
- **`APP_ENV=development`** (ambiente de desenvolvimento)
- **Configuração válida** encontrada

## 🎯 **Como Alterar o Comportamento**

### **Para NÃO Executar Migrações:**
```bash
# Opção 1: Alterar .env
RUN_MIGRATIONS=false

# Opção 2: Alterar ambiente
APP_ENV=production

# Opção 3: Remover variável (usa padrão do ambiente)
# Comentar ou remover a linha RUN_MIGRATIONS
```

### **Para Executar Migrações:**
```bash
# Opção 1: Alterar .env
RUN_MIGRATIONS=true

# Opção 2: Alterar ambiente
APP_ENV=development

# Opção 3: Manter configuração atual (já executa)
```

## 🚀 **Conclusão**

### **O Sistema Executa Migrações Porque:**

1. **✅ `RUN_MIGRATIONS=true`** está definido no `.env`
2. **✅ `APP_ENV=development`** (ambiente de desenvolvimento)
3. **✅ Configuração válida** encontrada
4. **✅ Lógica de decisão** determina execução

### **Configuração Atual:**
- **Status**: **EXECUTA MIGRAÇÕES** 🚀
- **Motivo**: `RUN_MIGRATIONS=true` + `APP_ENV=development`
- **Resultado**: Migrações são executadas automaticamente na inicialização

**O sistema está configurado para executar migrações automaticamente!** 🎉
