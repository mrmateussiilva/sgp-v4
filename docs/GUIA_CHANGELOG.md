# 📋 Guia do CHANGELOG - SGP v4

## 📍 Localização

O CHANGELOG está localizado em: **`documentation/CHANGELOG.md`**

O sistema busca automaticamente de:
```
https://raw.githubusercontent.com/mrmateussiilva/sgp-v4/main/documentation/CHANGELOG.md
```

## ✅ Processo ao Criar uma Nova Release

### 1. Atualizar o CHANGELOG.md

Antes de criar a release, adicione a nova versão no **topo** do arquivo:

```markdown
# Changelog - SGP v4

## [1.0.13] - 2025-01-XX

### ✨ Adicionado
- Nova funcionalidade X
- Melhoria Y

### 🐛 Corrigido
- Bug Z corrigido
- Problema W resolvido

### 🔧 Melhorado
- Performance do sistema X
- Interface do componente Y

## [1.0.12] - 2025-01-XX
...
```

### 2. Formato Recomendado

Use emojis para categorizar as mudanças:
- ✨ **Adicionado** - Novas funcionalidades
- 🐛 **Corrigido** - Correções de bugs
- 🔧 **Melhorado** - Melhorias em funcionalidades existentes
- 🔄 **Alterado** - Mudanças em funcionalidades existentes
- 🗑️ **Removido** - Funcionalidades removidas
- 🔒 **Segurança** - Correções de segurança
- 📝 **Documentação** - Mudanças na documentação

### 3. Commit e Push

```bash
git add documentation/CHANGELOG.md
git commit -m "docs: atualiza CHANGELOG para versão 1.0.13"
git push
```

### 4. Criar Release no GitHub

1. Vá para: https://github.com/mrmateussiilva/sgp-v4/releases/new
2. Crie uma nova release com a tag da versão (ex: `v1.0.13`)
3. Adicione uma descrição (pode copiar do CHANGELOG)
4. Anexe os arquivos de instalação (MSI, DEB, etc.)
5. Publique a release

### 5. Atualizar o Manifesto de Atualização

Atualize o arquivo `updater/latest.json` com a nova versão:

```json
{
  "version": "1.0.13",
  "notes": "Resumo das principais mudanças...",
  "pub_date": "2025-01-XXT00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "url": "https://github.com/mrmateussiilva/sgp-v4/releases/download/v1.0.13/SGP_1.0.13_x64.msi",
      "signature": "..."
    }
  }
}
```

## 🔍 Como Funciona

1. **Após atualização**: O app salva a versão anterior no localStorage
2. **Ao reiniciar**: O App.tsx detecta a mudança de versão
3. **Busca automática**: Chama `fetch_changelog` que busca do GitHub
4. **Extração**: Extrai apenas a seção da versão instalada
5. **Exibição**: Mostra o modal com o changelog formatado

## 📝 Exemplo Completo

```markdown
# Changelog - SGP v4

## [1.0.13] - 2025-01-15

### ✨ Adicionado
- **Tela de Changelog após Atualização**: Sistema agora exibe automaticamente as mudanças após atualizar
- Nova funcionalidade de exportação em CSV

### 🐛 Corrigido
- Corrigido erro ao salvar pedidos com caracteres especiais
- Resolvido problema de performance na listagem de pedidos

### 🔧 Melhorado
- Melhorada a interface do modal de changelog
- Otimizada a busca de pedidos

## [1.0.12] - 2025-01-XX
...
```

## ⚠️ Importante

- ✅ Sempre adicione a nova versão no **topo** do arquivo
- ✅ Use o formato `## [X.Y.Z] - YYYY-MM-DD`
- ✅ Mantenha o arquivo no repositório (não precisa anexar na release)
- ✅ Faça commit do CHANGELOG antes de criar a release
- ✅ O sistema busca automaticamente do branch `main`

## 🧪 Testar Localmente

Para testar se o changelog está sendo buscado corretamente:

1. Atualize o CHANGELOG.md com uma nova versão
2. Faça commit e push
3. No app, execute no console:
```javascript
localStorage.setItem('previous_version', '1.0.12');
localStorage.setItem('show_changelog_after_update', 'true');
window.location.reload();
```

O modal deve aparecer com o changelog da nova versão!
