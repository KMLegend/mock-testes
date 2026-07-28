import { Contrato } from '../entities/Contrato';
import { OcorrenciaDeRecesso } from '../entities/OcorrenciaDeRecesso';
import { ExtratoDeRecesso } from '../collections/ExtratoDeRecesso';
import { AutorDoLancamento } from '../value-objects/AutorDoLancamento';
import { CompetenciaDeRecesso } from '../value-objects/CompetenciaDeRecesso';
import { OrigemDaOcorrencia } from '../value-objects/OrigemDaOcorrencia';
import { QuantidadeDeDias } from '../value-objects/QuantidadeDeDias';
import { TipoOcorrencia } from '../value-objects/TipoOcorrencia';

/** Direito mensal de recesso de um contrato: 2,5 dias por mês de vigência. */
export const CREDITO_MENSAL_BASE = 2.5;

const LIMITE_DE_COMPETENCIAS = 600; // guarda contra laço infinito por data inválida

/**
 * Acumula o recesso mês a mês, por CONTRATO: a cada aniversário mensal da data de
 * início credita 2,5 dias. Para de creditar no fim da vigência (dataFim) ou hoje.
 *
 * IDEMPOTENTE: nunca gera crédito para uma competência que já possui crédito automático.
 */
export class MotorDeCreditoMensal {
  constructor(private readonly agora: () => Date = () => new Date()) {}

  gerarPara(
    contrato: Contrato,
    extratoExistente: ExtratoDeRecesso
  ): readonly OcorrenciaDeRecesso[] {
    const mensalidades = this.competenciasVencidas(contrato)
      .filter((competencia) => !extratoExistente.temCreditoAutomaticoDe(competencia))
      .map((competencia) => this.criarCredito(contrato, competencia));

    const encerramentos = this.gerarEncerramentoSeVigenciaExpirou(
      contrato,
      extratoExistente,
      mensalidades
    );

    return [...mensalidades, ...encerramentos];
  }

  /** Aniversários mensais já completados a partir de 2025, dentro da vigência e até hoje. */
  private competenciasVencidas(contrato: Contrato): readonly CompetenciaDeRecesso[] {
    const limite = this.dataLimite(contrato);
    const competencias: CompetenciaDeRecesso[] = [];

    // O acúmulo de recesso é considerado a partir do ano de 2025.
    let competencia = this.primeiraCompetenciaCalculada(contrato);

    while (
      competencias.length < LIMITE_DE_COMPETENCIAS
      && competencia.data().getTime() <= limite.getTime()
    ) {
      competencias.push(competencia);
      competencia = competencia.proxima();
    }

    return competencias;
  }

  /**
   * Define o primeiro marco de competência mensal:
   * Para contratos iniciados antes de 2025 (ex: 15/03/2023), o crédito inicia em 2025 (15/03/2025).
   * Para contratos iniciados em 2025 em diante, o primeiro crédito nasce um mês após a data de início.
   */
  private primeiraCompetenciaCalculada(contrato: Contrato): CompetenciaDeRecesso {
    const inicio = contrato.dataInicio.paraDataLocal();
    const anoInicio = inicio.getFullYear();

    if (anoInicio < 2025) {
      const data2025 = new Date(2025, inicio.getMonth(), inicio.getDate());
      return CompetenciaDeRecesso.apartirDe(data2025);
    }

    return CompetenciaDeRecesso.apartirDe(inicio).proxima();
  }

  /**
   * Se a vigência do contrato já expirou (dataFim <= hoje), gera a rescisão contratual
   * (regra dos 15 dias) e o encerramento (débito que zera o saldo). Ambos idempotentes.
   */
  private gerarEncerramentoSeVigenciaExpirou(
    contrato: Contrato,
    extratoExistente: ExtratoDeRecesso,
    novasMensalidades: readonly OcorrenciaDeRecesso[]
  ): readonly OcorrenciaDeRecesso[] {
    const fimDaVigencia = contrato.dataFim.paraDataLocal();
    if (this.agora().getTime() < fimDaVigencia.getTime()) return [];

    const rescisao = this.criarRescisao(contrato, extratoExistente, novasMensalidades);
    const zeramento = this.criarZeramento(contrato, extratoExistente, [...novasMensalidades, ...rescisao]);
    return [...rescisao, ...zeramento];
  }

