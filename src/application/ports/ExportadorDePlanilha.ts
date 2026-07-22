import { LinhasDeStatus } from '../../domain/collections/LinhasDeStatus';
import { Alertas } from '../../domain/collections/Alertas';
import { Competencia } from '../../domain/value-objects/Competencia';

export interface ExportadorDePlanilha {
  exportar(linhasGrid: LinhasDeStatus, alertas: Alertas, competencia: Competencia): Promise<void>;
}
