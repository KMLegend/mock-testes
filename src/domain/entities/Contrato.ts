import { DataHora } from '../value-objects/DataHora';
import { ProporcaoDeRecesso } from '../value-objects/ProporcaoDeRecesso';

export interface PropsContrato {
  readonly codEmpresa: string;
  readonly codContrato: string;
  readonly nomeContrato: string;
  readonly dataInicio: DataHora;
  readonly dataFim: DataHora;
  readonly valorMensal: number;
  readonly empresaResponsavel: string;
  readonly nomeEmpresaResponsavel: string;
  /** Fatia do direito de recesso do PJ que cabe a este contrato. Ausente = 100%. */
  readonly proporcaoDeRecesso?: ProporcaoDeRecesso;
}

export class Contrato {
  constructor(private readonly props: PropsContrato) {}

  get codEmpresa(): string { return this.props.codEmpresa; }
  get codContrato(): string { return this.props.codContrato; }
  get nomeContrato(): string { return this.props.nomeContrato; }
  get dataInicio(): DataHora { return this.props.dataInicio; }
  get dataFim(): DataHora { return this.props.dataFim; }
  get valorMensal(): number { return this.props.valorMensal; }
  get empresaResponsavel(): string { return this.props.empresaResponsavel; }
  get nomeEmpresaResponsavel(): string { return this.props.nomeEmpresaResponsavel; }

  get proporcaoDeRecesso(): ProporcaoDeRecesso {
    return this.props.proporcaoDeRecesso ?? ProporcaoDeRecesso.integral();
  }

  ehDoFornecedor(codEmpresa: string): boolean {
    return this.props.codEmpresa === codEmpresa;
  }

  /**
   * Chave do contrato nos lançamentos de recesso. Composta porque `codContrato`
   * vem do ERP numerado por empresa ("101", "102") e não é único isoladamente.
   */
  identificador(): string {
    return `${this.props.codEmpresa}-${this.props.codContrato}`;
  }

  /** Dia/mês de aniversário do acúmulo mensal. */
  diaEMesBase(): string {
    const inicio = this.props.dataInicio.paraDataLocal();
    const dia = String(inicio.getDate()).padStart(2, '0');
    const mes = String(inicio.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}`;
  }
}
