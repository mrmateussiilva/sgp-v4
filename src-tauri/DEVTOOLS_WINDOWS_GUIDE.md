# DevTools para Windows - Guia de Configuração

## ✅ Configuração Completa

O DevTools foi configurado com sucesso no seu aplicativo Tauri para funcionar tanto em desenvolvimento quanto em produção no Windows.

## 🚀 Como Usar

### 1. Atalhos de Teclado
- **F12**: Alterna o DevTools (abre/fecha)
- **Ctrl+Shift+I**: Alterna o DevTools (abre/fecha)
- **Ctrl+Shift+J**: Abre o DevTools

### 2. Comandos Tauri (Frontend)
```javascript
// Abrir DevTools
await invoke('open_devtools');

// Fechar DevTools
await invoke('close_devtools');

// Alternar DevTools
await invoke('toggle_devtools');

// Verificar se está aberto (sempre retorna false por limitação)
await invoke('is_devtools_open');
```

## 🔧 Configurações Implementadas

### Cargo.toml
```toml
tauri = { version = "1.5.4", features = [ "dialog-all", "shell-open", "updater", "devtools"] }
```

### tauri.conf.json
- ✅ Feature `devtools` habilitada
- ✅ Atalhos de teclado configurados
- ✅ Janela principal com label "main"
- ✅ Configuração específica para Windows com `embedBootstrapper`

### Comandos Rust
- ✅ `open_devtools()` - Abre o DevTools
- ✅ `close_devtools()` - Fecha o DevTools
- ✅ `toggle_devtools()` - Alterna o estado
- ✅ `is_devtools_open()` - Verifica se está aberto

## 🏗️ Build e Teste

### Script de Teste Windows
Execute o script `test_devtools_windows.bat` para:
1. Verificar todas as configurações
2. Compilar em modo debug e release
3. Testar a funcionalidade

```cmd
test_devtools_windows.bat
```

### Build Manual
```cmd
# Debug
cargo build

# Release
cargo build --release

# Executar
target\release\sgp-v4.exe
```

## 🎯 Funcionalidades

### ✅ Funciona em:
- ✅ Modo desenvolvimento (`cargo tauri dev`)
- ✅ Modo produção (`cargo build --release`)
- ✅ Builds distribuídos
- ✅ Windows 10/11

### 🔍 DevTools Inclui:
- ✅ Console para logs JavaScript
- ✅ Inspector de elementos HTML
- ✅ Network tab para requisições
- ✅ Sources para debug
- ✅ Application tab para storage
- ✅ Performance profiling

## 🚨 Notas Importantes

1. **Permissões**: O DevTools funcionará mesmo em builds de produção
2. **Segurança**: Considere desabilitar em builds finais se necessário
3. **Performance**: O DevTools pode impactar performance quando aberto
4. **Windows**: Funciona nativamente no Windows sem configurações adicionais

## 🛠️ Troubleshooting

### DevTools não abre
1. Verifique se a feature `devtools` está no Cargo.toml
2. Confirme que os atalhos estão configurados no tauri.conf.json
3. Teste com `invoke('open_devtools')` no frontend

### Atalhos não funcionam
1. Verifique se a janela tem label "main"
2. Confirme os atalhos no tauri.conf.json
3. Teste com diferentes combinações de teclas

### Build falha
1. Execute `cargo clean`
2. Recompile com `cargo build --release`
3. Verifique se todas as dependências estão atualizadas

## 📝 Exemplo de Uso no Frontend

```typescript
// React/Vue/Angular
import { invoke } from '@tauri-apps/api/tauri';

// Botão para abrir DevTools
const openDevTools = async () => {
  try {
    await invoke('open_devtools');
    console.log('DevTools aberto!');
  } catch (error) {
    console.error('Erro ao abrir DevTools:', error);
  }
};

// Botão para alternar DevTools
const toggleDevTools = async () => {
  try {
    await invoke('toggle_devtools');
  } catch (error) {
    console.error('Erro ao alternar DevTools:', error);
  }
};
```

## 🎉 Conclusão

O DevTools está completamente configurado e funcionando no seu aplicativo Tauri para Windows. Você pode usar tanto os atalhos de teclado quanto os comandos programáticos para acessar as ferramentas de desenvolvimento em qualquer momento.
