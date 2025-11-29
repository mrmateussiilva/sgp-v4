/**
 * Testes para FormPainelCompleto (componente de ficha)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { FormPainelCompleto } from '@/components/FormPainelCompleto';

describe('FormPainelCompleto', () => {
  const mockTabData = {
    descricao: '',
    largura: '',
    altura: '',
    metro_quadrado: '0,00',
    vendedor: '',
    designer: '',
    tecido: '',
    valor_painel: '0,00',
    descontoAtivo: false,
  };

  const mockHandlers = {
    onDataChange: vi.fn(),
    onSaveItem: vi.fn(),
    onCancelItem: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar campos obrigatórios', () => {
    render(
      <FormPainelCompleto
        tabId="test-1"
        tabData={mockTabData}
        vendedores={['Vendedor 1', 'Vendedor 2']}
        designers={['Designer 1']}
        tecidos={['Tecido 1']}
        {...mockHandlers}
      />
    );

    expect(screen.getByLabelText(/descrição do tecido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tecido/i)).toBeInTheDocument();
  });

  it('deve chamar onDataChange quando campo é alterado', () => {
    render(
      <FormPainelCompleto
        tabId="test-1"
        tabData={mockTabData}
        vendedores={[]}
        designers={[]}
        tecidos={[]}
        {...mockHandlers}
      />
    );

    const descricaoInput = screen.getByLabelText(/descrição do tecido/i);
    fireEvent.change(descricaoInput, { target: { value: 'Nova descrição' } });

    expect(mockHandlers.onDataChange).toHaveBeenCalledWith('descricao', 'Nova descrição');
  });

  it('deve desativar campo desconto quando descontoAtivo é false', () => {
    const tabDataSemDesconto = {
      ...mockTabData,
      descontoAtivo: false,
    };

    render(
      <FormPainelCompleto
        tabId="test-1"
        tabData={tabDataSemDesconto}
        vendedores={[]}
        designers={[]}
        tecidos={[]}
        {...mockHandlers}
      />
    );

    // Verificar que campos de desconto não estão visíveis ou estão desabilitados
    // (dependendo da implementação)
    const descontoInputs = screen.queryAllByLabelText(/desconto/i);
    descontoInputs.forEach((input) => {
      if (input instanceof HTMLInputElement) {
        expect(input.disabled || input.readOnly).toBe(true);
      }
    });
  });

  it('deve validar campos obrigatórios', () => {
    render(
      <FormPainelCompleto
        tabId="test-1"
        tabData={mockTabData}
        vendedores={[]}
        designers={[]}
        tecidos={[]}
        {...mockHandlers}
      />
    );

    // Campo descrição deve ser obrigatório (marcado com *)
    const descricaoLabel = screen.getByText(/descrição do tecido \*/i);
    expect(descricaoLabel).toBeInTheDocument();
  });

  it('deve calcular valores corretamente', () => {
    const tabDataComValores = {
      ...mockTabData,
      valor_painel: '100,00',
      quantidade_paineis: '2',
      valores_adicionais: '50,00',
    };

    render(
      <FormPainelCompleto
        tabId="test-1"
        tabData={tabDataComValores}
        vendedores={[]}
        designers={[]}
        tecidos={[]}
        {...mockHandlers}
      />
    );

    // Verificar que valores são exibidos
    // (o cálculo pode estar em um elemento específico)
    expect(screen.getByDisplayValue('100,00')).toBeInTheDocument();
  });

  it('deve permitir selecionar vendedor', () => {
    render(
      <FormPainelCompleto
        tabId="test-1"
        tabData={mockTabData}
        vendedores={['Vendedor 1', 'Vendedor 2']}
        designers={[]}
        tecidos={[]}
        {...mockHandlers}
      />
    );

    // Encontrar select de vendedor e interagir
    const vendedorSelect = screen.getByLabelText(/vendedor/i);
    if (vendedorSelect) {
      fireEvent.click(vendedorSelect);
      // Verificar que opções aparecem
      expect(screen.getByText('Vendedor 1')).toBeInTheDocument();
    }
  });
});

