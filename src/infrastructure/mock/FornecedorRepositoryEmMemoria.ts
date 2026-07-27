import { FornecedorRepository } from '../../application/ports/FornecedorRepository';
import { Fornecedor } from '../../domain/entities/Fornecedor';
import { BaseDeCadastroStore } from './cadastro/BaseDeCadastroStore';

/** Lê do store ao vivo — a carga de planilha reflete sem recriar dependências. */
export class FornecedorRepositoryEmMemoria implements FornecedorRepository {
  constructor(private readonly store: BaseDeCadastroStore) {}

  async ativos(): Promise<Fornecedor[]> {
    return this.store.fornecedores().filter((fornecedor) => fornecedor.ativo);
  }

  async todos(): Promise<Fornecedor[]> {
    return this.store.fornecedores();
  }
}
