import { OcorrenciaDeRecessoRepository } from '../../application/ports/OcorrenciaDeRecessoRepository';
import { ContratoRepository } from '../../application/ports/ContratoRepository';
import { OcorrenciaDeRecesso } from '../../domain/entities/OcorrenciaDeRecesso';
import { ExtratoDeRecesso } from '../../domain/collections/ExtratoDeRecesso';
import { MotorDeCreditoMensal } from '../../domain/services/MotorDeCreditoMensal';
import { AutorDoLancamento } from '../../domain/value-objects/AutorDoLancamento';
import { CompetenciaDeRecesso } from '../../domain/value-objects/CompetenciaDeRecesso';
import { OrigemDaOcorrencia } from '../../domain/value-objects/OrigemDaOcorrencia';
import { QuantidadeDeDias } from '../../domain/value-objects/QuantidadeDeDias';
import { TipoOcorrencia } from '../../domain/value-objects/TipoOcorrencia';

// v5: encerramentos/rescisões automáticas são vinculados estritamente à vigência real do contrato
const CHAVE_ARMAZENAMENTO = 'nf-pjs:recesso:ocorrencias:v5';

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
}

/**
 * Repositório mock com persistência em localStorage (R-12) — sem isso o lançamento
 * some ao recarregar e a demonstração perde sentido.
 */
export class OcorrenciaDeRecessoRepositoryEmMemoria implements OcorrenciaDeRecessoRepository {
  private ocorrencias: OcorrenciaDeRecesso[] = [];
  private readonly motor = new MotorDeCreditoMensal();

  constructor(private readonly contratoRepo?: ContratoRepository) {
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

  async finalizarContratoAntecipadamente(contratoId: string): Promise<void> {
    if (!this.contratoRepo) throw new Error('Repositório de contratos indisponível para finalização antecipada.');

    const contratos = await this.contratoRepo.todos();
    const contrato = contratos.find((candidato) => candidato.identificador() === contratoId);
    if (!contrato) throw new Error('Contrato não encontrado.');

    const extrato = new ExtratoDeRecesso(await this.doContrato(contratoId));
    const novas = this.motor.gerarEncerramentoAntecipado(contrato, extrato);
    await this.salvarVarias(novas);
  }

  limpar(): void {
    this.ocorrencias = [];
    this.persistir();
  }

  /** Limpa lançamentos automáticos do motor quando uma nova carga de cadastro é aplicada. */
  limparAutomaticos(): void {
    this.ocorrencias = this.ocorrencias.filter((ocorrencia) => !ocorrencia.origem.ehAutomatica());
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
      criadoEm: ocorrencia.criadoEm.toISOString()
    }));
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(dados));
  }

  private carregar(): OcorrenciaDeRecesso[] {
    if (typeof localStorage === 'undefined') return [];
    // Limpeza defensiva das chaves antigas (v1, v2, v3, v4)
    localStorage.removeItem('nf-pjs:recesso:ocorrencias:v1');
    localStorage.removeItem('nf-pjs:recesso:ocorrencias:v2');
    localStorage.removeItem('nf-pjs:recesso:ocorrencias:v3');
    localStorage.removeItem('nf-pjs:recesso:ocorrencias:v4');

    const bruto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (!bruto) return [];
    try {
      const dados = JSON.parse(bruto) as OcorrenciaSerializada[];
      // Filtra ocorrências antigas salvas com texto de 40% do direito
      const limpos = dados.filter((d) => !d.descricao.includes('40% do direito'));
      return limpos.map((dado) => this.reconstruir(dado));
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
      criadoEm: new Date(dado.criadoEm)
    });
  }

  /** Rescisão sem direito é gravada com zero — só ela pode voltar como "nenhuma". */
  private reconstruirQuantidade(valor: number): QuantidadeDeDias {
    if (valor <= 0) return QuantidadeDeDias.nenhuma();
    return QuantidadeDeDias.de(valor);
  }
}
