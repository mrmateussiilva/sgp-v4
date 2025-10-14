# Guia de Contribuição

Obrigado por considerar contribuir com o SGP v4! 

## 🤝 Como Contribuir

### Reportando Bugs

1. Verifique se o bug já foi reportado nas [Issues](../../issues)
2. Se não, crie uma nova issue com:
   - Título descritivo
   - Descrição detalhada do problema
   - Passos para reproduzir
   - Comportamento esperado vs. atual
   - Screenshots (se aplicável)
   - Informações do ambiente (OS, versões)

### Sugerindo Melhorias

1. Abra uma issue com o prefixo `[FEATURE]`
2. Descreva a funcionalidade proposta
3. Explique o problema que ela resolve
4. Sugira possíveis implementações

### Pull Requests

1. **Fork o repositório**
2. **Clone seu fork:**
   ```bash
   git clone https://github.com/seu-usuario/sgp_v4.git
   ```

3. **Crie uma branch:**
   ```bash
   git checkout -b feature/minha-feature
   # ou
   git checkout -b fix/meu-bug-fix
   ```

4. **Faça suas alterações:**
   - Siga os padrões de código do projeto
   - Adicione testes se necessário
   - Atualize a documentação

5. **Commit suas mudanças:**
   ```bash
   git add .
   git commit -m "feat: adiciona nova funcionalidade X"
   ```

6. **Push para seu fork:**
   ```bash
   git push origin feature/minha-feature
   ```

7. **Abra um Pull Request**

## 📝 Padrões de Código

### TypeScript/React

- Use TypeScript para tipagem forte
- Componentes funcionais com hooks
- Props tipadas com interfaces
- ESLint e Prettier configurados

### Rust

- Siga as convenções do Rust
- Use `cargo fmt` antes de commit
- Execute `cargo clippy` para verificar warnings
- Adicione comentários em funções complexas

### Commits

Siga o padrão [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação
- `refactor:` Refatoração
- `test:` Testes
- `chore:` Tarefas gerais

Exemplos:
```
feat: adiciona exportação em Excel
fix: corrige cálculo de subtotal
docs: atualiza guia de instalação
```

## 🧪 Testes

Antes de submeter um PR:

```bash
# Executar testes
npm test

# Verificar lint
npm run lint

# Formatar código
npm run format

# Verificar build
npm run build
npm run tauri:build
```

## 📚 Documentação

Ao adicionar novas features:

1. Atualize o README.md
2. Adicione comentários no código
3. Documente APIs e comandos Tauri
4. Atualize exemplos se necessário

## ✅ Checklist do PR

Antes de submeter, verifique:

- [ ] O código segue os padrões do projeto
- [ ] Testes passam (`npm test`)
- [ ] Lint passa (`npm run lint`)
- [ ] Build funciona (`npm run build`)
- [ ] Documentação atualizada
- [ ] Commits seguem o padrão
- [ ] Branch está atualizada com main

## 🐛 Debugging

### Frontend (React)

```bash
npm run dev
# Abra http://localhost:1420
# Use DevTools do navegador
```

### Backend (Tauri/Rust)

```bash
# Com logs detalhados
RUST_LOG=debug npm run tauri:dev

# No código Rust, use:
tracing::info!("Log message");
tracing::error!("Error: {}", e);
```

### Banco de Dados

```bash
# Verificar dados
psql -U postgres -d sgp_database

# Ver queries
SET log_statement = 'all';
```

## 🔍 Code Review

Pull Requests serão revisados para:

- Qualidade do código
- Performance
- Segurança
- Testes adequados
- Documentação clara

## 📞 Suporte

Dúvidas? Entre em contato:

- Abra uma issue
- Consulte a [documentação](README.md)
- Verifique issues existentes

## 📜 Código de Conduta

Este projeto adere a padrões de conduta profissional:

- Seja respeitoso e construtivo
- Aceite críticas construtivas
- Foque no que é melhor para a comunidade
- Mostre empatia com outros contribuidores

---

**Obrigado por contribuir! 🎉**



