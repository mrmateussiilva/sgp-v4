# Release

Este projeto usa Tauri v2 e publica releases Windows pelo GitHub Actions quando uma tag `v*` e enviada ao repositorio.

## Chaves do updater

Gere o par de chaves do updater:

```bash
npm run tauri signer generate
```

A chave publica gerada deve ficar em `src-tauri/tauri.conf.json`, em `plugins.updater.pubkey`.

A chave privada nunca deve ser commitada. Coloque o conteudo dela no secret do GitHub:

```text
TAURI_SIGNING_PRIVATE_KEY
```

Se a chave tiver senha, coloque a senha em:

```text
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

O workflow tambem usa o secret padrao do GitHub:

```text
GITHUB_TOKEN
```

## Configuracao do updater

O endpoint do updater deve apontar para o `latest.json` anexado na ultima GitHub Release:

```text
https://github.com/mrmateussiilva/sgp-v4/releases/latest/download/latest.json
```

O arquivo `latest.json` e gerado pela `tauri-apps/tauri-action` durante o release.

## Como publicar

Crie e envie uma tag no formato `v*`:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Isso executa `.github/workflows/release.yml`, que builda o app no Windows, cria a GitHub Release e anexa o instalador `.msi`, os arquivos `.sig` e o `latest.json`.

## Como testar o updater

Depois que o workflow terminar, acesse:

```text
https://github.com/mrmateussiilva/sgp-v4/releases/latest/download/latest.json
```

Esse arquivo deve existir e conter uma entrada para Windows apontando para o artefato publicado, com a assinatura do updater embutida.

## Assinatura do updater vs assinatura Windows

A assinatura do updater Tauri e o arquivo `.sig`. Ela e criada com `TAURI_SIGNING_PRIVATE_KEY` e validada pelo app usando a `pubkey` configurada em `tauri.conf.json`. Essa assinatura garante que o pacote baixado pelo updater foi publicado por quem possui a chave privada.

A assinatura Windows e outra coisa: e a assinatura Authenticode do instalador `.msi` usando um certificado de codigo, normalmente um `.pfx`. Ela melhora a confianca do Windows/SmartScreen, mas nao substitui a assinatura do updater Tauri.
