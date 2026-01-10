# Casos de Uso - Sistema de Fechamentos

Este documento apresenta exemplos práticos de como usar o sistema de fechamentos para diferentes necessidades de negócio.

---

## 1. Fechamento de Comissão por Vendedor

### Objetivo
Calcular o valor total de vendas por vendedor para cálculo de comissão.

### Como Fazer

1. Acesse a página **Fechamentos**
2. Selecione o tipo de relatório: **Relatórios Sintéticos > Por Vendedor**
3. Configure o período desejado (ex: mês atual)
4. No filtro **Vendedor**, selecione o vendedor específico ou deixe "Todos" para ver todos
5. Selecione o status (geralmente "Concluído")
6. Clique em **Gerar Relatório**

### Exemplo de Resultado

```
Relatório Sintético — Totais por Vendedor
Período: 01/01/2024 - 31/01/2024
Status: Concluído

Grupos:
  - Vendedor: Maria Santos
    Total: R$ 15.450,00
      (Frete: R$ 800,00 + Serviços: R$ 14.650,00)
  
  - Vendedor: João Silva
    Total: R$ 22.300,00
      (Frete: R$ 1.200,00 + Serviços: R$ 21.100,00)

TOTAL GERAL: R$ 37.750,00
```

### Interpretação

- **Frete**: Soma dos valores de frete dos pedidos do vendedor (não duplicado)
- **Serviços**: Soma dos valores de todos os itens vendidos pelo vendedor
- **Total**: Frete + Serviços

**Importante para comissão**: O valor de comissão geralmente é calculado sobre o **valor de serviços** (itens), não sobre o frete.

---

## 2. Fechamento de Comissão por Designer

### Objetivo
Calcular o valor total de produção por designer para pagamento de comissão.

### Como Fazer

1. Tipo de relatório: **Relatórios Sintéticos > Por Designer**
2. Configure período e status
3. Opcional: Filtre por designer específico no campo **Designer**
4. Gere o relatório

### Exemplo de Resultado

```
Relatório Sintético — Totais por Designer
Período: 01/01/2024 - 31/01/2024

Grupos:
  - Designer: Ana Costa
    Total: R$ 18.900,00
      (Frete: R$ 950,00 + Serviços: R$ 17.950,00)
  
  - Designer: Pedro Alves
    Total: R$ 12.500,00
      (Frete: R$ 600,00 + Serviços: R$ 11.900,00)
```

### Interpretação

- Cada designer recebe comissão sobre os itens que produziu
- O frete não é relevante para comissão de designer (é do vendedor/logística)

---

## 3. Fechamento por Período (Diário/Mensal)

### Objetivo
Acompanhar vendas e receitas por período (dia, semana, mês).

### Como Fazer

1. Tipo de relatório: **Relatórios Sintéticos > Por Data de Entrega** (ou Entrada)
2. Configure o período desejado
3. Selecione o modo de data:
   - **Data de Entrega**: Usa data_entrega dos pedidos
   - **Data de Entrada**: Usa data_entrada dos pedidos
4. Gere o relatório

### Exemplo de Resultado

```
Relatório Sintético — Totais por Data de Entrega
Período: 01/01/2024 - 31/01/2024

Grupos:
  - Data de Entrega: 15/01/2024
    Total: R$ 8.500,00
      (Frete: R$ 450,00 + Serviços: R$ 8.050,00)
  
  - Data de Entrega: 16/01/2024
    Total: R$ 12.300,00
      (Frete: R$ 620,00 + Serviços: R$ 11.680,00)
  
  - Data de Entrega: 17/01/2024
    Total: R$ 5.200,00
      (Frete: R$ 280,00 + Serviços: R$ 4.920,00)
```

### Interpretação

- Útil para análise de fluxo de caixa
- Permite identificar dias/semanas de maior movimento
- Ajuda no planejamento de produção e logística

---

## 4. Relatório Analítico: Designer × Cliente

### Objetivo
Ver detalhadamente quais clientes cada designer atendeu e os valores envolvidos.

### Como Fazer

1. Tipo de relatório: **Relatórios Analíticos > Designer × Cliente**
2. Configure período e filtros
3. Gere o relatório

### Exemplo de Resultado

