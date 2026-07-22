import { Alerta } from '../entities/Alerta';
import { StatusNf } from '../value-objects/StatusNf';
import { Competencia } from '../value-objects/Competencia';

export interface CriterioFiltroAlertas {
  readonly competencia: Competencia;
  readonly searchQuery: string;
  readonly statusFilter: string;
  readonly mapaStatusFornecedor: Map<string, StatusNf>;
}

export class Alertas {
  constructor(private readonly itens: readonly Alerta[]) {}

  paraArray(): readonly Alerta[] {
    return this.itens;
  }

  filtradosPor(criterio: CriterioFiltroAlertas): Alertas {
    const filtrados = this.itens.filter((alerta) => Alertas.correspondeAoCriterio(alerta, criterio));
    return new Alertas(filtrados);
  }

  private static correspondeAoCriterio(alerta: Alerta, criterio: CriterioFiltroAlertas): boolean {
    if (!alerta.mesAnoReferencia.equals(criterio.competencia)) return false;

    const query = criterio.searchQuery.trim().toLowerCase();
    if (query && !Alertas.correspondeABusca(alerta, query)) return false;

    return Alertas.correspondeAoStatusFilter(alerta, criterio);
  }

  private static correspondeAoStatusFilter(alerta: Alerta, criterio: CriterioFiltroAlertas): boolean {
    if (!criterio.statusFilter || criterio.statusFilter === 'all') return true;
    const statusFornecedor = criterio.mapaStatusFornecedor.get(alerta.email.paraExibicao()) ?? StatusNf.pendente();
    return statusFornecedor.paraExibicao() === criterio.statusFilter;
  }

  private static correspondeABusca(alerta: Alerta, query: string): boolean {
    const bateTexto = [alerta.responsavelLegal, alerta.email.paraExibicao(), alerta.regra.paraExibicao()]
      .some((str) => str.toLowerCase().includes(query));
    const bateCnpj = alerta.cnpj.contem(query);
    return bateTexto || bateCnpj;
  }

  ordenadosPorDataDecrescente(): Alertas {
    const ordenados = [...this.itens].sort((a, b) => {
      const timeA = new Date(a.dataHoraEnvio.raw().replace(' ', 'T')).getTime();
      const timeB = new Date(b.dataHoraEnvio.raw().replace(' ', 'T')).getTime();
      return timeB - timeA;
    });
    return new Alertas(ordenados);
  }
}
