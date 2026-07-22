export class Email {
  private constructor(private readonly valor: string) {}

  static de(valor: string): Email {
    const normalizado = String(valor ?? '').trim().toLowerCase();
    return new Email(normalizado);
  }

  paraExibicao(): string {
    return this.valor;
  }

  equals(outro: Email): boolean {
    return this.valor === outro.valor;
  }

  contem(termo: string): boolean {
    const buscado = String(termo ?? '').trim().toLowerCase();
    if (buscado.length === 0) return false;
    return this.valor.includes(buscado);
  }
}
