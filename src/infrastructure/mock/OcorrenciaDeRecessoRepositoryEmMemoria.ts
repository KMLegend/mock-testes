import { OcorrenciaDeRecessoRepository } from '../../application/ports/OcorrenciaDeRecessoRepository';
import { OcorrenciaDeRecesso } from '../../domain/entities/OcorrenciaDeRecesso';
import { AutorDoLancamento } from '../../domain/value-objects/AutorDoLancamento';
import { CompetenciaDeRecesso } from '../../domain/value-objects/CompetenciaDeRecesso';
import { OrigemDaOcorrencia } from '../../domain/value-objects/OrigemDaOcorrencia';
import { QuantidadeDeDias } from '../../domain/value-objects/QuantidadeDeDias';
import { TipoOcorrencia } from '../../domain/value-objects/TipoOcorrencia';

// v2: o lançamento passou a ser por contrato e com competência mensal — o formato
// antigo em disco não é migrável, então a chave muda para descartá-lo.
const CHAVE_ARMAZENAMENTO = 'nf-pjs:recesso:ocorrencias:v2';

interface OcorrenciaSerializada {
  id: string;
  codContrato: string;
  dataDoCalculo: string;
  competencia: string;
  descricao: string;
  tipo: string;
  quantidade: number;
  autor: string;
  origem: string;
  criadoEm: string;
  encerraContrato?: boolean;
}

/**
 * Repositório mock com persistência em localStorage (R-12) — sem isso o lançamento
 * some ao recarregar e a demonstração perde sentido.
 */
export class OcorrenciaDeRecessoRepositoryEmMemoria implements OcorrenciaDeRecessoRepository {
  private ocorrencias: OcorrenciaDeRecesso[] = [];

  constructor() {
    this.ocorrencias = this.carregar();
  }

  async todas(): Promise<OcorrenciaDeRecesso[]> {
    return [...this.ocorrencias];
  }

  async doContrato(codContrato: string): Promise<OcorrenciaDeRecesso[]> {
    return this.ocorrencias.filter((ocorrencia) => ocorrencia.ehDoContrato(codContrato));
  }

  async salvar(ocorrencia: OcorrenciaDeRecesso): Promise<void> {
    this.ocorrencias.push(ocorrencia);
    this.persistir();
  }

  /** Idempotente: ignora ocorrência já existente com o mesmo id. */
  async salvarVarias(novas: readonly OcorrenciaDeRecesso[]): Promise<void> {
    const idsExistentes = new Set(this.ocorrencias.map((existente) => existente.id));
    const ineditas = novas.filter((nova) => !idsExistentes.has(nova.id));
    if (ineditas.length === 0) return;
    this.ocorrencias.push(...ineditas);
    this.persistir();
  }

  limpar(): void {
    this.ocorrencias = [];
    this.persistir();
  }

  private persistir(): void {
    if (typeof localStorage === 'undefined') return;
    const dados: OcorrenciaSerializada[] = this.ocorrencias.map((ocorrencia) => ({
      id: ocorrencia.id,
      codContrato: ocorrencia.codContrato,
      dataDoCalculo: ocorrencia.dataDoCalculo.toISOString(),
      competencia: ocorrencia.competencia.data().toISOString(),
      descricao: ocorrencia.descricao,
      tipo: ocorrencia.tipo.paraArmazenamento(),
      quantidade: ocorrencia.quantidade.obterValor(),
      autor: ocorrencia.autor.paraExibicao(),
      origem: ocorrencia.origem.paraArmazenamento(),
      criadoEm: ocorrencia.criadoEm.toISOString(),
      encerraContrato: ocorrencia.encerraContrato()
    }));
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(dados));
  }

  private carregar(): OcorrenciaDeRecesso[] {
    if (typeof localStorage === 'undefined') return [];
    const bruto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (!bruto) return [];
    try {
      const dados = JSON.parse(bruto) as OcorrenciaSerializada[];
      return dados.map((dado) => this.reconstruir(dado));
    } catch {
      return [];
    }
  }

  private reconstruir(dado: OcorrenciaSerializada): OcorrenciaDeRecesso {
    return new OcorrenciaDeRecesso({
      id: dado.id,
      codContrato: dado.codContrato,
      dataDoCalculo: new Date(dado.dataDoCalculo),
      competencia: CompetenciaDeRecesso.apartirDe(new Date(dado.competencia)),
      descricao: dado.descricao,
      tipo: TipoOcorrencia.de(dado.tipo),
      quantidade: this.reconstruirQuantidade(dado.quantidade),
      autor: AutorDoLancamento.usuario(dado.autor),
      origem: OrigemDaOcorrencia.de(dado.origem),
      criadoEm: new Date(dado.criadoEm),
      encerraContrato: dado.encerraContrato === true
    });
  }

  /** Rescisão sem direito é gravada com zero — só ela pode voltar como "nenhuma". */
  private reconstruirQuantidade(valor: number): QuantidadeDeDias {
    if (valor <= 0) return QuantidadeDeDias.nenhuma();
    return QuantidadeDeDias.de(valor);
  }
}
