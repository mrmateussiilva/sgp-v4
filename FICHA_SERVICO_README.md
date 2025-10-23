# Ficha de Serviço - Sistema SGP v4

## 📋 Visão Geral

Foi implementada uma nova funcionalidade para gerar fichas de serviço com layout idêntico ao modelo antigo. A ficha é gerada em formato PDF com duas fichas por página, reproduzindo exatamente o visual de formulário impresso.

## ✨ Funcionalidades

### Layout da Ficha
- **Título**: "EMISSÃO FICHA DE SERVIÇO" centralizado e em negrito
- **Datas**: Entrada e Entrega lado a lado no topo direito
- **Cliente**: Nome completo, telefone e cidade em fonte maior
- **Corpo**: Tabela com bordas cinza (#999) simulando formulário impresso
- **Campos fixos**: Todos os campos solicitados organizados em linhas
- **Rodapé**: Campo de observações e espaço para assinatura
- **Duas fichas por página**: Layout otimizado para impressão A4

### Campos Incluídos
- Nro. OS
- Descrição
- Tamanho (largura x altura + cálculo de m²)
- Arte / Designer / Exclusiva / Vr. Arte
- RIP / Máquina / Impressão / Data Impressão
- Tecido / Ilhós / Emendas / Overloque / Elástico
- Revisão / Expedição
- Forma de envio / pagamento
- Valores (Painel, Outros, SubTotal, Frete, Total)

## 🚀 Como Usar

### 1. No Modal de Visualização de Pedidos
1. Abra um pedido no sistema
2. Clique no botão **"Ficha de Serviço"** (ícone de impressora)
3. A ficha será gerada e aberta para impressão

### 2. Arquivos Implementados

#### `src/utils/printOrderServiceForm.ts`
- Função principal `printOrderServiceForm(order: OrderWithItems)`
- Geração de HTML com CSS inline
- Layout responsivo e otimizado para impressão
- Suporte a duas fichas por página

#### `src/utils/testServiceForm.ts`
- Dados de exemplo para testes
- Função `testServiceForm()` para testar a geração
- Dados realistas de pedido para demonstração

### 3. Integração no Sistema
- Botão adicionado no `OrderViewModal.tsx`
- Importação automática da função de impressão
- Integração com dados existentes do pedido

## 🎨 Características Visuais

### Estilo
- **Fonte**: Monoespaçada (Courier New, Roboto Mono)
- **Bordas**: Linhas finas cinza (#999)
- **Espaçamento**: Consistente e legível
- **Margens**: 10mm para layout A4
- **Cores**: Preto sobre branco, com destaque em cinza claro

### Layout
- **Duas fichas por página**: Divididas horizontalmente
- **Campos organizados**: Em linhas com bordas
- **Valores financeiros**: Destacados em caixas separadas
- **Observações**: Campo expandido para texto
- **Assinatura**: Linha dedicada no rodapé

## 🔧 Personalização

### Modificar Campos
Para adicionar ou modificar campos, edite a função `buildServiceFormBody()` em `printOrderServiceForm.ts`:

```typescript
const buildServiceFormBody = (order: OrderWithItems, financials: OrderFinancials): string => {
  // Adicionar novos campos aqui
  const novoCampo = order.novo_campo || '';
  
  return `
    <div class="service-form-body">
      <table class="form-table">
        <tbody>
          <tr>
            <td class="field-label">Novo Campo:</td>
            <td class="field-value">${escapeHtml(novoCampo)}</td>
          </tr>
          // ... outros campos
        </tbody>
      </table>
    </div>
  `;
};
```

### Modificar Estilos
Para alterar a aparência, edite a função `buildServiceFormStyles()`:

```typescript
const buildServiceFormStyles = (): string => `
  // Modificar estilos CSS aqui
  .field-label {
    font-weight: bold;
    width: 45%;
    background: #f8f8f8; // Alterar cor de fundo
  }
`;
```

## 📱 Responsividade

O template é responsivo e se adapta a diferentes tamanhos de tela:
- **Desktop**: Layout completo com duas fichas
- **Tablet/Mobile**: Layout adaptado para telas menores
- **Impressão**: Otimizado para papel A4

## 🧪 Testes

### Testar a Funcionalidade
1. Abra o console do navegador (F12)
2. Execute: `testServiceForm()`
3. A ficha de exemplo será gerada

### Dados de Teste
Os dados de exemplo incluem:
- Pedido completo com cliente e itens
- Informações de produção (tecido, acabamento, etc.)
- Valores financeiros
- Observações e prioridades

## 🔍 Troubleshooting

### Problemas Comuns

1. **Ficha não aparece**
   - Verifique se o pedido tem dados válidos
   - Confirme se o navegador suporta impressão

2. **Layout quebrado**
   - Verifique se as fontes monoespaçadas estão disponíveis
   - Confirme se o CSS está sendo aplicado corretamente

3. **Dados não aparecem**
   - Verifique se os campos existem no pedido
   - Confirme se a função `escapeHtml()` está funcionando

### Logs de Debug
Para debug, verifique o console do navegador para mensagens de erro.

## 📝 Próximos Passos

### Melhorias Futuras
- [ ] Adicionar mais campos específicos por tipo de produção
- [ ] Implementar templates personalizáveis
- [ ] Adicionar código de barras ou QR Code
- [ ] Integrar com sistema de assinatura digital
- [ ] Exportar para outros formatos (PDF direto, etc.)

### Contribuição
Para contribuir com melhorias:
1. Fork do repositório
2. Crie uma branch para sua feature
3. Implemente as mudanças
4. Teste thoroughly
5. Submeta um Pull Request

## 📞 Suporte

Para dúvidas ou problemas:
- Verifique a documentação existente
- Consulte os logs do sistema
- Entre em contato com a equipe de desenvolvimento

---

**Versão**: 1.0.0  
**Data**: Janeiro 2024  
**Autor**: Sistema SGP v4
