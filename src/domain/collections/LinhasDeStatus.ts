import { Cnpj } from '../value-objects/Cnpj';
import { Email } from '../value-objects/Email';
import { StatusNf } from '../value-objects/StatusNf';
import { TipoLancamento } from '../value-objects/TipoLancamento';
import { DataHora } from '../value-objects/DataHora';
import { RollupDeStatus } from '../services/RollupDeStatus';

export interface PropsLinhaDeStatus {
  readonly id: string;
  readonly nome: string;
  readonly apelido: string;
  readonly funcionario: string;
  readonly email: Email;
  readonly cnpj: Cnpj;
  readonly status: StatusNf;
  readonly protocolo: string;
  readonly dataAbertura: DataHora;
  readonly dataFinalizacao: DataHora | null;
  readonly tipoLancamento: TipoLancamento;
  readonly contratoCodigo: string;
  readonly contratoNome: string;
  readonly empresaResponsavel: string;
  readonly linkChamado: string;
  readonly ticketId: string | null;
  readonly manualReason: string | null;
}

export interface ResumoRollup {
  readonly total: number;
  readonly pendente: number;
  readonly enviado: number;
  readonly recebido: number;
  readonly manual: number;
}

export class LinhasDeStatus {
  constructor(private readonly itens: readonly PropsLinhaDeStatus[]) {}

  paraArray(): readonly PropsLinhaDeStatus[] {
    return this.itens;
  }

  filtradasPor(statusFilter: string, searchQuery: string): LinhasDeStatus {
    const filtradas = this.itens.filter((item) => {
      const bateStatus = statusFilter === 'all' || !statusFilter || item.status.paraExibicao() === statusFilter;
      if (!bateStatus) return false;

      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;

      const bateTexto = [item.apelido, item.nome, item.funcionario, item.email.paraExibicao(), item.protocolo]
        .some((val) => val.toLowerCase().includes(query));

      const bateCnpj = item.cnpj.contem(query);

      return bateTexto || bateCnpj;
    });

    return new LinhasDeStatus(filtradas);
  }

  ordenadasPor(campo: string, direcao: 'asc' | 'desc'): LinhasDeStatus {
    const ordenadas = [...this.itens].sort((itemA, itemB) => {
      const valA = LinhasDeStatus.obterValorOrdenacao(itemA, campo);
      const valB = LinhasDeStatus.obterValorOrdenacao(itemB, campo);
      
      const comp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return direcao === 'asc' ? comp : -comp;
    });

    return new LinhasDeStatus(ordenadas);
  }

  private static obterValorOrdenacao(item: PropsLinhaDeStatus, campo: string): string {
    if (campo === 'apelido') return item.apelido;
    if (campo === 'nome') return item.nome;
    if (campo === 'funcionario') return item.funcionario;
    if (campo === 'cnpj') return item.cnpj.obterDigitos();
    if (campo === 'status') return item.status.paraExibicao();
    return '';
  }

  resumoRollup(): ResumoRollup {
    const mapaStatus = this.agruparStatusPorEmail();
    return LinhasDeStatus.calcularContadores(mapaStatus);
  }

  agruparStatusPorEmail(): Map<string, StatusNf[]> {
    const mapa = new Map<string, StatusNf[]>();
    for (const item of this.itens) {
      const key = item.email.paraExibicao();
      const lista = mapa.get(key) ?? [];
      lista.push(item.status);
      mapa.set(key, lista);
    }
    return mapa;
  }

  static calcularContadores(mapaStatus: Map<string, StatusNf[]>): ResumoRollup {
    const contadores = { pendente: 0, enviado: 0, recebido: 0, manual: 0 };

    for (const lista of mapaStatus.values()) {
      const stFinal = RollupDeStatus.calcularStatusFornecedor(lista);
      LinhasDeStatus.incrementarContador(contadores, stFinal.paraExibicao());
    }

    return {
      total: mapaStatus.size,
      ...contadores
    };
  }

  private static incrementarContador(
    contadores: { pendente: number; enviado: number; recebido: number; manual: number },
    statusStr: string
  ): void {
    if (statusStr === 'Tratamento Manual') contadores.manual++;
    if (statusStr === 'Pendente') contadores.pendente++;
    if (statusStr === 'Enviado') contadores.enviado++;
    if (statusStr === 'Recebido') contadores.recebido++;
  }
}
