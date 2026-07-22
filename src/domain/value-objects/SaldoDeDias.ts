import { QuantidadeDeDias } from './QuantidadeDeDias';
import { TipoOcorrencia } from './TipoOcorrencia';

const CENTESIMOS_POR_DIA = 100;

/**
 * Saldo de dias de recesso. Imutável: cada operação devolve um novo saldo.
 * Acumula em centésimos de dia — ver QuantidadeDeDias sobre o porquê.
 */
export class SaldoDeDias {
  private constructor(private readonly centesimos: number) {}

  static zero(): SaldoDeDias {
    return new SaldoDeDias(0);
  }

  static de(dias: number): SaldoDeDias {
    return new SaldoDeDias(Math.round(dias * CENTESIMOS_POR_DIA));
  }

  aplicar(tipo: TipoOcorrencia, quantidade: QuantidadeDeDias): SaldoDeDias {
    return new SaldoDeDias(this.centesimos + tipo.sinal() * quantidade.emCentesimos());
  }

  /** Quantidade que zera este saldo — usada no encerramento de contrato. */
  comoQuantidade(): QuantidadeDeDias {
    if (this.centesimos <= 0) return QuantidadeDeDias.nenhuma();
    return QuantidadeDeDias.de(this.obterValor());
  }

  obterValor(): number {
    return this.centesimos / CENTESIMOS_POR_DIA;
  }

  ehNegativo(): boolean {
    return this.centesimos < 0;
  }

  ehZero(): boolean {
    return this.centesimos === 0;
  }

  /** Suporta a regra R-05: bloquear débito que deixaria o saldo negativo. */
  suporta(tipo: TipoOcorrencia, quantidade: QuantidadeDeDias): boolean {
    return !this.aplicar(tipo, quantidade).ehNegativo();
  }

  paraExibicao(): string {
    const valor = this.obterValor();
    const plural = Math.abs(valor) === 1 ? 'dia' : 'dias';
    return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${plural}`;
  }
}
