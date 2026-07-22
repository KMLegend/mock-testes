import { UsuarioAtual, UsuarioIdentificado } from '../../application/ports/UsuarioAtual';

/**
 * Fase 1 — usuário fixo de demonstração (R-04).
 * Fase 2 (SPFx): substituir por UsuarioAtualSpfx no Composition Root, SEM tocar em domínio/UI.
 */
export class UsuarioAtualFixo implements UsuarioAtual {
  constructor(
    private readonly login = 'kevin.maykel@cityinc.com.br',
    private readonly nome = 'Kevin Maykel'
  ) {}

  async identificar(): Promise<UsuarioIdentificado> {
    return { login: this.login, nome: this.nome };
  }
}
