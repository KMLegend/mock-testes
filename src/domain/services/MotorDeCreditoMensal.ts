import { Contrato } from '../entities/Contrato';
import { OcorrenciaDeRecesso } from '../entities/OcorrenciaDeRecesso';
import { ExtratoDeRecesso } from '../collections/ExtratoDeRecesso';
import { CompetenciaDeRecesso } from '../value-objects/CompetenciaDeRecesso';
import { FabricaDeOcorrenciasAutomaticas } from './FabricaDeOcorrenciasAutomaticas';

/** Direito mensal de recesso de um contrato: 2,5 dias por mês de vigência. */
export const CREDITO_MENSAL_BASE = 2.5;

const LIMITE_DE_COMPETENCIAS = 600; // guarda contra laço infinito por data inválida
const MILISSEGUNDOS_POR_DIA = 1000 * 60 * 60 * 24;

function ehEncerramentoDe(contrato: Contrato, ocorrencia: OcorrenciaDeRecesso): boolean {
  return ocorrencia.id === `auto-rescisao-${contrato.identificador()}`
    || ocorrencia.id === `auto-zeramento-${contrato.identificador()}`;
}

/**
 * Acumula o recesso mês a mês, por CONTRATO: a cada aniversário mensal da data de
 * início credita 2,5 dias. Para de creditar no fim da vigência (dataFim) ou hoje.
 *
 * IDEMPOTENTE: nunca gera crédito para uma competência que já possui crédito automático.
 */
export class MotorDeCreditoMensal {
  private readonly fabrica = new FabricaDeOcorrenciasAutomaticas();

  constructor(private readonly agora: () => Date = () => new Date()) {}

  gerarPara(contrato: Contrato, extratoExistente: ExtratoDeRecesso): readonly OcorrenciaDeRecesso[] {
    const limpo = this.sanitizarExtratoParaContratoVigente(contrato, extratoExistente);

    const mensalidades = this.competenciasVencidas(contrato)
      .filter((competencia) => !limpo.temCreditoAutomaticoDe(competencia))
      .map((competencia) => this.fabrica.credito(contrato, competencia, CREDITO_MENSAL_BASE));

    const encerramentos = this.gerarEncerramentoSeVigenciaExpirou(contrato, limpo, mensalidades);
    return [...mensalidades, ...encerramentos];
  }

  /** Se o contrato está vigente, remove qualquer lançamento de encerramento gravado anteriormente. */
  private sanitizarExtratoParaContratoVigente(
    contrato: Contrato,
    extratoExistente: ExtratoDeRecesso
  ): ExtratoDeRecesso {
    const fimDaVigencia = contrato.dataFim.paraDataLocal();
    if (this.agora().getTime() >= fimDaVigencia.getTime()) return extratoExistente;

    const semEncerramentos = extratoExistente.paraArray()
      .filter((ocorrencia) => !ehEncerramentoDe(contrato, ocorrencia));
    return new ExtratoDeRecesso(semEncerramentos);
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

    const dias = this.diasDesdeUltimoCalculo(contrato, extratoExistente, novasMensalidades);
    const ganhaCredito = dias >= 15;
    return [this.fabrica.rescisao(contrato, { dias, ganhaCredito, valorCredito: CREDITO_MENSAL_BASE })];
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
    return Math.max(0, Math.floor(diffMs / MILISSEGUNDOS_POR_DIA));
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

    return [this.fabrica.zeramento(contrato, saldo)];
  }

  private dataLimite(contrato: Contrato): Date {
    const fimDaVigencia = contrato.dataFim.paraDataLocal();
    const hoje = this.agora();
    return fimDaVigencia < hoje ? fimDaVigencia : hoje;
  }
}
