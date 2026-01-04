# 🔧 Atualizador Simplificado – Ajustes Concluídos

Com a remoção do `tauri-plugin-updater`, todo o fluxo de atualização passou a ser **manual**. Este documento resume o que foi implementado e como validar.

---

## ✅ O que foi feito

- Remoção do módulo `src/updater.rs` e da dependência `tauri-plugin-updater`.
- Exposição apenas dos comandos:
  - `check_update_manual(manifestUrl: String)`
  - `download_update_manual(updateUrl: String)`
  - `install_update_manual(filePath: String)`
- Atualização do exemplo React para consumir esses comandos.
- Configuração da URL de manifest (`https://sgp.finderbit.com.br/update` por padrão) via `VITE_SGP_MANIFEST_URL`, meta tag ou variável global.
- Parser atualizado para aceitar tanto o formato simples (`version/url`) quanto o formato oficial do Tauri (`platforms`, `pub_date`, `signature`).

---

## 🛠️ Como testar rapidamente

```typescript
await invoke('check_update_manual', { manifestUrl: 'https://sgp.finderbit.com.br/update' });
const filePath = await invoke('download_update_manual', { updateUrl: 'https://sgp.finderbit.com.br/update/releases/windows/SGP_1.0.1_x64.msi' });
await invoke('install_update_manual', { filePath });
```

Verifique os logs do backend (tracing) para acompanhar downloads e instalação conforme o SO.

---

## 📂 Referências úteis

- `src/commands/manual_updater.rs`
- `FRONTEND_UPDATER_EXAMPLE.tsx`
- `MANUAL_UPDATER_GUIDE.md`
- `TAURI_UPDATER_GUIDE.md`

---

## 🔮 Próximos passos sugeridos

1. Automatizar a publicação do manifesto JSON durante o deploy.
2. Adicionar validação básica (hash/CKSUM) após o download.
3. Documentar procedimentos para cada SO no manual de operações.
