# 🔄 Guia do Atualizador Manual – SGP v4

Este projeto deixou de usar o `tauri-plugin-updater` e agora conta apenas com o fluxo **manual** implementado em `src/commands/manual_updater.rs`. O objetivo é permitir atualizações sem lidar com chaves minisign.

---

## 📦 Componentes

- **Manifesto JSON** hospedado no servidor (`https://sgp.finderbit.com.br/update`) no formato do Tauri (`platforms`, `pub_date`, etc.) – ainda aceitamos o formato simples como fallback.
- **Comandos Tauri**
  - `check_update_manual(manifestUrl)` – lê o manifest e compara com `CARGO_PKG_VERSION`.
  - `download_update_manual(updateUrl)` – baixa o instalador para o cache do app.
  - `install_update_manual(filePath)` – dispara `msiexec` / `dpkg` / `tar` conforme o SO.
- **Hook React de exemplo** em `FRONTEND_UPDATER_EXAMPLE.tsx`.

---

## 🌐 Manifesto de Atualizações

O backend de produção responde em `https://sgp.finderbit.com.br/update` com algo como:

```json
{
  "version": "1.0.1",
  "notes": "Correções gerais.",
  "pub_date": "2025-01-01T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "url": "https://sgp.finderbit.com.br/update/releases/windows/SGP_1.0.1_x64.msi",
      "signature": "..."
    }
  }
}
```

> Se você tiver apenas um arquivo estático (`version`, `url`, `notes`, `date`), mantenha o endpoint retornando esse JSON simples que também será aceito.

---

## ⚙️ Configurando a URL no Frontend

`FRONTEND_UPDATER_EXAMPLE.tsx` resolve o manifest na ordem:

1. `import.meta.env.VITE_SGP_MANIFEST_URL`
2. `window.__SGP_MANIFEST_URL__`
3. `<meta name="sgp-manifest-url" content="...">`
4. Fallback `https://sgp.finderbit.com.br/update`

Defina a variável `VITE_SGP_MANIFEST_URL` (ou o meta tag/global) no seu frontend para cada ambiente.

---

## 🧠 Fluxo do Hook

```typescript
const {
  updateAvailable,
  updateInfo,
  isChecking,
  isDownloading,
  isInstalling,
  checkForUpdates,
  downloadAndInstall,
} = useManualUpdater();
```

1. `checkForUpdates()` → `check_update_manual`
2. Armazena `updateInfo` se `available = true`
3. `downloadAndInstall()` → `download_update_manual` → `install_update_manual`
4. Mostra alertas com `alert()` personalizado

---

## 🖥️ UI Recomendada

Use os componentes do exemplo:

```tsx
const updater = useManualUpdater();

return (
  <>
    <UpdateNotification {...updater} />
    <UpdateManager {...updater} />
  </>
);
```

- `UpdateNotification` – toasts com CTAs *Baixar e Instalar*.
- `UpdateManager` – painel com versões e botões.

---

## 🔐 Observações de Segurança

- Esse fluxo **não valida assinatura**; distribua apenas em ambientes confiáveis.
- Publique os instaladores em HTTPS e limite o acesso sempre que possível.
- Ative novamente o updater oficial do Tauri apenas quando as chaves minisign estiverem configuradas.

---

## ✅ Checklist

- [ ] Manifest hospedado com URL válida.
- [ ] Variável `VITE_SGP_MANIFEST_URL`/meta/global configurada.
- [ ] Comandos manuais expostos no backend.
- [ ] UI integrada usando `useManualUpdater`.
- [ ] Teste manual nos 3 comandos antes de publicar releases.

> Para detalhes linha a linha, consulte também `MANUAL_UPDATER_GUIDE.md`.
