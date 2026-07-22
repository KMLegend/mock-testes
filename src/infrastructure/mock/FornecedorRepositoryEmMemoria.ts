import { FornecedorRepository } from '../../application/ports/FornecedorRepository';
import { Fornecedor } from '../../domain/entities/Fornecedor';
import { mockFornecedoresData } from './dados/mockData';

export class FornecedorRepositoryEmMemoria implements FornecedorRepository {
  private readonly fornecedores: Fornecedor[] = [...mockFornecedoresData];

  async ativos(): Promise<Fornecedor[]> {
    return this.fornecedores.filter((f) => f.ativo);
  }

  async todos(): Promise<Fornecedor[]> {
    return [...this.fornecedores];
  }
}
