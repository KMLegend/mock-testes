import { ExportadorDePlanilha } from '../ports/ExportadorDePlanilha';
import { LinhasDeStatus } from '../../domain/collections/LinhasDeStatus';
import { Alertas } from '../../domain/collections/Alertas';
import { Competencia } from '../../domain/value-objects/Competencia';

export class ExportarPlanilha {
  constructor(private readonly exportador: ExportadorDePlanilha) {}

  async executar(linhasGrid: LinhasDeStatus, alertas: Alertas, competencia: Competencia): Promise<void> {
    return this.exportador.exportar(linhasGrid, alertas, competencia);
  }
}