```
Relatório Analítico — Designer × Cliente

Grupo: Designer: Ana Costa
  Subgrupo: Cliente: Empresa ABC Ltda
    - Ficha: PED-001 | Painel 2m x 3m | Frete: R$ 50,00 | Serviços: R$ 450,00
    - Ficha: PED-005 | Banner 1m x 2m | Frete: R$ 50,00 | Serviços: R$ 280,00
    Subtotal: Frete: R$ 100,00 | Serviços: R$ 730,00
  
  Subgrupo: Cliente: Comércio XYZ
    - Ficha: PED-012 | Adesivo 50cm | Frete: R$ 30,00 | Serviços: R$ 150,00
    Subtotal: Frete: R$ 30,00 | Serviços: R$ 150,00
  
  Subtotal do grupo: Frete: R$ 130,00 | Serviços: R$ 880,00
```

### Interpretação

- Cada linha representa um **item** de pedido
- O **frete aparece em cada linha**, mas é deduplicado nos subtotais
- Útil para análise de relacionamento designer-cliente
- Permite identificar clientes mais frequentes por designer

**Nota sobre Frete**: Em relatórios analíticos, o frete pode aparecer em múltiplas linhas (uma por item do mesmo pedido), mas no **total geral** ele é contado apenas uma vez por pedido.

---

## 5. Relatório por Cliente Específico

### Objetivo
Gerar um relatório completo de todas as vendas para um cliente específico.

### Como Fazer

1. Tipo de relatório: **Relatórios Sintéticos > Por Cliente** (ou analítico)
2. No campo **Cliente**, digite o nome do cliente (busca automática)
3. Configure período e status
4. Gere o relatório

### Exemplo de Resultado

```
Relatório Sintético — Totais por Cliente
Período: 01/01/2024 - 31/01/2024

Grupo: Cliente: Empresa ABC Ltda
  Total: R$ 45.800,00
    (Frete: R$ 2.300,00 + Serviços: R$ 43.500,00)
```

### Interpretação

- Valor total de negócios com o cliente no período
- Útil para análise de relacionamento comercial
- Ajuda em renegociação de contratos

---

## 6. Distribuição Proporcional de Frete

### Objetivo
Distribuir o frete do pedido proporcionalmente entre os itens, baseado no valor de cada item.

### Quando Usar

Esta opção é útil quando você precisa:
- Calcular custos por item incluindo sua parte proporcional do frete
- Análises financeiras onde cada item deve "carregar" seu frete proporcional
- Relatórios de margem de lucro por item

### Como Fazer

1. Configure o relatório normalmente
2. **Atenção**: Esta opção precisa ser implementada na interface ou via API
3. Quando disponível, selecione: `frete_distribution: 'proporcional'`

### Exemplo de Cálculo

**Pedido #100:**
- Item A: R$ 200,00 (66,67% do total de itens)
- Item B: R$ 100,00 (33,33% do total de itens)
- Frete: R$ 90,00

**Com distribuição proporcional:**
- Item A: Frete = R$ 90,00 × 66,67% = R$ 60,00
- Item B: Frete = R$ 90,00 × 33,33% = R$ 30,00
- Total de frete: R$ 60,00 + R$ 30,00 = R$ 90,00 ✓

**Sem distribuição (padrão):**
- Item A: Frete = R$ 90,00 (frete total do pedido)
- Item B: Frete = R$ 90,00 (frete total do pedido)
- No total geral: R$ 90,00 (deduplicado) ✓

---

## 7. Interpretando Relatórios Analíticos vs Sintéticos

### Relatórios Sintéticos

**Características:**
- Apresentam apenas **totais agregados** por grupo
- Não mostram linhas individuais de itens
- Úteis para visão geral e totais

**Exemplo:**
```
Grupo: Vendedor: Maria
  Subtotal: Frete R$ 500,00 | Serviços R$ 5.000,00
```

**Quando usar:**
- Fechamento de comissão
- Relatórios gerenciais
- Análise de performance

### Relatórios Analíticos

**Características:**
- Mostram **cada item individualmente**
- Permitem ver ficha, descrição, valores por item
- Úteis para análise detalhada

**Exemplo:**
```
Grupo: Designer: João
  Subgrupo: Cliente: Empresa X
    - PED-001 | Painel | Frete: R$ 50,00 | Serviços: R$ 200,00
    - PED-001 | Banner | Frete: R$ 50,00 | Serviços: R$ 150,00
    Subtotal: Frete: R$ 100,00 | Serviços: R$ 350,00
```

