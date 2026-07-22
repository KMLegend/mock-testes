import { ContratoRepository } from '../../application/ports/ContratoRepository';
import { Contrato } from '../../domain/entities/Contrato';
import { mockContratosData } from './dados/mockData';

export class ContratoRepositoryEmMemoria implements ContratoRepository {
  private readonly contratos: Contrato[] = [...mockContratosData];

  async todos(): Promise<Contrato[]> {
    return [...this.contratos];
  }
}
