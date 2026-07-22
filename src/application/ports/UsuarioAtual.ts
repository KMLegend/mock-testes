export interface UsuarioIdentificado {
  readonly login: string;
  readonly nome: string;
}

/**
 * Identidade de quem está usando o sistema.
 * Fase 1: usuário fixo de demonstração.
 * Fase 2 (SPFx): context.pageContext.user — e o backend grava a partir do TOKEN validado.
 */
export interface UsuarioAtual {
  identificar(): Promise<UsuarioIdentificado>;
}