**Quando usar:**
- Auditoria detalhada
- Análise de produtos
- Verificação de inconsistências

---

## 8. Entendendo o Frete nos Relatórios

### Como o Frete Funciona

**Regra Fundamental**: O frete é **por pedido**, não por item.

#### No Relatório Analítico:

Cada item de um pedido mostra o **frete total do pedido**:
```
Pedido #100 (frete R$ 50,00, 2 itens):
  - Item 1 | Frete: R$ 50,00 | Serviços: R$ 200,00
  - Item 2 | Frete: R$ 50,00 | Serviços: R$ 150,00
```

**Por que?** Porque cada item pode estar em grupos diferentes:
- Item 1 pode estar no grupo "Designer: João"
- Item 2 pode estar no grupo "Designer: Maria"
- Ambos precisam mostrar o frete para que o subtotal do grupo esteja completo

#### No Total Geral:

O frete é **deduplicado** - contado apenas uma vez por pedido:
```
Total Geral:
  Frete: R$ 50,00 (não R$ 100,00 = 50 + 50)
  Serviços: R$ 350,00 (200 + 150)
```

### Possível "Problema Visual"

**Atenção**: Em relatórios analíticos com múltiplos níveis, o frete pode aparecer "duplicado" nos subtotais de grupos/subgrupos. Isso é **esperado e correto** para análise detalhada, mas o **total geral sempre está correto**.

**Exemplo:**
```
Grupo: Designer: João
  Subgrupo: Cliente A
    - Item 1 (Pedido #100) | Frete: R$ 50,00
    Subtotal: Frete: R$ 50,00
  
  Subgrupo: Cliente B  
    - Item 2 (Pedido #100) | Frete: R$ 50,00
    Subtotal: Frete: R$ 50,00
  
  Subtotal do grupo: Frete: R$ 100,00 ⚠️ (visualmente duplicado)

TOTAL GERAL: Frete: R$ 50,00 ✓ (correto - deduplicado)
```

---

## 9. Como Calcular Desconto nos Relatórios

### Cálculo Automático de Desconto

O sistema **calcula automaticamente** o desconto quando:
```
Desconto = (Soma de Itens + Frete) - Total do Pedido
```

### Exemplo

**Pedido #100:**
- Itens: R$ 400,00
- Frete: R$ 50,00
- Total do pedido: R$ 400,00
- **Desconto calculado**: (400 + 50) - 400 = **R$ 50,00**

### No Relatório

Se houver desconto, o relatório mostrará:
```
Total: R$ 450,00
  Frete: R$ 50,00
  Serviços: R$ 400,00
  Desconto: R$ 50,00
  Valor Líquido: R$ 400,00
```

### Quando Não Aparece Desconto

- Se não houver diferença entre (itens + frete) e total
- Se o total for maior que (itens + frete) - neste caso, pode haver erro nos dados

---

## 10. Exportação e Uso dos Relatórios

### Exportar para PDF

1. Gere o relatório
2. Clique em **Exportar PDF**
3. O PDF será aberto em nova janela
4. Salve ou imprima conforme necessário

**Conteúdo do PDF:**
- Cabeçalho com título, período, status
- Metadados (pedidos únicos, itens totais)
- Grupos e subgrupos com valores
- Total geral
- Data/hora de geração

### Exportar para CSV

1. Gere o relatório
2. Clique em **Exportar CSV**
3. O arquivo será baixado automaticamente

**Conteúdo do CSV:**
- Linha de metadados no início
- Todas as linhas do relatório
- Colunas: Grupo, Subgrupo, Ficha, Descrição, Valor Frete, Valor Serviços, Desconto (se houver), Total
- Última linha: TOTAL GERAL

**Uso do CSV:**
- Importar no Excel/Google Sheets
- Análises adicionais com fórmulas
- Gráficos e tabelas dinâmicas
- Integração com outros sistemas

---

## 11. Troubleshooting - Problemas Comuns

### Problema: "Total não bate com a soma manual"

**Possíveis causas:**
1. **Frete duplicado visualmente** (normal em analíticos)
   - **Solução**: Verifique o **total geral**, não os subtotais de grupos

