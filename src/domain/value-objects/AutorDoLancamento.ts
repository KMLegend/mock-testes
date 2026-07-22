const AUTOR_SISTEMA = 'SISTEMA';

/**
 * Quem lançou a ocorrência: um usuário ou o próprio sistema (crédito automático).
 * Na Fase 2 o valor gravado vem do TOKEN validado no servidor — nunca do formulário.
 */
export class AutorDoLancamento {
  private constructor(private readonly identificacao: string) {}

  static sistema(): AutorDoLancamento {
    return new AutorDoLancamento(AUTOR_SISTEMA);
  }

  static usuario(identificacao: string): AutorDoLancamento {
    const limpa = String(identificacao ?? '').trim();
    if (limpa.length === 0) return AutorDoLancamento.sistema();
    return new AutorDoLancamento(limpa);
  }

  ehSistema(): boolean {
    return this.identificacao === AUTOR_SISTEMA;
  }

  paraExibicao(): string {
    return this.identificacao;
  }
}
