# Guia de Monitoramento de Memória - SGP v4

Este documento fornece instruções de como medir o uso de recursos do sistema nos diferentes componentes da arquitetura.

## 1. Monitoramento no Linux (Processos Locais)

Como o sistema está em desenvolvimento, vários processos rodam simultaneamente.

### Usando `htop` (Recomendado)
O `htop` é uma ferramenta visual excelente.
1. Abra o terminal.
2. Digite `htop`.
3. Pressione `F4` e digite `sgp` ou `tauri` para filtrar os processos do sistema.

### Usando `ps` (Comando Rápido)
Para ver apenas o consumo dos processos principais agora:
```bash
ps aux | grep -iE "tauri|sgp|vite" | grep -v grep
```

---

## 2. Monitoramento de Contêineres (Banco de Dados)

O PostgreSQL e o PgAdmin rodam dentro do Docker. Para ver quanto de memória eles estão consumindo em tempo real:

```bash
docker stats sgp_postgres sgp_pgadmin
```

---

## 3. Monitoramento do Frontend (Interface)

Como o Frontend é uma aplicação baseada em Webview (Tauri), você pode usar as ferramentas de desenvolvedor para inspecionar a memória do navegador interno.

1. Com a aplicação aberta, clique com o botão direito em qualquer lugar e selecione **"Inspecionar"** (ou use `Ctrl+Shift+I`).
2. Vá para a aba **Memory**.
3. Você pode tirar um "Heap Snapshot" para ver exatamente quais objetos estão ocupando espaço.

---

## 4. Notas Importantes sobre Ambiente de Desenvolvimento

> [!WARNING]
> O uso de memória que você vê agora **não reflete o uso em produção**.

No ambiente atual:
1. **Vite**: O bundler mantém muitos arquivos em memória para o "Hot Module Replacement" (atualização instantânea).
2. **Node.js**: Diversos processos auxiliares do `pnpm` e `tauri-cli` estão rodando.
3. **Debug Build**: O binário Rust compilado em modo debug (`target/debug/sgp-v4`) é muito maior e menos otimizado que a versão final (`release`).

Para uma medição real, o sistema deve ser testado após o comando `pnpm run tauri:build`.
