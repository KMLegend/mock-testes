import { AlertaRepository } from '../ports/AlertaRepository';
import { Alertas, CriterioFiltroAlertas } from '../../domain/collections/Alertas';

export class ListarMensagens {
  constructor(private readonly alertaRepo: AlertaRepository) {}

  async executar(criterio: CriterioFiltroAlertas): Promise<Alertas> {
    const todosAlertas = await this.alertaRepo.todos();
    const colecao = new Alertas(todosAlertas);
    return colecao.filtradosPor(criterio);
  }
}
