export type ValorOrigem = 'MANUAL' | 'AUTOMATICO';

/**
 * Origem da ocorrência. Base da IDEMPOTÊNCIA do crédito automático:
 * no máximo 1 ocorrência AUTOMATICO por (fornecedor, período aquisitivo).
 */
export class OrigemDaOcorrencia {
  private constructor(private readonly valor: ValorOrigem) {}

  static manual(): OrigemDaOcorrencia {
    return new OrigemDaOcorrencia('MANUAL');
  }

  static automatico(): OrigemDaOcorrencia {
    return new OrigemDaOcorrencia('AUTOMATICO');
  }

  static de(valor: string): OrigemDaOcorrencia {
    if (valor === 'AUTOMATICO') return OrigemDaOcorrencia.automatico();
    return OrigemDaOcorrencia.manual();
  }

  ehAutomatica(): boolean {
    return this.valor === 'AUTOMATICO';
  }

  paraArmazenamento(): ValorOrigem {
    return this.valor;
  }
}
