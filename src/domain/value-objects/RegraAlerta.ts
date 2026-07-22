export class RegraAlerta {
  private constructor(private readonly valor: string) {}

  static de(regra: string): RegraAlerta {
    return new RegraAlerta(String(regra ?? '').trim());
  }

  paraExibicao(): string {
    return this.valor;
  }

  ehCobranca(): boolean {
    return this.valor === 'D+1' || this.valor === 'D+3';
  }

  ehPreventivo(): boolean {
    return this.valor === 'D-3' || this.valor === 'D';
  }

  equals(outra: RegraAlerta): boolean {
    return this.valor === outra.valor;
  }
}
