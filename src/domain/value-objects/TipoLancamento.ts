export class TipoLancamento {
  private constructor(private readonly valor: string) {}

  static de(tipo: string): TipoLancamento {
    const t = String(tipo ?? '').trim().toLowerCase();
    if (t === 'contratual') {
      return new TipoLancamento('Contratual');
    }
    if (t === 'reembolso plano de saude' || t === 'reembolso plano de saúde') {
      return new TipoLancamento('Reembolso plano de saúde');
    }
    if (t === 'ambas') {
      return new TipoLancamento('Ambas');
    }
    return new TipoLancamento(tipo);
  }

  paraExibicao(): string {
    return this.valor;
  }

  equals(outro: TipoLancamento): boolean {
    return this.valor === outro.valor;
  }

  ehContratualOuAmbas(): boolean {
    return this.valor === 'Contratual' || this.valor === 'Ambas';
  }
}
