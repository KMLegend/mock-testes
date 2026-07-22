import { OcorrenciaDeRecesso } from '../entities/OcorrenciaDeRecesso';
import { CompetenciaDeRecesso } from '../value-objects/CompetenciaDeRecesso';
import { QuantidadeDeDias } from '../value-objects/QuantidadeDeDias';
import { SaldoDeDias } from '../value-objects/SaldoDeDias';
import { TipoOcorrencia } from '../value-objects/TipoOcorrencia';

export interface LinhaDeExtrato {
  readonly ocorrencia: OcorrenciaDeRecesso;
  readonly saldo: SaldoDeDias;
}

/**
 * Extrato de recesso de um CONTRATO. ÚNICO lugar onde o saldo é calculado —
 * tela, modal e exportação consomem daqui (docs/modulo-recesso/03 §4).
 */
export class ExtratoDeRecesso {
  constructor(private readonly ocorrencias: readonly OcorrenciaDeRecesso[]) {}

  static vazio(): ExtratoDeRecesso {
    return new ExtratoDeRecesso([]);
  }

  /** Cronológica ascendente; empate resolvido por criadoEm (ordem estável). */
  ordenadoCronologicamente(): ExtratoDeRecesso {
    const ordenadas = [...this.ocorrencias].sort((a, b) => {
      const diferenca = a.dataDoCalculo.getTime() - b.dataDoCalculo.getTime();
      if (diferenca !== 0) return diferenca;
      return a.criadoEm.getTime() - b.criadoEm.getTime();
    });
    return new ExtratoDeRecesso(ordenadas);
  }

  /** Running balance: o saldo de cada linha é o acumulado APÓS aquela ocorrência. */
  comSaldoCorrente(): readonly LinhaDeExtrato[] {
    let saldo = SaldoDeDias.zero();
    return this.ordenadoCronologicamente().ocorrencias.map((ocorrencia) => {
      saldo = saldo.aplicar(ocorrencia.tipo, ocorrencia.quantidade);
      return { ocorrencia, saldo };
    });
  }

  /** Invariante: igual ao saldo da última linha de comSaldoCorrente(). */
  saldoAtual(): SaldoDeDias {
    return this.ocorrencias.reduce(
      (saldo, ocorrencia) => saldo.aplicar(ocorrencia.tipo, ocorrencia.quantidade),
      SaldoDeDias.zero()
    );
  }

  /** Guarda de idempotência do acúmulo mensal. */
  temCreditoAutomaticoDe(competencia: CompetenciaDeRecesso): boolean {
    return this.ocorrencias.some((ocorrencia) => ocorrencia.ehCreditoAutomaticoDe(competencia));
  }

  /**
   * Data do último cálculo automático — o MAX da coluna (docs/modulo-recesso/02).
   * É a referência da regra dos 15 dias na rescisão.
   */
  dataDoUltimoCalculo(): Date | null {
    const automaticas = this.ocorrencias.filter((ocorrencia) => ocorrencia.ehAutomatica());
    if (automaticas.length === 0) return null;
    return automaticas.reduce(
      (maior, ocorrencia) => (ocorrencia.dataDoCalculo > maior ? ocorrencia.dataDoCalculo : maior),
      automaticas[0]!.dataDoCalculo
    );
  }

  /** Data da rescisão, se o contrato já foi encerrado. */
  dataDoEncerramento(): Date | null {
    const encerramento = this.ocorrencias.find((ocorrencia) => ocorrencia.encerraContrato());
    return encerramento ? encerramento.dataDoCalculo : null;
  }

  suportaDebito(tipo: TipoOcorrencia, quantidade: QuantidadeDeDias): boolean {
    return this.saldoAtual().suporta(tipo, quantidade);
  }

  doContrato(codContrato: string): ExtratoDeRecesso {
    return new ExtratoDeRecesso(
      this.ocorrencias.filter((ocorrencia) => ocorrencia.ehDoContrato(codContrato))
    );
  }

  acrescentar(novas: readonly OcorrenciaDeRecesso[]): ExtratoDeRecesso {
    return new ExtratoDeRecesso([...this.ocorrencias, ...novas]);
  }

  vazio(): boolean {
    return this.ocorrencias.length === 0;
  }

  quantidade(): number {
    return this.ocorrencias.length;
  }

  paraArray(): readonly OcorrenciaDeRecesso[] {
    return this.ocorrencias;
  }
}
