import { Competencia } from '../value-objects/Competencia';
import { Cnpj } from '../value-objects/Cnpj';
import { DataHora } from '../value-objects/DataHora';
import { Email } from '../value-objects/Email';
import { RegraAlerta } from '../value-objects/RegraAlerta';

export interface PropsAlerta {
  readonly email: Email;
  /** Pessoa responsável legal pelo PJ destinatário do alerta (não a razão social). */
  readonly responsavelLegal: string;
  readonly cnpj: Cnpj;
  readonly regra: RegraAlerta;
  readonly dataHoraEnvio: DataHora;
  readonly mesAnoReferencia: Competencia;
}

export class Alerta {
  constructor(private readonly props: PropsAlerta) {}

  get email(): Email { return this.props.email; }
  get responsavelLegal(): string { return this.props.responsavelLegal; }
  get cnpj(): Cnpj { return this.props.cnpj; }
  get regra(): RegraAlerta { return this.props.regra; }
  get dataHoraEnvio(): DataHora { return this.props.dataHoraEnvio; }
  get mesAnoReferencia(): Competencia { return this.props.mesAnoReferencia; }
}
