import { Cnpj } from '../value-objects/Cnpj';
import { Email } from '../value-objects/Email';

export interface PropsFornecedor {
  readonly codEmpresa: string;
  readonly empresa: string;
  readonly apelido: string;
  readonly email: Email;
  readonly tipoInscricao: string;
  readonly cnpj: Cnpj;
  readonly ativo: boolean;
  /**
   * Responsável legal (pessoa) do PJ.
   * PENDÊNCIA R-16: o HCM não fornece este campo hoje — mockado na Fase 1.
   */
  readonly responsavelLegal?: string;
}

export class Fornecedor {
  constructor(private readonly props: PropsFornecedor) {}

  get codEmpresa(): string { return this.props.codEmpresa; }
  get empresa(): string { return this.props.empresa; }
  get apelido(): string { return this.props.apelido; }
  get email(): Email { return this.props.email; }
  get tipoInscricao(): string { return this.props.tipoInscricao; }
  get cnpj(): Cnpj { return this.props.cnpj; }
  get ativo(): boolean { return this.props.ativo; }
  get responsavelLegal(): string { return this.props.responsavelLegal ?? this.props.apelido; }

  statusParaExibicao(): string {
    if (this.props.ativo) return 'Ativo';
    return 'Inativo';
  }

  temEmail(email: Email): boolean {
    return this.props.email.equals(email);
  }
}
