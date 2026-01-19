# Variáveis Necessárias para o Template de Produção

## ⚠️ IMPORTANTE
O template usa Handlebars (`{{variavel}}`). O backend **DEVE** fornecer TODAS estas variáveis no contexto de renderização.

## 📋 Variáveis Obrigatórias

### Header
```python
{
    "data_envio": "20/01/2026",  # Data de envio formatada
    "prioridade": "Alta",         # "Alta", "Média" ou "Baixa"
    "forma_envio": "PRETTI CARGAS",  # Nome da transportadora
    
    # Opcionais para badges de urgência
    "urgencia_atrasado": True,    # Booleano - pedido está atrasado?
    "urgencia_hoje": False,       # Booleano - entrega é hoje?
}
```

### Pedido e Cliente
```python
{
    "numero": "0000000116",       # Número do pedido
    "is_reposicao": False,        # Booleano - é reposição?
    "cliente": "MATEUS",          # Nome do cliente
    "telefone_cliente": "(00) 00000-0000",
    "cidade_estado": "Colatina - ES",  # Pode ser None
    "tipo_producao": "painel",    # "painel", "lona", "totem" ou "adesivo"
}
```

### Produto/Item
```python
{
    "descricao": "MATE",          # Nome do produto
    "dimensoes": "3 x 3 = 9,00 m²",  # Formatado
    "quantity": 2,                # Numérico
    "material": "ATOLHADO",       # Nome do material
    "emenda_label": "Horizontal",  # Label de emenda
    "emenda_qtd": 198,            # Quantidade de emendas (opcional)
}
```

### Especificações por Tipo

#### Para PAINEL:
```python
{
    "acabamentos_painel": "Overloque + Elástico",
    "overloque": "Sim",
    "elastico": "Sim",
    "ilhos_resumo": "Nenhum",
    "cordinha_resumo": "Nenhum"
}
```

#### Para TOTEM:
```python
{
    "acabamento_totem_resumo": "Vertical (3)",
    "quantidade_totem": 3  # Opcional
}
```

#### Para LONA:
```python
{
    "acabamento_lona": "Sem Acabamento",
    "quantidade_ilhos": 0,
    "espaco_ilhos": "N/A"
}
```

#### Para ADESIVO:
```python
{
    "tipo_adesivo": "Vinil Adesivo",
    "quantidade_adesivo": 50
}
```

### Imagem
```python
{
    "imagem": "/path/to/image.jpg",  # Caminho da imagem OU URL base64
    "legenda_imagem": "Arte aprovada"  # Opcional
}
```

**CRÍTICO**: Se não houver imagem, deixe `None` ou string vazia. O template mostrará "SEM PRÉVIA".

### Observações
```python
{
    "observacao_pedido": "[REPOSIÇÃO] Baseado no pedido #123 - Cliente pediu cores mais vibrantes",
    "observacao_item": "Verificar alinhamento da arte antes de imprimir"
}
```

Ambas são opcionais. Se vazias, as seções não aparecem.

### Footer
```python
{
    "designer": "MAICON",
    "vendedor": "Andre"
}
```

---

## 🔍 Exemplo Completo de Contexto

```python
context = {
    # Header
    "data_envio": "20/01/2026",
    "prioridade": "NORMAL",
    "forma_envio": "PRETTI CARGAS",
    "urgencia_atrasado": False,
    "urgencia_hoje": False,
    
    # Pedido
    "numero": "0000000116",
    "is_reposicao": False,
    "cliente": "MATEUS",
    "telefone_cliente": "(00) 00000-0000",
    "cidade_estado": "Colatina",
    "tipo_producao": "painel",
    
    # Produto
    "descricao": "MATE",
    "dimensoes": "3 x 3 = 9,00 m²",
    "quantity": 2,
    "material": "ATOLHADO",
    "emenda_label": "Horizontal",
    "emenda_qtd": 198,
    
    # Specs de Painel
    "acabamentos_painel": "Overloque + Elástico",
    "overloque": "Sim",
    "elastico": "Sim",
    "ilhos_resumo": "Nenhum",
    "cordinha_resumo": "Nenhum",
    
    # Imagem
    "imagem": "/media/uploads/pedido_116_arte.jpg",
    "legenda_imagem": None,
    
    # Observações
    "observacao_pedido": None,
    "observacao_item": "Verificar cores",
    
    # Footer
    "designer": "MAICON",
    "vendedor": "Andre"
}
```

---

## 🐛 Debugging

Se algo não aparece, verifique:

1. **Variável está definida?** `print(context.get('data_envio'))`
2. **Nome está correto?** Case-sensitive!
3. **Valor não é vazio?** `None`, `""` ou `[]` não renderizam
4. **Loop `{{#each items}}`**: Certifique-se de que está iterando sobre uma lista de itens

---

## 🔧 Template Engine

O template usa **Handlebars**. Sintaxe:
- `{{variavel}}` - Renderiza valor
- `{{#if variavel}}...{{/if}}` - Condicional
- `{{#each items}}...{{/each}}` - Loop
- `{{#eq a b}}...{{/eq}}` - Comparação (helper customizado)

---

**Próximos Passos:**
1. Verifique no backend qual contexto está sendo passado
2. Compare com esta lista
3. Adicione as variáveis faltantes
4. Teste a renderização