  /** Fecha o mês quebrado: +2,5 se ≥15 dias desde o último cálculo, senão +0. */
  private criarRescisao(
    contrato: Contrato,
    extratoExistente: ExtratoDeRecesso,
    novasMensalidades: readonly OcorrenciaDeRecesso[]
  ): readonly OcorrenciaDeRecesso[] {
    const id = `auto-rescisao-${contrato.identificador()}`;
    if (extratoExistente.paraArray().some((ocorrencia) => ocorrencia.id === id)) return [];

    const fimDaVigencia = contrato.dataFim.paraDataLocal();
    const dias = this.diasDesdeUltimoCalculo(contrato, extratoExistente, novasMensalidades);
    const ganhaCredito = dias >= 15;
    return [new OcorrenciaDeRecesso({
      id,
      codContrato: contrato.identificador(),
      dataDoCalculo: fimDaVigencia,
      competencia: CompetenciaDeRecesso.contendo(fimDaVigencia, contrato.dataInicio.paraDataLocal()),
      descricao: `Rescisão contratual (+${ganhaCredito ? '2,5' : '0'} crédito) — ${dias} dia(s)`,
      tipo: TipoOcorrencia.credito(),
      quantidade: ganhaCredito ? QuantidadeDeDias.de(CREDITO_MENSAL_BASE) : QuantidadeDeDias.nenhuma(),
      autor: AutorDoLancamento.sistema(),
      origem: OrigemDaOcorrencia.automatico(),
      criadoEm: fimDaVigencia
    })];
  }

  /** Dias corridos entre o último cálculo (ou o marco inicial) e o fim da vigência. */
  private diasDesdeUltimoCalculo(
    contrato: Contrato,
    extratoExistente: ExtratoDeRecesso,
    novasMensalidades: readonly OcorrenciaDeRecesso[]
  ): number {
    const todas = [...extratoExistente.paraArray(), ...novasMensalidades];
    const inicioMs = this.primeiraCompetenciaCalculada(contrato).data().getTime();
    const ultimaMs = todas.length > 0
      ? Math.max(...todas.map((ocorrencia) => ocorrencia.dataDoCalculo.getTime()))
      : inicioMs;
    const diffMs = contrato.dataFim.paraDataLocal().getTime() - ultimaMs;
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  /** Débito que zera o saldo remanescente do contrato encerrado. */
  private criarZeramento(
    contrato: Contrato,
    extratoExistente: ExtratoDeRecesso,
    ocorrenciasAteRescisao: readonly OcorrenciaDeRecesso[]
  ): readonly OcorrenciaDeRecesso[] {
    const id = `auto-zeramento-${contrato.identificador()}`;
    if (extratoExistente.paraArray().some((ocorrencia) => ocorrencia.id === id)) return [];

    const saldo = extratoExistente.acrescentar(ocorrenciasAteRescisao).saldoAtual().obterValor();
    if (saldo <= 0) return [];

    const fimDaVigencia = contrato.dataFim.paraDataLocal();
    return [new OcorrenciaDeRecesso({
      id,
      codContrato: contrato.identificador(),
      dataDoCalculo: fimDaVigencia,
      competencia: CompetenciaDeRecesso.contendo(fimDaVigencia, contrato.dataInicio.paraDataLocal()),
      descricao: 'Encerramento de contrato (zera o saldo atual)',
      tipo: TipoOcorrencia.debito(),
      quantidade: QuantidadeDeDias.de(saldo),
      autor: AutorDoLancamento.sistema(),
      origem: OrigemDaOcorrencia.automatico(),
      criadoEm: new Date(fimDaVigencia.getTime() + 1000)
    })];
  }

  private dataLimite(contrato: Contrato): Date {
    const fimDaVigencia = contrato.dataFim.paraDataLocal();
    const hoje = this.agora();
    return fimDaVigencia < hoje ? fimDaVigencia : hoje;
  }

  private criarCredito(contrato: Contrato, competencia: CompetenciaDeRecesso): OcorrenciaDeRecesso {
    return new OcorrenciaDeRecesso({
      id: `auto-${contrato.identificador()}-${competencia.identificador()}`,
      codContrato: contrato.identificador(),
      dataDoCalculo: competencia.data(),
      competencia,
      descricao: 'Crédito mensal de recesso',
      tipo: TipoOcorrencia.credito(),
      quantidade: QuantidadeDeDias.de(CREDITO_MENSAL_BASE),
      autor: AutorDoLancamento.sistema(),
      origem: OrigemDaOcorrencia.automatico(),
      criadoEm: competencia.data()
    });
  }
}
