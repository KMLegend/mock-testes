export type ValorTipoOcorrencia = 'Credito' | 'Debito';

/** Tipo da ocorrência de recesso. O SINAL vem daqui — a quantidade é sempre positiva. */
export class TipoOcorrencia {
  private constructor(private readonly valor: ValorTipoOcorrencia) {}

  static credito(): TipoOcorrencia {
    return new TipoOcorrencia('Credito');
  }

  static debito(): TipoOcorrencia {
    return new TipoOcorrencia('Debito');
  }

  static de(valor: string): TipoOcorrencia {
    if (valor === 'Debito') return TipoOcorrencia.debito();
    return TipoOcorrencia.credito();
  }

  ehCredito(): boolean {
    return this.valor === 'Credito';
  }

  ehDebito(): boolean {
    return this.valor === 'Debito';
  }

  /** +1 para crédito, -1 para débito. */
  sinal(): number {
    if (this.ehCredito()) return 1;
    return -1;
  }

  paraArmazenamento(): ValorTipoOcorrencia {
    return this.valor;
  }

  paraExibicao(): string {
    if (this.ehCredito()) return 'Crédito';
    return 'Débito';
  }
}
