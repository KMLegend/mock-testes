export class Cnpj {
  private constructor(private readonly digitos: string) {}

  static de(valor: string): Cnpj {
    const limpo = String(valor ?? '').replace(/\D/g, '');
    return new Cnpj(limpo);
  }

  obterDigitos(): string {
    return this.digitos;
  }

  contem(termo: string): boolean {
    const buscado = String(termo ?? '').replace(/\D/g, '');
    if (buscado.length === 0) return false;
    return this.digitos.includes(buscado);
  }

  equals(outro: Cnpj): boolean {
    return this.digitos === outro.digitos;
  }

  paraExibicao(): string {
    if (this.digitos.length !== 14) return this.digitos;
    return this.digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
}
