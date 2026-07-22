import { Contrato } from '../entities/Contrato';
import { OcorrenciaDeRecesso } from '../entities/OcorrenciaDeRecesso';
import { ExtratoDeRecesso } from '../collections/ExtratoDeRecesso';
import { AutorDoLancamento } from '../value-objects/AutorDoLancamento';
import { CompetenciaDeRecesso } from '../value-objects/CompetenciaDeRecesso';
import { OrigemDaOcorrencia } from '../value-objects/OrigemDaOcorrencia';
import { QuantidadeDeDias } from '../value-objects/QuantidadeDeDias';
import { TipoOcorrencia } from '../value-objects/TipoOcorrencia';
import { CREDITO_MENSAL_BASE } from './MotorDeCreditoMensal';

/** Mínimo de dias trabalhados no mês incompleto para gerar direito na rescisão. */
export const DIAS_MINIMOS_PARA_CREDITO = 15;

const MILISSEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Encerramento de contrato: fecha o mês quebrado e zera o saldo.
 *
 * São DOIS lançamentos, de propósito — o extrato precisa mostrar que a regra dos
 * 15 dias foi aplicada (mesmo quando não gerou direito) antes de zerar o saldo.
 */
export class EncerramentoDeContrato {
  constructor(private readonly autor: AutorDoLancamento) {}

  gerarPara(
    contrato: Contrato,
    extrato: ExtratoDeRecesso,
    dataDaRescisao: Date
  ): readonly OcorrenciaDeRecesso[] {
    const rescisao = this.lancamentoDeRescisao(contrato, extrato, dataDaRescisao);
    const saldo = extrato.acrescentar([rescisao]).saldoAtual();

    // O encerramento é emitido SEMPRE, mesmo zerando nada: é ele que marca o
    // contrato como encerrado na grade.
    const encerramento = this.lancamentoDeEncerramento(
      contrato,
      saldo.comoQuantidade(),
      dataDaRescisao
    );
    return [rescisao, encerramento];
  }

  /**
   * Crédito proporcional do mês quebrado: 2,5 × proporção se houver ao menos 15 dias
   * desde o último cálculo; abaixo disso o mês não gera direito e o crédito é zero.
   */
  private lancamentoDeRescisao(
    contrato: Contrato,
    extrato: ExtratoDeRecesso,
    dataDaRescisao: Date
  ): OcorrenciaDeRecesso {
    const competencia = CompetenciaDeRecesso.apartirDe(dataDaRescisao);
    const dias = this.diasDesdeOUltimoCalculo(contrato, extrato, dataDaRescisao);
    const temDireito = dias >= DIAS_MINIMOS_PARA_CREDITO;
    const quantidade = temDireito
      ? QuantidadeDeDias.de(contrato.proporcaoDeRecesso.aplicarA(CREDITO_MENSAL_BASE))
      : QuantidadeDeDias.nenhuma();

    return new OcorrenciaDeRecesso({
      id: `rescisao-${contrato.identificador()}-${dataDaRescisao.getTime()}`,
      codContrato: contrato.identificador(),
      dataDoCalculo: dataDaRescisao,
      competencia,
      descricao: `Rescisão contratual (+${quantidade.paraExibicao()} crédito) — ${dias} dia(s) desde o último cálculo`,
      tipo: TipoOcorrencia.credito(),
      quantidade,
      autor: this.autor,
      origem: OrigemDaOcorrencia.manual(),
      criadoEm: dataDaRescisao
    });
  }

  private lancamentoDeEncerramento(
    contrato: Contrato,
    quantidade: QuantidadeDeDias,
    dataDaRescisao: Date
  ): OcorrenciaDeRecesso {
    return new OcorrenciaDeRecesso({
      id: `encerramento-${contrato.identificador()}-${dataDaRescisao.getTime()}`,
      codContrato: contrato.identificador(),
      dataDoCalculo: dataDaRescisao,
      competencia: CompetenciaDeRecesso.apartirDe(dataDaRescisao),
      descricao: 'Encerramento de contrato (zera o saldo atual)',
      tipo: TipoOcorrencia.debito(),
      quantidade,
      autor: this.autor,
      origem: OrigemDaOcorrencia.manual(),
      criadoEm: dataDaRescisao,
      encerraContrato: true
    });
  }

  /** Sem cálculo automático ainda, a contagem parte do início do contrato. */
  private diasDesdeOUltimoCalculo(
    contrato: Contrato,
    extrato: ExtratoDeRecesso,
    dataDaRescisao: Date
  ): number {
    const referencia = extrato.dataDoUltimoCalculo() ?? contrato.dataInicio.paraDataLocal();
    const decorridos = (dataDaRescisao.getTime() - referencia.getTime()) / MILISSEGUNDOS_POR_DIA;
    return Math.max(0, Math.floor(decorridos));
  }
}
