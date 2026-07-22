import { Competencia } from '../../domain/value-objects/Competencia';
import { LinhasDeStatus } from '../../domain/collections/LinhasDeStatus';
import { MotorDeStatus } from '../../domain/services/MotorDeStatus';
import { FornecedorRepository } from '../ports/FornecedorRepository';
import { ChamadoRepository } from '../ports/ChamadoRepository';
import { ContratoRepository } from '../ports/ContratoRepository';
import { ExtratorCnpjDaNota } from '../ports/ExtratorCnpjDaNota';
import { Chamado } from '../../domain/entities/Chamado';
import { Cnpj } from '../../domain/value-objects/Cnpj';

export interface RepositoriosStatus {
  readonly fornecedorRepo: FornecedorRepository;
  readonly chamadoRepo: ChamadoRepository;
  readonly contratoRepo: ContratoRepository;
  readonly extratorCnpj?: ExtratorCnpjDaNota;
}

export class ObterStatusDaCompetencia {
  constructor(
    private readonly repos: RepositoriosStatus,
    private readonly cnpjTomadores: Map<string, string>
  ) {}

  async executar(competencia: Competencia): Promise<LinhasDeStatus> {
    const fornecedores = await this.repos.fornecedorRepo.ativos();
    const chamados = await this.repos.chamadoRepo.daCompetencia(competencia);
    const contratos = await this.repos.contratoRepo.todos();
    const cnpjsExtraidos = await this.extrairCnpjs(chamados);

    return MotorDeStatus.processar({
      fornecedores,
      chamados,
      contratos,
      cnpjTomadores: this.cnpjTomadores,
      cnpjsExtraidos
    });
  }

  private async extrairCnpjs(chamados: readonly Chamado[]): Promise<Map<string, Cnpj | null>> {
    const mapa = new Map<string, Cnpj | null>();
    if (!this.repos.extratorCnpj) {
      return mapa;
    }

    const extracoes = await Promise.all(
      chamados.map(async (c) => ({
        id: c.id,
        cnpj: await this.repos.extratorCnpj!.extrair(c)
      }))
    );

    for (const item of extracoes) {
      mapa.set(item.id, item.cnpj);
    }
    return mapa;
  }
}
