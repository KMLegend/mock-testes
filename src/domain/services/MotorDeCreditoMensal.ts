import { Contrato } from '../entities/Contrato';
import { OcorrenciaDeRecesso } from '../entities/OcorrenciaDeRecesso';
import { ExtratoDeRecesso } from '../collections/ExtratoDeRecesso';
import { AutorDoLancamento } from '../value-objects/AutorDoLancamento';
import { CompetenciaDeRecesso } from '../value-objects/CompetenciaDeRecesso';
import { OrigemDaOcorrencia } from '../value-objects/OrigemDaOcorrencia';
import { QuantidadeDeDias } from '../value-objects/QuantidadeDeDias';
import { TipoOcorrencia } from '../value-objects/TipoOcorrencia';

/** Direito mensal cheio de um PJ. Contratos repartem esse valor pela proporção. */
export const CREDITO_MENSAL_BASE = 2.5;

const LIMITE_DE_COMPETENCIAS = 600; // guarda contra laço infinito por data inválida

/**
 * Acumula o recesso mês a mês, por CONTRATO: a cada aniversário mensal da data de
 * início credita 2,5 dias × proporção do contrato.
 *
 * IDEMPOTENTE: nunca gera crédito para uma competência que já possui crédito automático.
 */
export class MotorDeCreditoMensal {
  constructor(private readonly agora: () => Date = () => new Date()) {}

  gerarPara(
    contrato: Contrato,
    extratoExistente: ExtratoDeRecesso,
    encerradoEm: Date | null = null
  ): readonly OcorrenciaDeRecesso[] {
    return this.competenciasVencidas(contrato, encerradoEm)
      .filter((competencia) => !extratoExistente.temCreditoAutomaticoDe(competencia))
      .map((competencia) => this.criarCredito(contrato, competencia));
  }

  /** Aniversários mensais já completados, dentro da vigência e até hoje. */
  private competenciasVencidas(
    contrato: Contrato,
    encerradoEm: Date | null
  ): readonly CompetenciaDeRecesso[] {
    const limite = this.dataLimite(contrato, encerradoEm);
    const competencias: CompetenciaDeRecesso[] = [];

    // O primeiro crédito só nasce um mês DEPOIS do início — mês incompleto não gera direito.
    let competencia = CompetenciaDeRecesso.apartirDe(contrato.dataInicio.paraDataLocal()).proxima();

    while (
      competencias.length < LIMITE_DE_COMPETENCIAS
      && competencia.data().getTime() <= limite.getTime()
    ) {
      competencias.push(competencia);
      competencia = competencia.proxima();
    }

    return competencias;
  }

  private dataLimite(contrato: Contrato, encerradoEm: Date | null): Date {
    const candidatas = [this.agora(), contrato.dataFim.paraDataLocal()];
    if (encerradoEm) candidatas.push(encerradoEm);
    return candidatas.reduce((menor, data) => (data < menor ? data : menor));
  }

  private criarCredito(contrato: Contrato, competencia: CompetenciaDeRecesso): OcorrenciaDeRecesso {
    const dias = contrato.proporcaoDeRecesso.aplicarA(CREDITO_MENSAL_BASE);
    return new OcorrenciaDeRecesso({
      id: `auto-${contrato.identificador()}-${competencia.identificador()}`,
      codContrato: contrato.identificador(),
      dataDoCalculo: competencia.data(),
      competencia,
      descricao: this.descricao(contrato),
      tipo: TipoOcorrencia.credito(),
      quantidade: QuantidadeDeDias.de(dias),
      autor: AutorDoLancamento.sistema(),
      origem: OrigemDaOcorrencia.automatico(),
      criadoEm: competencia.data()
    });
  }

  private descricao(contrato: Contrato): string {
    const proporcao = contrato.proporcaoDeRecesso;
    if (proporcao.ehIntegral()) return 'Crédito mensal de recesso';
    return `Crédito mensal de recesso (${proporcao.paraExibicao()} do direito)`;
  }
}
