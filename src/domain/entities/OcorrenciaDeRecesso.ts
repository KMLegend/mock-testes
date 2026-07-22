import { AutorDoLancamento } from '../value-objects/AutorDoLancamento';
import { CompetenciaDeRecesso } from '../value-objects/CompetenciaDeRecesso';
import { OrigemDaOcorrencia } from '../value-objects/OrigemDaOcorrencia';
import { QuantidadeDeDias } from '../value-objects/QuantidadeDeDias';
import { TipoOcorrencia } from '../value-objects/TipoOcorrencia';

export interface PropsOcorrenciaDeRecesso {
  readonly id: string;
  /** O saldo é POR CONTRATO — um PJ com dois contratos tem dois extratos. */
  readonly codContrato: string;
  /** Quando o lançamento foi calculado/registrado. */
  readonly dataDoCalculo: Date;
  /** A qual competência mensal o lançamento pertence. */
  readonly competencia: CompetenciaDeRecesso;
  readonly descricao: string;
  readonly tipo: TipoOcorrencia;
  readonly quantidade: QuantidadeDeDias;
  readonly autor: AutorDoLancamento;
  readonly origem: OrigemDaOcorrencia;
  readonly criadoEm: Date;
  /** Marca o lançamento que encerra o contrato — a grade lê isso para o status. */
  readonly encerraContrato?: boolean;
}

/**
 * Lançamento no extrato de recesso de um contrato.
 * NÃO carrega saldo — o saldo é responsabilidade do ExtratoDeRecesso (first-class collection).
 */
export class OcorrenciaDeRecesso {
  constructor(private readonly props: PropsOcorrenciaDeRecesso) {}

  get id(): string { return this.props.id; }
  get codContrato(): string { return this.props.codContrato; }
  get dataDoCalculo(): Date { return this.props.dataDoCalculo; }
  get competencia(): CompetenciaDeRecesso { return this.props.competencia; }
  get descricao(): string { return this.props.descricao; }
  get tipo(): TipoOcorrencia { return this.props.tipo; }
  get quantidade(): QuantidadeDeDias { return this.props.quantidade; }
  get autor(): AutorDoLancamento { return this.props.autor; }
  get origem(): OrigemDaOcorrencia { return this.props.origem; }
  get criadoEm(): Date { return this.props.criadoEm; }

  ehDoContrato(codContrato: string): boolean {
    return this.props.codContrato === codContrato;
  }

  ehAutomatica(): boolean {
    return this.props.origem.ehAutomatica();
  }

  encerraContrato(): boolean {
    return this.props.encerraContrato === true;
  }

  /** Identifica um crédito automático já lançado para a competência (idempotência). */
  ehCreditoAutomaticoDe(competencia: CompetenciaDeRecesso): boolean {
    return this.props.origem.ehAutomatica() && this.props.competencia.equals(competencia);
  }

  dataDoCalculoFormatada(): string {
    return this.props.dataDoCalculo.toLocaleDateString('pt-BR');
  }
}
