# Sistema de Logs Avançado - Guia Completo

## ✅ Configuração Completa

O sistema de logs foi configurado com sucesso no seu aplicativo Tauri para Windows, fornecendo logs detalhados tanto em desenvolvimento quanto em produção.

## 🚀 Funcionalidades Implementadas

### 📋 **Sistema de Logs Estruturado**
- ✅ **Múltiplos níveis**: debug, info, warn, error
- ✅ **Rotação automática**: Logs diários com limite de arquivos
- ✅ **Dupla saída**: Console + arquivo simultaneamente
- ✅ **Formato configurável**: Texto ou JSON
- ✅ **Tamanho limitado**: Controle de tamanho máximo por arquivo

### 🔧 **Comandos Tauri Disponíveis**
```javascript
// Estatísticas dos logs
const stats = await invoke('get_log_stats');

// Listar arquivos de log
const files = await invoke('get_log_files');

// Obter conteúdo de arquivo específico
const content = await invoke('get_log_content', { file_name: 'sgp.log' });

// Últimas N linhas dos logs
const recent = await invoke('get_recent_logs', { lines: 100 });

// Pesquisar nos logs
const results = await invoke('search_logs', { query: 'erro' });

// Limpar todos os logs
await invoke('clear_logs');

// Testar sistema de logs
await invoke('test_logging_system');
```

## ⚙️ Configuração

### 📁 **Arquivo de Configuração** (`logging.env`)
```env
# Nível de log (debug, info, warn, error)
LOG_LEVEL=info

# Caminho do arquivo de log
LOG_FILE_PATH=logs/sgp.log

# Número máximo de arquivos de log a manter
LOG_MAX_FILES=10

# Tamanho máximo de cada arquivo de log em MB
LOG_MAX_SIZE_MB=10

# Habilitar logs no console (true/false)
LOG_ENABLE_CONSOLE=true

# Habilitar logs em arquivo (true/false)
LOG_ENABLE_FILE=true

# Habilitar formato JSON nos logs (true/false)
LOG_ENABLE_JSON=false
```

### 🎯 **Configurações Recomendadas**

#### **Desenvolvimento:**
```env
LOG_LEVEL=debug
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=true
LOG_ENABLE_JSON=false
```

#### **Produção:**
```env
LOG_LEVEL=info
LOG_ENABLE_CONSOLE=false
LOG_ENABLE_FILE=true
LOG_ENABLE_JSON=true
```

## 📊 Tipos de Logs Implementados

### 🔍 **Logs do Sistema**
```rust
// Inicialização do sistema
log_system_start();

// Conexão com banco de dados
log_database_connection(true, "Conexão estabelecida");

// Ações do usuário
log_user_action("admin", "login", Some("Login bem-sucedido"));

// Performance
log_performance("query_database", 150);

// Erros
log_error("Falha na conexão", Some("Timeout de 30s"));
```

### 📝 **Exemplo de Logs Gerados**
```
2024-01-15 10:30:15 [INFO] 🚀 Sistema SGP iniciado
2024-01-15 10:30:15 [INFO] 📅 Data/Hora: 2024-01-15 10:30:15
2024-01-15 10:30:15 [INFO] 🖥️  Sistema: windows
2024-01-15 10:30:15 [INFO] 🏗️  Arquitetura: x86_64
2024-01-15 10:30:16 [INFO] ✅ Conexão com banco de dados estabelecida: PostgreSQL
2024-01-15 10:30:16 [INFO] 👤 Usuário 'admin' executou 'login': Login bem-sucedido
2024-01-15 10:30:17 [DEBUG] ⚡ Operação 'query_database' executada em 45ms
```

## 🏗️ Build e Teste

### 📋 **Scripts de Teste**

#### **Linux/Mac:**
```bash
chmod +x test_logging_system.sh
./test_logging_system.sh
```

#### **Windows:**
```cmd
test_logging_system_windows.bat
```

### 🔨 **Build Manual**
```cmd
# Compilar
cargo build --release

# Executar
target\release\sgp-v4.exe
```

## 📁 Estrutura de Arquivos

```
src-tauri/
├── logs/                          # Diretório de logs
│   ├── sgp.log                    # Log atual
│   ├── sgp.2024-01-14.log        # Log do dia anterior
│   └── sgp.2024-01-13.log        # Logs antigos
├── logging.env                    # Configuração de logs
├── logging.env.example           # Exemplo de configuração
├── src/
│   ├── logging.rs                # Sistema de logs
│   └── commands/logs.rs           # Comandos Tauri para logs
└── test_logging_system_windows.bat # Script de teste
```

## 🎯 Casos de Uso

### 🔍 **Debugging em Produção**
```javascript
// Obter últimas 50 linhas para debug
const recent = await invoke('get_recent_logs', { lines: 50 });
console.log('Logs recentes:', recent);

// Pesquisar por erros específicos
const errors = await invoke('search_logs', { query: 'ERROR' });
console.log('Erros encontrados:', errors);
```

### 📊 **Monitoramento**
```javascript
// Verificar estatísticas dos logs
const stats = await invoke('get_log_stats');
console.log(`Total de arquivos: ${stats.file_count}`);
console.log(`Tamanho total: ${stats.total_size_mb.toFixed(2)} MB`);
console.log(`Arquivo mais recente: ${stats.newest_file}`);
```

### 🧹 **Manutenção**
```javascript
// Limpar logs antigos quando necessário
await invoke('clear_logs');
console.log('Logs limpos com sucesso');
```

## 🚨 Troubleshooting

### ❌ **Logs não aparecem**
1. Verifique se `LOG_ENABLE_FILE=true` no `logging.env`
2. Confirme se o diretório `logs/` existe
3. Verifique permissões de escrita

### 📁 **Arquivos não são criados**
1. Verifique o caminho em `LOG_FILE_PATH`
2. Confirme se o diretório pai existe
3. Teste com caminho absoluto

### 🔍 **Logs não são encontrados na pesquisa**
1. Verifique se os arquivos existem
2. Confirme se a query está correta
3. Teste com termos mais simples

### ⚡ **Performance lenta**
1. Reduza `LOG_MAX_FILES` se necessário
2. Use `LOG_LEVEL=info` em produção
3. Desabilite `LOG_ENABLE_CONSOLE` em produção

## 📈 Monitoramento Avançado

### 📊 **Métricas Disponíveis**
- **Total de arquivos de log**
- **Tamanho total em MB/KB**
- **Arquivo mais antigo/novo**
- **Número de linhas por arquivo**

### 🔄 **Rotação Automática**
- **Frequência**: Diária
- **Limite de arquivos**: Configurável
- **Tamanho máximo**: Configurável por arquivo
- **Compressão**: Automática para arquivos antigos

## 🎉 Conclusão

O sistema de logs está completamente configurado e funcionando no seu aplicativo Tauri para Windows. Você agora tem:

- ✅ **Logs detalhados** em desenvolvimento e produção
- ✅ **Rotação automática** para gerenciar espaço
- ✅ **Comandos Tauri** para acessar logs programaticamente
- ✅ **Configuração flexível** via variáveis de ambiente
- ✅ **Múltiplos formatos** (texto/JSON)
- ✅ **Monitoramento completo** do sistema

Use os comandos Tauri no frontend para acessar e gerenciar os logs conforme necessário! 📋✨