2. **Desconto não considerado**
   - **Solução**: O desconto aparece apenas quando calculado. Verifique se há diferença entre total_value e (itens + frete)

3. **Filtros aplicados**
   - **Solução**: Verifique se não há filtros por vendedor/designer/cliente ativos

### Problema: "Valores zerados (R$ 0,00)"

**Possíveis causas:**
1. Item sem subtotal, quantity, unit_price ou valor_unitario válido
   - **Solução**: Verifique os dados do pedido no sistema
   - O sistema loga warnings no console quando detecta problemas

2. Valores null/undefined não parseados corretamente
   - **Solução**: Verifique os logs do console (F12) para ver avisos

### Problema: "Pedido não aparece no relatório"

**Verifique:**
1. Status do pedido (filtro aplicado?)
2. Data do pedido (dentro do período selecionado?)
3. Modo de data (entrada vs entrega)
4. Filtros por vendedor/designer/cliente

---

## 12. Boas Práticas

### Para Fechamento de Comissão

1. **Use relatórios sintéticos** por vendedor/designer
2. **Filtre por status "Concluído"** apenas
3. **Use data de entrega** como referência (venda efetivada)
4. **Exporte para CSV** para cálculos adicionais
5. **Verifique o valor de serviços**, não o total (frete geralmente não entra na comissão)

### Para Análise Gerencial

1. **Use períodos mensais** para comparar mês a mês
2. **Compare diferentes tipos de agrupamento** (por cliente, por designer, por data)
3. **Exporte para PDF** para apresentações
4. **Analise tendências** usando relatórios por data

### Para Auditoria

1. **Use relatórios analíticos** para ver detalhes
2. **Verifique inconsistências** (valores zerados, descontos anômalos)
3. **Consulte os logs** do console para avisos
4. **Valide totais** comparando com outras fontes

---

## 13. Exemplos de Consultas Comuns

### "Quanto a vendedora Maria vendeu em janeiro?"

**Relatório:** Sintético > Por Vendedor
**Período:** 01/01/2024 - 31/01/2024
**Filtro:** Vendedor = "Maria"
**Status:** Concluído

### "Quais clientes o designer João atendeu e quanto foi cada um?"

**Relatório:** Analítico > Designer × Cliente
**Período:** Período desejado
**Filtro:** Designer = "João"
**Status:** Todos ou Concluído

### "Qual foi a receita de cada dia da última semana?"

**Relatório:** Sintético > Por Data de Entrega
**Período:** Últimos 7 dias
**Status:** Concluído

### "Quanto de desconto foi dado no último mês?"

**Relatório:** Qualquer tipo
**Período:** Último mês
**Status:** Concluído
**Verificar:** Campo "Desconto" no total geral do relatório

---

## 14. Interpretação dos Metadados

Ao exportar relatório (PDF/CSV), você verá:

```
Metadados:
  Pedidos únicos: 25
  Itens totais: 68
  Gerado em: 25/01/2024 14:30:00
```

**Interpretação:**
- **Pedidos únicos**: Quantidade de pedidos diferentes incluídos no relatório
- **Itens totais**: Quantidade total de itens (linhas) no relatório
- **Gerado em**: Data/hora exata da geração do relatório

**Importante:**
- Um pedido pode ter múltiplos itens
- Exemplo: 25 pedidos podem ter 68 itens (média de 2,72 itens por pedido)

---

## 15. Validação de Consistência

O sistema valida automaticamente:

1. **Valores negativos**: Loga warning se encontrar
2. **Inconsistências de totais**: Verifica se grupos = total geral
3. **Descontos anômalos**: Detecta quando desconto > 15% do esperado
4. **Dados faltantes**: Loga erros quando não consegue calcular valores

**Onde ver os avisos:**
- Console do navegador (F12 > Console)
- Logs do sistema
- Mensagens de warning começam com `[fechamentoReport]`

---

## Conclusão

O sistema de fechamentos é uma ferramenta poderosa para análise financeira e cálculo de comissões. Use os relatórios sintéticos para visão geral e analíticos para detalhamento. Sempre verifique o total geral para valores corretos, especialmente em relatórios analíticos onde o frete pode parecer duplicado visualmente.

Para mais informações técnicas, consulte a [Análise de Fechamentos](./analise-fechamentos.md).
