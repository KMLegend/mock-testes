export class ProporcaoInvalida extends Error {
  constructor(valor: unknown) {
    super(`Proporção inválida: ${String(valor)}. Deve estar entre 0 e 100.`);
    this.name = 'ProporcaoInvalida';
  }
}

/**
 * Percentual do direito de recesso do PJ que cabe a ESTE contrato.
 *
 * Um PJ lotado em mais de um contrato tem o direito repartido (ex.: 40% / 60%),
 * de modo que a soma das proporções de seus contratos continue valendo os
 * 2,5 dias/mês da pessoa — e não 2,5 por contrato.
 */
export class ProporcaoDeRecesso {
  private constructor(private readonly percentual: number) {}

  static de(valor: number): ProporcaoDeRecesso {
    if (!Number.isFinite(valor) || valor <= 0 || valor > 100) throw new ProporcaoInvalida(valor);
    return new ProporcaoDeRecesso(valor);
  }

  /** Contrato único do PJ: leva 100% do direito. */
  static integral(): ProporcaoDeRecesso {
    return new ProporcaoDeRecesso(100);
  }

  aplicarA(dias: number): number {
    return (dias * this.percentual) / 100;
  }

  obterValor(): number {
    return this.percentual;
  }

  ehIntegral(): boolean {
    return this.percentual === 100;
  }

  paraExibicao(): string {
    return `${this.percentual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
  }
}
