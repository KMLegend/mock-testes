import { Contrato } from '../../domain/entities/Contrato';

export interface ContratoRepository {
  todos(): Promise<Contrato[]>;
}
