import { Chamado } from '../../domain/entities/Chamado';
import { Cnpj } from '../../domain/value-objects/Cnpj';

export interface ExtratorCnpjDaNota {
  extrair(chamado: Chamado): Promise<Cnpj | null>;
}
