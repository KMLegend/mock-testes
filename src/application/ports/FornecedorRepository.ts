import { Fornecedor } from '../../domain/entities/Fornecedor';

export interface FornecedorRepository {
  ativos(): Promise<Fornecedor[]>;
  todos(): Promise<Fornecedor[]>;
}
