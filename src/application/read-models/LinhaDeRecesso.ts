import { Contrato } from '../../domain/entities/Contrato';
import { Fornecedor } from '../../domain/entities/Fornecedor';
import { ExtratoDeRecesso } from '../../domain/collections/ExtratoDeRecesso';
import { SaldoDeDias } from '../../domain/value-objects/SaldoDeDias';

const MILISSEGUNDOS_POR_DIA = 1000 * 60 * 60 * 24;
const DIAS_ANTES_DO_FIM_PARA_FINALIZAR = 30;

export interface PropsLinhaDeRecesso {
  readonly contrato: Contrato;
  readonly fornecedor: Fornecedor;
  readonly extrato: ExtratoDeRecesso;
  readonly hoje: Date;
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

  chave(): string {
    return this.props.contrato.identificador();
  }

  saldoAtual(): SaldoDeDias {
    return this.props.extrato.saldoAtual();
  }

  /** Fora da vigência do contrato OU inativo no cadastro do ERP. */
  estaInativo(): boolean {
    return !this.props.contrato.estaVigente(this.props.hoje) || !this.props.fornecedor.ativo;
  }

  /**
   * Botão "Finalizar contrato": liberado a partir de 30 dias antes do fim da vigência,
   * enquanto o contrato ainda estiver vigente e não houver encerramento já lançado
   * (o encerramento natural, pós-dataFim, já é feito automaticamente pelo motor).
   */
  podeFinalizarAntecipadamente(): boolean {
    if (!this.props.contrato.estaVigente(this.props.hoje)) return false;
    if (!this.props.contrato.temPrazoDeterminado) return false;
    if (this.jaEncerrado()) return false;

    const diasParaOFim = Math.floor(
      (this.props.contrato.dataFim.paraDataLocal().getTime() - this.props.hoje.getTime()) / MILISSEGUNDOS_POR_DIA
    );
    return diasParaOFim <= DIAS_ANTES_DO_FIM_PARA_FINALIZAR;
  }

  private jaEncerrado(): boolean {
    const id = `auto-rescisao-${this.props.contrato.identificador()}`;
    return this.props.extrato.paraArray().some((ocorrencia) => ocorrencia.id === id);
  }

  motivoDaInatividade(): string {
    if (!this.props.fornecedor.ativo) return 'Fornecedor inativo no cadastro';
    return `Contrato fora da vigência (até ${this.props.contrato.dataFim.paraFormatadoCurto()})`;
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
