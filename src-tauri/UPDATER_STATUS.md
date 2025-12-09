# 🔄 Status do Atualizador Manual

## ✅ Situação Atual
- `tauri-plugin-updater` removido.
- Apenas os comandos manuais estão expostos.
- Frontend e documentação atualizados para usar o fluxo manual.
- Endpoint oficial `https://sgp.finderbit.com.br/update` retornando manifesto no formato Tauri (`platforms` + `pub_date`), com fallback para JSON simples.

## 🧱 Componentes Principais
| Camada    | Arquivo                                 | Observação |
|-----------|-----------------------------------------|------------|
| Backend   | `src/commands/manual_updater.rs`        | Comandos `check`, `download`, `install`. |
| Frontend  | `FRONTEND_UPDATER_EXAMPLE.tsx`          | Hook `useManualUpdater` + UI. |
| Docs      | `MANUAL_UPDATER_GUIDE.md`, `TAURI_UPDATER_GUIDE.md`, `UPDATER_FIXES.md` | Explicam o fluxo atual. |

## 🔁 Fluxo Resumido
1. Frontend resolve a URL do manifest (`VITE_SGP_MANIFEST_URL` → global → meta tag → fallback `https://sgp.finderbit.com.br/update`).
2. `check_update_manual` lê o JSON (compatível com formato Tauri ou simples) e retorna `available/latest_version/url/signature`.
3. `download_update_manual` salva o arquivo no cache.
4. `install_update_manual` executa o instalador do sistema (MSI/DEB/TAR.GZ) e reinicia o app.

## 🧪 Como validar
```typescript
const info = await invoke('check_update_manual', { manifestUrl });
if (info.available) {
  const filePath = await invoke('download_update_manual', { updateUrl: info.url });
  await invoke('install_update_manual', { filePath });
}
```

## 📌 Pendências / Melhorias Sugeridas
1. Automatizar publicação do manifest e do instalador no deploy.
2. Adicionar validação de hash após download.
3. Implementar página/admin para atualizar o manifest com novas versões.

> Enquanto o updater oficial não volta, este fluxo é o **único caminho** suportado para entregar releases aos usuários.
