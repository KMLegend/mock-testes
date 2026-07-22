import { ChamadoRepository } from '../../application/ports/ChamadoRepository';
import { Chamado } from '../../domain/entities/Chamado';
import { Competencia } from '../../domain/value-objects/Competencia';
import { obterMockChamadosIniciais } from './dados/mockData';

export class ChamadoRepositoryEmMemoria implements ChamadoRepository {
  private chamados: Chamado[] = obterMockChamadosIniciais();

  async daCompetencia(competencia: Competencia): Promise<Chamado[]> {
    return this.chamados.filter((c) => c.mesReferente.equals(competencia));
  }

  async todos(): Promise<Chamado[]> {
    return [...this.chamados];
  }

  async salvar(chamado: Chamado): Promise<void> {
    this.chamados.push(chamado);
  }

  async remover(id: string): Promise<void> {
    this.chamados = this.chamados.filter((c) => c.id !== id);
  }

  async atualizar(chamadoAtualizado: Chamado): Promise<void> {
    const idx = this.chamados.findIndex((c) => c.id === chamadoAtualizado.id);
    if (idx !== -1) {
      this.chamados[idx] = chamadoAtualizado;
    }
  }

  async resetar(): Promise<void> {
    this.chamados = obterMockChamadosIniciais();
  }
}
