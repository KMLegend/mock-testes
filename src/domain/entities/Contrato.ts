import { DataHora } from '../value-objects/DataHora';

export interface PropsContrato {
  readonly codEmpresa: string;
  readonly codContrato: string;
  readonly nomeContrato: string;
  readonly dataInicio: DataHora;
  readonly dataFim: DataHora;
  readonly valorMensal: number;
  readonly empresaResponsavel: string;
  readonly nomeEmpresaResponsavel: string;
  readonly isDeletedAt?: string | null;
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
  get isDeletedAt(): string | null { return this.props.isDeletedAt ?? null; }
  get ehDeletado(): boolean { return this.props.isDeletedAt !== null && this.props.isDeletedAt !== undefined; }

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

  /**
   * Status derivado da VIGÊNCIA: um PJ nunca presta serviço a duas empresas ao
   * mesmo tempo — rescinde e gera novo contrato. Ativo = hoje dentro de [início, fim] e NÃO deletado.
   */
  estaVigente(hoje: Date): boolean {
    if (this.ehDeletado) return false;
    const inicio = this.props.dataInicio.paraDataLocal().getTime();
    const fim = this.props.dataFim.paraDataLocal().getTime();
    return hoje.getTime() >= inicio && hoje.getTime() <= fim;
  }

  statusParaExibicao(hoje: Date): string {
    if (this.ehDeletado) return 'Deletado';
    return this.estaVigente(hoje) ? 'Ativo' : 'Inativo';
  }
}
