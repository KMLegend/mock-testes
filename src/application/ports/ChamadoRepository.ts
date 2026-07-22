import { Chamado } from '../../domain/entities/Chamado';
import { Competencia } from '../../domain/value-objects/Competencia';

export interface ChamadoRepository {
  daCompetencia(competencia: Competencia): Promise<Chamado[]>;
  todos(): Promise<Chamado[]>;
  salvar(chamado: Chamado): Promise<void>;
  remover(id: string): Promise<void>;
  atualizar(chamado: Chamado): Promise<void>;
  resetar(): Promise<void>;
}
