import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CompositionRoot } from '../../src/ui/providers/CompositionRoot';
import { App } from '../../src/ui/App';
import { AlertaRepositoryEmMemoria } from '../../src/infrastructure/mock/AlertaRepositoryEmMemoria';

describe('C-01 Regressão: Prevenção de Loop Infinito', () => {
  it('não deve chamar AlertaRepository.todos mais que 2 vezes no render inicial sem interação', async () => {
    const todosSpy = vi.spyOn(AlertaRepositoryEmMemoria.prototype, 'todos');

    render(
      <CompositionRoot>
        <App />
      </CompositionRoot>
    );

    // Aguarda micro-tasks inicializarem
    await new Promise((r) => setTimeout(r, 300));

    // Sem o loop infinito, o repositório deve ser chamado no máximo 2 vezes (render inicial + efeito inicial)
    expect(todosSpy.mock.calls.length).toBeLessThanOrEqual(2);

    todosSpy.mockRestore();
  });
});
