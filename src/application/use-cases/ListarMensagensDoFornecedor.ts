import { AlertaRepository } from '../ports/AlertaRepository';
import { Alerta } from '../../domain/entities/Alerta';
import { Email } from '../../domain/value-objects/Email';

export class ListarMensagensDoFornecedor {
  constructor(private readonly alertaRepo: AlertaRepository) {}

  async executar(email: Email): Promise<Alerta[]> {
    return this.alertaRepo.doFornecedor(email);
  }
}
