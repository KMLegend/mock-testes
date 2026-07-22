import { Competencia } from '../value-objects/Competencia';
import { Email } from '../value-objects/Email';
import { TipoLancamento } from '../value-objects/TipoLancamento';
import { DataHora } from '../value-objects/DataHora';
import { Cnpj } from '../value-objects/Cnpj';

export interface PropsChamado {
  readonly id: string;
  readonly protocolo: string;
  readonly assunto: string;
  readonly dataCriacao: DataHora;
  readonly dataFinalizacao: DataHora | null;
  readonly nomeSolicitante: string;
  readonly email: Email;
  readonly situacaoId: string;
  readonly situacaoDescricao: string;
  readonly categoriaId: string;
  readonly categoriaNome: string;
  readonly tipoLancamento: TipoLancamento;
  readonly mesReferente: Competencia;
  readonly cnpjAnexo?: Cnpj | null;
}

export class Chamado {
  constructor(private readonly props: PropsChamado) {}

  get id(): string { return this.props.id; }
  get protocolo(): string { return this.props.protocolo; }
  get assunto(): string { return this.props.assunto; }
  get dataCriacao(): DataHora { return this.props.dataCriacao; }
  get dataFinalizacao(): DataHora | null { return this.props.dataFinalizacao; }
  get nomeSolicitante(): string { return this.props.nomeSolicitante; }
  get email(): Email { return this.props.email; }
  get situacaoId(): string { return this.props.situacaoId; }
  get situacaoDescricao(): string { return this.props.situacaoDescricao; }
  get categoriaId(): string { return this.props.categoriaId; }
  get categoriaNome(): string { return this.props.categoriaNome; }
  get tipoLancamento(): TipoLancamento { return this.props.tipoLancamento; }
  get mesReferente(): Competencia { return this.props.mesReferente; }
  get cnpjAnexo(): Cnpj | null | undefined { return this.props.cnpjAnexo; }

  ehFinalizado(): boolean {
    return this.props.situacaoId === '5' || Boolean(this.props.dataFinalizacao?.raw());
  }
}
