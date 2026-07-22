import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CompositionRoot } from '../../src/ui/providers/CompositionRoot';
import { App } from '../../src/ui/App';

describe('UI Integration Tests (React Testing Library)', () => {
  it('deve renderizar a aplicação e permitir busca por CNPJ mascarado e desmascarado', async () => {
    render(
      <CompositionRoot>
        <App />
      </CompositionRoot>
    );

    expect(await screen.findByText('Status de Recebimento por Competência')).toBeInTheDocument();
    expect((await screen.findAllByText(/CARLOS SANTOS/i)).length).toBeGreaterThan(0);

    const searchInput = screen.getByPlaceholderText(/Buscar por Nome, CNPJ/i);

    // Busca por CNPJ com máscara
    fireEvent.change(searchInput, { target: { value: '33.333.333/0001-33' } });
    expect((await screen.findAllByText(/CARLOS SANTOS/i)).length).toBeGreaterThan(0);

    // Busca por CNPJ só dígitos
    fireEvent.change(searchInput, { target: { value: '33333333000133' } });
    expect((await screen.findAllByText(/CARLOS SANTOS/i)).length).toBeGreaterThan(0);
  });

  it('deve alternar entre as abas Status e Mensagens', async () => {
    render(
      <CompositionRoot>
        <App />
      </CompositionRoot>
    );

    const btnMensagens = screen.getByRole('button', { name: 'Mensagens' });
    fireEvent.click(btnMensagens);

    expect(await screen.findByText('Histórico de alertas disparados aos fornecedores (regras D-3, D, D+1, D+3).')).toBeInTheDocument();
  });

  it('deve abrir o modal de mensagens para um fornecedor ao clicar no botão de envelope', async () => {
    render(
      <CompositionRoot>
        <App />
      </CompositionRoot>
    );

    const envButtons = await screen.findAllByRole('button', { name: '✉' });
    expect(envButtons.length).toBeGreaterThan(0);
    fireEvent.click(envButtons[0]!);

    expect(await screen.findByText('Mensagens enviadas ao PJ')).toBeInTheDocument();
  });
});
