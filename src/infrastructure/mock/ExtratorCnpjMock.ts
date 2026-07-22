import { ExtratorCnpjDaNota } from '../../application/ports/ExtratorCnpjDaNota';
import { Chamado } from '../../domain/entities/Chamado';
import { Cnpj } from '../../domain/value-objects/Cnpj';

export class ExtratorCnpjMock implements ExtratorCnpjDaNota {
  async extrair(chamado: Chamado): Promise<Cnpj | null> {
    return chamado.cnpjAnexo ?? null;
  }
}
