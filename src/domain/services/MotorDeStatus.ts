import { Fornecedor } from '../entities/Fornecedor';
import { Chamado } from '../entities/Chamado';
import { Contrato } from '../entities/Contrato';
import { LinhasDeStatus, PropsLinhaDeStatus } from '../collections/LinhasDeStatus';
import { ResolucaoDeContrato } from './ResolucaoDeContrato';
import { StatusNf } from '../value-objects/StatusNf';
import { DataHora } from '../value-objects/DataHora';
import { TipoLancamento } from '../value-objects/TipoLancamento';
import { Cnpj } from '../value-objects/Cnpj';

const TOMTICKET_BASE_URL = 'https://city.tomticket.com/chamado/';

export interface ContextoProcessamento {
  readonly fornecedores: readonly Fornecedor[];
  readonly chamados: readonly Chamado[];
  readonly contratos: readonly Contrato[];
  readonly cnpjTomadores: Map<string, string>;
  readonly cnpjsExtraidos?: Map<string, Cnpj | null>;
}

export class MotorDeStatus {
  static processar(ctx: ContextoProcessamento): LinhasDeStatus {
    const fornecedoresAtivos = ctx.fornecedores.filter((f) => f.ativo);
    const linhas: PropsLinhaDeStatus[] = [];

    for (const pj of fornecedoresAtivos) {
      const novasLinhas = MotorDeStatus.processarPj(pj, ctx);
      linhas.push(...novasLinhas);
    }

    return new LinhasDeStatus(linhas);
  }

  private static processarPj(pj: Fornecedor, ctx: ContextoProcessamento): PropsLinhaDeStatus[] {
    const chamadosPj = ctx.chamados.filter((c) => c.email.equals(pj.email));
    const contratosPj = ctx.contratos.filter((c) => c.codEmpresa === pj.codEmpresa);

    if (chamadosPj.length === 0) {
      return [MotorDeStatus.criarLinhaPendente(pj)];
    }

    return chamadosPj.map((ticket) => {
      const cnpjExtraido = ctx.cnpjsExtraidos?.get(ticket.id) ?? null;
      const resolucao = ResolucaoDeContrato.resolver({
        fornecedor: pj,
        contratos: contratosPj,
        chamado: ticket,
        cnpjTomadores: ctx.cnpjTomadores,
        cnpjExtraido
      });
      return MotorDeStatus.criarLinhaComChamado(pj, ticket, resolucao);
    });
  }

  private static criarLinhaPendente(pj: Fornecedor): PropsLinhaDeStatus {
    return {
      id: `pendente-${pj.codEmpresa}`,
      nome: pj.empresa,
      apelido: pj.apelido,
      funcionario: '-',
      email: pj.email,
      cnpj: pj.cnpj,
      status: StatusNf.pendente(),
      protocolo: '-',
      dataAbertura: DataHora.de(null),
      dataFinalizacao: null,
      tipoLancamento: TipoLancamento.de('-'),
      contratoCodigo: '-',
      contratoNome: '-',
      empresaResponsavel: '-',
      linkChamado: '',
      ticketId: null,
      manualReason: null
    };
  }

  private static criarLinhaComChamado(
    pj: Fornecedor,
    ticket: Chamado,
    resolucao: ReturnType<typeof ResolucaoDeContrato.resolver>
  ): PropsLinhaDeStatus {
    let status = StatusNf.enviado();
    let manualReason: string | null = null;

    if (ticket.ehFinalizado()) {
      status = StatusNf.recebido();
    }

    if (resolucao.status === 'manual_treatment') {
      status = StatusNf.tratamentoManual();
      manualReason = resolucao.reason;
    }

    const contrato = resolucao.status === 'resolved' ? resolucao.contrato : null;

    return {
      id: ticket.id,
      nome: pj.empresa,
      apelido: pj.apelido,
      funcionario: ticket.nomeSolicitante || '-',
      email: pj.email,
      cnpj: pj.cnpj,
      status,
      protocolo: ticket.protocolo,
      dataAbertura: ticket.dataCriacao,
      dataFinalizacao: ticket.dataFinalizacao,
      tipoLancamento: ticket.tipoLancamento,
      contratoCodigo: contrato ? contrato.codContrato : '-',
      contratoNome: contrato ? contrato.nomeContrato : '-',
      empresaResponsavel: contrato ? contrato.nomeEmpresaResponsavel : '-',
      linkChamado: `${TOMTICKET_BASE_URL}${ticket.id}`,
      ticketId: ticket.id,
      manualReason
    };
  }
}
