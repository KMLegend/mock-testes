export class QuantidadeDeDiasInvalida extends Error {
  constructor(valor: unknown) {
    super(`Quantidade de dias inválida: ${String(valor)}. Deve ser um número maior que zero.`);
    this.name = 'QuantidadeDeDiasInvalida';
  }
}

const CENTESIMOS_POR_DIA = 100;

/**
 * Quantidade de dias de uma ocorrência. SEMPRE positiva — o sinal vem do TipoOcorrencia.
 *
 * Guardada em CENTÉSIMOS de dia (inteiro) porque o acúmulo mensal é fracionário
 * (2,5 dias × proporção do contrato). Somar 0.1 + 0.2 em ponto flutuante acumularia
 * erro ao longo de dezenas de meses e o saldo deixaria de fechar.
 */
export class QuantidadeDeDias {
  private constructor(private readonly centesimos: number) {}

  /** Entrada de usuário e crédito de sistema: precisa ser positiva. */
  static de(valor: number | string): QuantidadeDeDias {
    const centesimos = QuantidadeDeDias.emCentesimos(valor);
    if (centesimos === null || centesimos <= 0) throw new QuantidadeDeDiasInvalida(valor);
    return new QuantidadeDeDias(centesimos);
  }

  /**
   * Zero só existe para registrar que uma regra foi aplicada e não gerou direito
   * (rescisão com menos de 15 dias desde o último cálculo). Não é entrada de usuário.
   */
  static nenhuma(): QuantidadeDeDias {
    return new QuantidadeDeDias(0);
  }

  private static emCentesimos(valor: number | string): number | null {
    const numero = typeof valor === 'string' ? Number(String(valor).replace(',', '.')) : valor;
    if (!Number.isFinite(numero)) return null;
    return Math.round(numero * CENTESIMOS_POR_DIA);
  }

  emCentesimos(): number {
    return this.centesimos;
  }

  obterValor(): number {
    return this.centesimos / CENTESIMOS_POR_DIA;
  }

  ehZero(): boolean {
    return this.centesimos === 0;
  }

  /** "2,5" — vírgula decimal e sem zeros à direita inúteis. */
  paraExibicao(): string {
    return this.obterValor().toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
}
