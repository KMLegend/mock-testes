/**
 * Competência de um lançamento de recesso: a data mensal de aniversário do contrato.
 *
 * Substitui o antigo período aquisitivo anual — o direito passou a ser acumulado
 * mês a mês (docs/modulo-recesso/02). O dia base é guardado à parte do mês corrente
 * porque meses curtos não podem "perder" o dia: um contrato iniciado em 31/01
 * cai em 28/02 e volta para 31/03, e não fica preso no 28.
 */
const LIMITE_DE_MESES = 1200; // guarda contra laço infinito por data inválida

export class CompetenciaDeRecesso {
  private constructor(
    private readonly ano: number,
    private readonly mes: number,
    private readonly diaBase: number
  ) {}

  static apartirDe(data: Date): CompetenciaDeRecesso {
    return new CompetenciaDeRecesso(data.getFullYear(), data.getMonth(), data.getDate());
  }

  /**
   * Competência mensal que contém `data`, ancorada no dia base do contrato.
   * Data anterior ao início cai na primeira competência.
   */
  static contendo(data: Date, inicioDoContrato: Date): CompetenciaDeRecesso {
    let competencia = CompetenciaDeRecesso.apartirDe(inicioDoContrato);
    let proxima = competencia.proxima();
    let voltas = 0;

    while (proxima.data().getTime() <= data.getTime() && voltas < LIMITE_DE_MESES) {
      competencia = proxima;
      proxima = competencia.proxima();
      voltas += 1;
    }

    return competencia;
  }

  /** Mesmo dia base, um mês adiante. */
  proxima(): CompetenciaDeRecesso {
    return new CompetenciaDeRecesso(this.ano, this.mes + 1, this.diaBase);
  }

  /** Data efetiva, com o dia limitado ao último dia do mês. */
  data(): Date {
    const ultimoDia = new Date(this.ano, this.mes + 1, 0).getDate();
    return new Date(this.ano, this.mes, Math.min(this.diaBase, ultimoDia));
  }

  /** Chave de idempotência: um único crédito automático por mês de competência. */
  identificador(): string {
    const data = this.data();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    return `${data.getFullYear()}${mes}`;
  }

  equals(outra: CompetenciaDeRecesso): boolean {
    return this.identificador() === outra.identificador();
  }

  /** "15/03/2026" — a competência é exibida como data completa. */
  paraExibicao(): string {
    return this.data().toLocaleDateString('pt-BR');
  }

  /** "15/03" — dia e mês base mostrados ao lado do saldo. */
  diaEMesBase(): string {
    const data = this.data();
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}`;
  }
}
