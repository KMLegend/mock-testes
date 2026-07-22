import { Contrato } from '../../domain/entities/Contrato';
import { Fornecedor } from '../../domain/entities/Fornecedor';
import { ExtratoDeRecesso } from '../../domain/collections/ExtratoDeRecesso';
import { SaldoDeDias } from '../../domain/value-objects/SaldoDeDias';

export interface PropsLinhaDeRecesso {
  readonly contrato: Contrato;
  readonly fornecedor: Fornecedor;
  readonly extrato: ExtratoDeRecesso;
  readonly encerradoEm: Date | null;
}

/**
 * Uma linha da grade de recesso = um CONTRATO (não um PJ).
 * Um PJ lotado em dois contratos aparece em duas linhas, cada uma com seu saldo.
 */
export class LinhaDeRecesso {
  constructor(private readonly props: PropsLinhaDeRecesso) {}

  get contrato(): Contrato { return this.props.contrato; }
  get fornecedor(): Fornecedor { return this.props.fornecedor; }
  get extrato(): ExtratoDeRecesso { return this.props.extrato; }
  get encerradoEm(): Date | null { return this.props.encerradoEm; }

  chave(): string {
    return this.props.contrato.identificador();
  }

  saldoAtual(): SaldoDeDias {
    return this.props.extrato.saldoAtual();
  }

  /** Encerrado por rescisão OU inativo no cadastro do ERP. */
  estaInativo(): boolean {
    return this.props.encerradoEm !== null || !this.props.fornecedor.ativo;
  }

  motivoDaInatividade(): string {
    if (this.props.encerradoEm) {
      return `Contrato encerrado em ${this.props.encerradoEm.toLocaleDateString('pt-BR')}`;
    }
    return 'Fornecedor inativo no cadastro';
  }

  statusParaExibicao(): string {
    return this.estaInativo() ? 'Inativo' : 'Ativo';
  }

  correspondeAoStatus(statusFilter: string): boolean {
    if (statusFilter === 'all') return true;
    return this.statusParaExibicao() === statusFilter;
  }

  correspondeA(termo: string): boolean {
    const busca = termo.trim().toLowerCase();
    if (busca === '') return true;

    const textos = [
      this.props.fornecedor.empresa,
      this.props.fornecedor.apelido,
      this.props.fornecedor.responsavelLegal,
      this.props.contrato.codContrato,
      this.props.contrato.nomeEmpresaResponsavel
    ];
    if (textos.some((texto) => texto.toLowerCase().includes(busca))) return true;
    return this.props.fornecedor.cnpj.contem(busca);
  }
}
