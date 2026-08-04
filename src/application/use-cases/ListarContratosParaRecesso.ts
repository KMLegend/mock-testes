import { Contrato } from '../../domain/entities/Contrato';
import { Fornecedor } from '../../domain/entities/Fornecedor';
import { ExtratoDeRecesso } from '../../domain/collections/ExtratoDeRecesso';
import { MotorDeCreditoMensal } from '../../domain/services/MotorDeCreditoMensal';
import { ContratoRepository } from '../ports/ContratoRepository';
import { FornecedorRepository } from '../ports/FornecedorRepository';
import { OcorrenciaDeRecessoRepository } from '../ports/OcorrenciaDeRecessoRepository';
import { LinhaDeRecesso } from '../read-models/LinhaDeRecesso';

export interface DependenciasListarContratos {
  readonly contratoRepo: ContratoRepository;
  readonly fornecedorRepo: FornecedorRepository;
  readonly ocorrenciaRepo: OcorrenciaDeRecessoRepository;
  readonly motor: MotorDeCreditoMensal;
  readonly agora?: () => Date;
}

/**
 * Grade de recesso: uma linha por CONTRATO, já com o acúmulo mensal materializado.
 * Inclui contratos fora da vigência e de PJs inativos — a grade os marca com ícone.
 */
export class ListarContratosParaRecesso {
  constructor(private readonly deps: DependenciasListarContratos) {}

  async executar(): Promise<readonly LinhaDeRecesso[]> {
    const [contratos, fornecedores] = await Promise.all([
      this.deps.contratoRepo.todos(),
      this.deps.fornecedorRepo.todos()
    ]);

    const porCodEmpresa = new Map(fornecedores.map((pj) => [pj.codEmpresa, pj]));

    // Busca ocorrências por contrato (o backend exige contratoId como parâmetro obrigatório).
    const ocorrenciasPorContrato = await Promise.all(
      contratos.map((contrato) => this.deps.ocorrenciaRepo.doContrato(contrato.identificador()))
    );
    const geral = new ExtratoDeRecesso(ocorrenciasPorContrato.flat());

    const novos = contratos.flatMap((contrato) => this.creditosPendentes(contrato, geral));
    if (novos.length > 0) await this.deps.ocorrenciaRepo.salvarVarias(novos);

    const atualizado = geral.acrescentar(novos);
    return contratos
      .flatMap((contrato) => this.montarLinha(contrato, porCodEmpresa, atualizado))
      .sort((linhaA, linhaB) => this.ordenar(linhaA, linhaB));
  }

  private creditosPendentes(contrato: Contrato, geral: ExtratoDeRecesso) {
    const extrato = geral.doContrato(contrato.identificador());
    return this.deps.motor.gerarPara(contrato, extrato);
  }

  private montarLinha(
    contrato: Contrato,
    porCodEmpresa: Map<string, Fornecedor>,
    geral: ExtratoDeRecesso
  ): LinhaDeRecesso[] {
    const fornecedor = porCodEmpresa.get(contrato.codEmpresa);
    if (!fornecedor) return [];

    const hoje = (this.deps.agora ?? (() => new Date()))();
    let extratoDoContrato = geral.doContrato(contrato.identificador());

    // Se o contrato está vigente, remove qualquer rescisão/zeramento automático legado do extrato
    if (contrato.estaVigente(hoje)) {
      const semEncerramentos = extratoDoContrato.paraArray().filter((ocorrencia) => (
        ocorrencia.id !== `auto-rescisao-${contrato.identificador()}` &&
        ocorrencia.id !== `auto-zeramento-${contrato.identificador()}`
      ));
      extratoDoContrato = new ExtratoDeRecesso(semEncerramentos);
    }

    return [
      new LinhaDeRecesso({
        contrato,
        fornecedor,
        extrato: extratoDoContrato,
        hoje
      })
    ];
  }

  /** Razão social e, dentro do mesmo PJ, número do contrato. */
  private ordenar(linhaA: LinhaDeRecesso, linhaB: LinhaDeRecesso): number {
    const porEmpresa = linhaA.fornecedor.empresa.localeCompare(linhaB.fornecedor.empresa, 'pt-BR');
    if (porEmpresa !== 0) return porEmpresa;
    return linhaA.contrato.codContrato.localeCompare(linhaB.contrato.codContrato, 'pt-BR');
  }
}
