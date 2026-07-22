export type TipoStatusNf = 'Pendente' | 'Enviado' | 'Recebido' | 'Tratamento Manual';

export class StatusNf {
  private constructor(private readonly valor: TipoStatusNf) {}

  static pendente(): StatusNf {
    return new StatusNf('Pendente');
  }

  static enviado(): StatusNf {
    return new StatusNf('Enviado');
  }

  static recebido(): StatusNf {
    return new StatusNf('Recebido');
  }

  static tratamentoManual(): StatusNf {
    return new StatusNf('Tratamento Manual');
  }

  static de(valor: string): StatusNf {
    const limpo = String(valor ?? '').trim();
    if (limpo === 'Tratamento Manual') return StatusNf.tratamentoManual();
    if (limpo === 'Recebido') return StatusNf.recebido();
    if (limpo === 'Enviado') return StatusNf.enviado();
    return StatusNf.pendente();
  }

  paraExibicao(): TipoStatusNf {
    return this.valor;
  }

  equals(outro: StatusNf): boolean {
    return this.valor === outro.valor;
  }

  ehPendente(): boolean {
    return this.valor === 'Pendente';
  }

  ehEnviado(): boolean {
    return this.valor === 'Enviado';
  }

  ehRecebido(): boolean {
    return this.valor === 'Recebido';
  }

  ehTratamentoManual(): boolean {
    return this.valor === 'Tratamento Manual';
  }
}
