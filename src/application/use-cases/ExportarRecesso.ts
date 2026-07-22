import { ExportadorDeRecesso } from '../ports/ExportadorDeRecesso';
import { LinhaDeRecesso } from '../read-models/LinhaDeRecesso';

export class ExportarRecesso {
  constructor(private readonly exportador: ExportadorDeRecesso) {}

  async executar(linhas: readonly LinhaDeRecesso[]): Promise<void> {
    return this.exportador.exportar(linhas);
  }
}
