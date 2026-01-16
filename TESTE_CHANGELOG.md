# 🧪 Guia de Teste - Changelog após Atualização

## Como testar localmente

### Passo 1: Simular versão anterior
1. Abra o DevTools do app (F12)
2. No console, execute:
```javascript
localStorage.setItem('previous_version', '1.0.10');
localStorage.setItem('show_changelog_after_update', 'true');
```

### Passo 2: Alterar versão atual
1. Edite `src-tauri/Cargo.toml` e altere a versão para `1.0.12` (ou qualquer versão diferente)
2. Recompile o app: `pnpm tauri:dev` ou `pnpm tauri:build`

### Passo 3: Reiniciar o app
1. Feche completamente o app
2. Abra novamente
3. O modal de changelog deve aparecer automaticamente após ~1 segundo

### Passo 4: Verificar funcionamento
- ✅ Modal deve aparecer automaticamente
- ✅ Deve mostrar o changelog da versão 1.0.12
- ✅ Deve extrair apenas a seção da versão específica
- ✅ Ao fechar, as flags devem ser removidas do localStorage

## Teste alternativo (sem recompilar)

Se quiser testar sem recompilar, você pode:

1. No console do DevTools:
```javascript
// Simular que acabou de atualizar
localStorage.setItem('previous_version', '1.0.10');
localStorage.setItem('show_changelog_after_update', 'true');

// Forçar verificação (recarregar a página)
window.location.reload();
```

2. O App.tsx vai detectar e mostrar o changelog (mas vai buscar a versão atual do Cargo.toml)

## Limpar flags de teste

Para limpar as flags após testar:
```javascript
localStorage.removeItem('show_changelog_after_update');
localStorage.removeItem('previous_version');
```
