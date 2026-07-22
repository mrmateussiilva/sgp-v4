const GEMINI_CONTEXT_KEY = 'sgp_gemini_context';

export const GEMINI_CONTEXT_PLACEHOLDER = `# Contexto da Empresa

## Produtos que fabricamos
- Sublimação têxtil: camisetas, cangas, mochilinhas
- Lonas: frontlight, backlight, lona fria
- Banners, adesivos, totens

## Tempos reais de produção (nossos)
- Camiseta sublimada: 30min por peça
- Mochilinha: 1h por peça (impressão + costura)
- Lona até 3m²: 1 dia
- Lona acima de 3m²: 2 dias

## Capacidade da equipe
- 1 máquina de sublimação (ocupa turno inteiro em pedidos grandes)
- 2 costureiras (1 pedido por vez cada)

## Regras e observações da casa
- Pedidos com Correios devem ser postados até 14h
- Transportadora coleta às 17h (avisar até 15h)
- Clientes de fora do estado: sempre confirmar frete antes de liberar
- Pedidos acima de R$500: exigir 50% de entrada antes de imprimir

## Clientes frequentes / observações
- (adicione aqui se quiser que a IA considere)`;

export function loadGeminiContext(): string {
  try {
    return localStorage.getItem(GEMINI_CONTEXT_KEY) || '';
  } catch {
    return '';
  }
}

export function saveGeminiContext(context: string): void {
  localStorage.setItem(GEMINI_CONTEXT_KEY, context.trim());
}

export function clearGeminiContext(): void {
  localStorage.removeItem(GEMINI_CONTEXT_KEY);
}
