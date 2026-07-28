import { ContratoRepository } from '../../application/ports/ContratoRepository';
import { Contrato } from '../../domain/entities/Contrato';
import { BaseDeCadastroStore } from './cadastro/BaseDeCadastroStore';

/** Lê do store ao vivo — a carga de planilha reflete sem recriar dependências. */
export class ContratoRepositoryEmMemoria implements ContratoRepository {
  constructor(private readonly store: BaseDeCadastroStore) {}

  async todos(): Promise<Contrato[]> {
    return this.store.contratos().filter((c) => !c.ehDeletado);
  }
}
