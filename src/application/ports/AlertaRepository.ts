import { Alerta } from '../../domain/entities/Alerta';
import { Email } from '../../domain/value-objects/Email';

export interface AlertaRepository {
  todos(): Promise<Alerta[]>;
  doFornecedor(email: Email): Promise<Alerta[]>;
}
