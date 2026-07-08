# Release

## v1.4.3 — 2026-07-08

### 🐛 Correções críticas

**Relatórios de Fechamento (API)**
- Corrigido cálculo de valores de itens com quantidade > 1 em todos os tipos de produção (totem, adesivo, lona, canga, mochilinha, etc.)
- A função `get_item_value` agora usa o mapa de campos correto espelhado do `pricing.py`
- Removido o "ajuste silencioso" que distribuía diferenças de valor entre itens, gerando valores residuais falsos
- `calculate_order_value` agora usa `valor_itens` do banco (sem frete) como fonte de verdade

**Tela de Criação de Pedido (Frontend)**
- Corrigido loop infinito de re-render: 7 `useEffect` que dependiam de `tabsData` inteiro foram consolidados em 1 único effect estável
- Corrigido geração de IDs duplicados nas abas de itens ao remover e re-adicionar
- Corrigido leitura do cache de rascunho executada em todo re-render

Esses bugs causavam comportamento aleatório na tela de criação: campos que não aceitavam digitação, selects que não respondiam ao clique e checkboxes travados.



## Chaves do updater

Gere o par de chaves do updater com a versão atual do Tauri CLI:

```bash
pnpm tauri signer generate
```

A chave publica gerada deve ficar em `src-tauri/tauri.conf.json`, em `plugins.updater.pubkey`.

A chave privada nunca deve ser commitada. Coloque o conteudo dela no secret do GitHub:

```text
TAURI_SIGNING_PRIVATE_KEY
```

Esse secret precisa conter o arquivo completo da chave privada minisign, incluindo a linha `untrusted comment: minisign secret key`. Se voce colar apenas a linha base64, o build falha com `Missing comment in secret key`.

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

Se o build falhar com erro de assinatura do tipo `Missing comment in secret key` ou `incorrect updater private key password`, regenere a chave privada com o `@tauri-apps/cli` atual e substitua o secret no GitHub. Chaves geradas por versões antigas do CLI podem nao ser aceitas pelo processo de build.

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
